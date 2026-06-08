import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, RefreshCw, Play, AlertTriangle, Info, Zap } from 'lucide-react';

const DOUBLE_CONSONANTS = new Set([
  'zz','rr','tt','pp','ss','dd','ff','gg','kk','ll','mm','ww','vv','bb','nn',
]);

const BATCH_SIZE = 200;

function isAlsViolation(phoneme: string, isLast: boolean): boolean {
  if (!phoneme.includes('als')) return false;
  if (isLast && phoneme === 'galsch') return false;
  return true;
}

function computeKlankzuiver(klankteken: string): 0 | 1 {
  const phonemes = klankteken.split('-');
  if (phonemes[phonemes.length - 1] === 'dt') return 0;
  for (let i = 0; i < phonemes.length; i++) {
    const p = phonemes[i];
    const last = i === phonemes.length - 1;
    if (isAlsViolation(p, last)) return 0;
    if (DOUBLE_CONSONANTS.has(p)) return 0;
    if (p === 'x') return 0;
  }
  return 1;
}

function reasons(klankteken: string): string[] {
  const r: string[] = [];
  const phonemes = klankteken.split('-');
  if (phonemes[phonemes.length - 1] === 'dt') r.push('eindigt op dt');
  const alsOnes = phonemes.filter((p, i) => isAlsViolation(p, i === phonemes.length - 1));
  const dcOnes  = phonemes.filter(p => DOUBLE_CONSONANTS.has(p));
  if (alsOnes.length) r.push(`als: ${alsOnes.join(', ')}`);
  if (dcOnes.length)  r.push(`dubbelconsonant: ${dcOnes.join(', ')}`);
  if (phonemes.includes('x')) r.push('x');
  return r;
}

interface WordRow {
  id: number;
  word: string;
  klankteken: string;
  klankzuiver: number | null;
  computed: 0 | 1;
  reasons: string[];
  changed: boolean;
}

interface Stats {
  total: number;
  pending: number;
  mismatch: number;
}

type Mode = 'pending' | 'recalculate';

export default function KlankzuiverCheck() {
  const [stats, setStats]           = useState<Stats | null>(null);
  const [mode, setMode]             = useState<Mode>('pending');
  const [preview, setPreview]       = useState<WordRow[]>([]);
  const [loadingStats, setLoadingStats]   = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying]     = useState(false);
  const [applied, setApplied]       = useState(0);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const bulkAbort = useRef(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [{ count: total }, { count: pending }] = await Promise.all([
        supabase.from('wordfrequency')
          .select('*', { count: 'exact', head: true })
          .not('klankteken', 'is', null)
          .neq('klankteken', ''),
        supabase.from('wordfrequency')
          .select('*', { count: 'exact', head: true })
          .is('klankzuiver', null)
          .not('klankteken', 'is', null)
          .neq('klankteken', ''),
      ]);

      // estimate mismatch by loading a sample — full scan too expensive client-side
      setStats({ total: total ?? 0, pending: pending ?? 0, mismatch: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const loadPreview = async () => {
    setLoadingPreview(true);
    setPreview([]);
    try {
      let query = supabase
        .from('wordfrequency')
        .select('id, word, klankteken, klankzuiver')
        .not('klankteken', 'is', null)
        .neq('klankteken', '')
        .order('aantal_karakters', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      if (mode === 'pending') {
        query = query.is('klankzuiver', null);
      }
      // 'recalculate' loads all (including already-set) — we filter client-side to changed ones

      const { data, error } = await query;
      if (error) throw error;

      const rows: WordRow[] = (data ?? []).map(r => {
        const computed = computeKlankzuiver(r.klankteken as string);
        return {
          id:          r.id as number,
          word:        r.word as string,
          klankteken:  r.klankteken as string,
          klankzuiver: r.klankzuiver as number | null,
          computed,
          reasons:     computed === 0 ? reasons(r.klankteken as string) : [],
          changed:     r.klankzuiver !== computed,
        };
      });

      const filtered = mode === 'recalculate' ? rows.filter(r => r.changed) : rows;
      setPreview(filtered);
    } catch (err) {
      showToast('error', String(err));
    } finally {
      setLoadingPreview(false);
    }
  };

  const applyBatch = async () => {
    if (!preview.length) return;
    setApplying(true);
    try {
      const updates = preview.map(r =>
        supabase.from('wordfrequency').update({ klankzuiver: r.computed }).eq('id', r.id)
      );
      const results = await Promise.all(updates);
      const errored = results.filter(r => r.error).length;
      const saved   = results.length - errored;
      setApplied(prev => prev + saved);

      if (errored > 0) {
        showToast('error', `${saved} opgeslagen, ${errored} fouten.`);
      } else {
        showToast('success', `${saved} woorden bijgewerkt.`);
      }

      setPreview([]);
      await loadStats();
    } catch (err) {
      showToast('error', String(err));
    } finally {
      setApplying(false);
    }
  };

  const runAll = async () => {
    bulkAbort.current = false;
    setBulkRunning(true);
    setBulkProgress(null);
    let totalDone = 0;

    try {
      // first pass: get total count
      const { count } = await supabase.from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .is('klankzuiver', null)
        .not('klankteken', 'is', null)
        .neq('klankteken', '');
      const total = count ?? 0;
      setBulkProgress({ done: 0, total });

      let lastId = 0;
      while (!bulkAbort.current) {
        const { data, error } = await supabase
          .from('wordfrequency')
          .select('id, klankteken')
          .is('klankzuiver', null)
          .not('klankteken', 'is', null)
          .neq('klankteken', '')
          .gt('id', lastId)
          .order('id', { ascending: true })
          .limit(BATCH_SIZE);

        if (error) throw error;
        if (!data || data.length === 0) break;

        const updates = data.map(r =>
          supabase.from('wordfrequency')
            .update({ klankzuiver: computeKlankzuiver(r.klankteken as string) })
            .eq('id', r.id)
        );
        await Promise.all(updates);

        totalDone += data.length;
        lastId = data[data.length - 1].id as number;
        setBulkProgress({ done: totalDone, total });
        setApplied(prev => prev + data.length);
      }

      showToast('success', `${totalDone.toLocaleString('nl-BE')} woorden verwerkt.`);
      await loadStats();
    } catch (err) {
      showToast('error', String(err));
    } finally {
      setBulkRunning(false);
      setBulkProgress(null);
    }
  };

  const pendingCount  = stats?.pending ?? 0;
  const processedCount = stats ? (stats.total - stats.pending) : 0;
  const progress = stats ? Math.round((processedCount / stats.total) * 100) : 0;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Klankzuiver Check</h1>
        <p className="mt-1 text-gray-500 text-sm">
          Herberekent de klankzuiver-waarde op basis van klankteken — geen 'als'-klanken en geen dubbelconsonanten.
        </p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <div>
          <span className="font-semibold">Klankzuiver = 1</span> als klankteken geen foneem bevat met <code className="bg-blue-100 px-1 rounded">als</code> en geen dubbelconsonant (<code className="bg-blue-100 px-1 rounded">pp, ss, ll, mm, nn ...</code>).
          Anders <span className="font-semibold">klankzuiver = 0</span>.
        </div>
      </div>

      {/* Stats */}
      {loadingStats ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Statistieken laden...
        </div>
      ) : stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Totaal met klankteken</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString('nl-BE')}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <p className="text-xs text-amber-600 mb-1">Nog te verwerken</p>
            <p className="text-2xl font-bold text-amber-700">{pendingCount.toLocaleString('nl-BE')}</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-5">
            <p className="text-xs text-green-600 mb-1">Verwerkt</p>
            <p className="text-2xl font-bold text-green-700">{processedCount.toLocaleString('nl-BE')}</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{progress}%</p>
          </div>
          {applied > 0 && (
            <div className="col-span-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700 font-medium">
              ✓ {applied.toLocaleString('nl-BE')} woorden bijgewerkt in deze sessie
            </div>
          )}
        </div>
      )}

      {/* Mode + Load */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Modus</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setMode('pending'); setPreview([]); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === 'pending'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Nog niet verwerkt
              {pendingCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-semibold">
                  {pendingCount.toLocaleString('nl-BE')}
                </span>
              )}
            </button>
            <button
              onClick={() => { setMode('recalculate'); setPreview([]); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === 'recalculate'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Herberekenen (bestaande waarden)
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {mode === 'pending'
              ? `Laadt ${BATCH_SIZE} woorden zonder klankzuiver-waarde en berekent de nieuwe waarde.`
              : `Laadt ${BATCH_SIZE} woorden met een bestaande waarde en toont welke zouden wijzigen.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadPreview}
            disabled={loadingPreview || bulkRunning || (mode === 'pending' && pendingCount === 0)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingPreview
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Laden...</>
              : <><Play className="w-4 h-4" /> Volgende {BATCH_SIZE} woorden laden</>}
          </button>

          {!bulkRunning ? (
            <button
              onClick={runAll}
              disabled={loadingPreview || applying || pendingCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Zap className="w-4 h-4" />
              Alles automatisch verwerken ({pendingCount.toLocaleString('nl-BE')})
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {bulkProgress
                  ? `${bulkProgress.done.toLocaleString('nl-BE')} / ${bulkProgress.total.toLocaleString('nl-BE')} verwerkt`
                  : 'Starten...'}
              </div>
              <button
                onClick={() => { bulkAbort.current = true; }}
                className="px-3 py-2.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Stoppen
              </button>
            </div>
          )}
        </div>

        {bulkProgress && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{bulkProgress.done.toLocaleString('nl-BE')} verwerkt</span>
              <span>{Math.round((bulkProgress.done / bulkProgress.total) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Preview — {preview.length} woorden</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {mode === 'pending' ? 'Nieuwe waarden klaar om op te slaan' : 'Woorden waarvan de waarde zou wijzigen'}
              </p>
            </div>
            <button
              onClick={applyBatch}
              disabled={applying}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {applying
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Opslaan...</>
                : <><CheckCircle className="w-4 h-4" /> {preview.length} woorden toepassen</>}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Woord</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Klankteken</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Huidig</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nieuw</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Reden</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map(row => (
                  <tr key={row.id} className={row.changed && row.klankzuiver !== null ? 'bg-amber-50' : ''}>
                    <td className="px-6 py-3 font-medium text-gray-900">{row.word}</td>
                    <td className="px-6 py-3 text-gray-600 font-mono text-xs">{row.klankteken}</td>
                    <td className="px-4 py-3 text-center">
                      {row.klankzuiver === null ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : row.klankzuiver === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                          <CheckCircle className="w-3 h-3" /> 1
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">
                          <XCircle className="w-3 h-3" /> 0
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.computed === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-semibold">
                          <CheckCircle className="w-3 h-3" /> 1
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-semibold">
                          <XCircle className="w-3 h-3" /> 0
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {row.reasons.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.reasons.map((r, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                              <AlertTriangle className="w-3 h-3" /> {r}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">zuiver</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>
              {preview.filter(r => r.computed === 1).length} klankzuiver &bull;{' '}
              {preview.filter(r => r.computed === 0).length} niet klankzuiver
              {mode === 'recalculate' && (
                <> &bull; <span className="text-amber-600 font-medium">{preview.filter(r => r.changed).length} wijzigingen</span></>
              )}
            </span>
            <button
              onClick={applyBatch}
              disabled={applying}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
            >
              {applying ? 'Opslaan...' : `${preview.length} woorden toepassen`}
            </button>
          </div>
        </div>
      )}

      {!loadingPreview && preview.length === 0 && mode === 'pending' && pendingCount === 0 && !loadingStats && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-3 text-green-800">
          <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
          <div>
            <p className="font-semibold">Alle woorden verwerkt!</p>
            <p className="text-sm text-green-700">Geen woorden meer zonder klankzuiver-waarde.</p>
          </div>
        </div>
      )}
    </div>
  );
}


export default KlankzuiverCheck