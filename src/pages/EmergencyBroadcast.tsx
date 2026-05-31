import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Info, Zap, Save, Eye, ToggleLeft, ToggleRight, Radio } from 'lucide-react';

type BroadcastType = 'info' | 'warning' | 'danger';

interface Broadcast {
  id: string;
  platform: string;
  is_active: boolean;
  type: BroadcastType;
  title: string;
  content: string;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
}

const PLATFORMS = [
  { value: 'bijleer.school', label: 'bijleer.school' },
  { value: 'letterlezer', label: 'LetterLezer' },
  { value: 'all', label: 'Alle platformen' },
];

const TYPE_CONFIG: Record<BroadcastType, { label: string; bg: string; border: string; text: string; iconBg: string; icon: typeof Info }> = {
  info: {
    label: 'Info',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconBg: 'bg-blue-100',
    icon: Info,
  },
  warning: {
    label: 'Waarschuwing',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconBg: 'bg-amber-100',
    icon: AlertTriangle,
  },
  danger: {
    label: 'Gevaar',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconBg: 'bg-red-100',
    icon: Zap,
  },
};

function toLocalDatetime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetime(val: string): string | null {
  if (!val) return null;
  return new Date(val).toISOString();
}

export default function EmergencyBroadcast() {
  const [selectedPlatform, setSelectedPlatform] = useState('bijleer.school');
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<BroadcastType>('info');
  const [content, setContent] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBroadcast();
  }, [selectedPlatform]);

  const fetchBroadcast = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('emergency_broadcasts')
      .select('*')
      .eq('platform', selectedPlatform)
      .maybeSingle();

    if (data) {
      setBroadcast(data);
      setTitle(data.title);
      setType(data.type as BroadcastType);
      setContent(data.content);
      setStartsAt(toLocalDatetime(data.starts_at));
      setEndsAt(toLocalDatetime(data.ends_at));
      setIsActive(data.is_active);
      // Sync editor HTML
      if (editorRef.current) {
        editorRef.current.innerHTML = data.content;
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!broadcast) return;
    setSaving(true);
    await supabase
      .from('emergency_broadcasts')
      .update({
        is_active: isActive,
        type,
        title,
        content,
        starts_at: fromLocalDatetime(startsAt),
        ends_at: fromLocalDatetime(endsAt),
      })
      .eq('platform', selectedPlatform);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    fetchBroadcast();
  };

  const handleToggleActive = async () => {
    if (!broadcast) return;
    setToggleSaving(true);
    const next = !isActive;
    await supabase
      .from('emergency_broadcasts')
      .update({ is_active: next })
      .eq('platform', selectedPlatform);
    setIsActive(next);
    setToggleSaving(false);
  };

  // Rich text commands
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  };

  const handleEditorInput = () => {
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  };

  const cfg = TYPE_CONFIG[type];
  const TypeIcon = cfg.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <Radio className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emergency Broadcast</h1>
          <p className="text-sm text-gray-500">Stuur een dringend bericht naar alle gebruikers van een platform</p>
        </div>
      </div>

      {/* Platform selector + Active toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
          <select
            value={selectedPlatform}
            onChange={e => setSelectedPlatform(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PLATFORMS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Instant toggle */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <div>
            <p className="text-sm font-semibold text-gray-800">Actief</p>
            <p className="text-xs text-gray-500">{isActive ? 'Zichtbaar voor gebruikers' : 'Verborgen voor gebruikers'}</p>
          </div>
          <button
            onClick={handleToggleActive}
            disabled={toggleSaving}
            className="relative focus:outline-none disabled:opacity-50"
            title={isActive ? 'Deactiveer broadcast' : 'Activeer broadcast'}
          >
            {isActive
              ? <ToggleRight className="w-10 h-10 text-green-500" />
              : <ToggleLeft className="w-10 h-10 text-gray-400" />
            }
          </button>
          {isActive && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Korte koptekst die gebruikers als eerste zien..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="flex gap-3">
            {(Object.entries(TYPE_CONFIG) as [BroadcastType, typeof TYPE_CONFIG['info']][]).map(([key, c]) => {
              const Icon = c.icon;
              const selected = type === key;
              return (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    selected
                      ? `${c.bg} ${c.border} ${c.text}`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* WYSIWYG Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bericht</label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <ToolbarBtn onClick={() => exec('bold')} title="Vet"><strong>B</strong></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('italic')} title="Cursief"><em>I</em></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('underline')} title="Onderstrepen"><span className="underline">U</span></ToolbarBtn>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <ToolbarBtn onClick={() => exec('formatBlock', 'h3')} title="Koptekst">H3</ToolbarBtn>
              <ToolbarBtn onClick={() => exec('formatBlock', 'p')} title="Alinea">P</ToolbarBtn>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Opsomming">&#8226; lijst</ToolbarBtn>
              <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Genummerde lijst">1. lijst</ToolbarBtn>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <ToolbarBtn onClick={() => exec('justifyLeft')} title="Links">&#8676;</ToolbarBtn>
              <ToolbarBtn onClick={() => exec('justifyCenter')} title="Midden">&#8596;</ToolbarBtn>
              <ToolbarBtn onClick={() => exec('justifyRight')} title="Rechts">&#8677;</ToolbarBtn>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <select
                onChange={e => exec('foreColor', e.target.value)}
                defaultValue=""
                className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
                title="Tekstkleur"
              >
                <option value="" disabled>Kleur</option>
                <option value="#111827">Zwart</option>
                <option value="#1d4ed8">Blauw</option>
                <option value="#b45309">Oranje</option>
                <option value="#dc2626">Rood</option>
                <option value="#15803d">Groen</option>
              </select>
              <ToolbarBtn
                onClick={() => {
                  const url = prompt('Link URL:');
                  if (url) exec('createLink', url);
                }}
                title="Link invoegen"
              >
                Link
              </ToolbarBtn>
            </div>
            {/* Editable area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              className="min-h-[140px] max-h-80 overflow-y-auto p-4 text-sm text-gray-800 focus:outline-none"
              style={{ lineHeight: '1.6' }}
            />
          </div>
        </div>

        {/* Scheduling */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Planning (optioneel)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Actief vanaf</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={e => setStartsAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Actief tot</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={e => setEndsAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Als beide velden zijn ingevuld, wordt het bericht alleen getoond binnen dit tijdvenster — en enkel wanneer "Actief" aan staat.
          </p>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {broadcast?.updated_at
              ? `Laatste opslag: ${new Date(broadcast.updated_at).toLocaleString('nl-BE')}`
              : ''}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saveSuccess ? (
              <span className="text-green-300">&#10003;</span>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Opslaan...' : saveSuccess ? 'Opgeslagen!' : 'Opslaan'}
          </button>
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Live voorbeeld</span>
          {!isActive && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">inactief — niet zichtbaar voor gebruikers</span>
          )}
        </div>

        {title || content ? (
          <div className={`rounded-xl border-2 p-4 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 p-2 rounded-lg ${cfg.iconBg}`}>
                <TypeIcon className={`w-5 h-5 ${cfg.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                {title && (
                  <p className={`font-semibold text-sm ${cfg.text}`}>{title}</p>
                )}
                {content && (
                  <div
                    className={`mt-1 text-sm ${cfg.text} prose prose-sm max-w-none`}
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                )}
                {(startsAt || endsAt) && (
                  <p className={`mt-2 text-xs opacity-70 ${cfg.text}`}>
                    {startsAt && `Vanaf ${new Date(startsAt).toLocaleString('nl-BE')}`}
                    {startsAt && endsAt && ' · '}
                    {endsAt && `Tot ${new Date(endsAt).toLocaleString('nl-BE')}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            Vul een titel of bericht in om een voorbeeld te zien
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
    >
      {children}
    </button>
  );
}
