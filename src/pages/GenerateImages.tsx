import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Image, RefreshCw, Check, SkipForward, ChevronLeft, ChevronRight, Filter, ExternalLink } from 'lucide-react';

interface Word {
  id: number;
  word: string;
  klankteken: string | null;
  frequency: number;
  image: string | null;
  image_file: string | null;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

type SortOption = 'shortest' | 'longest' | 'frequency-high' | 'frequency-low';

const BATCH_SIZE = 100;
const BASE_IMG_URL = 'https://www.instructielezen.be/img';

export default function GenerateImages() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<Notification | null>(null);
  const [stats, setStats] = useState({ total: 0, withImage: 0, withoutImage: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('shortest');
  const [imageStatuses, setImageStatuses] = useState<Map<number, 'loading' | 'found' | 'missing'>>(new Map());

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const [{ count: total }, { count: withImage }] = await Promise.all([
        supabase.from('wordfrequency').select('*', { count: 'exact', head: true }),
        supabase
          .from('wordfrequency')
          .select('*', { count: 'exact', head: true })
          .not('image_file', 'is', null)
          .neq('image_file', ''),
      ]);
      setStats({
        total: total || 0,
        withImage: withImage || 0,
        withoutImage: (total || 0) - (withImage || 0),
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    setImageStatuses(new Map());
    try {
      let query = supabase
        .from('wordfrequency')
        .select('id, word, klankteken, frequency, image, image_file')
        .or('image_file.is.null,image_file.eq.');

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
      checkImagesBatch(sorted);
    } catch (err) {
      console.error('Error fetching words:', err);
      showNotification('error', 'Fout bij ophalen woorden');
    } finally {
      setLoading(false);
    }
  }, [sortOption, currentPage]);

  const checkImagesBatch = async (wordList: Word[]) => {
    const initial = new Map<number, 'loading' | 'found' | 'missing'>();
    wordList.forEach(w => initial.set(w.id, 'loading'));
    setImageStatuses(new Map(initial));

    await Promise.all(
      wordList.map(async w => {
        const found = await checkImageExists(w.word);
        setImageStatuses(prev => new Map(prev).set(w.id, found ? 'found' : 'missing'));
      })
    );
  };

  const checkImageExists = async (word: string): Promise<string | null> => {
    for (const ext of ['jpg', 'png']) {
      try {
        const url = `${BASE_IMG_URL}/${word}.${ext}`;
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) return url;
      } catch {
        continue;
      }
    }
    return null;
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const confirmImage = async (word: Word) => {
    setSaving(prev => new Set(prev).add(word.id));
    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({ image: '2', image_file: `${word.word}.png`, updated_at: new Date().toISOString() })
        .eq('id', word.id);

      if (error) throw error;

      setWords(prev => prev.filter(w => w.id !== word.id));
      await fetchStats();
      showNotification('success', `Afbeelding bevestigd voor "${word.word}"`);
    } catch (err) {
      console.error('Error confirming image:', err);
      showNotification('error', 'Fout bij opslaan');
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(word.id); return n; });
    }
  };

  const markNoImage = async (word: Word) => {
    setSaving(prev => new Set(prev).add(word.id));
    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({ image: '1', updated_at: new Date().toISOString() })
        .eq('id', word.id);

      if (error) throw error;

      setWords(prev => prev.filter(w => w.id !== word.id));
      await fetchStats();
      showNotification('success', `"${word.word}" gemarkeerd als geen afbeelding`);
    } catch (err) {
      console.error('Error marking no image:', err);
      showNotification('error', 'Fout bij opslaan');
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(word.id); return n; });
    }
  };

  const skipWord = (wordId: number) => {
    setWords(prev => prev.filter(w => w.id !== wordId));
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
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Genereer Afbeeldingen</h1>
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
              <option value="frequency-high">Hoogste frequentie</option>
              <option value="frequency-low">Laagste frequentie</option>
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

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Totaal</p>
          <p className="text-3xl font-bold text-blue-900">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">Met afbeelding</p>
          <p className="text-3xl font-bold text-green-900">{stats.withImage.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Zonder afbeelding</p>
          <p className="text-3xl font-bold text-amber-900">{stats.withoutImage.toLocaleString()}</p>
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
          <p className="text-gray-500">Alle woorden hebben een afbeelding of zijn gemarkeerd.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 grid grid-cols-[180px_80px_80px_120px_1fr_160px] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div>Woord</div>
              <div>Freq.</div>
              <div>Status</div>
              <div>Preview</div>
              <div>Afbeelding URL</div>
              <div>Acties</div>
            </div>

            <div className="divide-y divide-gray-100">
              {words.map(word => {
                const status = imageStatuses.get(word.id) || 'loading';
                const imgUrl = status === 'found'
                  ? `${BASE_IMG_URL}/${word.word}.jpg`
                  : null;

                return (
                  <div
                    key={word.id}
                    className="px-5 py-3 grid grid-cols-[180px_80px_80px_120px_1fr_160px] gap-4 items-center hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{word.word}</p>
                      {word.klankteken && (
                        <p className="text-xs text-gray-400 font-mono">{word.klankteken}</p>
                      )}
                    </div>

                    <div className="text-sm text-gray-600">{word.frequency}</div>

                    <div>
                      {status === 'loading' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
                          ...
                        </span>
                      ) : status === 'found' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                          Gevonden
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">
                          Niet gevonden
                        </span>
                      )}
                    </div>

                    <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {status === 'found' && imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={word.word}
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : status === 'loading' ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Image className="w-6 h-6 text-gray-300" />
                      )}
                    </div>

                    <div className="text-xs font-mono text-gray-500 truncate">
                      {status === 'found'
                        ? `${BASE_IMG_URL}/${word.word}.jpg`
                        : status === 'missing'
                        ? <span className="text-gray-300 italic">geen afbeelding</span>
                        : '—'}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {status === 'found' && (
                        <button
                          onClick={() => confirmImage(word)}
                          disabled={saving.has(word.id)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          title="Bevestig afbeelding"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={`${BASE_IMG_URL}/${word.word}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Open afbeelding URL"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => markNoImage(word)}
                        disabled={saving.has(word.id)}
                        className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Geen afbeelding mogelijk"
                      >
                        <Image className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => skipWord(word.id)}
                        disabled={saving.has(word.id)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Overslaan"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
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
