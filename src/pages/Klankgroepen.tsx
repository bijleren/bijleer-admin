import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Check, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface Word {
  id: number;
  word: string;
  klankteken: string | null;
  klankgroepenklanken: string | null;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

type SortOption = 'most_recent' | 'shortest' | 'longest' | 'random';

const BATCH_SIZE = 100;

export default function Klankgroepen() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [stats, setStats] = useState({ total: 0, checked: 0, unchecked: 0 });
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('most_recent');

  const fetchStats = async () => {
    try {
      const { count: totalCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true });

      const { count: checkedCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('klankgroup_checked', 1);

      const { count: uncheckedCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('klankgroup_checked', 0);

      setStats({
        total: totalCount || 0,
        checked: checkedCount || 0,
        unchecked: uncheckedCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchWords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('wordfrequency')
        .select('id, word, klankteken, klankgroepenklanken')
        .eq('klankgroup_checked', 0);

      if (sortOption === 'most_recent') {
        query = query.order('id', { ascending: false });
      } else if (sortOption === 'shortest') {
        query = query.order('word', { ascending: true });
      } else if (sortOption === 'longest') {
        query = query.order('word', { ascending: false });
      } else if (sortOption === 'random') {
        const { count } = await supabase
          .from('wordfrequency')
          .select('*', { count: 'exact', head: true })
          .eq('klankgroup_checked', 0);

        if (count && count > 0) {
          const randomOffset = Math.floor(Math.random() * Math.max(0, count - BATCH_SIZE));
          query = query.range(randomOffset, randomOffset + BATCH_SIZE - 1);

          const { data, error } = await query;
          if (error) throw error;
          setWords(data || []);
          setLoading(false);
          return;
        }
      }

      query = query.range(currentPage * BATCH_SIZE, (currentPage + 1) * BATCH_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;

      let processedData = data || [];

      if (sortOption === 'shortest') {
        processedData = processedData.sort((a, b) => a.word.length - b.word.length);
      } else if (sortOption === 'longest') {
        processedData = processedData.sort((a, b) => b.word.length - a.word.length);
      }

      setWords(processedData);
    } catch (error) {
      console.error('Error fetching words:', error);
      showNotification('error', 'Fout bij ophalen woorden');
    } finally {
      setLoading(false);
    }
  };

  const applyKlankgroepenRules = (klankteken: string): string => {
    if (!klankteken) return klankteken;

    let result = klankteken;
    const parts = klankteken.split('-');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const nextPart = i < parts.length - 1 ? parts[i + 1] : null;

      if (part === 'g-doffe' || part === 'v-doffe-r' || part === 'b-doffe' || part === 'aa-n') {
        const pattern = new RegExp(`${part.replace(/[-]/g, '\\-')}\\-`, 'g');
        result = result.replace(pattern, `${part}+`);
      }

      if (nextPart && /^(mm|nn|ll|pp|tt|dd|kk|bb|ff|ss|gg|vv|zz|rr|cc|jj|ww|hh)/.test(nextPart)) {
        const beforeDouble = result.lastIndexOf('-' + nextPart);
        if (beforeDouble !== -1) {
          result = result.substring(0, beforeDouble) + '+' + result.substring(beforeDouble + 1);
        }
      }
    }

    if (result.endsWith('-doffe-n')) {
      const endPattern = /(.+?)\-([^-]+)\-doffe\-n$/;
      const match = result.match(endPattern);
      if (match) {
        const beforeLast = match[1];
        const lastPhoneme = match[2];
        result = result.replace(endPattern, `${beforeLast}+${lastPhoneme}-doffe-n`);
      }
    }

    return result;
  };

  const duplicateToKlankgroepen = async (wordId: number, klankteken: string | null) => {
    if (!klankteken) {
      showNotification('error', 'Geen klankteken om te dupliceren');
      return;
    }

    const klankgroepenklanken = applyKlankgroepenRules(klankteken);
    const cellKey = `${wordId}-klankgroepenklanken`;
    setSavingCells(prev => new Set(prev).add(cellKey));

    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          klankgroepenklanken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wordId);

      if (error) throw error;

      setWords(prev =>
        prev.map(w =>
          w.id === wordId ? { ...w, klankgroepenklanken } : w
        )
      );
      showNotification('success', 'Gedupliceerd naar klankgroepenklanken');
    } catch (error) {
      console.error('Error duplicating:', error);
      showNotification('error', 'Fout bij dupliceren');
    } finally {
      setSavingCells(prev => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  };

  const duplicateAllToKlankgroepen = async () => {
    const wordsWithKlankteken = words.filter(w => w.klankteken);
    if (wordsWithKlankteken.length === 0) {
      showNotification('error', 'Geen woorden met klankteken gevonden');
      return;
    }

    if (!confirm(`${wordsWithKlankteken.length} woorden dupliceren naar klankgroepenklanken?`)) {
      return;
    }

    try {
      for (const word of wordsWithKlankteken) {
        await duplicateToKlankgroepen(word.id, word.klankteken);
      }
      showNotification('success', `${wordsWithKlankteken.length} woorden gedupliceerd`);
    } catch (error) {
      console.error('Error bulk duplicating:', error);
      showNotification('error', 'Fout bij bulk dupliceren');
    }
  };

  const updateField = async (
    wordId: number,
    field: 'klankteken' | 'klankgroepenklanken',
    value: string
  ) => {
    const cellKey = `${wordId}-${field}`;
    setSavingCells(prev => new Set(prev).add(cellKey));

    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wordId);

      if (error) throw error;

      setWords(prev =>
        prev.map(w =>
          w.id === wordId ? { ...w, [field]: value } : w
        )
      );
    } catch (error) {
      console.error('Error updating field:', error);
      showNotification('error', 'Fout bij opslaan');
    } finally {
      setSavingCells(prev => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  };

  const markAsChecked = async (wordId: number) => {
    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          klankgroup_checked: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wordId);

      if (error) throw error;

      setWords(prev => prev.filter(w => w.id !== wordId));
      await fetchStats();
      showNotification('success', 'Gemarkeerd als gecontroleerd');
    } catch (error) {
      console.error('Error marking as checked:', error);
      showNotification('error', 'Fout bij markeren');
    }
  };

  const markAllAsChecked = async () => {
    if (words.length === 0) return;

    if (!confirm(`Alle ${words.length} woorden markeren als gecontroleerd?`)) {
      return;
    }

    try {
      const wordIds = words.map(w => w.id);
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          klankgroup_checked: 1,
          updated_at: new Date().toISOString(),
        })
        .in('id', wordIds);

      if (error) throw error;

      setWords([]);
      await fetchStats();
      showNotification('success', `${wordIds.length} woorden gemarkeerd als gecontroleerd`);
    } catch (error) {
      console.error('Error marking all as checked:', error);
      showNotification('error', 'Fout bij markeren');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInputChange = (
    wordId: number,
    field: 'klankteken' | 'klankgroepenklanken',
    currentValue: string | null,
    newValue: string
  ) => {
    if (currentValue !== newValue) {
      updateField(wordId, field, newValue);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchWords();
  }, [currentPage, sortOption]);

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
          className={`p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Klankgroepen</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="most_recent">Meest recent</option>
              <option value="shortest">Kortste woorden</option>
              <option value="longest">Langste woorden</option>
              <option value="random">Willekeurige woorden</option>
            </select>
          </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Totaal woorden</p>
          <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Gecontroleerd</p>
          <p className="text-3xl font-bold text-green-900">{stats.checked}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Nog te controleren</p>
          <p className="text-3xl font-bold text-orange-900">{stats.unchecked}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={duplicateAllToKlankgroepen}
          disabled={loading || words.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Dupliceer alle klanktekens naar klankgroepenklanken
        </button>
        <button
          onClick={markAllAsChecked}
          disabled={loading || words.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Markeer alle als gecontroleerd
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : words.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Alles is nagekeken!</h2>
          <p className="text-gray-600">Er zijn geen woorden meer die gecontroleerd moeten worden.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-48">
                      Woord
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Klankteken
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Klankgroepenklanken
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {words.map((word) => (
                    <tr key={word.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {word.word}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={word.klankteken || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setWords(prev =>
                              prev.map(w =>
                                w.id === word.id ? { ...w, klankteken: newValue } : w
                              )
                            );
                          }}
                          onBlur={(e) => handleInputChange(word.id, 'klankteken', word.klankteken, e.target.value)}
                          disabled={savingCells.has(`${word.id}-klankteken`)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                          placeholder="Klankteken"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={word.klankgroepenklanken || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setWords(prev =>
                              prev.map(w =>
                                w.id === word.id ? { ...w, klankgroepenklanken: newValue } : w
                              )
                            );
                          }}
                          onBlur={(e) => handleInputChange(word.id, 'klankgroepenklanken', word.klankgroepenklanken, e.target.value)}
                          disabled={savingCells.has(`${word.id}-klankgroepenklanken`)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                          placeholder="Klankgroepenklanken"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => duplicateToKlankgroepen(word.id, word.klankteken)}
                            disabled={!word.klankteken || savingCells.has(`${word.id}-klankgroepenklanken`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Dupliceer klankteken"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => markAsChecked(word.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Markeer als gecontroleerd"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {words.length} woorden geladen (Pagina {currentPage + 1})
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={!canGoPrev}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Vorige
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!canGoNext}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Volgende
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Instructies</h3>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-2">
          <p>Deze pagina helpt je om klankgroepenklanken te beheren voor woorden.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Selecteer een sorteeroptie om woorden te filteren: meest recent, kortste, langste of willekeurig</li>
            <li>Alle velden zijn direct bewerkbaar - klik en typ direct</li>
            <li>Wijzigingen worden automatisch opgeslagen bij het verlaten van een veld</li>
            <li>Gebruik het dupliceer icoon om klankteken naar klankgroepenklanken te kopiëren</li>
            <li>Gebruik "Dupliceer alle klanktekens" om alle woorden op deze pagina te kopiëren</li>
            <li>Markeer woorden als gecontroleerd wanneer klaar</li>
            <li>Gebruik "Markeer alle als gecontroleerd" om alle woorden op deze pagina te markeren</li>
            <li>De pagina toont 100 woorden tegelijk</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
