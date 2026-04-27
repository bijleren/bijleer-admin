import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Loader2, Pencil, X, Save, CheckCircle2, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown, ToggleLeft, ToggleRight, Columns2 as Columns, Check } from 'lucide-react';

interface ExerciseType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category: string | null;
  exercise_type: string | null;
  target_page: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  available_online: boolean;
  beta: boolean;
  coach_needed: boolean;
  speak: boolean;
  listen: boolean;
  typing: boolean;
  understand: boolean;
  reading: boolean;
  spelling: boolean;
  memory: boolean | null;
  isolation: number;
  blending: number;
  segmentation: number;
  addition: number;
  deletion: number;
  substitution: number;
  explanation: string | null;
  example_video: string | null;
  example_screen: string | null;
  legacy_mysql_id: number | null;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM: Omit<ExerciseType, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  slug: '',
  description: null,
  short_description: null,
  category: null,
  exercise_type: null,
  target_page: null,
  icon: null,
  display_order: 0,
  is_active: true,
  available_online: false,
  beta: false,
  coach_needed: false,
  speak: false,
  listen: false,
  typing: false,
  understand: false,
  reading: false,
  spelling: false,
  memory: false,
  isolation: 0,
  blending: 0,
  segmentation: 0,
  addition: 0,
  deletion: 0,
  substitution: 0,
  explanation: null,
  example_video: null,
  example_screen: null,
  legacy_mysql_id: null,
};

const CATEGORIES = ['phoneme', 'word', 'sentence', 'text', 'other'];
const EXERCISE_TYPES = ['phonem', 'word', 'text'];

type SortField = 'name' | 'category' | 'exercise_type' | 'display_order' | 'is_active';
type SortDir = 'asc' | 'desc';

type ColKey =
  | 'category'
  | 'exercise_type'
  | 'display_order'
  | 'skills'
  | 'is_active'
  | 'tags'
  | 'short_description'
  | 'target_page'
  | 'icon'
  | 'phonological'
  | 'memory'
  | 'legacy_id';

const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'category', label: 'Categorie' },
  { key: 'exercise_type', label: 'Type' },
  { key: 'display_order', label: 'Volgorde' },
  { key: 'skills', label: 'Vaardigheden' },
  { key: 'is_active', label: 'Actief' },
  { key: 'tags', label: 'Tags' },
  { key: 'short_description', label: 'Korte beschrijving' },
  { key: 'target_page', label: 'Target page' },
  { key: 'icon', label: 'Icon' },
  { key: 'phonological', label: 'Fonologisch' },
  { key: 'memory', label: 'Geheugen' },
  { key: 'legacy_id', label: 'Legacy ID' },
];

const DEFAULT_VISIBLE: ColKey[] = ['category', 'exercise_type', 'display_order', 'skills', 'is_active', 'tags'];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function Badge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    teal: 'bg-teal-100 text-teal-700',
    gray: 'bg-gray-100 text-gray-600',
    rose: 'bg-rose-100 text-rose-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
}

function categoryColor(cat: string | null) {
  if (cat === 'phoneme') return 'blue';
  if (cat === 'word') return 'green';
  if (cat === 'text') return 'teal';
  if (cat === 'sentence') return 'orange';
  return 'gray';
}

type FormData = Omit<ExerciseType, 'id' | 'created_at' | 'updated_at'>;

function BoolToggle({
  field,
  label,
  form,
  set,
}: {
  field: keyof FormData;
  label: string;
  form: FormData;
  set: (field: keyof FormData, value: unknown) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => set(field, !form[field])}
        className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form[field] ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span
          className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${form[field] ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function SmallInt({
  field,
  label,
  form,
  set,
}: {
  field: keyof FormData;
  label: string;
  form: FormData;
  set: (field: keyof FormData, value: unknown) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={(form[field] as number) ?? 0}
        onChange={(e) => set(field, parseInt(e.target.value) || 0)}
        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

function TextInput({
  field,
  label,
  placeholder,
  form,
  set,
}: {
  field: keyof FormData;
  label: string;
  placeholder?: string;
  form: FormData;
  set: (field: keyof FormData, value: unknown) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={(form[field] as string) || ''}
        onChange={(e) => set(field, e.target.value || null)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

function TextArea({
  field,
  label,
  rows = 3,
  form,
  set,
}: {
  field: keyof FormData;
  label: string;
  rows?: number;
  form: FormData;
  set: (field: keyof FormData, value: unknown) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        value={(form[field] as string) || ''}
        onChange={(e) => set(field, e.target.value || null)}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
    </div>
  );
}

function Modal({
  item,
  onClose,
  onSaved,
}: {
  item: ExerciseType | null;
  onClose: () => void;
  onSaved: (updated: ExerciseType) => void;
}) {
  const isNew = !item;
  const [form, setForm] = useState<FormData>(
    item
      ? {
          name: item.name,
          slug: item.slug,
          description: item.description,
          short_description: item.short_description,
          category: item.category,
          exercise_type: item.exercise_type,
          target_page: item.target_page,
          icon: item.icon,
          display_order: item.display_order,
          is_active: item.is_active,
          available_online: item.available_online,
          beta: item.beta,
          coach_needed: item.coach_needed,
          speak: item.speak,
          listen: item.listen,
          typing: item.typing,
          understand: item.understand,
          reading: item.reading,
          spelling: item.spelling,
          memory: item.memory,
          isolation: item.isolation,
          blending: item.blending,
          segmentation: item.segmentation,
          addition: item.addition,
          deletion: item.deletion,
          substitution: item.substitution,
          explanation: item.explanation,
          example_video: item.example_video,
          example_screen: item.example_screen,
          legacy_mysql_id: item.legacy_mysql_id,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleNameChange = (val: string) => {
    set('name', val);
    if (isNew) set('slug', slugify(val));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Naam en slug zijn verplicht');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      if (isNew) {
        const { data, error: err } = await supabase
          .from('exercise_types')
          .insert(payload)
          .select()
          .single();
        if (err) throw err;
        onSaved(data as ExerciseType);
      } else {
        const { data, error: err } = await supabase
          .from('exercise_types')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', item!.id)
          .select()
          .single();
        if (err) throw err;
        onSaved(data as ExerciseType);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-6">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isNew ? 'Nieuw oefentype' : 'Oefentype bewerken'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Naam *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <TextArea field="short_description" label="Korte beschrijving" rows={2} form={form} set={set} />
          <TextArea field="description" label="Beschrijving" rows={3} form={form} set={set} />
          <TextArea field="explanation" label="Uitleg" rows={3} form={form} set={set} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categorie</label>
              <select
                value={form.category || ''}
                onChange={(e) => set('category', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">— geen —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Oefentype</label>
              <select
                value={form.exercise_type || ''}
                onChange={(e) => set('exercise_type', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">— geen —</option>
                {EXERCISE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Volgorde</label>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => set('display_order', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput field="target_page" label="Target page" form={form} set={set} />
            <TextInput field="icon" label="Icon" form={form} set={set} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput field="example_screen" label="Voorbeeld scherm" form={form} set={set} />
            <TextInput field="example_video" label="Voorbeeld video" form={form} set={set} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Legacy MySQL ID</label>
            <input
              type="number"
              value={form.legacy_mysql_id ?? ''}
              onChange={(e) => set('legacy_mysql_id', e.target.value ? parseInt(e.target.value) : null)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Instellingen</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <BoolToggle field="is_active" label="Actief" form={form} set={set} />
              <BoolToggle field="available_online" label="Online" form={form} set={set} />
              <BoolToggle field="beta" label="Beta" form={form} set={set} />
              <BoolToggle field="coach_needed" label="Coach nodig" form={form} set={set} />
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Vaardigheden</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <BoolToggle field="speak" label="Spreken" form={form} set={set} />
              <BoolToggle field="listen" label="Luisteren" form={form} set={set} />
              <BoolToggle field="typing" label="Typen" form={form} set={set} />
              <BoolToggle field="understand" label="Begrijpen" form={form} set={set} />
              <BoolToggle field="reading" label="Lezen" form={form} set={set} />
              <BoolToggle field="spelling" label="Spellen" form={form} set={set} />
              <BoolToggle field="memory" label="Geheugen" form={form} set={set} />
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Fonologische bewerkingen</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SmallInt field="isolation" label="Isolatie" form={form} set={set} />
              <SmallInt field="blending" label="Samenvoegen" form={form} set={set} />
              <SmallInt field="segmentation" label="Segmentatie" form={form} set={set} />
              <SmallInt field="addition" label="Toevoegen" form={form} set={set} />
              <SmallInt field="deletion" label="Verwijderen" form={form} set={set} />
              <SmallInt field="substitution" label="Vervangen" form={form} set={set} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExerciseTypes() {
  const [items, setItems] = useState<ExerciseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalItem, setModalItem] = useState<ExerciseType | 'new' | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercise_types')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaved = (updated: ExerciseType) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
    setModalItem(null);
    showNotification('success', 'Oefentype opgeslagen');
  };

  const handleToggleActive = async (item: ExerciseType) => {
    const { error } = await supabase
      .from('exercise_types')
      .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (!error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i)));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const col = (key: ColKey) => visibleCols.has(key);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  const filtered = items
    .filter((i) => {
      if (searchTerm && !i.name.toLowerCase().includes(searchTerm.toLowerCase()) && !i.slug.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (categoryFilter && i.category !== categoryFilter) return false;
      if (statusFilter === 'active' && !i.is_active) return false;
      if (statusFilter === 'inactive' && i.is_active) return false;
      if (statusFilter === 'beta' && !i.beta) return false;
      if (statusFilter === 'online' && !i.available_online) return false;
      return true;
    })
    .sort((a, b) => {
      let av: string | number | boolean = a[sortField] ?? '';
      let bv: string | number | boolean = b[sortField] ?? '';
      if (typeof av === 'boolean') av = av ? 1 : 0;
      if (typeof bv === 'boolean') bv = bv ? 1 : 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  const SortTh = ({ field, label, center }: { field: SortField; label: string; center?: boolean }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap ${center ? 'text-center' : 'text-left'}`}
    >
      <div className={`flex items-center gap-1.5 ${center ? 'justify-center' : ''}`}>
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  );

  const Th = ({ label }: { label: string }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
      {label}
    </th>
  );

  const skillDots = (item: ExerciseType) => {
    const skills = [
      { key: 'speak', label: 'S' },
      { key: 'listen', label: 'L' },
      { key: 'typing', label: 'T' },
      { key: 'understand', label: 'B' },
      { key: 'reading', label: 'R' },
      { key: 'spelling', label: 'Sp' },
    ] as const;
    return skills
      .filter((s) => item[s.key])
      .map((s) => (
        <span key={s.key} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 font-medium">
          {s.label}
        </span>
      ));
  };

  const phonoDots = (item: ExerciseType) => {
    const ops = [
      { key: 'isolation', label: 'Iso' },
      { key: 'blending', label: 'Sam' },
      { key: 'segmentation', label: 'Seg' },
      { key: 'addition', label: 'Add' },
      { key: 'deletion', label: 'Del' },
      { key: 'substitution', label: 'Sub' },
    ] as const;
    const active = ops.filter((o) => (item[o.key] as number) > 0);
    if (!active.length) return <span className="text-gray-300 text-xs">—</span>;
    return active.map((o) => (
      <span key={o.key} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600 font-medium">
        {o.label}
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Oefentypes</h1>
          <p className="text-gray-600 mt-1">Beheer alle oefentypes ({items.length} totaal)</p>
        </div>
        <button
          onClick={() => setModalItem('new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nieuw oefentype
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 text-sm ${
            notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Totaal', value: items.length, color: 'text-gray-900' },
          { label: 'Actief', value: items.filter((i) => i.is_active).length, color: 'text-green-600' },
          { label: 'Online', value: items.filter((i) => i.available_online).length, color: 'text-blue-600' },
          { label: 'Beta', value: items.filter((i) => i.beta).length, color: 'text-orange-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek op naam of slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle categorieën</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle statussen</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
            <option value="beta">Beta</option>
            <option value="online">Online</option>
          </select>
          {(searchTerm || categoryFilter || statusFilter) && (
            <button
              onClick={() => { setSearchTerm(''); setCategoryFilter(''); setStatusFilter(''); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-3 h-3" />
              Wis filters
            </button>
          )}
          <span className="text-sm text-gray-500">{filtered.length} resultaten</span>

          {/* Column visibility toggle */}
          <div className="relative ml-auto" ref={colMenuRef}>
            <button
              onClick={() => setColMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Columns className="w-4 h-4" />
              Kolommen
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                {visibleCols.size}
              </span>
            </button>
            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-52">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1.5 mb-1">
                  Zichtbare kolommen
                </p>
                {ALL_COLUMNS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleCol(key)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${visibleCols.has(key) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {visibleCols.has(key) && <Check className="w-3 h-3 text-white" />}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortTh field="name" label="Naam" />
                {col('category') && <SortTh field="category" label="Categorie" />}
                {col('exercise_type') && <SortTh field="exercise_type" label="Type" />}
                {col('display_order') && <SortTh field="display_order" label="Volgorde" center />}
                {col('skills') && <Th label="Vaardigheden" />}
                {col('is_active') && <SortTh field="is_active" label="Actief" center />}
                {col('tags') && <Th label="Tags" />}
                {col('short_description') && <Th label="Korte omschrijving" />}
                {col('target_page') && <Th label="Target page" />}
                {col('icon') && <Th label="Icon" />}
                {col('phonological') && <Th label="Fonologisch" />}
                {col('memory') && <Th label="Geheugen" />}
                {col('legacy_id') && <Th label="Legacy ID" />}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.slug}</p>
                  </td>
                  {col('category') && (
                    <td className="px-4 py-3">
                      {item.category ? <Badge label={item.category} color={categoryColor(item.category)} /> : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  {col('exercise_type') && (
                    <td className="px-4 py-3">
                      {item.exercise_type ? (
                        <span className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                          {item.exercise_type}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                  {col('display_order') && (
                    <td className="px-4 py-3 text-center text-gray-500">{item.display_order}</td>
                  )}
                  {col('skills') && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">{skillDots(item)}</div>
                    </td>
                  )}
                  {col('is_active') && (
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggleActive(item)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        {item.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-300" />
                        )}
                      </button>
                    </td>
                  )}
                  {col('tags') && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.available_online && <Badge label="Online" color="blue" />}
                        {item.beta && <Badge label="Beta" color="orange" />}
                        {item.coach_needed && <Badge label="Coach" color="rose" />}
                      </div>
                    </td>
                  )}
                  {col('short_description') && (
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-gray-500 truncate">{item.short_description || <span className="text-gray-300">—</span>}</p>
                    </td>
                  )}
                  {col('target_page') && (
                    <td className="px-4 py-3">
                      {item.target_page ? (
                        <span className="text-xs font-mono text-gray-600">{item.target_page}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                  {col('icon') && (
                    <td className="px-4 py-3">
                      {item.icon ? (
                        <span className="text-xs font-mono text-gray-600">{item.icon}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                  {col('phonological') && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">{phonoDots(item)}</div>
                    </td>
                  )}
                  {col('memory') && (
                    <td className="px-4 py-3 text-center">
                      {item.memory ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 font-medium">Ja</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                  {col('legacy_id') && (
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {item.legacy_mysql_id ?? <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModalItem(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Bewerken
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={99} className="px-4 py-16 text-center text-gray-400">
                    Geen oefentypes gevonden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalItem !== null && (
        <Modal
          item={modalItem === 'new' ? null : modalItem}
          onClose={() => setModalItem(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
