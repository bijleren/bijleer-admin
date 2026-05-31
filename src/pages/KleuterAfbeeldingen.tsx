import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, ArrowLeft, Upload, Trash2, Eye, EyeOff, ChevronUp, ChevronDown,
  ImageOff, CheckCircle, Loader2, X, Image as ImageIcon, AlertTriangle,
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const EDGE = `${SUPABASE_URL}/functions/v1/kleuter-images`;
const BUCKET_URL = `${SUPABASE_URL}/storage/v1/object/public/images_kleuter`;

type ImageType = 'isolated' | 'context' | 'general';

interface WordImage {
  id: string;
  word: string;
  image_type: ImageType;
  storage_path: string;
  label: string | null;
  sort_order: number;
  is_active: boolean;
}

interface WordStats {
  isolated: number;
  context: number;
  general: number;
}

type View = 'list' | 'detail' | 'missing';

const IMAGE_TYPES: { key: ImageType; label: string }[] = [
  { key: 'isolated', label: 'Geïsoleerd' },
  { key: 'context', label: 'In context' },
  { key: 'general', label: 'Algemeen' },
];

async function callEdge(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? ANON_KEY;
  const res = await fetch(`${EDGE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  return res.json();
}

function publicUrl(storagePath: string) {
  return `${BUCKET_URL}/${storagePath}`;
}

export default function KleuterAfbeeldingen() {
  const [view, setView] = useState<View>('list');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const openDetail = (word: string) => {
    setSelectedWord(word);
    setView('detail');
  };

  return (
    <div className="w-full h-full p-6 space-y-6">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {notification.msg}
        </div>
      )}

      {view === 'list' && (
        <WordListView onOpenDetail={openDetail} onOpenMissing={() => setView('missing')} notify={notify} />
      )}
      {view === 'detail' && selectedWord && (
        <WordDetailView word={selectedWord} onBack={() => setView('list')} notify={notify} />
      )}
      {view === 'missing' && (
        <MissingImagesView onBack={() => setView('list')} onOpenDetail={openDetail} notify={notify} />
      )}
    </div>
  );
}

// ─── Word List View ────────────────────────────────────────────────────────────

interface WordListViewProps {
  onOpenDetail: (word: string) => void;
  onOpenMissing: () => void;
  notify: (type: 'success' | 'error', msg: string) => void;
}

function WordListView({ onOpenDetail, onOpenMissing }: WordListViewProps) {
  const [words, setWords] = useState<{ word: string }[]>([]);
  const [stats, setStats] = useState<Record<string, WordStats>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 60;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wordsRes, statsRes] = await Promise.all([
        supabase
          .from('vocabulary_words')
          .select('word')
          .eq('is_active', true)
          .order('word'),
        callEdge('?action=stats'),
      ]);
      setWords(wordsRes.data ?? []);
      setStats(statsRes.data ?? {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = words.filter(w =>
    !search || w.word.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const missingCount = words.filter(({ word }) => {
    const s = stats[word];
    return !s || s.isolated === 0 || s.context === 0 || s.general === 0;
  }).length;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kleuter Afbeeldingen</h1>
          <p className="text-sm text-gray-500 mt-1">{words.length.toLocaleString()} woorden · {missingCount.toLocaleString()} met ontbrekende afbeeldingen</p>
        </div>
        <button
          onClick={onOpenMissing}
          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
        >
          <ImageOff className="w-4 h-4" />
          Ontbrekende afbeeldingen
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Zoek woord…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 grid grid-cols-[1fr_100px_100px_100px] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div>Woord</div>
              <div className="text-center">Geïsoleerd</div>
              <div className="text-center">In context</div>
              <div className="text-center">Algemeen</div>
            </div>
            <div className="divide-y divide-gray-100">
              {paginated.map(({ word }) => {
                const s = stats[word] ?? { isolated: 0, context: 0, general: 0 };
                const hasNone = s.isolated === 0 && s.context === 0 && s.general === 0;
                return (
                  <button
                    key={word}
                    onClick={() => onOpenDetail(word)}
                    className="w-full px-5 py-3 grid grid-cols-[1fr_100px_100px_100px] gap-4 items-center hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{word}</span>
                      {hasNone && <ImageOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                    </div>
                    <TypeBadge count={s.isolated} />
                    <TypeBadge count={s.context} />
                    <TypeBadge count={s.general} />
                  </button>
                );
              })}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Pagina {page + 1} van {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                  className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Vorige
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                  className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Volgende
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function TypeBadge({ count }: { count: number }) {
  return (
    <div className="flex justify-center">
      <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-semibold ${
        count === 0
          ? 'bg-red-50 text-red-500 border border-red-200'
          : 'bg-green-50 text-green-700 border border-green-200'
      }`}>
        {count}
      </span>
    </div>
  );
}

// ─── Word Detail View ──────────────────────────────────────────────────────────

interface WordDetailViewProps {
  word: string;
  onBack: () => void;
  notify: (type: 'success' | 'error', msg: string) => void;
}

function WordDetailView({ word, onBack, notify }: WordDetailViewProps) {
  const [images, setImages] = useState<WordImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ImageType>('isolated');

  const loadImages = useCallback(async () => {
    setLoading(true);
    const res = await callEdge(`?action=list&word=${encodeURIComponent(word)}`);
    setImages(res.data ?? []);
    setLoading(false);
  }, [word]);

  useEffect(() => { loadImages(); }, [loadImages]);

  const tabImages = images.filter(i => i.image_type === activeTab);

  const handleDelete = async (img: WordImage) => {
    if (!confirm(`Afbeelding verwijderen?`)) return;
    const res = await callEdge('?action=delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: img.id, storage_path: img.storage_path }),
    });
    if (res.error) { notify('error', res.error); return; }
    notify('success', 'Afbeelding verwijderd');
    loadImages();
  };

  const handleToggleActive = async (img: WordImage) => {
    const res = await callEdge('?action=update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: img.id, is_active: !img.is_active }),
    });
    if (res.error) { notify('error', res.error); return; }
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, is_active: !i.is_active } : i));
  };

  const handleLabelChange = async (img: WordImage, label: string) => {
    const res = await callEdge('?action=update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: img.id, label }),
    });
    if (res.error) { notify('error', res.error); return; }
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, label } : i));
  };

  const handleReorder = async (img: WordImage, direction: 'up' | 'down') => {
    const list = tabImages.slice().sort((a, b) => a.sort_order - b.sort_order);
    const idx = list.findIndex(i => i.id === img.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    const a = list[idx];
    const b = list[swapIdx];
    await Promise.all([
      callEdge('?action=update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, sort_order: b.sort_order }) }),
      callEdge('?action=update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, sort_order: a.sort_order }) }),
    ]);
    loadImages();
  };

  const handleUploadComplete = () => {
    notify('success', 'Afbeelding geüpload');
    loadImages();
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{word}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Afbeeldingen beheren</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {IMAGE_TYPES.map(({ key, label }) => {
          const count = images.filter(i => i.image_type === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                count === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {tabImages.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
              <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nog geen afbeeldingen voor dit type.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tabImages
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((img) => (
                  <ImageCard
                    key={img.id}
                    img={img}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    onLabelChange={handleLabelChange}
                    onReorder={handleReorder}
                  />
                ))}
            </div>
          )}

          <UploadZone word={word} imageType={activeTab} onUploadComplete={handleUploadComplete} onError={(e) => notify('error', e)} />
        </div>
      )}
    </>
  );
}

// ─── Image Card ────────────────────────────────────────────────────────────────

interface ImageCardProps {
  img: WordImage;
  onDelete: (img: WordImage) => void;
  onToggleActive: (img: WordImage) => void;
  onLabelChange: (img: WordImage, label: string) => void;
  onReorder: (img: WordImage, dir: 'up' | 'down') => void;
}

function ImageCard({ img, onDelete, onToggleActive, onLabelChange, onReorder }: ImageCardProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelVal, setLabelVal] = useState(img.label ?? '');

  const commitLabel = () => {
    setEditingLabel(false);
    if (labelVal !== (img.label ?? '')) onLabelChange(img, labelVal);
  };

  return (
    <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${img.is_active ? 'border-gray-200' : 'border-gray-200 opacity-50'}`}>
      <div className="relative aspect-square bg-gray-100">
        <img
          src={publicUrl(img.storage_path)}
          alt={img.label ?? img.word}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        {!img.is_active && (
          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
            <EyeOff className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      <div className="p-2 space-y-1.5">
        {editingLabel ? (
          <input
            autoFocus
            type="text"
            value={labelVal}
            onChange={e => setLabelVal(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => e.key === 'Enter' && commitLabel()}
            className="w-full text-xs px-2 py-1 border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <button
            onClick={() => setEditingLabel(true)}
            className="w-full text-left text-xs text-gray-500 hover:text-gray-800 truncate px-1 py-0.5 rounded hover:bg-gray-50 transition-colors"
            title="Klik om label te bewerken"
          >
            {img.label || <span className="italic text-gray-300">Geen label</span>}
          </button>
        )}

        <div className="flex items-center justify-between gap-1">
          <div className="flex gap-0.5">
            <button onClick={() => onReorder(img, 'up')} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Omhoog">
              <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button onClick={() => onReorder(img, 'down')} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Omlaag">
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
          <div className="flex gap-0.5">
            <button onClick={() => onToggleActive(img)} className="p-1 hover:bg-gray-100 rounded transition-colors" title={img.is_active ? 'Verbergen' : 'Tonen'}>
              {img.is_active ? <Eye className="w-3.5 h-3.5 text-gray-500" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            <button onClick={() => onDelete(img)} className="p-1 hover:bg-red-50 rounded transition-colors" title="Verwijderen">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Zone ───────────────────────────────────────────────────────────────

interface UploadZoneProps {
  word: string;
  imageType: ImageType;
  onUploadComplete: () => void;
  onError: (msg: string) => void;
}

function UploadZone({ word, imageType, onUploadComplete, onError }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{ file: File; label: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => /\.(jpe?g|png|webp)$/i.test(f.name) && f.size <= 10 * 1024 * 1024);
    if (valid.length < files.length) onError('Sommige bestanden zijn overgeslagen (max 10MB, jpg/png/webp)');
    setPending(prev => [...prev, ...valid.map(f => ({ file: f, label: '' }))]);
  };

  const uploadAll = async () => {
    if (pending.length === 0) return;
    setUploading(true);
    let failed = 0;
    for (const { file, label } of pending) {
      const form = new FormData();
      form.append('file', file);
      form.append('word', word);
      form.append('image_type', imageType);
      if (label) form.append('label', label);
      const res = await callEdge('?action=upload', { method: 'POST', body: form });
      if (res.error) failed++;
    }
    setUploading(false);
    setPending([]);
    if (failed > 0) onError(`${failed} bestand(en) niet geüpload`);
    else onUploadComplete();
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">Sleep afbeeldingen hier of klik om te selecteren</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · max 10 MB per bestand</p>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {pending.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">{pending.length} bestand(en) klaar om te uploaden</p>
            <button onClick={() => setPending([])} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {pending.map((p, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={URL.createObjectURL(p.file)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{p.file.name}</p>
                  <input
                    type="text"
                    placeholder="Label (optioneel)"
                    value={p.label}
                    onChange={e => setPending(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    className="mt-1 w-full text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
                  />
                </div>
                <button onClick={() => setPending(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={uploadAll}
              disabled={uploading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploaden…' : `Upload ${pending.length} bestand(en)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Missing Images View ───────────────────────────────────────────────────────

interface MissingImagesViewProps {
  onBack: () => void;
  onOpenDetail: (word: string) => void;
  notify: (type: 'success' | 'error', msg: string) => void;
}

function MissingImagesView({ onBack, onOpenDetail, notify }: MissingImagesViewProps) {
  const [words, setWords] = useState<{ word: string }[]>([]);
  const [stats, setStats] = useState<Record<string, WordStats>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ImageType | 'any'>('any');
  const [uploadingWord, setUploadingWord] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [wordsRes, statsRes] = await Promise.all([
      supabase.from('vocabulary_words').select('word').eq('is_active', true).order('word'),
      callEdge('?action=stats'),
    ]);
    setWords(wordsRes.data ?? []);
    setStats(statsRes.data ?? {});
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const missing = words.filter(({ word }) => {
    const s = stats[word] ?? { isolated: 0, context: 0, general: 0 };
    const matchesFilter =
      filterType === 'any'
        ? s.isolated === 0 || s.context === 0 || s.general === 0
        : s[filterType] === 0;
    const matchesSearch = !search || word.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ontbrekende Afbeeldingen</h1>
          <p className="text-sm text-gray-500 mt-0.5">{loading ? '…' : missing.length.toLocaleString()} woorden gevonden</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek woord…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as ImageType | 'any')}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="any">Elk type ontbreekt</option>
          <option value="isolated">Geïsoleerd ontbreekt</option>
          <option value="context">In context ontbreekt</option>
          <option value="general">Algemeen ontbreekt</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 grid grid-cols-[1fr_90px_90px_90px_160px] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div>Woord</div>
            <div className="text-center">Geïsoleerd</div>
            <div className="text-center">In context</div>
            <div className="text-center">Algemeen</div>
            <div></div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {missing.slice(0, 200).map(({ word }) => {
              const s = stats[word] ?? { isolated: 0, context: 0, general: 0 };
              return (
                <div key={word} className="px-5 py-3 grid grid-cols-[1fr_90px_90px_90px_160px] gap-4 items-center">
                  <span className="font-medium text-gray-900 text-sm">{word}</span>
                  <TypeBadge count={s.isolated} />
                  <TypeBadge count={s.context} />
                  <TypeBadge count={s.general} />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setUploadingWord(uploadingWord === word ? null : word)}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                    </button>
                    <button
                      onClick={() => onOpenDetail(word)}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              );
            })}
            {missing.length > 200 && (
              <div className="px-5 py-3 text-sm text-gray-400 text-center">
                Nog {missing.length - 200} woorden — gebruik de zoekbalk om te filteren
              </div>
            )}
          </div>
        </div>
      )}

      {uploadingWord && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Snel uploaden voor <span className="text-blue-700">{uploadingWord}</span></h3>
            <div className="flex gap-2">
              {IMAGE_TYPES.map(({ key, label }) => (
                <QuickUploadTab key={key} word={uploadingWord} imageType={key} label={label}
                  onDone={() => { loadData(); notify('success', `Afbeelding geüpload voor "${uploadingWord}"`); }}
                  onError={(e) => notify('error', e)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface QuickUploadTabProps {
  word: string;
  imageType: ImageType;
  label: string;
  onDone: () => void;
  onError: (msg: string) => void;
}

function QuickUploadTab({ word, imageType, label, onDone, onError }: QuickUploadTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('word', word);
    form.append('image_type', imageType);
    const res = await callEdge('?action=upload', { method: 'POST', body: form });
    setUploading(false);
    if (res.error) onError(res.error);
    else onDone();
  };

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {label}
      </button>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
    </>
  );
}
