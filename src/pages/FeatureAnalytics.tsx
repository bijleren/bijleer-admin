import { useEffect, useState } from 'react';
import { Loader2, Globe, AlertTriangle, QrCode, BookOpen, BookMarked, Search, Map, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FeatureStat {
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  total: number;
  yesterday: number;
  today: number;
}

interface RawCounts {
  webwijzer_total: number;
  webwijzer_logins_total: number;
  incidents_total: number;
  qr_codes_total: number;
  qr_views_total: number;
  reading_total: number;
  books_total: number;
  book_loans_total: number;
  zoeker_total: number;
  sporen_total: number;

  webwijzer_yesterday: number;
  webwijzer_logins_yesterday: number;
  incidents_yesterday: number;
  qr_codes_yesterday: number;
  qr_views_yesterday: number;
  reading_yesterday: number;
  books_yesterday: number;
  book_loans_yesterday: number;
  zoeker_yesterday: number;
  sporen_yesterday: number;

  webwijzer_today: number;
  webwijzer_logins_today: number;
  incidents_today: number;
  qr_codes_today: number;
  qr_views_today: number;
  reading_today: number;
  books_today: number;
  book_loans_today: number;
  zoeker_today: number;
  sporen_today: number;
}

export default function FeatureAnalytics() {
  const [counts, setCounts] = useState<RawCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/feature-analytics`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCounts(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !counts) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const features: FeatureStat[] = [
    {
      label: 'Webwijzers',
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      total: counts.webwijzer_total,
      yesterday: counts.webwijzer_yesterday,
      today: counts.webwijzer_today,
    },
    {
      label: 'Webwijzers — ingelogd',
      sublabel: 'leerlingen ingelogd',
      icon: Globe,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      total: counts.webwijzer_logins_total,
      yesterday: counts.webwijzer_logins_yesterday,
      today: counts.webwijzer_logins_today,
    },
    {
      label: 'Gedragsincidenten',
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      total: counts.incidents_total,
      yesterday: counts.incidents_yesterday,
      today: counts.incidents_today,
    },
    {
      label: 'BlinkQR — codes',
      sublabel: 'aangemaakt',
      icon: QrCode,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      total: counts.qr_codes_total,
      yesterday: counts.qr_codes_yesterday,
      today: counts.qr_codes_today,
    },
    {
      label: 'BlinkQR — scans',
      sublabel: 'bekeken',
      icon: QrCode,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      total: counts.qr_views_total,
      yesterday: counts.qr_views_yesterday,
      today: counts.qr_views_today,
    },
    {
      label: 'Leesactiviteiten',
      icon: BookOpen,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      total: counts.reading_total,
      yesterday: counts.reading_yesterday,
      today: counts.reading_today,
    },
    {
      label: 'Booker — boeken',
      sublabel: 'in bibliotheek',
      icon: BookMarked,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      total: counts.books_total,
      yesterday: counts.books_yesterday,
      today: counts.books_today,
    },
    {
      label: 'Booker — uitleningen',
      sublabel: 'uitgelend',
      icon: BookMarked,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      total: counts.book_loans_total,
      yesterday: counts.book_loans_yesterday,
      today: counts.book_loans_today,
    },
    {
      label: 'Zoeker',
      icon: Search,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      total: counts.zoeker_total,
      yesterday: counts.zoeker_yesterday,
      today: counts.zoeker_today,
    },
    {
      label: 'Sporen',
      icon: Map,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      total: counts.sporen_total,
      yesterday: counts.sporen_yesterday,
      today: counts.sporen_today,
    },
  ];

  const todayDate = new Date();
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString('nl-BE');

  const Trend = ({ today, yesterday }: { today: number; yesterday: number }) => {
    if (yesterday === 0 && today === 0) return <Minus className="w-4 h-4 text-gray-300" />;
    if (yesterday === 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    const pct = ((today - yesterday) / yesterday) * 100;
    if (Math.abs(pct) < 5) return <Minus className="w-4 h-4 text-gray-400" />;
    if (pct > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    return <TrendingDown className="w-4 h-4 text-rose-500" />;
  };

  // Max total for the bar chart scaling
  const maxTotal = Math.max(...features.map(f => f.total), 1);

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feature Analytics</h1>
        <p className="text-gray-600 mt-1">Groei per functie — totaal, gisteren en vandaag</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Totaal records', value: features.reduce((s, f) => s + f.total, 0) },
          { label: 'Gisteren toegevoegd', value: features.reduce((s, f) => s + f.yesterday, 0) },
          { label: 'Vandaag toegevoegd', value: features.reduce((s, f) => s + f.today, 0) },
          { label: 'Functies actief', value: features.filter(f => f.today > 0 || f.yesterday > 0).length },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm text-gray-500 font-medium">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div className="col-span-4">Functie</div>
            <div className="col-span-4">Totaal gebruik</div>
            <div className="col-span-2 text-center">{fmtDate(yesterdayDate)}</div>
            <div className="col-span-2 text-center">{fmtDate(todayDate)}</div>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {features.map((f) => {
            const barPct = (f.total / maxTotal) * 100;
            return (
              <div key={f.label} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Feature name */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${f.bgColor} flex-shrink-0`}>
                      <f.icon className={`w-4 h-4 ${f.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{f.label}</p>
                      {f.sublabel && <p className="text-xs text-gray-400">{f.sublabel}</p>}
                    </div>
                  </div>

                  {/* Total with bar */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900 w-12 flex-shrink-0">
                        {fmt(f.total)}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${f.bgColor.replace('bg-', 'bg-').replace('-50', '-400')}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Yesterday */}
                  <div className="col-span-2 flex items-center justify-center gap-1.5">
                    <span className={`text-sm font-semibold ${f.yesterday > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                      {f.yesterday > 0 ? `+${fmt(f.yesterday)}` : '—'}
                    </span>
                  </div>

                  {/* Today */}
                  <div className="col-span-2 flex items-center justify-center gap-1.5">
                    <span className={`text-sm font-semibold ${f.today > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                      {f.today > 0 ? `+${fmt(f.today)}` : '—'}
                    </span>
                    <Trend today={f.today} yesterday={f.yesterday} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar chart — today vs yesterday per feature */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Dagelijkse activiteit per functie</h2>

        {(() => {
          const allVals = features.flatMap(f => [f.yesterday, f.today]);
          const chartMax = Math.max(...allVals, 1);
          const fmtV = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

          return (
            <div className="space-y-6">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-400" />
                  <span className="text-gray-600">{fmtDate(yesterdayDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-600" />
                  <span className="text-gray-600">{fmtDate(todayDate)}</span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[100, 75, 50, 25, 0].map(pct => (
                    <div key={pct} className="flex items-center w-full">
                      <span className="text-xs text-gray-400 w-10 text-right mr-2">
                        {fmtV(Math.round((chartMax * pct) / 100))}
                      </span>
                      <div className="flex-1 border-t border-gray-100" />
                    </div>
                  ))}
                </div>

                <div className="flex items-end justify-around gap-1 h-64 pb-2 pl-12">
                  {features.map(f => {
                    const yH = (f.yesterday / chartMax) * 100;
                    const tH = (f.today / chartMax) * 100;
                    return (
                      <div key={f.label} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                        <div className="flex items-end gap-0.5 h-48 w-full justify-center">
                          <div
                            title={`${f.label} gisteren: ${f.yesterday}`}
                            className="bg-gray-400 hover:bg-gray-500 rounded-t transition-colors flex items-start justify-center pt-1"
                            style={{ height: `${yH}%`, minHeight: f.yesterday > 0 ? '20px' : '0', width: '1.5rem' }}
                          >
                            {f.yesterday > 0 && (
                              <span className="text-white text-[9px] font-medium leading-none">{fmtV(f.yesterday)}</span>
                            )}
                          </div>
                          <div
                            title={`${f.label} vandaag: ${f.today}`}
                            className="bg-blue-600 hover:bg-blue-700 rounded-t transition-colors flex items-start justify-center pt-1"
                            style={{ height: `${tH}%`, minHeight: f.today > 0 ? '20px' : '0', width: '1.5rem' }}
                          >
                            {f.today > 0 && (
                              <span className="text-white text-[9px] font-medium leading-none">{fmtV(f.today)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500 text-center leading-tight w-full px-1 truncate">
                          {f.label.replace(' — ', '\n').split(' — ')[0]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
