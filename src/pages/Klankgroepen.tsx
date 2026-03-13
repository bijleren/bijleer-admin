import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

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

const BATCH_SIZE = 100;

export default function Klankgroepen() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [stats, setStats] = useState({ total: 0, checked: 0, unchecked: 0 });
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'klankteken' | 'klankgroepenklanken' } | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);

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
      const { data, error } = await supabase
        .from('wordfrequency')
        .select('id, word, klankteken, klankgroepenklanken')
        .eq('klankgroup_checked', 0)
        .order('id', { ascending: true })
        .range(currentPage * BATCH_SIZE, (currentPage + 1) * BATCH_SIZE - 1);

      if (error) throw error;

      setWords(data || []);
    } catch (error) {
      console.error('Error fetching words:', error);
      showNotification('error', 'Fout bij ophalen woorden');
    } finally {
      setLoading(false);
    }
  };

  const duplicateToKlankgroepen = async (wordId: number, klankteken: string | null) => {
    if (!klankteken) {
      showNotification('error', 'Geen klankteken om te dupliceren');
      return;
    }

    const cellKey = `${wordId}-klankgroepenklanken`;
    setSavingCells(prev => new Set(prev).add(cellKey));

    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          klankgroepenklanken: klankteken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wordId);

      if (error) throw error;

      setWords(prev =>
        prev.map(w =>
          w.id === wordId ? { ...w, klankgroepenklanken: klankteken } : w
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

  const handleCellBlur = (
    wordId: number,
    field: 'klankteken' | 'klankgroepenklanken',
    currentValue: string | null,
    newValue: string
  ) => {
    setEditingCell(null);
    if (currentValue !== newValue) {
      updateField(wordId, field, newValue);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    wordId: number,
    field: 'klankteken' | 'klankgroepenklanken',
    currentValue: string | null
  ) => {
    if (e.key === 'Enter') {
      const newValue = e.currentTarget.value;
      setEditingCell(null);
      if (currentValue !== newValue) {
        updateField(wordId, field, newValue);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchWords();
  }, [currentPage]);

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
        <button
          onClick={fetchWords}
          disabled={loading}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Ververs"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
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
                        {editingCell?.id === word.id && editingCell?.field === 'klankteken' ? (
                          <input
                            type="text"
                            defaultValue={word.klankteken || ''}
                            autoFocus
                            onBlur={(e) => handleCellBlur(word.id, 'klankteken', word.klankteken, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, word.id, 'klankteken', word.klankteken)}
                            className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({ id: word.id, field: 'klankteken' })}
                            className={`cursor-text px-2 py-1 rounded hover:bg-gray-100 ${
                              savingCells.has(`${word.id}-klankteken`) ? 'opacity-50' : ''
                            }`}
                          >
                            <span className="text-sm text-gray-700">
                              {word.klankteken || <span className="text-gray-400 italic">Klik om te bewerken</span>}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingCell?.id === word.id && editingCell?.field === 'klankgroepenklanken' ? (
                          <input
                            type="text"
                            defaultValue={word.klankgroepenklanken || ''}
                            autoFocus
                            onBlur={(e) => handleCellBlur(word.id, 'klankgroepenklanken', word.klankgroepenklanken, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, word.id, 'klankgroepenklanken', word.klankgroepenklanken)}
                            className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({ id: word.id, field: 'klankgroepenklanken' })}
                            className={`cursor-text px-2 py-1 rounded hover:bg-gray-100 ${
                              savingCells.has(`${word.id}-klankgroepenklanken`) ? 'opacity-50' : ''
                            }`}
                          >
                            <span className="text-sm text-gray-700">
                              {word.klankgroepenklanken || <span className="text-gray-400 italic">Klik om te bewerken</span>}
                            </span>
                          </div>
                        )}
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
            <li>Klik op een cel om deze te bewerken</li>
            <li>Druk op Enter of klik buiten de cel om automatisch op te slaan</li>
            <li>Druk op Escape om de bewerking te annuleren</li>
            <li>Gebruik het dupliceer icoon om klankteken naar klankgroepenklanken te kopiëren</li>
            <li>Markeer woorden als gecontroleerd wanneer klaar</li>
            <li>De pagina toont 100 woorden tegelijk</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
