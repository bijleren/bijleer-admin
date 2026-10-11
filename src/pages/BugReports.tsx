import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bug, Calendar, User, Monitor, Globe, AlertTriangle, ChevronDown, ChevronUp, Tag, FileText, Clock, CheckCircle, XCircle, Search, Eye, Download, Mail } from 'lucide-react';

interface ConsoleError {
  level: 'error' | 'warn' | 'uncaught' | 'unhandledrejection';
  message: string;
  stack: string | null;
  ts: number;
}

interface BugReport {
  id: string;
  created_at: string;
  type: string;
  title: string;
  description: string;
  user_id: string | null;
  user_email: string | null;
  url: string | null;
  user_agent: string | null;
  viewport: string | null;
  locale: string | null;
  ip: string | null;
  screenshot: string | null;
  console_errors: ConsoleError[] | null;
  status: string;
  notes: string | null;
  external_notes: string | null;
  emailed_at: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  suggestie: 'Suggestie',
  vraag: 'Vraag',
};

const STATUS_CONFIG = {
  new: { label: 'Nieuw', color: 'bg-blue-100 text-blue-800', icon: AlertTriangle },
  triaged: { label: 'Getriaged', color: 'bg-amber-100 text-amber-800', icon: Clock },
  fixed: { label: 'Opgelost', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  wontfix: { label: 'Niet opgelost', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const TYPE_CONFIG = {
  bug: { label: 'Bug', color: 'bg-red-100 text-red-700' },
  suggestie: { label: 'Suggestie', color: 'bg-teal-100 text-teal-700' },
  vraag: { label: 'Vraag', color: 'bg-sky-100 text-sky-700' },
};

const CONSOLE_LEVEL_COLOR: Record<string, string> = {
  error: 'text-red-600',
  uncaught: 'text-red-600',
  unhandledrejection: 'text-orange-500',
  warn: 'text-amber-500',
};

export default function BugReports() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BugReport | null>(null);
  const [notes, setNotes] = useState('');
  const [externalNotes, setExternalNotes] = useState('');
  const [savingExternalNotes, setSavingExternalNotes] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [search, setSearch] = useState('');
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('id,created_at,type,title,description,user_email,url,viewport,locale,ip,status,notes,external_notes,emailed_at,user_agent,user_id,console_errors,screenshot')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error loading bug reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('bug_reports').update({ status }).eq('id', id);
    if (error) { console.error(error); return; }
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    const { error } = await supabase.from('bug_reports').update({ notes }).eq('id', selected.id);
    setSavingNotes(false);
    if (error) { console.error(error); return; }
    setReports(prev => prev.map(r => r.id === selected.id ? { ...r, notes } : r));
    setSelected(prev => prev ? { ...prev, notes } : prev);
  };

  const saveExternalNotes = async () => {
    if (!selected) return;
    setSavingExternalNotes(true);
    const { error } = await supabase.from('bug_reports').update({ external_notes: externalNotes || null }).eq('id', selected.id);
    setSavingExternalNotes(false);
    if (error) { console.error(error); return; }
    setReports(prev => prev.map(r => r.id === selected.id ? { ...r, external_notes: externalNotes || null } : r));
    setSelected(prev => prev ? { ...prev, external_notes: externalNotes || null } : prev);
  };

  const toggleEmailed = async () => {
    if (!selected) return;
    const emailed_at = selected.emailed_at ? null : new Date().toISOString();
    const { error } = await supabase.from('bug_reports').update({ emailed_at }).eq('id', selected.id);
    if (error) { console.error(error); return; }
    setReports(prev => prev.map(r => r.id === selected.id ? { ...r, emailed_at } : r));
    setSelected(prev => prev ? { ...prev, emailed_at } : prev);
  };

  const selectReport = (report: BugReport) => {
    setSelected(report);
    setNotes(report.notes || '');
    setExternalNotes(report.external_notes || '');
    setScreenshotOpen(false);
    setErrorsOpen(false);
  };

  const getOrigin = (url: string | null): string | null => {
    if (!url) return null;
    try { return new URL(url).origin; } catch { return null; }
  };

  const platforms = Array.from(
    new Set(reports.map(r => getOrigin(r.url)).filter(Boolean) as string[])
  ).sort();

  const filtered = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterPlatform !== 'all' && getOrigin(r.url) !== filterPlatform) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) ||
        (r.user_email || '').toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);
    }
    return true;
  });

  const newCount = reports.filter(r => r.status === 'new').length;

  const exportCsv = (data: BugReport[], filename: string) => {
    const headers = ['id', 'datum', 'type', 'status', 'titel', 'beschrijving', 'gebruiker', 'url', 'viewport', 'locale', 'notities'];
    const statusLabel = (s: string) => STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s;
    const typeLabel = (t: string) => TYPE_LABELS[t] ?? t;
    const escape = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const rows = data.map(r => [
      escape(r.id),
      escape(new Date(r.created_at).toLocaleString('nl-BE')),
      escape(typeLabel(r.type)),
      escape(statusLabel(r.status)),
      escape(r.title),
      escape(r.description),
      escape(r.user_email),
      escape(r.url),
      escape(r.viewport),
      escape(r.locale),
      escape(r.notes),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.new;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  const TypeBadge = ({ type }: { type: string }) => {
    const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] || { label: type, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        <Tag className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Bug Reports</h1>
            {newCount > 0 && (
              <span className="px-2.5 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">{newCount} nieuw</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => exportCsv(reports.filter(r => r.status !== 'fixed'), 'bug-reports-actief.csv')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporteer actief
            </button>
            <button
              onClick={() => exportCsv(reports, 'bug-reports-alles.csv')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporteer alles
            </button>
          </div>
        </div>
        <p className="text-gray-500">In-app meldingen van fouten, suggesties en vragen</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek op titel, e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alle statussen</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alle types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {platforms.length > 0 && (
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle platforms</option>
            {platforms.map(p => (
              <option key={p} value={p}>{p.replace(/^https?:\/\//, '')}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Meldingen</h2>
            <span className="text-sm text-gray-500">{filtered.length} resultaten</span>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[calc(100vh-340px)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Bug className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Geen meldingen gevonden</p>
              </div>
            ) : (
              filtered.map(report => (
                <button
                  key={report.id}
                  onClick={() => selectReport(report)}
                  className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 transition-colors ${
                    selected?.id === report.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className={`font-medium text-sm leading-snug flex-1 ${selected?.id === report.id ? 'text-blue-900' : 'text-gray-900'}`}>
                      {report.title}
                    </p>
                    <StatusBadge status={report.status} />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{report.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <TypeBadge type={report.type} />
                    {report.user_email && (
                      <span className="text-xs text-gray-500 truncate max-w-[160px]">{report.user_email}</span>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleDateString('nl-BE')}
                    </span>
                  </div>
                  {report.console_errors && report.console_errors.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                      <AlertTriangle className="w-3 h-3" />
                      {report.console_errors.length} console fout{report.console_errors.length !== 1 ? 'en' : ''}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div>
          {selected ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{selected.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selected.status} />
                  <TypeBadge type={selected.type} />
                </div>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selected.user_email && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Gebruiker</p>
                        <p className="text-gray-900 break-all">{selected.user_email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Datum</p>
                      <p className="text-gray-900">{new Date(selected.created_at).toLocaleString('nl-BE')}</p>
                    </div>
                  </div>
                  {selected.viewport && (
                    <div className="flex items-start gap-2">
                      <Monitor className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Viewport</p>
                        <p className="text-gray-900">{selected.viewport}</p>
                      </div>
                    </div>
                  )}
                  {selected.locale && (
                    <div className="flex items-start gap-2">
                      <Globe className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Locale</p>
                        <p className="text-gray-900">{selected.locale}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selected.url && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Pagina</p>
                    <a href={selected.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all">
                      {selected.url}
                    </a>
                  </div>
                )}

                {/* Description */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Beschrijving</p>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-900 whitespace-pre-wrap">
                    {selected.description}
                  </div>
                </div>

                {/* Screenshot */}
                {selected.screenshot && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setScreenshotOpen(o => !o)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                    >
                      <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Screenshot</span>
                      {screenshotOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {screenshotOpen && (
                      <div className="p-3">
                        <img src={selected.screenshot} alt="Screenshot" className="w-full rounded border border-gray-200" />
                      </div>
                    )}
                  </div>
                )}

                {/* Console errors */}
                {selected.console_errors && selected.console_errors.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setErrorsOpen(o => !o)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        Console fouten ({selected.console_errors.length})
                      </span>
                      {errorsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {errorsOpen && (
                      <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                        {selected.console_errors.map((err, i) => (
                          <div key={i} className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold uppercase ${CONSOLE_LEVEL_COLOR[err.level] || 'text-gray-600'}`}>
                                {err.level}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(err.ts).toLocaleTimeString('nl-BE')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-800 font-mono break-all">{err.message}</p>
                            {err.stack && (
                              <pre className="mt-1 text-xs text-gray-400 font-mono whitespace-pre-wrap break-all line-clamp-4">{err.stack}</pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Internal notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Interne notities
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Voeg interne notities toe..."
                  />
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="mt-2 px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {savingNotes ? 'Opslaan...' : 'Notities opslaan'}
                  </button>
                </div>

                {/* External notes */}
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-teal-700 uppercase tracking-wide mb-2">
                    <Eye className="w-3.5 h-3.5" />
                    Externe notities
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-teal-100 text-teal-600 text-[10px] font-semibold normal-case tracking-normal">Zichtbaar voor eindgebruikers</span>
                  </label>
                  <textarea
                    value={externalNotes}
                    onChange={e => setExternalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-teal-300 bg-white rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="Voeg een reactie toe die zichtbaar is voor de eindgebruiker..."
                  />
                  <button
                    onClick={saveExternalNotes}
                    disabled={savingExternalNotes}
                    className="mt-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {savingExternalNotes ? 'Opslaan...' : 'Externe notities opslaan'}
                  </button>
                  {selected.user_email && (
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-teal-200 pt-3">
                      <span className="flex items-center gap-1.5 text-sm text-teal-800">
                        <Mail className="w-3.5 h-3.5" />
                        {selected.emailed_at
                          ? `Gemaild op ${new Date(selected.emailed_at).toLocaleDateString('nl-BE')}`
                          : 'Nog niet gemaild'}
                      </span>
                      <button
                        onClick={toggleEmailed}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-teal-300 bg-white text-teal-700 hover:bg-teal-100 transition-colors"
                      >
                        {selected.emailed_at ? 'Markering wissen' : 'Markeer als gemaild'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status wijzigen</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(STATUS_CONFIG).map(([value, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={value}
                          onClick={() => updateStatus(selected.id, value)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selected.status === value
                              ? cfg.color + ' ring-2 ring-offset-1 ring-current'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-gray-300">
              <Bug className="w-14 h-14 mb-3" />
              <p className="text-gray-400 text-sm">Selecteer een melding om te bekijken</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
