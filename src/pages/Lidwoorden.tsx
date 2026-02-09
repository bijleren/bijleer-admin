import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, SkipForward, RefreshCw } from 'lucide-react';

interface Word {
  id: number;
  word: string;
  lidwoord: string | null;
  betekenis: string | null;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const LIDWOORD_OPTIONS = [
  { value: 'de', label: 'de', color: 'bg-blue-500 hover:bg-blue-600' },
  { value: 'het', label: 'het', color: 'bg-green-500 hover:bg-green-600' },
  { value: 'geen', label: 'geen', color: 'bg-gray-500 hover:bg-gray-600' },
  { value: 'beide', label: 'beide', color: 'bg-purple-500 hover:bg-purple-600' },
  { value: 'onzeker', label: 'onzeker', color: 'bg-orange-500 hover:bg-orange-600' },
];

export default function Lidwoorden() {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [stats, setStats] = useState({ checked: 0, unchecked: 0, total: 0 });

  const fetchStats = async () => {
    try {
      const { count: totalCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true });

      const { count: checkedCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('lidwoord_check', 1);

      setStats({
        total: totalCount || 0,
        checked: checkedCount || 0,
        unchecked: (totalCount || 0) - (checkedCount || 0),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRandomWord = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wordfrequency')
        .select('id, word, lidwoord, betekenis')
        .eq('lidwoord_check', 0)
        .order('id', { ascending: true })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        setCurrentWord(data[randomIndex]);
      } else {
        setCurrentWord(null);
        showNotification('success', 'Alle woorden zijn gecontroleerd!');
      }
    } catch (error) {
      console.error('Error fetching word:', error);
      showNotification('error', 'Fout bij ophalen woord');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (lidwoord: string) => {
    if (!currentWord || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          lidwoord: lidwoord,
          lidwoord_check: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentWord.id);

      if (error) throw error;

      showNotification('success', `"${currentWord.word}" opgeslagen met lidwoord "${lidwoord}"`);
      await fetchStats();
      await fetchRandomWord();
    } catch (error) {
      console.error('Error updating word:', error);
      showNotification('error', 'Fout bij opslaan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    await fetchRandomWord();
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchStats();
    fetchRandomWord();
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (submitting || !currentWord) return;

      const key = event.key;
      const keyMap: { [key: string]: number } = {
        '1': 0, '&': 0,
        '2': 1, 'é': 1,
        '3': 2, '"': 2,
        '4': 3, "'": 3,
        '5': 4, '(': 4,
      };

      const index = keyMap[key];
      if (index !== undefined && LIDWOORD_OPTIONS[index]) {
        handleSubmit(LIDWOORD_OPTIONS[index].value);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentWord, submitting]);

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lidwoorden</h1>
          <p className="text-gray-600 mt-1">
            Controleer en voeg lidwoorden toe aan woorden
          </p>
        </div>
        <button
          onClick={fetchRandomWord}
          disabled={loading || submitting}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Ververs
        </button>
      </div>

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : currentWord ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-2 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Woord #{currentWord.id}</p>
            </div>
            <h2 className="text-5xl font-bold text-gray-900">{currentWord.word}</h2>
            {currentWord.betekenis && (
              <p className="text-lg text-gray-600 italic">{currentWord.betekenis}</p>
            )}
            {currentWord.lidwoord && (
              <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                Huidig lidwoord: {currentWord.lidwoord}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-center text-gray-700 font-medium">Selecteer het juiste lidwoord:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {LIDWOORD_OPTIONS.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => handleSubmit(option.value)}
                  disabled={submitting}
                  className={`${option.color} text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 relative`}
                >
                  <span className="absolute top-2 right-2 text-xs opacity-75">
                    {index + 1}
                  </span>
                  <Check className="w-5 h-5" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={handleSkip}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <SkipForward className="w-5 h-5" />
              Overslaan
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Alle woorden gecontroleerd!</h2>
          <p className="text-gray-600">Er zijn geen woorden meer die gecontroleerd moeten worden.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Totaal</p>
          <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Gecontroleerd</p>
          <p className="text-3xl font-bold text-green-900">{stats.checked}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Te controleren</p>
          <p className="text-3xl font-bold text-orange-900">{stats.unchecked}</p>
        </div>
      </div>
    </div>
  );
}
