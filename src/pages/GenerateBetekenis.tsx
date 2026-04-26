import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, RefreshCw, Check, SkipForward, ChevronLeft, ChevronRight, Filter, Pencil, X } from 'lucide-react';

interface Word {
  id: number;
  word: string;
  klankteken: string | null;
  betekenis: string | null;
  betekenis_check: number | null;
  frequency: number;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

type SortOption = 'shortest' | 'longest' | 'frequency-high' | 'frequency-low';
type BetekenisFilter = 'missing' | 'all' | 'needs-improvement';

const BATCH_SIZE = 100;

export default function GenerateBetekenis() {
  const [words, setWords] = useState<Word[]>([]);
  const [editValues, setEditValues] = useState<Map<number, string>>(new Map());
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<Notification | null>(null);
  const [stats, setStats] = useState({ total: 0, withMeaning: 0, withoutMeaning: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('shortest');
  const [filterOption, setFilterOption] = useState<BetekenisFilter>('missing');

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const [{ count: total }, { count: withMeaning }] = await Promise.all([
        supabase.from('wordfrequency').select('*', { count: 'exact', head: true }),
        supabase
          .from('wordfrequency')
          .select('*', { count: 'exact', head: true })
          .not('betekenis', 'is', null)
          .neq('betekenis', ''),
      ]);
      setStats({
        total: total || 0,
        withMeaning: withMeaning || 0,
        withoutMeaning: (total || 0) - (withMeaning || 0),
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('wordfrequency')
        .select('id, word, klankteken, betekenis, betekenis_check, frequency');

      if (filterOption === 'missing') {
        query = query.or('betekenis.is.null,betekenis.eq.');
      } else if (filterOption === 'needs-improvement') {
        query = query.eq('betekenis_check', 2);
      }

      if (sortOption === 'shortest' || sortOption === 'longest') {
        query = query.order('word', { ascending: sortOption === 'shortest' });
      } else {
        query = query.order('frequency', { ascending: sortOption === 'frequency-low' });
      }

      const { data, error } = await query.range(
        currentPage * BATCH_SIZE,
        (currentPage + 1) * BATCH_SIZE - 1
      );

      if (error) throw error;

      const sorted =
        sortOption === 'shortest' || sortOption === 'longest'
          ? (data || []).sort((a, b) =>
              sortOption === 'shortest'
                ? a.word.length - b.word.length
                : b.word.length - a.word.length
            )
          : data || [];

      setWords(sorted);

      const initialValues = new Map<number, string>();
      sorted.forEach(w => initialValues.set(w.id, w.betekenis || ''));
      setEditValues(initialValues);
      setEditingIds(new Set());
    } catch (err) {
      console.error('Error fetching words:', err);
      showNotification('error', 'Fout bij ophalen woorden');
    } finally {
      setLoading(false);
    }
  }, [sortOption, filterOption, currentPage]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const toggleEdit = (wordId: number) => {
    setEditingIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  };

  const saveWord = async (word: Word, checkValue: number) => {
    setSaving(prev => new Set(prev).add(word.id));
    try {
      const betekenis = (editValues.get(word.id) ?? word.betekenis ?? '').trim();
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          betekenis: betekenis || null,
          betekenis_check: checkValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', word.id);

      if (error) throw error;

      setWords(prev => prev.filter(w => w.id !== word.id));
      setEditingIds(prev => { const n = new Set(prev); n.delete(word.id); return n; });
      await fetchStats();
      showNotification('success', `"${word.word}" opgeslagen`);
    } catch (err) {
      console.error('Error saving word:', err);
      showNotification('error', 'Fout bij opslaan');
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(word.id); return n; });
    }
  };

  const skipWord = (wordId: number) => {
    setWords(prev => prev.filter(w => w.id !== wordId));
    setEditingIds(prev => { const n = new Set(prev); n.delete(wordId); return n; });
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    setCurrentPage(0);
  };

  const handleFilterChange = (newFilter: BetekenisFilter) => {
    setFilterOption(newFilter);
    setCurrentPage(0);
  };

  const canGoNext = words.length === BATCH_SIZE;
  const canGoPrev = currentPage > 0;

  return (
    <div className="w-full h-full p-6 space-y-6">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Betekenis Genereren</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterOption}
              onChange={e => handleFilterChange(e.target.value as BetekenisFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="missing">Ontbrekende betekenis</option>
              <option value="needs-improvement">Verbetering nodig</option>
              <option value="all">Alle woorden</option>
            </select>
          </div>
          <select
            value={sortOption}
            onChange={e => handleSortChange(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="shortest">Kortste woorden</option>
            <option value="longest">Langste woorden</option>
            <option value="frequency-high">Hoogste frequentie</option>
            <option value="frequency-low">Laagste frequentie</option>
          </select>
          <button
            onClick={fetchWords}
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
          <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">Met betekenis</p>
          <p className="text-3xl font-bold text-green-900">{stats.withMeaning.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Zonder betekenis</p>
          <p className="text-3xl font-bold text-amber-900">{stats.withoutMeaning.toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : words.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Klaar!</h2>
          <p className="text-gray-500">Geen woorden gevonden voor de geselecteerde filter.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 grid grid-cols-[200px_1fr_140px] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div>Woord</div>
              <div>Betekenis</div>
              <div>Acties</div>
            </div>

            <div className="divide-y divide-gray-100">
              {words.map(word => {
                const isEditing = editingIds.has(word.id);
                const isSaving = saving.has(word.id);
                const currentValue = editValues.get(word.id) ?? word.betekenis ?? '';

                return (
                  <div
                    key={word.id}
                    className="px-5 py-3 grid grid-cols-[200px_1fr_140px] gap-4 items-start hover:bg-gray-50 transition-colors"
                  >
                    <div className="pt-1">
                      <p className="font-semibold text-gray-900 text-sm">{word.word}</p>
                      {word.klankteken && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{word.klankteken}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">freq: {word.frequency}</p>
                      {word.betekenis_check === 2 && (
                        <span className="inline-block mt-1 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                          Verbeteren
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <textarea
                        value={currentValue}
                        onChange={e =>
                          setEditValues(prev => new Map(prev).set(word.id, e.target.value))
                        }
                        disabled={isSaving}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
                        placeholder="Voer betekenis in..."
                        autoFocus
                      />
                    ) : (
                      <div className="pt-1 text-sm text-gray-700 leading-relaxed">
                        {currentValue || (
                          <span className="text-gray-300 italic text-xs">Geen betekenis</span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        onClick={() => saveWord(word, 1)}
                        disabled={isSaving}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        title="OK — opslaan"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleEdit(word.id)}
                        disabled={isSaving}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                          isEditing
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        title={isEditing ? 'Sluiten' : 'Bewerken'}
                      >
                        {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => skipWord(word.id)}
                        disabled={isSaving}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Overslaan"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                      <BookOpen className="w-4 h-4 text-gray-200 mt-2" />
                    </div>
                  </div>
                );
              })}
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
