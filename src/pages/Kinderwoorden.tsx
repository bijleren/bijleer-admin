import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Baby } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WordRow {
  id: number;
  word: string;
  aantal_karakters: number;
  image: string | null;
  image_file: string | null;
}

const IMAGE_BASE = 'https://www.instructielezen.be/img';

function resolveImageUrl(row: WordRow): string | null {
  if (row.image && row.image.trim() !== '') return row.image.trim();
  if (row.image_file && row.image_file.trim() !== '') {
    const f = row.image_file.trim();
    return f.startsWith('http') ? f : `${IMAGE_BASE}/${f}`;
  }
  return `${IMAGE_BASE}/${row.word}.jpg`;
}

export default function Kinderwoorden() {
  const [queue, setQueue] = useState<WordRow[]>([]);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('wordfrequency')
      .select('id, word, aantal_karakters, image, image_file')
      .eq('language', 'nl')
      .eq('forbidden', 0)
      .eq('first_words', 0)
      .lt('aantal_karakters', 6)
      .order('aantal_karakters', { ascending: true })
      .order('word', { ascending: true });

    if (!error && data) {
      setQueue(data);
      setTotal(data.length);
      setIndex(0);
      setDone(data.length === 0);
    }
    setLoading(false);
  }

  const advance = useCallback(() => {
    setIndex(prev => {
      const next = prev + 1;
      if (next >= queue.length) {
        setDone(true);
      }
      return next;
    });
    setImgError(false);
  }, [queue.length]);

  const answer = useCallback(async (value: 1 | 2) => {
    const row = queue[index];
    if (!row) return;
    advance();
    await supabase
      .from('wordfrequency')
      .update({ first_words: value })
      .eq('id', row.id);
  }, [queue, index, advance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || loading || index >= queue.length) return;
      if (e.key === 'y' || e.key === 'Y') answer(1);
      if (e.key === 'n' || e.key === 'N') answer(2);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, loading, index, queue.length, answer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Klaar!</h2>
          <p className="text-gray-500 mt-1">Alle woorden zijn beoordeeld.</p>
        </div>
        <button
          onClick={load}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Opnieuw laden
        </button>
      </div>
    );
  }

  const current = queue[index];
  const remaining = queue.length - index;
  const imageUrl = current ? resolveImageUrl(current) : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Baby className="w-5 h-5 text-blue-600" />
        <h1 className="text-base font-semibold text-gray-900">Kinderwoorden</h1>
        <span className="ml-auto text-sm font-medium text-gray-400">
          {remaining} {remaining === 1 ? 'woord' : 'woorden'} resterend
        </span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Image area */}
        <div className="bg-gray-50 flex items-center justify-center" style={{ minHeight: 280 }}>
          {imageUrl && !imgError ? (
            <img
              key={current.id}
              src={imageUrl}
              alt={current.word}
              onError={() => setImgError(true)}
              className="max-w-full object-contain"
              style={{ maxHeight: 280 }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-300">
              <Baby className="w-16 h-16" />
              <span className="text-xs">geen afbeelding</span>
            </div>
          )}
        </div>

        {/* Word */}
        <div className="px-6 py-6 text-center">
          <span className="text-4xl font-bold tracking-tight text-gray-900">
            {current.word}
          </span>
          <p className="text-xs text-gray-400 mt-2">{current.aantal_karakters} letters</p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
          <button
            onClick={() => answer(2)}
            className="flex items-center justify-center gap-2 py-5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <XCircle className="w-5 h-5" />
            Nee
            <kbd className="ml-1 text-xs font-mono text-red-300 border border-red-200 rounded px-1 py-0.5">N</kbd>
          </button>
          <button
            onClick={() => answer(1)}
            className="flex items-center justify-center gap-2 py-5 text-sm font-semibold text-green-600 hover:bg-green-50 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            Ja
            <kbd className="ml-1 text-xs font-mono text-green-300 border border-green-200 rounded px-1 py-0.5">Y</kbd>
          </button>
        </div>
      </div>

      {/* Progress dots — just a thin bar */}
      <div className="mt-5 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${((total - remaining) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
