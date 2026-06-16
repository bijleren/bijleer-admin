import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, Monitor, Smartphone, Tablet, Globe, TrendingUp, RefreshCw, BarChart2, AlertCircle, ChevronDown } from 'lucide-react';

const DAYS_OPTIONS = [
  { label: 'Laatste 7 dagen', value: 7 },
  { label: 'Laatste 30 dagen', value: 30 },
  { label: 'Laatste 90 dagen', value: 90 },
];

const DEVICE_ICONS: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#2563eb',
  mobile: '#0d9488',
  tablet: '#d97706',
  onbekend: '#6b7280',
};

interface Summary {
  total_views: number;
  unique_paths: number;
  unique_referrers: number;
  views_today: number;
  views_yesterday: number;
}

interface DailyPoint { day: string; views: number }
interface DevicePoint { device_class: string; views: number }
interface ReferrerPoint { referrer_host: string; views: number }
interface PathPoint { page_path: string; views: number }

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{typeof value === 'number' ? value.toLocaleString('nl') : value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function HorizBar({ label, value, max, color, sub }: {
  label: string; value: number; max: number; color: string; sub?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 truncate mr-3">{label}</span>
        <span className="font-bold text-gray-800 shrink-0">{value.toLocaleString('nl')}{sub ? ` ${sub}` : ''}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function DailyChart({ data, days }: { data: DailyPoint[]; days: number }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Geen data beschikbaar</p>;
  }

  // Fill in missing days
  const filled: DailyPoint[] = [];
  const today = new Date();
  const map: Record<string, number> = {};
  for (const d of data) map[d.day] = d.views;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    filled.push({ day: key, views: map[key] ?? 0 });
  }

  const max = Math.max(...filled.map(d => d.views), 1);
  const barW = Math.max(2, Math.floor(600 / filled.length) - 2);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-0.5 h-32 min-w-0" style={{ minWidth: `${filled.length * (barW + 2)}px` }}>
        {filled.map((d) => (
          <div key={d.day} className="flex flex-col items-center justify-end group relative" style={{ width: barW }}>
            <div
              className="w-full rounded-t-sm bg-blue-500 transition-all hover:bg-blue-600 cursor-default"
              style={{ height: `${(d.views / max) * 100}%`, minHeight: d.views > 0 ? 2 : 0 }}
            />
            {d.views > 0 && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                {d.day.slice(5)}: {d.views}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{filled[0]?.day.slice(5)}</span>
        <span>{filled[Math.floor(filled.length / 2)]?.day.slice(5)}</span>
        <span>{filled[filled.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

export default function PageViews() {
  const [days, setDays] = useState(30);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [pathInput, setPathInput] = useState('');
  const [topPaths, setTopPaths] = useState<PathPoint[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [devices, setDevices] = useState<DevicePoint[]>([]);
  const [referrers, setReferrers] = useState<ReferrerPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathDropdownOpen, setPathDropdownOpen] = useState(false);

  const loadTopPaths = useCallback(async () => {
    const { data } = await supabase.rpc('get_pageviews_top_paths', { p_days: days });
    const paths = (data as PathPoint[] | null) ?? [];
    setTopPaths(paths);
    if (paths.length > 0 && !selectedPath) {
      setSelectedPath(paths[0].page_path);
      setPathInput(paths[0].page_path);
    }
  }, [days, selectedPath]);

  const loadData = useCallback(async (path: string) => {
    setRefreshing(true);
    setError(null);
    try {
      const [summaryRes, dailyRes, devicesRes, referrersRes] = await Promise.all([
        supabase.rpc('get_pageviews_summary', { p_days: days }),
        path ? supabase.rpc('get_pageviews_daily', { p_path: path, p_days: days }) : Promise.resolve({ data: [] }),
        path ? supabase.rpc('get_pageviews_by_device', { p_path: path }) : Promise.resolve({ data: [] }),
        supabase.rpc('get_pageviews_top_referrers', { p_days: days, p_path: path || null }),
      ]);
      if (summaryRes.error) throw summaryRes.error;
      setSummary((summaryRes.data as Summary[] | null)?.[0] ?? null);
      setDaily((dailyRes.data as DailyPoint[] | null) ?? []);
      setDevices((devicesRes.data as DevicePoint[] | null) ?? []);
      setReferrers((referrersRes.data as ReferrerPoint[] | null) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fout bij ophalen data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    loadTopPaths();
  }, [days]);

  useEffect(() => {
    if (selectedPath !== undefined) {
      loadData(selectedPath);
    }
  }, [selectedPath, days, loadData]);

  function handleRefresh() {
    loadTopPaths();
    loadData(selectedPath);
  }

  function selectPath(path: string) {
    setSelectedPath(path);
    setPathInput(path);
    setPathDropdownOpen(false);
  }

  const maxDevice = Math.max(...devices.map(d => d.views), 1);
  const maxReferrer = Math.max(...referrers.map(r => r.views), 1);
  const maxPath = Math.max(...topPaths.map(p => p.views), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paginaweergaven</h1>
          <p className="text-sm text-gray-500 mt-0.5">Anonieme bezoekersdata van de publieke PHP-tools</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DAYS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Vernieuwen
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Totaal weergaven" value={summary?.total_views ?? 0} sub={`laatste ${days} dagen`} icon={Eye} color="#2563eb" />
        <StatCard label="Vandaag" value={summary?.views_today ?? 0} sub="weergaven" icon={TrendingUp} color="#16a34a" />
        <StatCard label="Gisteren" value={summary?.views_yesterday ?? 0} sub="weergaven" icon={BarChart2} color="#d97706" />
        <StatCard label="Unieke pagina's" value={summary?.unique_paths ?? 0} sub="paden" icon={Globe} color="#0891b2" />
        <StatCard label="Unieke verwijzers" value={summary?.unique_referrers ?? 0} sub="domeinen" icon={Globe} color="#9333ea" />
      </div>

      {/* Path filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Paginafilter</h2>
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={pathInput}
                onChange={e => setPathInput(e.target.value)}
                onFocus={() => setPathDropdownOpen(true)}
                onKeyDown={e => { if (e.key === 'Enter') { selectPath(pathInput); } if (e.key === 'Escape') setPathDropdownOpen(false); }}
                placeholder="/pagina.php"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setPathDropdownOpen(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              {pathDropdownOpen && topPaths.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                  {topPaths
                    .filter(p => p.page_path.includes(pathInput) || pathInput === '')
                    .map(p => (
                      <button
                        key={p.page_path}
                        onClick={() => selectPath(p.page_path)}
                        className={`w-full text-left px-3 py-2 text-sm font-mono hover:bg-gray-50 flex items-center justify-between ${selectedPath === p.page_path ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                      >
                        <span className="truncate">{p.page_path}</span>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">{p.views.toLocaleString('nl')}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { selectPath(pathInput); }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Toon
            </button>
          </div>
        </div>
      </div>

      {/* Daily chart */}
      {selectedPath && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Dagelijkse weergaven</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{selectedPath}</p>
          </div>
          <DailyChart data={daily} days={days} />
        </div>
      )}

      {/* Device mix + referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedPath && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Apparaattype</h2>
            <p className="text-xs text-gray-400 mb-4">Verdeling voor geselecteerde pagina (30 dagen)</p>
            {devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map(d => {
                  const Icon = DEVICE_ICONS[d.device_class] ?? Monitor;
                  const color = DEVICE_COLORS[d.device_class] ?? '#6b7280';
                  return (
                    <div key={d.device_class} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18' }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 capitalize">{d.device_class}</span>
                          <span className="font-bold text-gray-800">{d.views.toLocaleString('nl')}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(d.views / maxDevice) * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Geen data beschikbaar</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Top verwijzers</h2>
          <p className="text-xs text-gray-400 mb-4">Domeinen die bezoekers sturen (laatste {days} dagen)</p>
          {referrers.length > 0 ? (
            <div className="space-y-3">
              {referrers.map(r => (
                <HorizBar
                  key={r.referrer_host}
                  label={r.referrer_host}
                  value={r.views}
                  max={maxReferrer}
                  color="#2563eb"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Geen verwijzers gevonden</p>
          )}
        </div>
      </div>

      {/* Top paths */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Meest bezochte pagina's</h2>
        <p className="text-xs text-gray-400 mb-4">Top 30 paden, laatste {days} dagen</p>
        {topPaths.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2.5">
            {topPaths.map(p => (
              <button
                key={p.page_path}
                onClick={() => selectPath(p.page_path)}
                className="text-left group"
              >
                <HorizBar
                  label={p.page_path}
                  value={p.views}
                  max={maxPath}
                  color={selectedPath === p.page_path ? '#2563eb' : '#94a3b8'}
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Geen paginaweergaven gevonden</p>
        )}
      </div>
    </div>
  );
}
