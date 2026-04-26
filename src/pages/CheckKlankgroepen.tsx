import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Check, SkipForward, ChevronLeft, ChevronRight, Filter, Pencil, X } from 'lucide-react';

interface WordRow {
  id: number;
  word: string;
  klankteken: string | null;
  klankgroepenklanken: string | null;
  klankgroepen: string | null;
  aantal_klankgroepen: number | null;
}

interface WorkingWord extends WordRow {
  workingKlankgroepenklanken: string;
  derivedKlankgroepen: string;
  derivedAantal: number;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

type SortOption = 'shortest' | 'longest' | 'oldest' | 'newest' | 'random';

const BATCH_SIZE = 100;

function normalizeForComparison(s: string): string {
  return s.replace(/[+-]/g, '-');
}

function segmentsMatch(klankteken: string, klankgroepenklanken: string): boolean {
  return normalizeForComparison(klankteken) === normalizeForComparison(klankgroepenklanken);
}

function parseTokens(value: string): Array<{ type: 'segment' | 'sep'; value: string }> {
  const tokens: Array<{ type: 'segment' | 'sep'; value: string }> = [];
  let current = '';
  for (const ch of value) {
    if (ch === '-' || ch === '+') {
      if (current) tokens.push({ type: 'segment', value: current });
      tokens.push({ type: 'sep', value: ch });
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) tokens.push({ type: 'segment', value: current });
  return tokens;
}

function tokensToString(tokens: Array<{ type: 'segment' | 'sep'; value: string }>): string {
  return tokens.map(t => t.value).join('');
}

function deriveKlankgroepen(
  klankgroepenklanken: string,
  lookupMap: Map<string, string>
): { klankgroepen: string; aantal: number } {
  if (!klankgroepenklanken) return { klankgroepen: '', aantal: 1 };

  const groups = klankgroepenklanken.split('+');
  const aantal = groups.length;

  const klankgroepen = groups
    .map(group => {
      const parts = group.split('-');
      return parts
        .map(part => lookupMap.get(part) ?? part)
        .join('');
    })
    .join('+');

  return { klankgroepen, aantal };
}

function buildWorkingWord(
  row: WordRow,
  lookupMap: Map<string, string>
): WorkingWord {
  let working = row.klankgroepenklanken || '';

  if (!working || !row.klankteken) {
    working = row.klankteken || '';
  } else if (row.klankteken && !segmentsMatch(row.klankteken, working)) {
    working = row.klankteken;
  }

  const { klankgroepen, aantal } = deriveKlankgroepen(working, lookupMap);

  return {
    ...row,
    workingKlankgroepenklanken: working,
    derivedKlankgroepen: klankgroepen,
    derivedAantal: aantal,
  };
}

export default function CheckKlankgroepen() {
  const [words, setWords] = useState<WorkingWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<Notification | null>(null);
  const [stats, setStats] = useState({ total: 0, checked: 0, unchecked: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('shortest');
  const [lookupMap, setLookupMap] = useState<Map<string, string>>(new Map());
  const [lookupLoaded, setLookupLoaded] = useState(false);
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchLookupMap = useCallback(async () => {
    const { data, error } = await supabase
      .from('klankteken')
      .select('title, letters');
    if (error) {
      console.error('Error fetching klankteken lookup:', error);
      return;
    }
    const map = new Map<string, string>();
    for (const row of data || []) {
      if (row.title && row.letters !== null && row.letters !== undefined) {
        map.set(row.title, row.letters);
      }
    }
    setLookupMap(map);
    setLookupLoaded(true);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const base = supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('klankteken_checked', 1)
        .filter('woordstructuur', 'ilike', '%k%k%');

      const [{ count: total }, { count: checked }] = await Promise.all([
        base,
        supabase
          .from('wordfrequency')
          .select('*', { count: 'exact', head: true })
          .eq('klankteken_checked', 1)
          .eq('klankgroepen_checked', 1)
          .filter('woordstructuur', 'ilike', '%k%k%'),
      ]);

      setStats({
        total: total || 0,
        checked: checked || 0,
        unchecked: (total || 0) - (checked || 0),
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchWords = useCallback(async (map: Map<string, string>) => {
    setLoading(true);
    try {
      const baseQuery = () =>
        supabase
          .from('wordfrequency')
          .select('id, word, klankteken, klankgroepenklanken, klankgroepen, aantal_klankgroepen')
          .eq('klankteken_checked', 1)
          .eq('klankgroepen_checked', 0)
          .filter('woordstructuur', 'ilike', '%k%k%');

      let data: WordRow[] | null = null;

      if (sortOption === 'random') {
        const { count } = await supabase
          .from('wordfrequency')
          .select('*', { count: 'exact', head: true })
          .eq('klankteken_checked', 1)
          .eq('klankgroepen_checked', 0)
          .filter('woordstructuur', 'ilike', '%k%k%');

        if (count && count > 0) {
          const offset = Math.floor(Math.random() * Math.max(0, count - BATCH_SIZE));
          const { data: d } = await baseQuery().range(offset, offset + BATCH_SIZE - 1);
          data = d;
        }
      } else if (sortOption === 'shortest' || sortOption === 'longest') {
        const { data: d } = await baseQuery()
          .order('word', { ascending: sortOption === 'shortest' })
          .range(currentPage * BATCH_SIZE, (currentPage + 1) * BATCH_SIZE - 1);
        // sort by actual character length client-side after fetch for accuracy
        data = (d || []).sort((a, b) =>
          sortOption === 'shortest'
            ? a.word.length - b.word.length
            : b.word.length - a.word.length
        );
      } else {
        const { data: d } = await baseQuery()
          .order('id', { ascending: sortOption === 'oldest' })
          .range(currentPage * BATCH_SIZE, (currentPage + 1) * BATCH_SIZE - 1);
        data = d;
      }

      setWords((data || []).map(row => buildWorkingWord(row, map)));
    } catch (err) {
      console.error('Error fetching words:', err);
      showNotification('error', 'Fout bij ophalen woorden');
    } finally {
      setLoading(false);
    }
  }, [sortOption, currentPage]);

  useEffect(() => {
    fetchLookupMap();
    fetchStats();
  }, []);

  useEffect(() => {
    if (lookupLoaded) {
      fetchWords(lookupMap);
    }
  }, [lookupLoaded, lookupMap, fetchWords]);

  const toggleSeparator = (wordId: number, sepIndex: number) => {
    setWords(prev =>
      prev.map(w => {
        if (w.id !== wordId) return w;
        const tokens = parseTokens(w.workingKlankgroepenklanken);
        let sepCount = 0;
        const newTokens = tokens.map(t => {
          if (t.type === 'sep') {
            if (sepCount === sepIndex) {
              sepCount++;
              return { ...t, value: t.value === '-' ? '+' : '-' };
            }
            sepCount++;
          }
          return t;
        });
        const newKlankgroepenklanken = tokensToString(newTokens);
        const { klankgroepen, aantal } = deriveKlankgroepen(newKlankgroepenklanken, lookupMap);
        return {
          ...w,
          workingKlankgroepenklanken: newKlankgroepenklanken,
          derivedKlankgroepen: klankgroepen,
          derivedAantal: aantal,
        };
      })
    );
  };

  const saveWord = async (word: WorkingWord) => {
    setSaving(prev => new Set(prev).add(word.id));
    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          klankgroepenklanken: word.workingKlankgroepenklanken,
          klankgroepen: word.derivedKlankgroepen,
          aantal_klankgroepen: word.derivedAantal,
          klankgroepen_checked: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', word.id);

      if (error) throw error;

      setWords(prev => prev.filter(w => w.id !== word.id));
      await fetchStats();
      showNotification('success', `"${word.word}" opgeslagen`);
    } catch (err) {
      console.error('Error saving word:', err);
      showNotification('error', 'Fout bij opslaan');
    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(word.id);
        return next;
      });
    }
  };

  const skipWord = (wordId: number) => {
    setWords(prev => prev.filter(w => w.id !== wordId));
  };

  const saveAll = async () => {
    if (words.length === 0) return;
    if (!confirm(`Alle ${words.length} zichtbare woorden opslaan en markeren als gecontroleerd?`)) return;

    const ids = words.map(w => w.id);
    setSaving(new Set(ids));
    try {
      for (const word of words) {
        await supabase
          .from('wordfrequency')
          .update({
            klankgroepenklanken: word.workingKlankgroepenklanken,
            klankgroepen: word.derivedKlankgroepen,
            aantal_klankgroepen: word.derivedAantal,
            klankgroepen_checked: 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', word.id);
      }
      setWords([]);
      await fetchStats();
      showNotification('success', `${ids.length} woorden opgeslagen`);
    } catch (err) {
      console.error('Error saving all:', err);
      showNotification('error', 'Fout bij bulk opslaan');
    } finally {
      setSaving(new Set());
    }
  };

  const toggleEditMode = (wordId: number) => {
    setEditingIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  };

  const updateWordKlankgroepenklanken = (wordId: number, newValue: string) => {
    setWords(prev =>
      prev.map(w => {
        if (w.id !== wordId) return w;
        const { klankgroepen, aantal } = deriveKlankgroepen(newValue, lookupMap);
        return {
          ...w,
          workingKlankgroepenklanken: newValue,
          derivedKlankgroepen: klankgroepen,
          derivedAantal: aantal,
        };
      })
    );
  };

  const updateWordKlankgroepen = (wordId: number, newValue: string) => {
    setWords(prev =>
      prev.map(w => w.id !== wordId ? w : { ...w, derivedKlankgroepen: newValue })
    );
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    setCurrentPage(0);
  };

  const canGoNext = words.length === BATCH_SIZE;
  const canGoPrev = currentPage > 0;

  return (
    <div className="w-full h-full p-6 space-y-6">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Check Klankgroepen</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={sortOption}
              onChange={e => handleSortChange(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="shortest">Kortste woorden</option>
              <option value="longest">Langste woorden</option>
              <option value="oldest">Oudste eerst</option>
              <option value="newest">Nieuwste eerst</option>
              <option value="random">Willekeurig</option>
            </select>
          </div>
          <button
            onClick={() => fetchWords(lookupMap)}
            disabled={loading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Ververs"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Totaal</p>
          <p className="text-3xl font-bold text-blue-900">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">Gecontroleerd</p>
          <p className="text-3xl font-bold text-green-900">{stats.checked.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Te controleren</p>
          <p className="text-3xl font-bold text-amber-900">{stats.unchecked.toLocaleString()}</p>
        </div>
      </div>

      {words.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={saveAll}
            disabled={loading || saving.size > 0}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Markeer alle als gecontroleerd ({words.length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : words.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Alles is nagekeken!</h2>
          <p className="text-gray-500">Er zijn geen woorden meer om te controleren.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 grid grid-cols-[200px_1fr_1fr_80px_140px] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div>Woord</div>
              <div>Klankgroepenklanken</div>
              <div>Klankgroepen</div>
              <div>Aantal</div>
              <div>Acties</div>
            </div>

            <div className="divide-y divide-gray-100">
              {words.map(word => (
                <WordRowItem
                  key={word.id}
                  word={word}
                  isSaving={saving.has(word.id)}
                  isEditing={editingIds.has(word.id)}
                  onToggleSep={toggleSeparator}
                  onSave={saveWord}
                  onSkip={skipWord}
                  onToggleEdit={toggleEditMode}
                  onChangeKlankgroepenklanken={updateWordKlankgroepenklanken}
                  onChangeKlankgroepen={updateWordKlankgroepen}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {words.length} woorden geladen &middot; Pagina {currentPage + 1}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={!canGoPrev}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Vorige
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!canGoNext}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Volgende
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface WordRowItemProps {
  word: WorkingWord;
  isSaving: boolean;
  isEditing: boolean;
  onToggleSep: (wordId: number, sepIndex: number) => void;
  onSave: (word: WorkingWord) => void;
  onSkip: (wordId: number) => void;
  onToggleEdit: (wordId: number) => void;
  onChangeKlankgroepenklanken: (wordId: number, value: string) => void;
  onChangeKlankgroepen: (wordId: number, value: string) => void;
}

function WordRowItem({
  word,
  isSaving,
  isEditing,
  onToggleSep,
  onSave,
  onSkip,
  onToggleEdit,
  onChangeKlankgroepenklanken,
  onChangeKlankgroepen,
}: WordRowItemProps) {
  const tokens = parseTokens(word.workingKlankgroepenklanken);
  let sepIndex = 0;

  return (
    <div className="px-5 py-4 grid grid-cols-[200px_1fr_1fr_80px_140px] gap-4 items-center hover:bg-gray-50 transition-colors">
      <div>
        <p className="font-semibold text-gray-900 text-sm">{word.word}</p>
        {word.klankteken && (
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{word.klankteken}</p>
        )}
      </div>

      {isEditing ? (
        <input
          type="text"
          value={word.workingKlankgroepenklanken}
          onChange={e => onChangeKlankgroepenklanken(word.id, e.target.value)}
          disabled={isSaving}
          className="w-full px-2 py-1.5 text-sm font-mono border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          placeholder="klankgroepenklanken"
          autoFocus
        />
      ) : (
        <div className="flex flex-wrap items-center gap-0.5">
          {tokens.map((token, i) => {
            if (token.type === 'segment') {
              return (
                <span key={i} className="text-sm font-mono text-gray-800 px-0.5">
                  {token.value}
                </span>
              );
            }
            const currentSepIndex = sepIndex++;
            const isPlus = token.value === '+';
            return (
              <button
                key={i}
                onClick={() => onToggleSep(word.id, currentSepIndex)}
                disabled={isSaving}
                className={`w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-all select-none ${
                  isPlus
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                }`}
                title={isPlus ? 'Klik om - te maken' : 'Klik om + te maken'}
              >
                {token.value}
              </button>
            );
          })}
        </div>
      )}

      {isEditing ? (
        <input
          type="text"
          value={word.derivedKlankgroepen}
          onChange={e => onChangeKlankgroepen(word.id, e.target.value)}
          disabled={isSaving}
          className="w-full px-2 py-1.5 text-sm font-mono border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          placeholder="klankgroepen"
        />
      ) : (
        <div className="text-sm font-mono text-emerald-700 font-medium">
          {word.derivedKlankgroepen || <span className="text-gray-300 italic text-xs">—</span>}
        </div>
      )}

      <div className="text-center">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-sm font-bold border border-blue-200">
          {word.derivedAantal}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onSave(word)}
          disabled={isSaving}
          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          title="Opslaan"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => onToggleEdit(word.id)}
          disabled={isSaving}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
            isEditing
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
          title={isEditing ? 'Terug naar tokenweergave' : 'Handmatig bewerken'}
        >
          {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onSkip(word.id)}
          disabled={isSaving}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Sla over"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
