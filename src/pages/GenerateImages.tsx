import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Image as ImageIcon, Sparkles, Check, X, Search, Loader2, AlertCircle, Download, RefreshCw } from 'lucide-react';

interface Word {
  id: number;
  word: string;
  frequency: number | null;
}

type ImageStyle = 'icon' | 'illustration' | 'photo';
type GenerationState = 'idle' | 'loading' | 'preview' | 'error' | 'approved';

interface WordState {
  status: GenerationState;
  imageUrl?: string;
  errorMessage?: string;
  style?: ImageStyle;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const PAGE_SIZE = 50;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const STYLE_BUTTONS: { style: ImageStyle; label: string; color: string }[] = [
  { style: 'icon', label: 'Icoon', color: 'bg-amber-500 hover:bg-amber-600' },
  { style: 'illustration', label: 'Illustratie', color: 'bg-blue-600 hover:bg-blue-700' },
  { style: 'photo', label: 'Foto', color: 'bg-teal-600 hover:bg-teal-700' },
];

export default function GenerateImages() {
  const [words, setWords] = useState<Word[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [wordStates, setWordStates] = useState<Record<number, WordState>>({});
  const [notification, setNotification] = useState<Notification | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchWords();
  }, [currentPage, search]);

  const fetchWords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('wordfrequency')
        .select('id, word, frequency', { count: 'exact' })
        .or('image.is.null,image.eq.')
        .or('image_file.is.null,image_file.eq.')
        .order('frequency', { ascending: false, nullsFirst: false });

      if (search.trim()) {
        query = query.ilike('word', `%${search.trim()}%`);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const filtered = (data || []).filter(
        (w: any) => (!w.image || w.image === '') && (!w.image_file || w.image_file === '')
      );

      setWords(filtered);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching words:', err);
      showNotification('error', 'Fout bij ophalen van woorden');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const setWordState = (id: number, state: Partial<WordState>) => {
    setWordStates((prev) => ({ ...prev, [id]: { ...prev[id], ...state } }));
  };

  const handleGenerate = async (word: Word, style: ImageStyle) => {
    setWordState(word.id, { status: 'loading', imageUrl: undefined, errorMessage: undefined, style });

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-word-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word.word, style }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Generatie mislukt');
      }

      setWordState(word.id, { status: 'preview', imageUrl: data.url, style });
    } catch (err: any) {
      console.error('Error generating image:', err);
      setWordState(word.id, { status: 'error', errorMessage: err.message || 'Onbekende fout', style });
    }
  };

  const downloadAs100x100Png = (imageUrl: string, word: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return reject(new Error('Canvas not available'));
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        ctx.clearRect(0, 0, 100, 100);
        ctx.drawImage(img, 0, 0, 100, 100);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Failed to create PNG blob'));
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${word}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  const handleApprove = async (word: Word) => {
    const state = wordStates[word.id];
    if (!state?.imageUrl) return;

    try {
      await downloadAs100x100Png(state.imageUrl, word.word);

      const filename = `${word.word}.png`;
      const { error } = await supabase
        .from('wordfrequency')
        .update({ image_file: filename, image: '2' })
        .eq('id', word.id);

      if (error) throw error;

      setWordState(word.id, { status: 'approved' });
      showNotification('success', `"${word.word}.png" gedownload en goedgekeurd`);

      setTimeout(() => {
        setWords((prev) => prev.filter((w) => w.id !== word.id));
        setTotalCount((prev) => prev - 1);
        setWordStates((prev) => {
          const next = { ...prev };
          delete next[word.id];
          return next;
        });
      }, 1200);
    } catch (err: any) {
      console.error('Error approving image:', err);
      showNotification('error', `Fout bij goedkeuren: ${err.message}`);
    }
  };

  const handleReject = (word: Word) => {
    setWordState(word.id, { status: 'idle', imageUrl: undefined, errorMessage: undefined, style: undefined });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Genereer Afbeeldingen</h1>
          <p className="text-gray-600 mt-1">
            Genereer AI-afbeeldingen voor woorden zonder afbeelding via DALL-E
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-center">
          <p className="text-3xl font-bold text-blue-700">{totalCount.toLocaleString('nl-NL')}</p>
          <p className="text-xs text-blue-600 mt-0.5">woorden zonder afbeelding</p>
        </div>
      </div>

      {notification && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {notification.message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek op woord..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : words.length === 0 ? (
          <div className="py-16 text-center">
            <ImageIcon className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Geen woorden gevonden</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {words.map((word) => {
              const state = wordStates[word.id] || { status: 'idle' };
              return (
                <div
                  key={word.id}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                    state.status === 'approved' ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-base">{word.word}</p>
                    {word.frequency != null && (
                      <p className="text-xs text-gray-400 mt-0.5">frequentie: {word.frequency.toLocaleString('nl-NL')}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 w-[100px] h-[100px] flex items-center justify-center">
                    {state.status === 'preview' && state.imageUrl ? (
                      <img
                        src={state.imageUrl}
                        alt={word.word}
                        className="w-[100px] h-[100px] object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                    ) : state.status === 'loading' ? (
                      <div className="w-[100px] h-[100px] rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 flex flex-col items-center justify-center gap-1">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        <span className="text-xs text-blue-500">Genereert...</span>
                      </div>
                    ) : state.status === 'approved' ? (
                      <div className="w-[100px] h-[100px] rounded-lg bg-green-100 flex flex-col items-center justify-center gap-1">
                        <Check className="w-6 h-6 text-green-600" />
                        <span className="text-xs text-green-700 font-medium">Goedgekeurd</span>
                      </div>
                    ) : state.status === 'error' ? (
                      <div className="w-[100px] h-[100px] rounded-lg border-2 border-dashed border-red-200 bg-red-50 flex flex-col items-center justify-center gap-1 px-2 text-center">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <span className="text-xs text-red-500 leading-tight">{state.errorMessage || 'Fout'}</span>
                      </div>
                    ) : (
                      <div className="w-[100px] h-[100px] rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    {state.status === 'preview' ? (
                      <>
                        <button
                          onClick={() => handleApprove(word)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                          title="Goedkeuren en downloaden"
                        >
                          <Download className="w-4 h-4" />
                          Goedkeuren
                        </button>
                        <button
                          onClick={() => handleReject(word)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                          title="Afwijzen"
                        >
                          <X className="w-4 h-4" />
                          Afwijzen
                        </button>
                      </>
                    ) : state.status === 'error' ? (
                      <div className="flex flex-col gap-1.5">
                        {STYLE_BUTTONS.map(({ style, label, color }) => (
                          <button
                            key={style}
                            onClick={() => handleGenerate(word, style)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 ${color} text-white text-xs font-medium rounded-lg transition-colors`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : state.status === 'loading' || state.status === 'approved' ? null : (
                      <div className="flex flex-col gap-1.5">
                        {STYLE_BUTTONS.map(({ style, label, color }) => (
                          <button
                            key={style}
                            onClick={() => handleGenerate(word, style)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 ${color} text-white text-xs font-medium rounded-lg transition-colors`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString('nl-NL')}–
              {Math.min(currentPage * PAGE_SIZE, totalCount).toLocaleString('nl-NL')} van{' '}
              {totalCount.toLocaleString('nl-NL')} woorden
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Vorige
              </button>
              <span className="text-sm text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Volgende
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
