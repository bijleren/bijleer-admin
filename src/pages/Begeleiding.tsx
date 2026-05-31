import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Calendar, AlertCircle, Clock, CheckCircle, FileText,
  GraduationCap, Presentation, HelpCircle, Users
} from 'lucide-react';

interface BegeleidingRequest {
  id: string;
  created_at: string;
  type: string;
  school_id: string;
  submitted_by: string;
  form_data: Record<string, unknown>;
  status: string;
  admin_notes: string | null;
  schools: { name: string } | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  bijleergesprek: { label: 'Bijleergesprek', icon: Users },
  vorming:        { label: 'Vorming', icon: GraduationCap },
  demodag:        { label: 'Demodag', icon: Presentation },
  ontwikkelingsvraag: { label: 'Ontwikkelingsvraag', icon: HelpCircle },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; button: string }> = {
  nieuw:            { label: 'Nieuw',           badge: 'bg-blue-100 text-blue-800',   button: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  'in behandeling': { label: 'In behandeling',  badge: 'bg-amber-100 text-amber-800', button: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  afgehandeld:      { label: 'Afgehandeld',     badge: 'bg-green-100 text-green-800', button: 'bg-green-100 text-green-700 hover:bg-green-200' },
};

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = status === 'nieuw' ? AlertCircle : status === 'in behandeling' ? Clock : CheckCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg?.badge ?? 'bg-gray-100 text-gray-700'}`}>
      <Icon className="w-3 h-3" />
      {cfg?.label ?? status}
    </span>
  );
}

export default function Begeleiding() {
  const [requests, setRequests] = useState<BegeleidingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BegeleidingRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('begeleiding_requests')
      .select('*, schools(name)')
      .order('created_at', { ascending: false });

    if (!error) setRequests((data as BegeleidingRequest[]) || []);
    setLoading(false);
  };

  const saveRequest = async () => {
    if (!selected || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('begeleiding_requests')
      .update({ status: selected.status, admin_notes: notes || null })
      .eq('id', selected.id);

    if (!error) {
      const updated = { ...selected, admin_notes: notes || null };
      setRequests(prev => prev.map(r => r.id === selected.id ? updated : r));
      setSelected(updated);
      await fetchRequests();
    }
    setSaving(false);
  };

  const setStatus = (status: string) => {
    if (!selected) return;
    const updated = { ...selected, status };
    setSelected(updated);
    setRequests(prev => prev.map(r => r.id === selected.id ? updated : r));
  };

  const allTypes = Array.from(new Set(requests.map(r => r.type))).filter(Boolean);

  const filtered = requests.filter(r => {
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const school = r.schools?.name?.toLowerCase() ?? '';
    const matchSearch = searchTerm === '' || school.includes(searchTerm.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Begeleiding</h1>
        <p className="text-sm text-gray-500">Ingediende begeleidingsaanvragen van scholen</p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Zoek op school..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
        />

        <div className="flex gap-1">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${typeFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Alle types
          </button>
          {allTypes.map(type => {
            const cfg = TYPE_CONFIG[type];
            const Icon = cfg?.icon ?? FileText;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${typeFilter === type ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg?.label ?? type}
              </button>
            );
          })}
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Alle statussen</option>
          <option value="nieuw">Nieuw</option>
          <option value="in behandeling">In behandeling</option>
          <option value="afgehandeld">Afgehandeld</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">
              Aanvragen
            </h2>
            <span className="text-xs text-gray-400">{filtered.length} resultaten</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[calc(100vh-320px)] overflow-y-auto">
            {filtered.map(req => {
              const cfg = TYPE_CONFIG[req.type];
              const Icon = cfg?.icon ?? FileText;
              return (
                <div
                  key={req.id}
                  onClick={() => { setSelected(req); setNotes(req.admin_notes || ''); }}
                  className={`px-5 py-4 cursor-pointer transition-colors ${
                    selected?.id === req.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {cfg?.label ?? req.type}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {req.schools?.name ?? '—'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 ml-9">
                    <Calendar className="w-3 h-3" />
                    {new Date(req.created_at).toLocaleDateString('nl-BE')}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-400">
                Geen aanvragen gevonden
              </div>
            )}
          </div>
        </div>

        {/* Right: detail */}
        {selected ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                {(() => { const Icon = TYPE_CONFIG[selected.type]?.icon ?? FileText; return <Icon className="w-4 h-4 text-gray-500" />; })()}
                <h2 className="font-semibold text-gray-900">
                  {TYPE_CONFIG[selected.type]?.label ?? selected.type}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={selected.status} />
                <span className="text-xs text-gray-400">
                  {selected.schools?.name}
                </span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">
                  {new Date(selected.created_at).toLocaleString('nl-BE')}
                </span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-320px)] overflow-y-auto">
              {/* Form data */}
              {Object.keys(selected.form_data).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Formuliergegevens</p>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(selected.form_data).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded-lg px-4 py-3">
                        <p className="text-xs font-medium text-gray-500 mb-0.5">{formatKey(key)}</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {value === null || value === undefined ? '—' : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Interne notities
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Voeg interne notities toe..."
                />
              </div>

              {/* Status buttons */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                    <button
                      key={status}
                      onClick={() => setStatus(status)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        selected.status === status
                          ? cfg.button + ' ring-2 ring-offset-1 ring-current'
                          : cfg.button
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <div className="pt-1">
                <button
                  onClick={saveRequest}
                  disabled={saving}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Selecteer een aanvraag om details te bekijken</p>
          </div>
        )}
      </div>
    </div>
  );
}
