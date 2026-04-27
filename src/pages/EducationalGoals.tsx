import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Target,
  Plus,
  Pencil,
  X,
  Save,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Layers,
  Hash,
} from 'lucide-react';

interface EducationalGoal {
  code: string;
  domain: string;
  subject: string;
  title: string;
  description: string;
  sort_order: number;
  created_at: string;
}

type FormData = Omit<EducationalGoal, 'created_at'>;

type SortField = 'code' | 'domain' | 'subject' | 'title' | 'sort_order';
type SortDir = 'asc' | 'desc';

const EMPTY_FORM: FormData = {
  code: '',
  domain: '',
  subject: '',
  title: '',
  description: '',
  sort_order: 0,
};

function TextInput({
  field,
  label,
  placeholder,
  form,
  set,
  mono,
}: {
  field: keyof FormData;
  label: string;
  placeholder?: string;
  form: FormData;
  set: (field: keyof FormData, value: unknown) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={(form[field] as string) || ''}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function Modal({
  goal,
  existingCodes,
  onClose,
  onSaved,
}: {
  goal: EducationalGoal | null;
  existingCodes: string[];
  onClose: () => void;
  onSaved: (saved: EducationalGoal) => void;
}) {
  const isNew = !goal;
  const [form, setForm] = useState<FormData>(
    goal
      ? {
          code: goal.code,
          domain: goal.domain,
          subject: goal.subject,
          title: goal.title,
          description: goal.description,
          sort_order: goal.sort_order,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.code.trim()) { setError('Code is verplicht'); return; }
    if (!form.domain.trim()) { setError('Domein is verplicht'); return; }
    if (!form.subject.trim()) { setError('Onderwerp is verplicht'); return; }
    if (!form.title.trim()) { setError('Titel is verplicht'); return; }
    if (!form.description.trim()) { setError('Beschrijving is verplicht'); return; }
    if (isNew && existingCodes.includes(form.code.trim())) {
      setError('Deze code bestaat al');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const { data, error: err } = await supabase
          .from('educational_goals')
          .insert({ ...form, code: form.code.trim() })
          .select()
          .single();
        if (err) throw err;
        onSaved(data as EducationalGoal);
      } else {
        const { data, error: err } = await supabase
          .from('educational_goals')
          .update({
            domain: form.domain,
            subject: form.subject,
            title: form.title,
            description: form.description,
            sort_order: form.sort_order,
          })
          .eq('code', goal!.code)
          .select()
          .single();
        if (err) throw err;
        onSaved(data as EducationalGoal);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-6">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isNew ? 'Nieuw leerdoel' : `Leerdoel bewerken — ${goal!.code}`}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                disabled={!isNew}
                placeholder="bv. KD1.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Volgorde</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => set('sort_order', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput field="domain" label="Domein *" placeholder="bv. Taal" form={form} set={set} />
            <TextInput field="subject" label="Onderwerp *" placeholder="bv. Fonologisch bewustzijn" form={form} set={set} />
          </div>

          <TextInput field="title" label="Titel *" form={form} set={set} />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Beschrijving *</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
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

function DomainPill({ domain }: { domain: string }) {
  const colors: Record<string, string> = {
    taal: 'bg-blue-100 text-blue-700',
    wiskunde: 'bg-green-100 text-green-700',
    muziek: 'bg-amber-100 text-amber-700',
    beweging: 'bg-rose-100 text-rose-700',
    wereldoriëntatie: 'bg-teal-100 text-teal-700',
  };
  const key = domain.toLowerCase();
  const cls = colors[key] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {domain}
    </span>
  );
}

export default function EducationalGoals() {
  const [goals, setGoals] = useState<EducationalGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('sort_order');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalGoal, setModalGoal] = useState<EducationalGoal | 'new' | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('educational_goals')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true });
      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotification({ type, message });
    notifTimer.current = setTimeout(() => setNotification(null), 4000);
  };

  const handleSaved = (saved: EducationalGoal) => {
    setGoals((prev) => {
      const idx = prev.findIndex((g) => g.code === saved.code);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setModalGoal(null);
    showNotification('success', 'Leerdoel opgeslagen');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
  };

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

  const domains = Array.from(new Set(goals.map((g) => g.domain))).sort();

  const filtered = goals
    .filter((g) => {
      if (domainFilter && g.domain !== domainFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          g.code.toLowerCase().includes(q) ||
          g.title.toLowerCase().includes(q) ||
          g.subject.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

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
          <h1 className="text-3xl font-bold text-gray-900">Didactische leerdoelen</h1>
          <p className="text-gray-600 mt-1">Beheer alle educatieve leerdoelen ({goals.length} totaal)</p>
        </div>
        <button
          onClick={() => setModalGoal('new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nieuw leerdoel
        </button>
      </div>

      {notification && (
        <div className={`p-4 rounded-lg flex items-center gap-2 text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {notification.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg"><Target className="w-4 h-4 text-blue-600" /></div>
            <span className="text-sm text-gray-500">Totaal leerdoelen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-teal-100 p-2 rounded-lg"><Layers className="w-4 h-4 text-teal-600" /></div>
            <span className="text-sm text-gray-500">Domeinen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{domains.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-100 p-2 rounded-lg"><Hash className="w-4 h-4 text-amber-600" /></div>
            <span className="text-sm text-gray-500">Onderwerpen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{new Set(goals.map((g) => g.subject)).size}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek op code, titel, onderwerp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle domeinen</option>
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {(search || domainFilter) && (
            <button
              onClick={() => { setSearch(''); setDomainFilter(''); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-3 h-3" />
              Wis filters
            </button>
          )}
          <span className="text-sm text-gray-500 ml-auto">{filtered.length} resultaten</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortTh field="code" label="Code" />
                <SortTh field="domain" label="Domein" />
                <SortTh field="subject" label="Onderwerp" />
                <SortTh field="title" label="Titel" />
                <SortTh field="sort_order" label="Volgorde" center />
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((goal) => (
                <>
                  <tr
                    key={goal.code}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedCode(expandedCode === goal.code ? null : goal.code)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
                        {goal.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DomainPill domain={goal.domain} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{goal.subject}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{goal.title}</p>
                      {expandedCode !== goal.code && (
                        <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{goal.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{goal.sort_order}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setModalGoal(goal); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Bewerken
                      </button>
                    </td>
                  </tr>
                  {expandedCode === goal.code && (
                    <tr key={`${goal.code}-expanded`} className="bg-blue-50/40">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
                            <Target className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Beschrijving</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{goal.description}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                    Geen leerdoelen gevonden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalGoal !== null && (
        <Modal
          goal={modalGoal === 'new' ? null : modalGoal}
          existingCodes={goals.map((g) => g.code)}
          onClose={() => setModalGoal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
