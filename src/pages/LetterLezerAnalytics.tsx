import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Smartphone, Activity, Users, TrendingUp, TrendingDown,
  CheckCircle, XCircle, BarChart2, RefreshCw, AlertCircle, Clock, Eye
} from 'lucide-react';

const EDGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/letterlezer-analytics`;

const EXERCISE_LABELS: Record<string, string> = {
  letterReader:  'Letterlezer',
  scanLetters:   'Letters scannen',
  wordReader:    'Woordlezer',
  layThisWord:   'Leg dit woord',
  listenAndPick: 'Klank en letter',
  wordSearch:    'Woordzoeker',
};

const EXERCISE_COLORS = ['#2563eb', '#0d9488', '#d97706', '#dc2626', '#16a34a', '#0891b2'];

interface OverviewData {
  todayActiveDevices: number;
  yesterdayActiveDevices: number;
  weekActiveDevices: number;
  totalEvents: number;
  latestActivityDate: string;
  isLive: boolean;
}
interface DailyPoint { day: string; devices: number }
interface ExerciseEntry { mode: string; opens: number }
interface OnboardingData {
  installs: number; onboardingCompleted: number;
  firstExercise: number; onboardingRate: number; exerciseRate: number;
}
interface QualityData {
  scan: { hits: number; misses: number; rate: number | null };
  lay:  { correct: number; wrong: number; rate: number | null };
  listen: { correct: number; wrong: number; rate: number | null };
}
interface PhonemeEntry { phoneme: string; correct: number; wrong: number; total: number; wrongPct: number }
interface WordsearchData { started: number; completed: number; abandonmentPct: number }
interface VersionEntry { version: string; devices: number }
interface WordEntry { word: string; finds: number }
interface MissEntry { seen: string; count: number }
interface SessionsData { totalDevices: number; totalSessions: number; avgSessions: number; distribution: Record<string, number> }
interface SessionLengthData { medianSeconds: number | null; avgSeconds: number | null; sessionCount: number }
interface WordsearchEfficiency { avgFound: number | null; avgTotal: number | null; avgCompletionPct: number | null; roundCount: number }
interface PhraseEntry { phrase: string; reads: number }
interface LaywordEntry { word: string; correct: number; wrong: number; total: number; wrongPct: number }
interface ExerciseTimeEntry { mode: string; avgSeconds: number; totalSeconds: number; sessions: number }
interface AppActivityDay { day: string; launched: number; foregrounded: number; backgrounded: number }
interface AppActivityData { daily: AppActivityDay[]; totals: { launched: number; foregrounded: number; backgrounded: number } }
interface WritingPhonemeEntry { phoneme: string; shown: number; completed: number; completionRate: number }
interface WritingStatsData { totalShown: number; totalCompleted: number; completionRate: number | null; phonemes: WritingPhonemeEntry[] }

async function fetchEndpoint<T>(endpoint: string, token: string): Promise<T | null> {
  const res = await fetch(`${EDGE_FN}?endpoint=${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

function formatSeconds(s: number | null): string {
  if (s === null) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function StatCard({
  label, value, sub, icon: Icon, iconBg, iconColor, trend
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  trend?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {trend >= 0
                ? <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {trend >= 0 ? '+' : ''}{trend} vs gisteren
              </span>
            </div>
          )}
        </div>
        <div className={`${iconBg} p-4 rounded-full`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function AccuracyBar({ label, rate, correct, wrong }: { label: string; rate: number | null; correct: number; wrong: number }) {
  const total = correct + wrong;
  if (total === 0) return null;
  const r = rate ?? 0;
  const color = r >= 80 ? '#16a34a' : r >= 60 ? '#d97706' : '#dc2626';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-bold" style={{ color }}>{r}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${r}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{correct} correct</span>
        <span>{wrong} fout</span>
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: DailyPoint[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.devices), 1);
  const recent = data.slice(-30);
  return (
    <div className="flex items-end gap-0.5 h-20">
      {recent.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center justify-end group relative">
          <div
            className="w-full bg-blue-500 rounded-sm transition-opacity hover:opacity-80 cursor-default"
            style={{ height: `${(d.devices / max) * 100}%`, minHeight: 2 }}
          />
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
            <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              {d.day}: {d.devices}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExerciseChart({ data }: { data: ExerciseEntry[] }) {
  if (!data.length) return <p className="text-sm text-gray-400">Geen data</p>;
  const max = Math.max(...data.map(d => d.opens), 1);
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.mode} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{EXERCISE_LABELS[item.mode] ?? item.mode}</span>
            <span className="text-gray-500">{item.opens.toLocaleString()}x</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(item.opens / max) * 100}%`, backgroundColor: EXERCISE_COLORS[i % EXERCISE_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelStep({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? Math.round(100 * count / total) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-36 text-sm text-gray-600 shrink-0">{label}</div>
      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
        <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        <span className="absolute inset-0 flex items-center px-3 text-sm font-semibold text-gray-800">
          {count.toLocaleString()}
        </span>
      </div>
      <div className="w-12 text-right text-sm font-medium text-gray-500">{pct}%</div>
    </div>
  );
}

function WordRankList({ items, valueKey, labelKey, valueLabel }: {
  items: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  valueLabel: string;
}) {
  if (!items.length) return <p className="text-sm text-gray-400">Geen data</p>;
  const max = Math.max(...items.map(i => i[valueKey] as number), 1);
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="w-5 text-xs text-gray-400 text-right shrink-0">{idx + 1}</span>
          <span className="w-28 font-mono text-sm text-gray-800 truncate shrink-0">{item[labelKey] as string}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${((item[valueKey] as number) / max) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-gray-600 w-12 text-right shrink-0">
            {(item[valueKey] as number).toLocaleString()} {valueLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

function HardWordList({ items }: { items: LaywordEntry[] | PhonemeEntry[] }) {
  if (!items.length) return <p className="text-sm text-gray-400">Onvoldoende data</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const label = 'word' in item ? item.word : item.phoneme;
        const pct = item.wrongPct;
        const color = pct >= 70 ? '#dc2626' : pct >= 40 ? '#d97706' : '#16a34a';
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="w-20 font-mono text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-center truncate">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-medium w-10 text-right shrink-0" style={{ color }}>{pct}%</span>
            <span className="text-xs text-gray-400 w-16 text-right shrink-0">{item.total} poging{item.total !== 1 ? 'en' : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function LetterLezerAnalytics() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [quality, setQuality] = useState<QualityData | null>(null);
  const [phonemes, setPhonemes] = useState<PhonemeEntry[]>([]);
  const [wordsearch, setWordsearch] = useState<WordsearchData | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [foundWords, setFoundWords] = useState<WordEntry[]>([]);
  const [missedScans, setMissedScans] = useState<MissEntry[]>([]);
  const [sessionsData, setSessionsData] = useState<SessionsData | null>(null);
  const [sessionLength, setSessionLength] = useState<SessionLengthData | null>(null);
  const [wsEfficiency, setWsEfficiency] = useState<WordsearchEfficiency | null>(null);
  const [topPhrases, setTopPhrases] = useState<PhraseEntry[]>([]);
  const [hardLaywords, setHardLaywords] = useState<LaywordEntry[]>([]);
  const [exerciseTime, setExerciseTime] = useState<ExerciseTimeEntry[]>([]);
  const [appActivity, setAppActivity] = useState<AppActivityData | null>(null);
  const [writingStats, setWritingStats] = useState<WritingStatsData | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, []);

  useEffect(() => {
    if (token !== null) loadAll();
  }, [token]);

  async function loadAll() {
    if (!token) { setError('Niet ingelogd'); setLoading(false); return; }
    setRefreshing(true);
    try {
      const [ov, dly, ex, ob, q, ph, ws, ver, fw, ms, sd, sl, wse, tp, hl, et, aa, wst] = await Promise.all([
        fetchEndpoint<OverviewData>('overview', token),
        fetchEndpoint<{ daily: DailyPoint[] }>('daily_active_devices', token),
        fetchEndpoint<{ exercises: ExerciseEntry[] }>('exercise_popularity', token),
        fetchEndpoint<OnboardingData>('onboarding_funnel', token),
        fetchEndpoint<QualityData>('recognition_quality', token),
        fetchEndpoint<{ phonemes: PhonemeEntry[] }>('hardest_phonemes', token),
        fetchEndpoint<WordsearchData>('wordsearch_abandonment', token),
        fetchEndpoint<{ versions: VersionEntry[] }>('app_versions', token),
        fetchEndpoint<{ words: WordEntry[] }>('most_found_words', token),
        fetchEndpoint<{ misses: MissEntry[] }>('top_missed_scans', token),
        fetchEndpoint<SessionsData>('sessions_per_device', token),
        fetchEndpoint<SessionLengthData>('session_length', token),
        fetchEndpoint<WordsearchEfficiency>('wordsearch_efficiency', token),
        fetchEndpoint<{ phrases: PhraseEntry[] }>('top_phrases', token),
        fetchEndpoint<{ words: LaywordEntry[] }>('hardest_laywords', token),
        fetchEndpoint<{ modes: ExerciseTimeEntry[] }>('exercise_time', token),
        fetchEndpoint<AppActivityData>('app_activity', token),
        fetchEndpoint<WritingStatsData>('writing_stats', token),
      ]);
      setOverview(ov);
      setDaily(dly?.daily ?? []);
      setExercises(ex?.exercises ?? []);
      setOnboarding(ob);
      setQuality(q);
      setPhonemes(ph?.phonemes ?? []);
      setWordsearch(ws);
      setVersions(ver?.versions ?? []);
      setFoundWords(fw?.words ?? []);
      setMissedScans(ms?.misses ?? []);
      setSessionsData(sd);
      setSessionLength(sl);
      setWsEfficiency(wse);
      setTopPhrases(tp?.phrases ?? []);
      setHardLaywords(hl?.words ?? []);
      setExerciseTime(et?.modes ?? []);
      setAppActivity(aa);
      setWritingStats(wst);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Fout bij laden</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const todayTrend = overview
    ? overview.todayActiveDevices - overview.yesterdayActiveDevices
    : undefined;

  const isLive = overview?.isLive ?? true;
  const latestDate = overview?.latestActivityDate;
  const latestDateFormatted = latestDate
    ? new Date(latestDate + 'T12:00:00Z').toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Label the "today" card relative to actual latest activity
  const todayLabel = isLive ? 'Actieve apparaten vandaag' : `Actief op ${latestDateFormatted}`;
  const yesterdayLabel = isLive ? 'Gisteren actief' : 'Dag ervoor actief';

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LetterLezer</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              iOS app analytics{isLive ? ' — live data' : ` — laatste activiteit: ${latestDateFormatted}`}
            </p>
          </div>
        </div>
        <button
          onClick={loadAll}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Vernieuwen
        </button>
      </div>

      {/* Stale data notice */}
      {!isLive && latestDateFormatted && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            Geen activiteit vandaag. Statistieken zijn gebaseerd op de meest recente sessie van <strong>{latestDateFormatted}</strong>. Tijdvensters zijn automatisch aangepast.
          </span>
        </div>
      )}

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label={todayLabel}
          value={overview?.todayActiveDevices ?? '—'}
          icon={Smartphone}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          trend={todayTrend}
        />
        <StatCard
          label="Actieve apparaten (7d)"
          value={overview?.weekActiveDevices ?? '—'}
          sub="unieke apparaten"
          icon={Users}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard
          label={yesterdayLabel}
          value={overview?.yesterdayActiveDevices ?? '—'}
          icon={Activity}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Totaal events"
          value={overview?.totalEvents?.toLocaleString() ?? '—'}
          icon={BarChart2}
          iconBg="bg-gray-50"
          iconColor="text-gray-600"
        />
      </div>

      {/* Engagement depth: sessions per device + session length */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Sessies per apparaat</h2>
          <p className="text-xs text-gray-400 mb-5">Laatste 7 dagen</p>
          {sessionsData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{sessionsData.totalDevices}</p>
                  <p className="text-xs text-gray-500 mt-1">apparaten</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{sessionsData.totalSessions}</p>
                  <p className="text-xs text-gray-500 mt-1">sessies totaal</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{sessionsData.avgSessions}</p>
                  <p className="text-xs text-gray-500 mt-1">gem. per apparaat</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Verdeling aantal sessies</p>
                <div className="flex items-end gap-2 h-16">
                  {Object.entries(sessionsData.distribution).map(([bucket, count]) => {
                    const maxCount = Math.max(...Object.values(sessionsData.distribution), 1);
                    return (
                      <div key={bucket} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-blue-500 rounded-sm" style={{ height: `${(count / maxCount) * 100}%`, minHeight: count ? 4 : 0 }} />
                        <span className="text-xs text-gray-500">{bucket}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Sessieduur</h2>
          <p className="text-xs text-gray-400 mb-5">Laatste 7 dagen</p>
          {sessionLength ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatSeconds(sessionLength.medianSeconds)}</p>
                  <p className="text-xs text-gray-500">mediaan</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Gemiddeld</span>
                  <span className="font-semibold text-gray-800">{formatSeconds(sessionLength.avgSeconds)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sessies gemeten</span>
                  <span className="font-semibold text-gray-800">{sessionLength.sessionCount}</span>
                </div>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>
      </div>

      {/* Daily active devices chart + Onboarding funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Dagelijkse actieve apparaten</h2>
          <p className="text-xs text-gray-400 mb-4">Afgelopen 30 dagen</p>
          {daily.length > 0
            ? <MiniBarChart data={daily} />
            : <p className="text-sm text-gray-400">Geen data</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Onboarding funnel</h2>
          <p className="text-xs text-gray-400 mb-5">Alle tijd</p>
          {onboarding ? (
            <div className="space-y-3">
              <FunnelStep label="App gestart" count={onboarding.installs} total={onboarding.installs} color="#2563eb" />
              <FunnelStep label="Onboarding klaar" count={onboarding.onboardingCompleted} total={onboarding.installs} color="#0d9488" />
              <FunnelStep label="Eerste oefening" count={onboarding.firstExercise} total={onboarding.installs} color="#16a34a" />
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>
      </div>

      {/* Exercise popularity + Recognition quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Populariteit oefeningen</h2>
          <p className="text-xs text-gray-400 mb-5">Laatste 30 dagen</p>
          <ExerciseChart data={exercises} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Herkenningskwaliteit</h2>
          <p className="text-xs text-gray-400 mb-5">Laatste 7 dagen — % correct</p>
          {quality ? (
            <div className="space-y-5">
              <AccuracyBar label="Letters scannen" rate={quality.scan.rate} correct={quality.scan.hits} wrong={quality.scan.misses} />
              <AccuracyBar label="Leg dit woord" rate={quality.lay.rate} correct={quality.lay.correct} wrong={quality.lay.wrong} />
              <AccuracyBar label="Klank en letter" rate={quality.listen.rate} correct={quality.listen.correct} wrong={quality.listen.wrong} />
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>
      </div>

      {/* Hardest content: phonemes + laywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Moeilijkste fonemen</h2>
          <p className="text-xs text-gray-400 mb-4">Laatste 30d — hoogste foutpercentage (min. 5 pogingen)</p>
          <HardWordList items={phonemes} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Moeilijkste woorden (Leg dit woord)</h2>
          <p className="text-xs text-gray-400 mb-4">Laatste 30d — hoogste foutpercentage (min. 3 pogingen)</p>
          <HardWordList items={hardLaywords} />
        </div>
      </div>

      {/* Most found words + top missed scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Meest gevonden woorden</h2>
          <p className="text-xs text-gray-400 mb-4">Letters scannen — laatste 30 dagen</p>
          <WordRankList
            items={foundWords as unknown as Record<string, unknown>[]}
            labelKey="word"
            valueKey="finds"
            valueLabel="x"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Veelste misreadings (Vision)</h2>
          <p className="text-xs text-gray-400 mb-4">Letters scannen — laatste 30 dagen</p>
          <WordRankList
            items={missedScans as unknown as Record<string, unknown>[]}
            labelKey="seen"
            valueKey="count"
            valueLabel="x"
          />
        </div>
      </div>

      {/* Woordzoeker: abandonment + efficiency + top phrases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Woordzoeker — verlaten</h2>
          <p className="text-xs text-gray-400 mb-5">Laatste 30 dagen</p>
          {wordsearch ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{wordsearch.started}</p>
                  <p className="text-xs text-gray-500 mt-1">gestart</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{wordsearch.completed}</p>
                  <p className="text-xs text-gray-500 mt-1">afgerond</p>
                </div>
              </div>
              <div className="text-center pt-2">
                <div className="flex items-center justify-center gap-2">
                  {wordsearch.abandonmentPct > 30
                    ? <XCircle className="w-5 h-5 text-red-500" />
                    : <CheckCircle className="w-5 h-5 text-green-600" />}
                  <span className="text-lg font-bold text-gray-800">{wordsearch.abandonmentPct}%</span>
                  <span className="text-sm text-gray-500">verlaten</span>
                </div>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Woordzoeker — efficiëntie</h2>
          <p className="text-xs text-gray-400 mb-5">Laatste 30 dagen</p>
          {wsEfficiency ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{wsEfficiency.avgFound ?? '—'}</p>
                  <p className="text-xs text-gray-500 mt-1">gem. gevonden</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{wsEfficiency.avgTotal ?? '—'}</p>
                  <p className="text-xs text-gray-500 mt-1">gem. mogelijk</p>
                </div>
              </div>
              {wsEfficiency.avgCompletionPct !== null && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Gemiddelde voltooiing</span>
                    <span className="font-bold text-gray-800">{wsEfficiency.avgCompletionPct}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${wsEfficiency.avgCompletionPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Meest gelezen zinnen</h2>
          <p className="text-xs text-gray-400 mb-4">Woordlezer — laatste 30 dagen</p>
          {topPhrases.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {topPhrases.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{p.phrase}</span>
                  <span className="text-xs font-semibold text-gray-500 shrink-0">{p.reads}x</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>
      </div>

      {/* Exercise time spent */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Tijd per oefening</h2>
        <p className="text-xs text-gray-400 mb-5">Laatste 30 dagen — gemiddelde sessieduur op basis van exercise_closed</p>
        {exerciseTime.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exerciseTime.map((item, i) => (
              <div key={item.mode} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{EXERCISE_LABELS[item.mode] ?? item.mode}</span>
                  <span className="text-xs text-gray-400">{item.sessions}x</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatSeconds(item.avgSeconds)}</p>
                <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.avgSeconds / Math.max(...exerciseTime.map(e => e.avgSeconds), 1)) * 100}%`,
                      backgroundColor: EXERCISE_COLORS[i % EXERCISE_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">Geen data</p>}
      </div>

      {/* App activity (foreground / background) + Writing stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">App activiteit</h2>
          <p className="text-xs text-gray-400 mb-5">Laatste 14 dagen — launches, foregrounded, backgrounded</p>
          {appActivity ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Gestart', value: appActivity.totals.launched, color: '#2563eb' },
                  { label: 'Voorgrond', value: appActivity.totals.foregrounded, color: '#0d9488' },
                  { label: 'Achtergrond', value: appActivity.totals.backgrounded, color: '#d97706' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: color }} />
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {appActivity.daily.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Per dag (laatste 14d)</p>
                  <div className="space-y-1.5">
                    {appActivity.daily.slice(-7).map((d) => (
                      <div key={d.day} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 w-20 shrink-0">{d.day.slice(5)}</span>
                        <div className="flex-1 flex gap-1 h-3">
                          {[
                            { v: d.launched, c: '#2563eb' },
                            { v: d.foregrounded, c: '#0d9488' },
                            { v: d.backgrounded, c: '#d97706' },
                          ].map(({ v, c }, i) => {
                            const total = d.launched + d.foregrounded + d.backgrounded || 1;
                            return (
                              <div key={i} className="h-full rounded-sm" style={{ width: `${(v / total) * 100}%`, backgroundColor: c, minWidth: v ? 2 : 0 }} />
                            );
                          })}
                        </div>
                        <span className="text-gray-400 w-8 text-right">{d.launched + d.foregrounded}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Schrijfoefening</h2>
          <p className="text-xs text-gray-400 mb-5">Laatste 30 dagen — getoond vs voltooid per foneem</p>
          {writingStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                  <p className="text-xl font-bold text-gray-900">{writingStats.totalShown}</p>
                  <p className="text-xs text-gray-500 mt-0.5">getoond</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                  <p className="text-xl font-bold text-gray-900">{writingStats.totalCompleted}</p>
                  <p className="text-xs text-gray-500 mt-0.5">voltooid</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                  <p className="text-xl font-bold text-gray-900">{writingStats.completionRate ?? '—'}%</p>
                  <p className="text-xs text-gray-500 mt-0.5">voltooiing</p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {writingStats.phonemes.map((p) => (
                  <div key={p.phoneme} className="flex items-center gap-3">
                    <span className="w-12 font-mono text-xs font-semibold text-gray-700 text-center bg-gray-50 border border-gray-200 rounded px-1 py-0.5 shrink-0">{p.phoneme}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.completionRate}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-20 text-right shrink-0">{p.completed}/{p.shown}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>
      </div>

      {/* App versions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">App versies in gebruik</h2>
        <p className="text-xs text-gray-400 mb-4">Laatste 14 dagen — actieve apparaten per versie</p>
        {versions.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {versions.map((v) => (
              <div key={v.version} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                <span className="font-mono text-sm font-semibold text-gray-800">{v.version}</span>
                <span className="text-xs text-gray-500">{v.devices} apparaten</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">Geen data</p>}
      </div>
    </div>
  );
}
