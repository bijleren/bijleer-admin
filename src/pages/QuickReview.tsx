import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { analyzeWord } from '../utils/klankteken';

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
  const [stats, setStats] = useState({ approved: 0, rejected: 0 });

  useEffect(() => {
    loadWords();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (processing || words.length === 0) return;

      if (e.key === 'a' || e.key === 'A') {
        handleApprove();
      } else if (e.key === 'r' || e.key === 'R') {
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

  const handleApprove = useCallback(async () => {
    if (words.length === 0 || processing) return;

    const currentWord = words[currentIndex];
    setProcessing(true);

    const klankteken = currentWord.klankteken || analyzeWord(currentWord.word);

    const { error: insertError } = await supabase
      .from('wordfrequency')
      .insert({
        word: currentWord.word,
        frequency: 1,
        klankteken: klankteken
      });

    if (insertError) {
      console.error('Error inserting to word_frequency:', insertError);
      alert('Error approving word');
      setProcessing(false);
      return;
    }

    const { data: user } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from('new_words')
      .update({
        status: 'approved',
        reviewed_by: user?.user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', currentWord.id);

    if (updateError) {
      console.error('Error updating new_words:', updateError);
    }

    setStats(prev => ({ ...prev, approved: prev.approved + 1 }));
    moveToNext();
  }, [words, currentIndex, processing]);

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
            No pending words to review. You reviewed {stats.approved + stats.rejected} words in this session.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <div className="bg-green-100 px-4 py-2 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{stats.approved}</div>
              <div className="text-sm text-green-600">Approved</div>
            </div>
            <div className="bg-red-100 px-4 py-2 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
              <div className="text-sm text-red-600">Rejected</div>
            </div>
          </div>
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
                Word {currentIndex + 1} of {words.length}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-green-100 px-4 py-2 rounded-lg">
                <div className="text-xl font-bold text-green-700">{stats.approved}</div>
                <div className="text-xs text-green-600">Approved</div>
              </div>
              <div className="bg-red-100 px-4 py-2 rounded-lg">
                <div className="text-xl font-bold text-red-700">{stats.rejected}</div>
                <div className="text-xs text-red-600">Rejected</div>
              </div>
            </div>
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

        <div className="flex justify-between items-center mb-8">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="flex gap-4">
            <button
              onClick={handleReject}
              disabled={processing}
              className="flex items-center gap-2 px-8 py-4 text-lg font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
            >
              <XCircle className="w-6 h-6" />
              Reject (R)
            </button>
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex items-center gap-2 px-8 py-4 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
            >
              <CheckCircle className="w-6 h-6" />
              Approve (A)
            </button>
          </div>

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
          <h3 className="font-medium text-blue-900 mb-2">Keyboard Shortcuts:</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <div className="flex justify-between">
              <span>Approve word</span>
              <kbd className="px-2 py-1 bg-blue-100 rounded">A</kbd>
            </div>
            <div className="flex justify-between">
              <span>Reject word</span>
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
