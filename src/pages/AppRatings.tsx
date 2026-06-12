import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Star, Search, Globe, Clock, MessageSquare, ExternalLink, BarChart2 } from 'lucide-react';

interface AppRating {
  id: string;
  created_at: string;
  app_id: string;
  rating: number;
  comment: string | null;
  user_id: string | null;
  user_email: string | null;
  session_ms: number | null;
  url: string | null;
  user_agent: string | null;
  locale: string | null;
}

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${cls} ${n <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </span>
  );
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export default function AppRatings() {
  const [ratings, setRatings] = useState<AppRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AppRating | null>(null);
  const [search, setSearch] = useState('');
  const [filterApp, setFilterApp] = useState('all');
  const [filterRating, setFilterRating] = useState('all');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_ratings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRatings(data || []);
    } catch (err) {
      console.error('Error loading ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  const appIds = Array.from(new Set(ratings.map(r => r.app_id))).sort();

  const filtered = ratings.filter(r => {
    if (filterApp !== 'all' && r.app_id !== filterApp) return false;
    if (filterRating !== 'all' && r.rating !== Number(filterRating)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.comment || '').toLowerCase().includes(q) ||
        (r.user_email || '').toLowerCase().includes(q) ||
        r.app_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const avgRating = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : '—';
  const withComment = ratings.filter(r => r.comment).length;

  const ratingDist = [5, 4, 3, 2, 1].map(n => ({
    n,
    count: ratings.filter(r => r.rating === n).length,
  }));

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
        <h1 className="text-3xl font-bold text-gray-900 mb-1">App Ratings</h1>
        <p className="text-gray-500">Beoordelingen gegeven door gebruikers in de app</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Totaal</p>
          <p className="text-3xl font-bold text-gray-900">{ratings.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Gemiddeld</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-gray-900">{avgRating}</p>
            {ratings.length > 0 && <Stars rating={Math.round(Number(avgRating))} />}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Met reactie</p>
          <p className="text-3xl font-bold text-gray-900">{withComment}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Apps</p>
          <p className="text-3xl font-bold text-gray-900">{appIds.length}</p>
        </div>
      </div>

      {/* Rating distribution */}
      {ratings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-700">Verdeling</p>
          </div>
          <div className="space-y-2">
            {ratingDist.map(({ n, count }) => (
              <div key={n} className="flex items-center gap-3">
                <span className="w-4 text-sm text-gray-600 text-right shrink-0">{n}</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-2 rounded-full transition-all"
                    style={{ width: ratings.length ? `${(count / ratings.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-6 text-sm text-gray-500 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek op reactie, e-mail, app..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {appIds.length > 1 && (
          <select
            value={filterApp}
            onChange={e => setFilterApp(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle apps</option>
            {appIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        )}
        <select
          value={filterRating}
          onChange={e => setFilterRating(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alle scores</option>
          {[5, 4, 3, 2, 1].map(n => (
            <option key={n} value={n}>{n} ster{n !== 1 ? 'ren' : ''}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Beoordelingen</h2>
            <span className="text-sm text-gray-500">{filtered.length} resultaten</span>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[calc(100vh-520px)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Star className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Geen beoordelingen gevonden</p>
              </div>
            ) : (
              filtered.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 transition-colors ${
                    selected?.id === r.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <Stars rating={r.rating} />
                    <span className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('nl-BE')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {r.app_id}
                    </span>
                    {r.locale && (
                      <span className="text-xs text-gray-400">{r.locale}</span>
                    )}
                  </div>
                  {r.comment ? (
                    <p className="text-sm text-gray-700 line-clamp-2">{r.comment}</p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Geen reactie</p>
                  )}
                  {r.user_email && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{r.user_email}</p>
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
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-1">
                  <Stars rating={selected.rating} size="lg" />
                  <span className="text-sm font-medium text-gray-500">{selected.rating}/5</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {selected.app_id}
                </span>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-380px)] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Datum</p>
                    <p className="text-gray-900">{new Date(selected.created_at).toLocaleString('nl-BE')}</p>
                  </div>
                  {selected.session_ms !== null && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Sessieduur</p>
                        <p className="text-gray-900">{formatDuration(selected.session_ms)}</p>
                      </div>
                    </div>
                  )}
                  {selected.user_email && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Gebruiker</p>
                      <p className="text-gray-900 break-all">{selected.user_email}</p>
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

                {selected.comment && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reactie</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-900 whitespace-pre-wrap">
                      {selected.comment}
                    </div>
                  </div>
                )}

                {selected.url && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Pagina</p>
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline break-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      {selected.url}
                    </a>
                  </div>
                )}

                {selected.user_agent && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">User Agent</p>
                    <p className="text-xs text-gray-500 font-mono break-all bg-gray-50 rounded p-3">
                      {selected.user_agent}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-gray-300">
              <Star className="w-14 h-14 mb-3" />
              <p className="text-gray-400 text-sm">Selecteer een beoordeling om te bekijken</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
