import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Sparkles, Check, AlertCircle, Loader2, Search, ChevronLeft, ChevronRight, Save } from 'lucide-react';

interface Word {
  id: number;
  word: string;
  aantal_karakters: number | null;
}

interface WordDraft {
  id: number;
  word: string;
  betekenis: string;
  status: 'idle' | 'generated' | 'saving' | 'saved' | 'error';
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const BATCH_SIZE = 200;
const PAGE_SIZE = 500;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function GenerateBetekenis() {
  const [words, setWords] = useState<Word[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<number, WordDraft>>({});
  const [notification, setNotification] = useState<Notification | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    fetchWords();
  }, [currentPage, search]);

  const fetchWords = async () => {
    setLoading(true);
    setDrafts({});
    try {
      let query = supabase
        .from('wordfrequency')
        .select('id, word, aantal_karakters', { count: 'exact' })
        .or('betekenis.is.null,betekenis.eq.')
        .order('aantal_karakters', { ascending: true, nullsFirst: false })
        .order('word', { ascending: true });

      if (search.trim()) {
        query = query.ilike('word', `%${search.trim()}%`);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const filtered = (data || []).filter(
        (w: any) => !w.betekenis || w.betekenis === ''
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
    setTimeout(() => setNotification(null), 5000);
  };

  const handleGenerate = async () => {
    if (generating || words.length === 0) return;

    setGenerating(true);
    setGenerationProgress({ done: 0, total: words.length });

    // Initialise all drafts as idle with empty betekenis
    const initial: Record<number, WordDraft> = {};
    words.forEach((w) => {
      initial[w.id] = { id: w.id, word: w.word, betekenis: '', status: 'idle' };
    });
    setDrafts(initial);

    // Send in chunks of BATCH_SIZE to the edge function
    const chunks: Word[][] = [];
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      chunks.push(words.slice(i, i + BATCH_SIZE));
    }

    let doneCount = 0;

    for (const chunk of chunks) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-betekenis`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ words: chunk.map((w) => ({ id: w.id, word: w.word })) }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || 'Generatie mislukt');
        }

        const results: Record<number, string> = data.results || {};

        setDrafts((prev) => {
          const next = { ...prev };
          chunk.forEach((w) => {
            next[w.id] = {
              ...next[w.id],
              betekenis: results[w.id] || '',
              status: results[w.id] ? 'generated' : 'error',
            };
          });
          return next;
        });

        doneCount += chunk.length;
        setGenerationProgress({ done: doneCount, total: words.length });
      } catch (err: any) {
        console.error('Chunk error:', err);
        setDrafts((prev) => {
          const next = { ...prev };
          chunk.forEach((w) => {
            next[w.id] = { ...next[w.id], status: 'error' };
          });
          return next;
        });
        doneCount += chunk.length;
        setGenerationProgress({ done: doneCount, total: words.length });
      }
    }

    setGenerating(false);
    showNotification('success', `Betekenissen gegenereerd voor ${doneCount} woorden`);
  };

  const handleDraftChange = (id: number, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], betekenis: value, status: 'generated' },
    }));
  };

  const handleSaveAll = async () => {
    const toSave = Object.values(drafts).filter(
      (d) => (d.status === 'generated') && d.betekenis.trim()
    );

    if (toSave.length === 0) {
      showNotification('error', 'Geen gegenereerde betekenissen om op te slaan');
      return;
    }

    setSaving(true);

    try {
      // Update in batches of 50
      const batchSize = 50;
      for (let i = 0; i < toSave.length; i += batchSize) {
        const batch = toSave.slice(i, i + batchSize);
        const updates = batch.map((d) =>
          supabase
            .from('wordfrequency')
            .update({ betekenis: d.betekenis.trim(), updated_at: new Date().toISOString() })
            .eq('id', d.id)
        );
        await Promise.all(updates);

        setDrafts((prev) => {
          const next = { ...prev };
          batch.forEach((d) => {
            next[d.id] = { ...next[d.id], status: 'saved' };
          });
          return next;
        });
      }

      showNotification('success', `${toSave.length} betekenissen opgeslagen`);

      // Remove saved words from the list after a short delay
      setTimeout(() => {
        const savedIds = new Set(toSave.map((d) => d.id));
        setWords((prev) => prev.filter((w) => !savedIds.has(w.id)));
        setTotalCount((prev) => prev - savedIds.size);
        setDrafts((prev) => {
          const next = { ...prev };
          savedIds.forEach((id) => delete next[id]);
          return next;
        });
        setGenerationProgress(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving:', err);
      showNotification('error', `Fout bij opslaan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const generatedCount = Object.values(drafts).filter((d) => d.status === 'generated' && d.betekenis.trim()).length;
  const savedCount = Object.values(drafts).filter((d) => d.status === 'saved').length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Betekenis Genereren</h1>
          <p className="text-gray-600 mt-1">
            Genereer kinderrijpe definities via AI voor woorden zonder betekenis
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{totalCount.toLocaleString('nl-NL')}</p>
            <p className="text-xs text-blue-600 mt-0.5">zonder betekenis</p>
          </div>
        </div>
      </div>

      {/* Notification */}
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

      {/* Action bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating || loading || words.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Genereren...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Genereer betekenissen ({words.length})
            </>
          )}
        </button>

        {generatedCount > 0 && (
          <button
            onClick={handleSaveAll}
            disabled={saving || generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Valideer & sla op ({generatedCount})
              </>
            )}
          </button>
        )}

        {generationProgress && (
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(generationProgress.done / generationProgress.total) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {generationProgress.done} / {generationProgress.total}
            </span>
            {savedCount > 0 && (
              <span className="text-sm text-green-600 font-medium whitespace-nowrap">
                {savedCount} opgeslagen
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
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
            <BookOpen className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Alle woorden hebben al een betekenis</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Column headers */}
            <div className="grid grid-cols-[200px_1fr_120px] gap-4 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>Woord</span>
              <span>Betekenis</span>
              <span>Status</span>
            </div>

            {words.map((word) => {
              const draft = drafts[word.id];
              const status = draft?.status || 'idle';

              return (
                <div
                  key={word.id}
                  className={`grid grid-cols-[200px_1fr_120px] gap-4 px-6 py-3 items-center transition-colors ${
                    status === 'saved'
                      ? 'bg-green-50'
                      : status === 'error'
                      ? 'bg-red-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Word */}
                  <div>
                    <p className="font-semibold text-gray-900">{word.word}</p>
                    {word.aantal_karakters != null && (
                      <p className="text-xs text-gray-400">{word.aantal_karakters} tekens</p>
                    )}
                  </div>

                  {/* Betekenis input */}
                  <div>
                    {status === 'idle' ? (
                      <div className="h-9 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center px-3">
                        <span className="text-xs text-gray-400">Nog niet gegenereerd</span>
                      </div>
                    ) : status === 'error' && !draft?.betekenis ? (
                      <div className="h-9 rounded-lg border border-red-200 bg-red-50 flex items-center px-3">
                        <span className="text-xs text-red-500">Fout bij genereren</span>
                      </div>
                    ) : (
                      <textarea
                        value={draft?.betekenis || ''}
                        onChange={(e) => handleDraftChange(word.id, e.target.value)}
                        disabled={status === 'saved' || saving}
                        rows={2}
                        className={`w-full px-3 py-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          status === 'saved'
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center">
                    {status === 'idle' && (
                      <span className="text-xs text-gray-400 font-medium">Wacht</span>
                    )}
                    {status === 'generated' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <Sparkles className="w-3 h-3" />
                        Gegenereerd
                      </span>
                    )}
                    {status === 'saving' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Opslaan...
                      </span>
                    )}
                    {status === 'saved' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <Check className="w-3 h-3" />
                        Opgeslagen
                      </span>
                    )}
                    {status === 'error' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertCircle className="w-3 h-3" />
                        Fout
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
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
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}