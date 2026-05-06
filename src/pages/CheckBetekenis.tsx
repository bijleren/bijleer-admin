import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, Wrench, SkipForward, RefreshCw } from 'lucide-react';

interface Word {
  id: number;
  word: string;
  betekenis: string | null;
  aantal_karakters: number;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

type WordOrder = 'random' | 'shortest';

export default function CheckBetekenis() {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [betekenisInput, setBetekenisInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [stats, setStats] = useState({ total: 0, checked: 0, unchecked: 0 });
  const [wordOrder, setWordOrder] = useState<WordOrder>('random');

  const fetchStats = async () => {
    try {
      const { count: totalCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('language', 'nl');

      const { count: checkedCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('language', 'nl')
        .not('betekenis_check', 'is', null)
        .neq('betekenis_check', 0);

      const { count: uncheckedCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('language', 'nl')
        .or('betekenis_check.is.null,betekenis_check.eq.0');

      setStats({
        total: totalCount || 0,
        checked: checkedCount || 0,
        unchecked: uncheckedCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRandomWord = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('wordfrequency')
        .select('id, word, betekenis, aantal_karakters')
        .eq('language', 'nl')
        .or('betekenis_check.is.null,betekenis_check.eq.0');

      if (wordOrder === 'shortest') {
        query = query.order('aantal_karakters', { ascending: true }).limit(100);
      } else {
        query = query.order('id', { ascending: true }).limit(100);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        const word = data[randomIndex];
        setCurrentWord(word);
        setBetekenisInput(word.betekenis || '');
      } else {
        setCurrentWord(null);
        setBetekenisInput('');
        showNotification('success', 'Alle woorden zijn gecontroleerd!');
      }
    } catch (error) {
      console.error('Error fetching word:', error);
      showNotification('error', 'Fout bij ophalen woord');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (checkValue: number) => {
    if (!currentWord || submitting) return;

    const betekenis = betekenisInput.trim();

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          betekenis: betekenis || null,
          betekenis_check: checkValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentWord.id);

      if (error) throw error;

      const statusLabel = checkValue === 1 ? 'OK' : checkValue === 2 ? 'Improve' : 'Not OK';
      showNotification('success', `Betekenis voor "${currentWord.word}" opgeslagen als ${statusLabel}`);
      await fetchStats();
      await fetchRandomWord();
    } catch (error) {
      console.error('Error saving word:', error);
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
    fetchRandomWord();
  }, [wordOrder]);

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : currentWord ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 space-y-6 relative">
          <button
            onClick={fetchRandomWord}
            disabled={loading || submitting}
            className="absolute top-4 right-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Ververs"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-2 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Woord #{currentWord.id}</p>
            </div>
            <h2 className="text-5xl font-bold text-blue-600">{currentWord.word}</h2>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-gray-700 font-medium">Betekenis</span>
              <textarea
                value={betekenisInput}
                onChange={(e) => setBetekenisInput(e.target.value)}
                className="mt-1 block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                placeholder="Voer betekenis in"
                rows={4}
                disabled={submitting}
                autoFocus
              />
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handleSave(1)}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5" />
              OK
            </button>
            <button
              onClick={() => handleSave(2)}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wrench className="w-5 h-5" />
              Improve
            </button>
            <button
              onClick={() => handleSave(0)}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
              Not OK
            </button>
            <button
              onClick={handleSkip}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <SkipForward className="w-5 h-5" />
              Skip
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Woordvolgorde</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="wordOrder"
                  value="random"
                  checked={wordOrder === 'random'}
                  onChange={(e) => setWordOrder(e.target.value as WordOrder)}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="text-gray-700">Willekeurig</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="wordOrder"
                  value="shortest"
                  checked={wordOrder === 'shortest'}
                  onChange={(e) => setWordOrder(e.target.value as WordOrder)}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="text-gray-700">Kortste eerst</span>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Alles is gecontroleerd!</h2>
          <p className="text-gray-600">Er zijn geen woorden meer die gecontroleerd moeten worden.</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Instructies</h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>Deze tool helpt je om betekenissen van woorden te controleren en te verbeteren.</p>

          <h4 className="font-bold mt-4 mb-2">Acties:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>OK:</strong> De betekenis is correct en compleet</li>
            <li><strong>Improve:</strong> De betekenis kan verbeterd worden maar is bruikbaar</li>
            <li><strong>Not OK:</strong> De betekenis is incorrect of moet volledig herzien worden</li>
            <li><strong>Skip:</strong> Sla dit woord over en ga naar het volgende</li>
          </ul>

          <h4 className="font-bold mt-4 mb-2">Tips:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Houd betekenissen kort en duidelijk</li>
            <li>Gebruik eenvoudige taal die leerlingen begrijpen</li>
            <li>Vermijd cirkelredeneringen in de definitie</li>
            <li>Geef indien nodig een voorbeeld in de context</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
