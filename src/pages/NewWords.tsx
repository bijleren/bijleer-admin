import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Trash2, Eye, CreditCard as Edit2, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { analyzeWord } from '../utils/klankteken';

interface NewWord {
  id: string;
  word: string;
  batch_id: string;
  status: string;
  created_at: string;
  batch_name?: string;
  klankteken?: string;
}

interface PhonemeMatch {
  title: string;
  audio: string;
}

interface ImportBatch {
  id: string;
  batch_name: string;
  total_words_in_text: number;
  filtered_out: number;
  unique_words: number;
  already_exists: number;
  previously_rejected: number;
  new_words_added: number;
  imported_at: string;
}

interface RejectedWord {
  id: string;
  word: string;
  rejected_by: string;
  rejected_at: string;
  rejection_reason?: string;
}

interface ImportStats {
  totalWords: number;
  filteredOut: number;
  uniqueWords: number;
  alreadyExists: number;
  previouslyRejected: number;
  newWords: number;
}

export default function NewWords() {
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'import' | 'history' | 'rejected'>('pending');
  const [pendingWords, setPendingWords] = useState<NewWord[]>([]);
  const [reviewedWords, setReviewedWords] = useState<NewWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [importText, setImportText] = useState('');
  const [batchName, setBatchName] = useState('');
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportBatch[]>([]);
  const [rejectedWords, setRejectedWords] = useState<RejectedWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKlankteken, setEditingKlankteken] = useState<{ [key: string]: string }>({});
  const [phonemeMatches, setPhonemeMatches] = useState<{ [key: string]: PhonemeMatch[] }>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingWords();
    } else if (activeTab === 'reviewed') {
      loadReviewedWords();
    } else if (activeTab === 'history') {
      loadImportHistory();
    } else if (activeTab === 'rejected') {
      loadRejectedWords();
    }
  }, [activeTab]);

  const loadPendingWords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('new_words')
      .select(`
        *,
        import_batches(batch_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading pending words:', error);
    } else {
      const words = data.map(item => ({
        ...item,
        batch_name: item.import_batches?.batch_name
      }));
      setPendingWords(words);
      await loadPhonemeMatches(words);
    }
    setLoading(false);
  };

  const loadReviewedWords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('new_words')
      .select(`
        *,
        import_batches(batch_name)
      `)
      .eq('status', 'reviewed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reviewed words:', error);
    } else {
      const words = data.map(item => ({
        ...item,
        batch_name: item.import_batches?.batch_name
      }));
      setReviewedWords(words);
      await loadPhonemeMatches(words);
    }
    setLoading(false);
  };

  const loadImportHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('import_batches')
      .select('*')
      .order('imported_at', { ascending: false });

    if (error) {
      console.error('Error loading import history:', error);
    } else {
      setImportHistory(data || []);
    }
    setLoading(false);
  };

  const loadRejectedWords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rejected_words')
      .select('*')
      .order('rejected_at', { ascending: false });

    if (error) {
      console.error('Error loading rejected words:', error);
    } else {
      setRejectedWords(data || []);
    }
    setLoading(false);
  };

  const loadPhonemeMatches = async (words: NewWord[]) => {
    const matches: { [key: string]: PhonemeMatch[] } = {};

    const allPhonemes = new Set<string>();
    words.forEach(word => {
      if (word.klankteken) {
        word.klankteken.split('-').filter(p => p.trim()).forEach(p => allPhonemes.add(p));
      }
    });

    if (allPhonemes.size === 0) {
      setPhonemeMatches({});
      return;
    }

    const { data: phonemeData } = await supabase
      .from('klankteken')
      .select('title, audio')
      .in('title', Array.from(allPhonemes));

    if (!phonemeData) {
      setPhonemeMatches({});
      return;
    }

    const phonemeMap = new Map(phonemeData.map(p => [p.title, p]));

    for (const word of words) {
      if (word.klankteken) {
        const phonemes = word.klankteken.split('-').filter(p => p.trim());
        const foundPhonemes: PhonemeMatch[] = [];

        for (const phoneme of phonemes) {
          const data = phonemeMap.get(phoneme);
          if (data) {
            foundPhonemes.push(data);
          }
        }

        if (foundPhonemes.length > 0) {
          matches[word.id] = foundPhonemes;
        }
      }
    }

    setPhonemeMatches(matches);
  };

  const playAudio = (audioPath: string) => {
    if (playingAudio === audioPath) {
      setPlayingAudio(null);
      return;
    }

    const audio = new Audio(audioPath);
    setPlayingAudio(audioPath);

    audio.onended = () => {
      setPlayingAudio(null);
    };

    audio.onerror = () => {
      setPlayingAudio(null);
      alert('Error playing audio file');
    };

    audio.play();
  };

  const processText = (text: string): string[] => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        if (word.length < 3) return false;
        if (/\d/.test(word)) return false;
        return true;
      });

    return [...new Set(words)];
  };

  const analyzeText = async () => {
    if (!importText.trim()) return;

    setIsAnalyzing(true);
    const totalWordsRaw = importText.split(/\s+/).filter(w => w.length > 0);
    const processedWords = processText(importText);

    const { data: existingWords } = await supabase
      .from('wordfrequency')
      .select('word')
      .in('word', processedWords);

    const { data: rejectedWordsData } = await supabase
      .from('rejected_words')
      .select('word')
      .in('word', processedWords);

    const existingSet = new Set(existingWords?.map(w => w.word) || []);
    const rejectedSet = new Set(rejectedWordsData?.map(w => w.word) || []);
    const newWords = processedWords.filter(w => !existingSet.has(w) && !rejectedSet.has(w));

    setImportStats({
      totalWords: totalWordsRaw.length,
      filteredOut: totalWordsRaw.length - processedWords.length,
      uniqueWords: processedWords.length,
      alreadyExists: existingWords?.length || 0,
      previouslyRejected: rejectedWordsData?.length || 0,
      newWords: newWords.length
    });

    setIsAnalyzing(false);
  };

  const importWords = async () => {
    if (!importText.trim() || !batchName.trim() || !importStats) return;

    setIsImporting(true);

    const processedWords = processText(importText);

    const { data: existingWords } = await supabase
      .from('wordfrequency')
      .select('word')
      .in('word', processedWords);

    const { data: rejectedWordsData } = await supabase
      .from('rejected_words')
      .select('word')
      .in('word', processedWords);

    const existingSet = new Set(existingWords?.map(w => w.word) || []);
    const rejectedSet = new Set(rejectedWordsData?.map(w => w.word) || []);
    const newWords = processedWords.filter(w => !existingSet.has(w) && !rejectedSet.has(w));

    const { data: user } = await supabase.auth.getUser();

    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        batch_name: batchName,
        imported_by: user?.user?.id,
        total_words_in_text: importStats.totalWords,
        filtered_out: importStats.filteredOut,
        unique_words: importStats.uniqueWords,
        already_exists: importStats.alreadyExists,
        previously_rejected: importStats.previouslyRejected,
        new_words_added: newWords.length
      })
      .select()
      .single();

    if (batchError || !batch) {
      console.error('Error creating batch:', batchError);
      alert('Error creating import batch');
      setIsImporting(false);
      return;
    }

    if (newWords.length > 0) {
      const wordsToInsert = newWords.map(word => ({
        word,
        batch_id: batch.id,
        status: 'pending',
        klankteken: analyzeWord(word)
      }));

      const { error: insertError } = await supabase
        .from('new_words')
        .insert(wordsToInsert);

      if (insertError) {
        console.error('Error inserting words:', insertError);
        alert('Error importing words');
        setIsImporting(false);
        return;
      }
    }

    alert(`Successfully imported ${newWords.length} new words!`);
    setImportText('');
    setBatchName('');
    setImportStats(null);
    setIsImporting(false);
    setActiveTab('pending');
  };

  const toggleWordSelection = (wordId: string) => {
    const newSelection = new Set(selectedWords);
    if (newSelection.has(wordId)) {
      newSelection.delete(wordId);
    } else {
      newSelection.add(wordId);
    }
    setSelectedWords(newSelection);
  };

  const selectAll = () => {
    const currentWords = activeTab === 'reviewed' ? reviewedWords : pendingWords;
    if (selectedWords.size === currentWords.length) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(currentWords.map(w => w.id)));
    }
  };

  const batchUpdateNewWords = async (ids: string[], payload: object): Promise<boolean> => {
    const BATCH_SIZE = 50;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const { error } = await supabase
        .from('new_words')
        .update(payload)
        .in('id', ids.slice(i, i + BATCH_SIZE));
      if (error) {
        console.error('Error updating new_words:', error);
        return false;
      }
    }
    return true;
  };

  const approveSelectedWords = async () => {
    if (selectedWords.size === 0) return;

    const { data: user } = await supabase.auth.getUser();
    const payload = {
      status: 'reviewed',
      reviewed_by: user?.user?.id,
      reviewed_at: new Date().toISOString()
    };

    const ok = await batchUpdateNewWords(Array.from(selectedWords), payload);
    if (!ok) {
      alert('Error moving words to reviewed');
      return;
    }

    alert(`Successfully moved ${selectedWords.size} words to reviewed!`);
    setSelectedWords(new Set());
    loadPendingWords();
  };

  const approveReviewedWords = async () => {
    if (selectedWords.size === 0) return;

    const wordsToApprove = reviewedWords.filter(w => selectedWords.has(w.id));

    let successCount = 0;
    let skipCount = 0;
    const successfulWordIds = new Set<string>();
    const allProcessedWordIds = new Set<string>();

    for (const word of wordsToApprove) {
      allProcessedWordIds.add(word.id);

      const { data: existing } = await supabase
        .from('wordfrequency')
        .select('word')
        .eq('word', word.word)
        .maybeSingle();

      if (existing) {
        console.log(`Word "${word.word}" already exists in vocabulary, skipping`);
        skipCount++;
        continue;
      }

      const wordData = {
        word: word.word,
        frequency: 1,
        klankteken: editingKlankteken[word.id] || word.klankteken
      };

      const { error: insertError } = await supabase
        .from('wordfrequency')
        .insert(wordData);

      if (insertError) {
        console.error('Error inserting to wordfrequency:', insertError, wordData);
        skipCount++;
      } else {
        successCount++;
        successfulWordIds.add(word.id);
      }
    }

    const { data: user } = await supabase.auth.getUser();

    if (allProcessedWordIds.size > 0) {
      const idsArray = Array.from(allProcessedWordIds);

      for (const id of idsArray) {
        const { error: updateError } = await supabase
          .from('new_words')
          .update({
            status: 'approved',
            reviewed_by: user?.user?.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error('Error updating new_word:', id, updateError);
        }
      }
    }

    if (successCount === 0) {
      alert('No new words were added. All selected words already exist in vocabulary.');
    } else if (skipCount > 0) {
      alert(`Approved ${successCount} words to vocabulary. ${skipCount} words were skipped (already exist or errors).`);
    } else {
      alert(`Successfully approved ${successCount} words to vocabulary!`);
    }

    setSelectedWords(new Set());
    await loadReviewedWords();
  };

  const rejectSelectedWords = async () => {
    if (selectedWords.size === 0) return;

    const wordsToReject = pendingWords.filter(w => selectedWords.has(w.id));
    const { data: user } = await supabase.auth.getUser();
    const BATCH_SIZE = 50;

    for (let i = 0; i < wordsToReject.length; i += BATCH_SIZE) {
      const batch = wordsToReject.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('rejected_words')
        .insert(batch.map(w => ({
          word: w.word,
          rejected_by: user?.user?.id,
          rejection_reason: 'Bulk rejection from new words review'
        })));
      if (error) {
        console.error('Error inserting to rejected_words:', error);
      }
    }

    const payload = {
      status: 'rejected',
      reviewed_by: user?.user?.id,
      reviewed_at: new Date().toISOString()
    };

    const ok = await batchUpdateNewWords(Array.from(selectedWords), payload);
    if (!ok) {
      alert('Error updating word status');
      return;
    }

    alert(`Successfully rejected ${selectedWords.size} words!`);
    setSelectedWords(new Set());
    loadPendingWords();
  };

  const deleteRejectedWord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rejected word?')) return;

    const { error } = await supabase
      .from('rejected_words')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting rejected word:', error);
      alert('Error deleting word');
      return;
    }

    loadRejectedWords();
  };

  const updateKlankteken = async (wordId: string, value: string) => {
    setEditingKlankteken(prev => ({
      ...prev,
      [wordId]: value
    }));

    const { error } = await supabase
      .from('new_words')
      .update({ klankteken: value })
      .eq('id', wordId);

    if (error) {
      console.error('Error updating klankteken:', error);
    }
  };

  const regenerateKlankteken = async (wordId: string, word: string) => {
    const newKlankteken = analyzeWord(word);

    const { error } = await supabase
      .from('new_words')
      .update({ klankteken: newKlankteken })
      .eq('id', wordId);

    if (error) {
      console.error('Error updating klankteken:', error);
      alert('Error regenerating klankteken');
      return;
    }

    if (activeTab === 'reviewed') {
      loadReviewedWords();
    } else {
      loadPendingWords();
    }
  };

  const regenerateAllKlankteken = async () => {
    const currentWords = activeTab === 'reviewed' ? reviewedWords : pendingWords;
    const wordType = activeTab === 'reviewed' ? 'reviewed' : 'pending';

    if (!confirm(`Regenerate klankteken for all ${wordType} words? This will overwrite existing values.`)) return;

    setLoading(true);

    for (const word of currentWords) {
      const newKlankteken = analyzeWord(word.word);

      await supabase
        .from('new_words')
        .update({ klankteken: newKlankteken })
        .eq('id', word.id);
    }

    setLoading(false);
    alert(`Regenerated klankteken for ${currentWords.length} words!`);

    if (activeTab === 'reviewed') {
      loadReviewedWords();
    } else {
      loadPendingWords();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">New Words Management</h1>
          <p className="mt-2 text-gray-600">Import, review, and approve new vocabulary words</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Eye className="inline-block w-5 h-5 mr-2" />
                Pending Review ({pendingWords.length})
              </button>
              <button
                onClick={() => setActiveTab('reviewed')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'reviewed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CheckCircle className="inline-block w-5 h-5 mr-2" />
                Reviewed ({reviewedWords.length})
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="inline-block w-5 h-5 mr-2" />
                Import New Words
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="inline-block w-5 h-5 mr-2" />
                Import History
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'rejected'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <XCircle className="inline-block w-5 h-5 mr-2" />
                Rejected Words
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'pending' && (
              <div>
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Words Pending Review</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedWords.size > 0 ? `${selectedWords.size} word(s) selected` : 'Select words to approve or reject'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={selectAll}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      {selectedWords.size === pendingWords.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={regenerateAllKlankteken}
                      disabled={pendingWords.length === 0}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Regenerate All Klankteken
                    </button>
                    <button
                      onClick={approveSelectedWords}
                      disabled={selectedWords.size === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Move to Reviewed ({selectedWords.size})
                    </button>
                    <button
                      onClick={rejectSelectedWords}
                      disabled={selectedWords.size === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject ({selectedWords.size})
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                  </div>
                ) : pendingWords.length === 0 ? (
                  <div className="text-center py-12">
                    <Eye className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No pending words</h3>
                    <p className="mt-1 text-sm text-gray-500">Import new words to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingWords.map(word => (
                      <div
                        key={word.id}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          selectedWords.has(word.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedWords.has(word.id)}
                                onChange={() => toggleWordSelection(word.id)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <div>
                                <div className="font-medium text-gray-900 text-lg">{word.word}</div>
                                {word.batch_name && (
                                  <div className="text-xs text-gray-500 mt-1">{word.batch_name}</div>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 ml-8">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Klankteken
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editingKlankteken[word.id] !== undefined ? editingKlankteken[word.id] : (word.klankteken || '')}
                                  onChange={(e) => updateKlankteken(word.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                                  placeholder="No klankteken"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    regenerateKlankteken(word.id, word.word);
                                  }}
                                  className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                                  title="Regenerate klankteken"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                              {phonemeMatches[word.id] && phonemeMatches[word.id].length > 0 && (
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="text-xs font-medium text-green-800 mb-2">
                                    Found Phonemes ({phonemeMatches[word.id].length})
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {phonemeMatches[word.id].map((phoneme, idx) => (
                                      <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-green-300">
                                        <span className="text-sm font-mono text-gray-900">{phoneme.title}</span>
                                        {phoneme.audio && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              playAudio(phoneme.audio);
                                            }}
                                            className={`p-1 rounded hover:bg-green-100 ${
                                              playingAudio === phoneme.audio ? 'text-green-600' : 'text-gray-600'
                                            }`}
                                            title="Play audio"
                                          >
                                            <Play className="w-3 h-3" fill={playingAudio === phoneme.audio ? 'currentColor' : 'none'} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviewed' && (
              <div>
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Reviewed Words</h2>
                    <p className="text-sm text-gray-600 mt-1">Check klankteken and approve to add to vocabulary</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={selectAll}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      {selectedWords.size === reviewedWords.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={regenerateAllKlankteken}
                      disabled={reviewedWords.length === 0}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Regenerate All Klankteken
                    </button>
                    <button
                      onClick={approveReviewedWords}
                      disabled={selectedWords.size === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve to Vocabulary ({selectedWords.size})
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                  </div>
                ) : reviewedWords.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No reviewed words yet. Review words from the pending tab first.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewedWords.map(word => (
                      <div
                        key={word.id}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          selectedWords.has(word.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedWords.has(word.id)}
                                onChange={() => toggleWordSelection(word.id)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <div>
                                <div className="font-medium text-gray-900 text-lg">{word.word}</div>
                                {word.batch_name && (
                                  <div className="text-xs text-gray-500 mt-1">{word.batch_name}</div>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 ml-8">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Klankteken
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editingKlankteken[word.id] !== undefined ? editingKlankteken[word.id] : (word.klankteken || '')}
                                  onChange={(e) => updateKlankteken(word.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                                  placeholder="No klankteken"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    regenerateKlankteken(word.id, word.word);
                                  }}
                                  className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                                  title="Regenerate klankteken"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                              {phonemeMatches[word.id] && phonemeMatches[word.id].length > 0 && (
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="text-xs font-medium text-green-800 mb-2">
                                    Found Phonemes ({phonemeMatches[word.id].length})
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {phonemeMatches[word.id].map((phoneme, idx) => (
                                      <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-green-300">
                                        <span className="text-sm font-mono text-gray-900">{phoneme.title}</span>
                                        {phoneme.audio && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              playAudio(phoneme.audio);
                                            }}
                                            className={`p-1 rounded hover:bg-green-100 ${
                                              playingAudio === phoneme.audio ? 'text-green-600' : 'text-gray-600'
                                            }`}
                                            title="Play audio"
                                          >
                                            <Play className="w-3 h-3" fill={playingAudio === phoneme.audio ? 'currentColor' : 'none'} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'import' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Import New Words</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">Import Rules:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Words must be 3+ characters</li>
                    <li>• Numbers and words with numbers excluded</li>
                    <li>• All words converted to lowercase</li>
                    <li>• Duplicates automatically removed</li>
                  </ul>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Import Name
                    </label>
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="e.g., Grade 3 Reading List"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text to Import
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Paste your text here..."
                      rows={10}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mb-6">
                  <button
                    onClick={analyzeText}
                    disabled={!importText.trim() || isAnalyzing}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Text'}
                  </button>
                  {importStats && (
                    <button
                      onClick={importWords}
                      disabled={!batchName.trim() || isImporting || importStats.newWords === 0}
                      className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isImporting ? 'Importing...' : `Import ${importStats.newWords} Words`}
                    </button>
                  )}
                </div>

                {importStats && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Analysis Results:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{importStats.totalWords}</div>
                        <div className="text-sm text-gray-600">Total words found</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{importStats.filteredOut}</div>
                        <div className="text-sm text-gray-600">Filtered out</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{importStats.uniqueWords}</div>
                        <div className="text-sm text-gray-600">Unique words</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{importStats.alreadyExists}</div>
                        <div className="text-sm text-gray-600">Already in database</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{importStats.previouslyRejected}</div>
                        <div className="text-sm text-gray-600">Previously rejected</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{importStats.newWords}</div>
                        <div className="text-sm text-gray-600">New words to import</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Import History</h2>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                  </div>
                ) : importHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No import history</h3>
                    <p className="mt-1 text-sm text-gray-500">Your import history will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {importHistory.map(batch => (
                      <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{batch.batch_name}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(batch.imported_at).toLocaleDateString()} at{' '}
                              {new Date(batch.imported_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">{batch.new_words_added}</div>
                            <div className="text-xs text-gray-500">words added</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{batch.total_words_in_text}</div>
                            <div className="text-gray-500">Total</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{batch.filtered_out}</div>
                            <div className="text-gray-500">Filtered</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{batch.unique_words}</div>
                            <div className="text-gray-500">Unique</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{batch.already_exists}</div>
                            <div className="text-gray-500">Existing</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{batch.previously_rejected}</div>
                            <div className="text-gray-500">Rejected</div>
                          </div>
                          <div>
                            <div className="font-medium text-green-600">{batch.new_words_added}</div>
                            <div className="text-gray-500">New</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rejected' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Rejected Words</h2>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                  </div>
                ) : rejectedWords.length === 0 ? (
                  <div className="text-center py-12">
                    <XCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No rejected words</h3>
                    <p className="mt-1 text-sm text-gray-500">Rejected words will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {rejectedWords.map(word => (
                      <div key={word.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{word.word}</div>
                          <div className="text-sm text-gray-500">
                            Rejected on {new Date(word.rejected_at).toLocaleDateString()}
                          </div>
                          {word.rejection_reason && (
                            <div className="text-sm text-gray-600 mt-1">{word.rejection_reason}</div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteRejectedWord(word.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
