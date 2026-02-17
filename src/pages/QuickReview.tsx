import { useState, useEffect, useCallback } from 'react';
import { XCircle, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewWord {
  id: string;
  word: string;
  batch_id: string;
  status: string;
  created_at: string;
  klankteken?: string;
}

export default function QuickReview() {
  const [words, setWords] = useState<NewWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ rejected: 0 });

  useEffect(() => {
    loadWords();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (processing || words.length === 0) return;

      if (e.key === 'r' || e.key === 'R') {
        handleReject();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, words, processing]);

  const loadWords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('new_words')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error loading words:', error);
    } else {
      setWords(data || []);
    }
    setLoading(false);
  };

  const handleReject = useCallback(async () => {
    if (words.length === 0 || processing) return;

    const currentWord = words[currentIndex];
    setProcessing(true);

    const { data: user } = await supabase.auth.getUser();

    const { error: rejectError } = await supabase
      .from('rejected_words')
      .insert({
        word: currentWord.word,
        rejected_by: user?.user?.id,
        rejection_reason: 'Quick review rejection'
      });

    if (rejectError) {
      console.error('Error inserting to rejected_words:', rejectError);
    }

    const { error: updateError } = await supabase
      .from('new_words')
      .update({
        status: 'rejected',
        reviewed_by: user?.user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', currentWord.id);

    if (updateError) {
      console.error('Error updating new_words:', updateError);
    }

    setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
    moveToNext();
  }, [words, currentIndex, processing]);

  const moveToNext = () => {
    const newWords = words.filter((_, i) => i !== currentIndex);
    setWords(newWords);

    if (newWords.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= newWords.length) {
      setCurrentIndex(newWords.length - 1);
    }

    setProcessing(false);
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentWord = words[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading words...</p>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">All done!</h2>
          <p className="mt-2 text-gray-600">
            No pending words to review. {stats.rejected > 0 && `You rejected ${stats.rejected} word${stats.rejected > 1 ? 's' : ''} in this session.`}
          </p>
          {stats.rejected > 0 && (
            <div className="mt-4 flex justify-center">
              <div className="bg-red-100 px-4 py-2 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
                <div className="text-sm text-red-600">Rejected</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quick Review</h1>
              <p className="mt-2 text-gray-600">
                Word {currentIndex + 1} of {words.length} • Only reject words that don't belong
              </p>
            </div>
            {stats.rejected > 0 && (
              <div className="bg-red-100 px-4 py-2 rounded-lg">
                <div className="text-xl font-bold text-red-700">{stats.rejected}</div>
                <div className="text-xs text-red-600">Rejected</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-12 mb-8">
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-900 mb-4">
              {currentWord.word}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center mb-8 gap-8">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={handleReject}
            disabled={processing}
            className="flex items-center gap-2 px-10 py-5 text-xl font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
          >
            <XCircle className="w-7 h-7" />
            Reject (R)
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === words.length - 1}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
          <p className="text-sm text-blue-800 mb-3">
            Use arrows to browse through words. Only click Reject (R) for words that don't belong.
            Good words will stay in the list for full review in "Nieuwe Woorden".
          </p>
          <h3 className="font-medium text-blue-900 mb-2">Keyboard Shortcuts:</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <div className="flex justify-between">
              <span>Reject word (only bad words!)</span>
              <kbd className="px-2 py-1 bg-blue-100 rounded">R</kbd>
            </div>
            <div className="flex justify-between">
              <span>Navigate</span>
              <div className="space-x-2">
                <kbd className="px-2 py-1 bg-blue-100 rounded">←</kbd>
                <kbd className="px-2 py-1 bg-blue-100 rounded">→</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
