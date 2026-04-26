import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Save, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface WordRow {
  id: number;
  word: string;
  klankteken: string;
  woordstructuur: string | null;
  computed: string;
  edited: string;
  dirty: boolean;
  error: string | null;
}

interface KlanktekenEntry {
  title: string;
  type: string;
}

const ITEMS_PER_PAGE = 500;

function computeStructuur(klankteken: string, lookup: Map<string, string>): { result: string; error: string | null } {
  const parts = klankteken.split('-');
  let result = '';
  for (const part of parts) {
    const type = lookup.get(part.toLowerCase());
    if (!type) {
      return { result: '', error: `Onbekend klankteken: "${part}"` };
    }
    result += type === 'vowel' ? 'k' : 'm';
  }
  return { result, error: null };
}

export default function Woordstructuur() {
  const [rows, setRows] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [klanktekenLookup, setKlanktekenLookup] = useState<Map<string, string>>(new Map());
  const [lookupReady, setLookupReady] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    loadKlanktekenTable();
  }, []);

  useEffect(() => {
    if (lookupReady) loadPage();
  }, [lookupReady, page]);

  const loadKlanktekenTable = async () => {
    try {
      const { data, error } = await supabase
        .from('klankteken')
        .select('title, type');
      if (error) throw error;

      const map = new Map<string, string>();
      (data as KlanktekenEntry[]).forEach((entry) => {
        map.set(entry.title.toLowerCase(), entry.type);
      });
      setKlanktekenLookup(map);
      setLookupReady(true);
    } catch (err) {
      console.error('Error loading klankteken table:', err);
      showNotification('error', 'Fout bij laden klankteken tabel');
    }
  };

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from('wordfrequency')
        .select('id, word, klankteken, woordstructuur', { count: 'exact' })
        .eq('klankteken_checked', 1)
        .not('klankteken', 'is', null)
        .neq('klankteken', '')
        .order('id', { ascending: true })
        .range(from, to);

      if (error) throw error;

      setTotalCount(count || 0);

      const newRows: WordRow[] = (data || []).map((item) => {
        const { result, error: compError } = computeStructuur(item.klankteken, klanktekenLookup);
        const existing = item.woordstructuur || '';
        return {
          id: item.id,
          word: item.word,
          klankteken: item.klankteken,
          woordstructuur: item.woordstructuur,
          computed: result,
          edited: existing || result,
          dirty: false,
          error: compError,
        };
      });

      setRows(newRows);
    } catch (err) {
      console.error('Error loading words:', err);
      showNotification('error', 'Fout bij laden woorden');
    } finally {
      setLoading(false);
    }
  }, [page, klanktekenLookup]);

  const handleEdit = (id: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, edited: value, dirty: r.edited !== value || (r.woordstructuur || '') !== value } : r
      )
    );
  };

  const handleSavePage = async () => {
    setSaving(true);
    try {
      const toSave = rows.filter((r) => !r.error && r.edited.trim());
      let count = 0;
      for (const row of toSave) {
        const { error } = await supabase
          .from('wordfrequency')
          .update({ woordstructuur: row.edited.trim() })
          .eq('id', row.id);
        if (!error) {
          count++;
        }
      }
      setSavedCount(count);
      showNotification('success', `${count} woorden opgeslagen`);
      setRows((prev) => prev.map((r) => ({ ...r, dirty: false, woordstructuur: r.edited })));
    } catch (err) {
      console.error('Error saving:', err);
      showNotification('error', 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyComputed = () => {
    setRows((prev) =>
      prev.map((r) =>
        r.error ? r : { ...r, edited: r.computed, dirty: r.computed !== (r.woordstructuur || '') }
      )
    );
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const dirtyCount = rows.filter((r) => r.dirty).length;
  const errorCount = rows.filter((r) => r.error).length;

  const filteredRows = searchTerm
    ? rows.filter(
        (r) =>
          r.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.klankteken.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : rows;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Woordstructuur</h1>
          <p className="text-gray-600 mt-1">
            Genereer en valideer de medeklinker/klinker structuur (mkm) per woord
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleApplyComputed}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Pas berekende toe
          </button>
          <button
            onClick={handleSavePage}
            disabled={saving || loading || dirtyCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Opslaan...' : `Sla pagina op${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Totaal woorden</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Pagina</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{page + 1} / {totalPages}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Gewijzigd</p>
          <p className={`text-2xl font-bold mt-1 ${dirtyCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{dirtyCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Fouten</p>
          <p className={`text-2xl font-bold mt-1 ${errorCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{errorCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek op woord of klankteken..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPage((p) => Math.max(0, p - 1)); setSearchTerm(''); }}
              disabled={page === 0 || loading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} van {totalCount.toLocaleString()}
            </span>
            <button
              onClick={() => { setPage((p) => Math.min(totalPages - 1, p + 1)); setSearchTerm(''); }}
              disabled={page >= totalPages - 1 || loading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Woord</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klankteken</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berekend</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Woordstructuur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 transition-colors ${row.dirty ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {page * ITEMS_PER_PAGE + rows.indexOf(row) + 1}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.word}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-600 text-xs">{row.klankteken}</td>
                    <td className="px-4 py-2.5">
                      {row.error ? (
                        <span className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {row.error}
                        </span>
                      ) : (
                        <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">{row.computed}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.edited}
                        onChange={(e) => handleEdit(row.id, e.target.value)}
                        className={`w-full px-2 py-1 border rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          row.dirty
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      {row.error ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Fout</span>
                      ) : row.dirty ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Gewijzigd</span>
                      ) : row.woordstructuur ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Opgeslagen</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Leeg</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                      Geen woorden gevonden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredRows.length !== rows.length
              ? `${filteredRows.length} van ${rows.length} getoond`
              : `${rows.length} woorden op deze pagina`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPage((p) => Math.max(0, p - 1)); setSearchTerm(''); }}
              disabled={page === 0 || loading}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Vorige
            </button>
            <button
              onClick={() => { setPage((p) => Math.min(totalPages - 1, p + 1)); setSearchTerm(''); }}
              disabled={page >= totalPages - 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Volgende
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
