import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Grid3x3, Users, BarChart2, Clock, CheckCircle, RefreshCw,
  Search, ChevronDown, TrendingUp, School, Award, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
}

interface School {
  id: string;
  name: string;
}

interface PracticeSession {
  id: string;
  kind: 'practice';
  student_id: string;
  school_id: string;
  created_at: string;
  exercise_type: string | null;
  game_mode: number | null;
  tables_selected: number[];
  correct_answers: number;
  mistake_count: number;
  completion_pct: number | null;
  avg_seconds_per_answer: number | null;
  duration_seconds: number;
  completed: boolean;
}

interface TestSession {
  id: string;
  kind: 'tafeltest' | 'deeltest';
  student_id: string;
  school_id: string;
  created_at: string;
  operation: string | null;
  tables_selected: number[];
  correct_count: number;
  mistake_count: number;
  avg_seconds_per_answer: number | null;
  duration_seconds: number;
  total_questions: number;
  completed: boolean;
  questions_json: QuestionEntry[] | null;
  table_second_factor: boolean;
}

type Session = PracticeSession | TestSession;

interface QuestionEntry {
  col: number;
  row: number;
  typed: number | null;
  answer: number;
  correct: boolean;
  elapsedMs: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KIND_CONFIG = {
  practice: { label: 'Oefenen', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', hex: '#2563eb' },
  tafeltest: { label: 'Tafels ×', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', hex: '#16a34a' },
  deeltest: { label: 'Tafels :', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', hex: '#ea580c' },
};

const EXERCISE_LABELS: Record<string, string> = {
  square: 'Tafelvierkant',
  quiz: 'Quiz',
  'zoek-fout': 'Zoek de fout',
  volgorde: 'Volgorde',
  patronen: 'Patronen',
  aanvullen: 'Aanvullen',
  herkenning: 'Herkenning',
  hoeveel_vakjes: 'Hoeveel vakjes?',
  tafelbreuken: 'Tafelbreuken',
  breuken: 'Breuken',
  breuken_vergelijken: 'Breuken vergelijken',
};

const EXERCISE_COLORS: Record<string, string> = {
  square: '#2563eb',
  quiz: '#0d9488',
  'zoek-fout': '#7c3aed',
  volgorde: '#db2777',
  patronen: '#d97706',
  aanvullen: '#16a34a',
  herkenning: '#dc2626',
  hoeveel_vakjes: '#0891b2',
  tafelbreuken: '#9333ea',
  breuken: '#ea580c',
  breuken_vergelijken: '#65a30d',
};

const TIME_RANGES = [
  { label: 'Vandaag', days: 0 },
  { label: '7 dagen', days: 7 },
  { label: '30 dagen', days: 30 },
  { label: '90 dagen', days: 90 },
  { label: 'Alles', days: -1 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function acc(correct: number, total: number) {
  return total ? Math.round((correct / total) * 100) : 0;
}

function accColor(pct: number) {
  if (pct >= 90) return '#16a34a';
  if (pct >= 70) return '#d97706';
  return '#dc2626';
}

function accTailwind(pct: number) {
  if (pct >= 90) return 'text-green-600';
  if (pct >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${s}s`;
}

function sName(s: Student) {
  return `${s.first_name} ${s.last_name}`.trim();
}

function sessionAccuracy(s: Session): { correct: number; total: number } {
  if (s.kind === 'practice') return { correct: s.correct_answers, total: s.correct_answers + s.mistake_count };
  return { correct: s.correct_count, total: s.correct_count + s.mistake_count };
}

function filterByRange(sessions: Session[], days: number): Session[] {
  if (days < 0) return sessions;
  const cutoff = new Date();
  if (days === 0) {
    cutoff.setHours(0, 0, 0, 0);
  } else {
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
  }
  return sessions.filter(s => new Date(s.created_at) >= cutoff);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`${iconBg} p-3.5 rounded-xl`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ data, color = '#2563eb' }: { data: { label: string; value: number }[]; color?: string }) {
  if (!data.length) return <p className="text-sm text-gray-400">Geen data</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-0.5 h-20">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center justify-end group relative">
          <div
            className="w-full rounded-sm transition-opacity hover:opacity-70 cursor-default"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0, backgroundColor: color }}
          />
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              {d.label}: {d.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HorizBar({ label, value, max, color, sub }: {
  label: string; value: number; max: number; color: string; sub?: string;
}) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{value.toLocaleString()}{sub ? ` ${sub}` : ''}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function TableHeatmap({ questions }: { questions: QuestionEntry[] }) {
  const grid: Record<string, { correct: number; total: number }> = {};
  for (const q of questions) {
    // normalize so row <= col
    const [r, c] = q.row <= q.col ? [q.row, q.col] : [q.col, q.row];
    const key = `${r}-${c}`;
    if (!grid[key]) grid[key] = { correct: 0, total: 0 };
    grid[key].total++;
    if (q.correct) grid[key].correct++;
  }
  const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return (
    <div className="overflow-x-auto">
      <table className="text-center text-xs border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="w-7 text-gray-400 font-normal">×</th>
            {tables.map(c => <th key={c} className="w-7 font-semibold text-gray-500">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {tables.map(row => (
            <tr key={row}>
              <td className="font-semibold text-gray-500">{row}</td>
              {tables.map(col => {
                const [r, c] = row <= col ? [row, col] : [col, row];
                const cell = grid[`${r}-${c}`];
                if (!cell) return <td key={col} className="w-7 h-7 rounded bg-gray-100" />;
                const pct = acc(cell.correct, cell.total);
                const bg = accColor(pct);
                return (
                  <td key={col} className="w-7 h-7 rounded relative group cursor-default"
                    style={{ backgroundColor: bg + '33' }}>
                    <span className="text-[9px] font-bold" style={{ color: bg }}>{pct}%</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {row}×{col}={row * col} — {cell.correct}/{cell.total}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ allSessions, studentMap, schoolMap }: {
  allSessions: Session[];
  studentMap: Record<string, Student>;
  schoolMap: Record<string, School>;
}) {
  const [rangeIdx, setRangeIdx] = useState(2); // default 30d
  const range = TIME_RANGES[rangeIdx];
  const sessions = useMemo(() => filterByRange(allSessions, range.days), [allSessions, range.days]);

  const totalStudents = useMemo(() => new Set(sessions.map(s => s.student_id)).size, [sessions]);
  const totalSchools = useMemo(() => new Set(sessions.map(s => s.school_id)).size, [sessions]);
  const totalMinutes = useMemo(() => Math.round(sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60), [sessions]);
  const avgAcc = useMemo(() => {
    if (!sessions.length) return 0;
    return Math.round(sessions.reduce((sum, s) => {
      const { correct, total } = sessionAccuracy(s);
      return sum + acc(correct, total);
    }, 0) / sessions.length);
  }, [sessions]);

  // Daily sessions
  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      const day = s.created_at.slice(0, 10);
      map[day] = (map[day] || 0) + 1;
    }
    const days = range.days < 0 ? 60 : Math.max(range.days, 1);
    const result: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ label: key.slice(5), value: map[key] || 0 });
    }
    return result;
  }, [sessions, range.days]);

  // Kind breakdown
  const kindCounts = useMemo(() => {
    const map: Record<string, { count: number; duration: number; correct: number; total: number }> = {};
    for (const s of sessions) {
      if (!map[s.kind]) map[s.kind] = { count: 0, duration: 0, correct: 0, total: 0 };
      map[s.kind].count++;
      map[s.kind].duration += s.duration_seconds;
      const { correct, total } = sessionAccuracy(s);
      map[s.kind].correct += correct;
      map[s.kind].total += total;
    }
    return map;
  }, [sessions]);

  // Exercise type within practice
  const exerciseTypeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      if (s.kind !== 'practice') continue;
      const t = (s as PracticeSession).exercise_type || 'onbekend';
      map[t] = (map[t] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [sessions]);

  // Tables popularity
  const tablePopularity = useMemo(() => {
    const map: Record<number, number> = {};
    for (const s of sessions) {
      for (const t of (s.tables_selected || [])) {
        map[t] = (map[t] || 0) + 1;
      }
    }
    return Array.from({ length: 10 }, (_, i) => ({ table: i + 1, count: map[i + 1] || 0 }));
  }, [sessions]);
  const maxTableCount = Math.max(...tablePopularity.map(t => t.count), 1);

  // Top students
  const topStudents = useMemo(() => {
    const map: Record<string, { count: number; correct: number; total: number; duration: number }> = {};
    for (const s of sessions) {
      if (!map[s.student_id]) map[s.student_id] = { count: 0, correct: 0, total: 0, duration: 0 };
      map[s.student_id].count++;
      map[s.student_id].duration += s.duration_seconds;
      const { correct, total } = sessionAccuracy(s);
      map[s.student_id].correct += correct;
      map[s.student_id].total += total;
    }
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v, acc: acc(v.correct, v.total) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [sessions]);

  // School breakdown
  const schoolBreakdown = useMemo(() => {
    const map: Record<string, { sessions: number; students: Set<string> }> = {};
    for (const s of sessions) {
      if (!map[s.school_id]) map[s.school_id] = { sessions: 0, students: new Set() };
      map[s.school_id].sessions++;
      map[s.school_id].students.add(s.student_id);
    }
    return Object.entries(map)
      .map(([id, v]) => ({ id, sessions: v.sessions, students: v.students.size }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);
  }, [sessions]);
  const maxSchoolSessions = Math.max(...schoolBreakdown.map(s => s.sessions), 1);

  return (
    <div className="space-y-6">
      {/* Time range picker */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">Periode:</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
          {TIME_RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-r last:border-r-0 border-gray-200 ${
                rangeIdx === i
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400">{sessions.length} sessies</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Sessies" value={sessions.length} icon={BarChart2} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Actieve leerlingen" value={totalStudents} icon={Users} iconBg="bg-teal-50" iconColor="text-teal-600" />
        <StatCard label="Scholen" value={totalSchools} icon={School} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard label="Gem. nauwkeurigheid" value={`${avgAcc}%`} icon={Award} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard label="Oefentijd" value={totalMinutes >= 60 ? `${Math.round(totalMinutes / 60)}u` : `${totalMinutes}m`} sub={`${totalMinutes.toLocaleString()} minuten totaal`} icon={Clock} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      {/* Daily chart + kind breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Sessies per dag</h2>
          <p className="text-xs text-gray-400 mb-4">{range.label === 'Alles' ? 'Afgelopen 60 dagen' : range.label}</p>
          {sessions.length > 0
            ? <MiniBarChart data={dailyData} color="#2563eb" />
            : <p className="text-sm text-gray-400">Geen sessies in deze periode</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Sessietypes</h2>
          <div className="space-y-4">
            {(['practice', 'tafeltest', 'deeltest'] as const).map(kind => {
              const cfg = KIND_CONFIG[kind];
              const data = kindCounts[kind] || { count: 0, duration: 0, correct: 0, total: 0 };
              const kindAcc = acc(data.correct, data.total);
              return (
                <div key={kind} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-sm font-medium text-gray-700">{cfg.label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800">{data.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${sessions.length ? (data.count / sessions.length) * 100 : 0}%`,
                      backgroundColor: cfg.hex,
                    }} />
                  </div>
                  {data.count > 0 && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{fmtDuration(Math.round(data.duration / data.count))} gem.</span>
                      <span className="font-medium" style={{ color: accColor(kindAcc) }}>{kindAcc}% correct</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Exercise types — full-width dedicated panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Oefentypes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Alle sessietypes binnen Oefenen ({exerciseTypeCounts.reduce((s, [, c]) => s + c, 0)} sessies)</p>
          </div>
        </div>
        {exerciseTypeCounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            {exerciseTypeCounts.map(([type, count]) => {
              const color = EXERCISE_COLORS[type] ?? '#6b7280';
              const pct = exerciseTypeCounts[0][1] ? Math.round((count / exerciseTypeCounts[0][1]) * 100) : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-gray-700">{EXERCISE_LABELS[type] ?? type}</span>
                    </div>
                    <span className="font-bold text-gray-800 ml-2">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-gray-400">Geen oefensessies in deze periode</p>}
      </div>

      {/* Table popularity + school breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Populariteit per tafel</h2>
          <p className="text-xs text-gray-400 mb-4">Hoe vaak is elke tafel geselecteerd in sessies</p>
          <div className="space-y-2">
            {tablePopularity.map(({ table, count }) => (
              <div key={table} className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg shrink-0">{table}×</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / maxTableCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-500 w-10 text-right">{count}x</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Gebruik per school</h2>
          <p className="text-xs text-gray-400 mb-4">Sessies en leerlingen per school</p>
          {schoolBreakdown.length > 0 ? (
            <div className="space-y-3">
              {schoolBreakdown.map(({ id, sessions: sc, students }) => (
                <div key={id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 truncate mr-2">{schoolMap[id]?.name ?? id.slice(0, 8)}</span>
                    <span className="text-gray-500 shrink-0 text-xs">{sc} sessies · {students} ll.</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(sc / maxSchoolSessions) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">Geen data</p>}
        </div>
      </div>

      {/* Top students */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Meest actieve leerlingen</h2>
        {topStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left pb-3 pr-4">#</th>
                  <th className="text-left pb-3 pr-4">Leerling</th>
                  <th className="text-left pb-3 pr-4">School</th>
                  <th className="text-right pb-3 pr-4">Sessies</th>
                  <th className="text-right pb-3 pr-4">Oefentijd</th>
                  <th className="text-right pb-3">Nauwkeurigheid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topStudents.map(({ id, count, duration, acc: a }, i) => {
                  const st = studentMap[id];
                  const school = schoolMap[st?.school_id ?? ''];
                  return (
                    <tr key={id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 text-gray-400 font-mono">{i + 1}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                            {st ? st.first_name[0] : '?'}
                          </div>
                          <span className="font-medium text-gray-900">{st ? sName(st) : id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 max-w-[160px] truncate">{school?.name ?? '—'}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-gray-800">{count}</td>
                      <td className="py-3 pr-4 text-right text-gray-600">{fmtDuration(duration)}</td>
                      <td className="py-3 text-right font-bold" style={{ color: accColor(a) }}>{a}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-400">Geen leerlingen in deze periode</p>}
      </div>
    </div>
  );
}

// ─── Per student tab ──────────────────────────────────────────────────────────

function StudentTab({ allSessions, studentMap, schoolMap, schools }: {
  allSessions: Session[];
  studentMap: Record<string, Student>;
  schoolMap: Record<string, School>;
  schools: School[];
}) {
  const [filterSchool, setFilterSchool] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Students with sessions
  const activeStudentIds = useMemo(() => new Set(allSessions.map(s => s.student_id)), [allSessions]);

  const filteredStudents = useMemo(() => {
    return Object.values(studentMap)
      .filter(st => {
        if (!activeStudentIds.has(st.id)) return false;
        if (filterSchool !== 'all' && st.school_id !== filterSchool) return false;
        if (search) {
          const q = search.toLowerCase();
          return sName(st).toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => sName(a).localeCompare(sName(b)));
  }, [studentMap, activeStudentIds, filterSchool, search]);

  const activeSchools = useMemo(() => {
    const ids = new Set(Object.values(studentMap)
      .filter(st => activeStudentIds.has(st.id))
      .map(st => st.school_id));
    return schools.filter(s => ids.has(s.id));
  }, [schools, studentMap, activeStudentIds]);

  const studentSessions = useMemo(() => {
    if (!selectedStudent) return [];
    return allSessions
      .filter(s => s.student_id === selectedStudent)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allSessions, selectedStudent]);

  const student = selectedStudent ? studentMap[selectedStudent] : null;

  // Aggregated heatmap questions across ALL test sessions for selected student
  const allTestQuestions = useMemo((): QuestionEntry[] => {
    return studentSessions
      .filter(s => s.kind !== 'practice' && s.questions_json)
      .flatMap(s => s.questions_json!);
  }, [studentSessions]);

  // Per-table accuracy from questions
  const perTableAcc = useMemo(() => {
    if (!allTestQuestions.length) return [];
    const map: Record<number, { correct: number; total: number }> = {};
    for (const q of allTestQuestions) {
      const t = q.col;
      if (!map[t]) map[t] = { correct: 0, total: 0 };
      map[t].total++;
      if (q.correct) map[t].correct++;
    }
    return Object.entries(map)
      .map(([t, v]) => ({ table: Number(t), ...v, pct: acc(v.correct, v.total) }))
      .sort((a, b) => a.table - b.table);
  }, [allTestQuestions]);

  // Stats for selected student
  const studentStats = useMemo(() => {
    if (!studentSessions.length) return null;
    const totalDuration = studentSessions.reduce((s, r) => s + r.duration_seconds, 0);
    const totalCorrect = studentSessions.reduce((s, r) => s + sessionAccuracy(r).correct, 0);
    const totalQ = studentSessions.reduce((s, r) => s + sessionAccuracy(r).total, 0);
    return { totalDuration, totalCorrect, totalQ, avgAcc: acc(totalCorrect, totalQ) };
  }, [studentSessions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Student list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek leerling..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={filterSchool}
              onChange={e => setFilterSchool(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="all">Alle scholen</option>
              {activeSchools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <p className="text-xs text-gray-400">{filteredStudents.length} leerlingen</p>
        </div>
        <div className="overflow-y-auto flex-1 max-h-[520px]">
          {filteredStudents.map(st => {
            const stSessions = allSessions.filter(s => s.student_id === st.id);
            const totalAcc = stSessions.length
              ? acc(
                  stSessions.reduce((s, r) => s + sessionAccuracy(r).correct, 0),
                  stSessions.reduce((s, r) => s + sessionAccuracy(r).total, 0)
                )
              : 0;
            return (
              <button
                key={st.id}
                onClick={() => { setSelectedStudent(st.id); setSelectedSession(null); }}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${
                  selectedStudent === st.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    selectedStudent === st.id ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {st.first_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{sName(st)}</p>
                    <p className="text-xs text-gray-400 truncate">{schoolMap[st.school_id]?.name ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold" style={{ color: accColor(totalAcc) }}>{totalAcc}%</p>
                    <p className="text-xs text-gray-400">{stSessions.length}x</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Student detail */}
      <div className="lg:col-span-2 space-y-4">
        {!student ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-24 text-gray-300">
            <Users className="w-12 h-12 mb-3" />
            <p className="text-gray-400 text-sm">Selecteer een leerling</p>
          </div>
        ) : (
          <>
            {/* Student header + stats */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                    {student.first_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{sName(student)}</p>
                    <p className="text-sm text-gray-500">{schoolMap[student.school_id]?.name ?? '—'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {studentStats && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Sessies', value: studentSessions.length },
                    { label: 'Oefentijd', value: fmtDuration(studentStats.totalDuration) },
                    { label: 'Nauwkeurigheid', value: `${studentStats.avgAcc}%` },
                    { label: 'Antwoorden', value: studentStats.totalQ.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                      <p className="text-lg font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Per-table accuracy if test data exists */}
            {perTableAcc.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Nauwkeurigheid per tafel (tests)</h3>
                  <div className="space-y-2">
                    {perTableAcc.map(({ table, correct, total, pct }) => (
                      <div key={table} className="flex items-center gap-3">
                        <span className="w-7 text-xs font-bold text-gray-600 text-right shrink-0">{table}×</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accColor(pct) }} />
                        </div>
                        <span className="text-xs font-semibold w-8 text-right" style={{ color: accColor(pct) }}>{pct}%</span>
                        <span className="text-xs text-gray-400 w-12 text-right shrink-0">{correct}/{total}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Heatmap (alle tests)</h3>
                  <TableHeatmap questions={allTestQuestions} />
                </div>
              </div>
            )}

            {/* Sessions list + detail */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Sessies ({studentSessions.length})</h3>
                </div>
                <div className="overflow-y-auto max-h-72">
                  {studentSessions.map(s => {
                    const { correct, total } = sessionAccuracy(s);
                    const pct = acc(correct, total);
                    const cfg = KIND_CONFIG[s.kind];
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSession(s)}
                        className={`w-full text-left px-5 py-3 border-b border-gray-100 last:border-0 transition-colors ${
                          selectedSession?.id === s.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('nl-BE')}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accColor(pct) }} />
                          </div>
                          <span className="text-xs font-bold w-8 text-right" style={{ color: accColor(pct) }}>{pct}%</span>
                          <span className="text-xs text-gray-400 w-12 text-right">{fmtDuration(s.duration_seconds)}</span>
                        </div>
                        {s.tables_selected?.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">tafel {s.tables_selected.slice(0, 6).join(', ')}{s.tables_selected.length > 6 ? '…' : ''}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Session detail */}
              {selectedSession ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 overflow-y-auto max-h-96">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${KIND_CONFIG[selectedSession.kind].color}`}>
                      {KIND_CONFIG[selectedSession.kind].label}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(selectedSession.created_at).toLocaleString('nl-BE')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    {[
                      ['Duur', fmtDuration(selectedSession.duration_seconds)],
                      ['Nauwkeurigheid', (() => { const { correct, total } = sessionAccuracy(selectedSession); return `${acc(correct, total)}%`; })()],
                      ['Gem. sec/antw.', selectedSession.avg_seconds_per_answer != null ? `${Number(selectedSession.avg_seconds_per_answer).toFixed(1)}s` : '—'],
                      ['Voltooid', selectedSession.completed ? 'Ja' : 'Nee'],
                      ...(selectedSession.kind === 'practice' && (selectedSession as PracticeSession).exercise_type
                        ? [['Oefentype', EXERCISE_LABELS[(selectedSession as PracticeSession).exercise_type!] ?? (selectedSession as PracticeSession).exercise_type!]]
                        : []),
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="font-medium text-gray-900">{value}</p>
                      </div>
                    ))}
                  </div>
                  {selectedSession.tables_selected?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1.5">Tafels</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedSession.tables_selected.map(t => (
                          <span key={t} className="w-7 h-7 flex items-center justify-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedSession.questions_json && selectedSession.questions_json.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Heatmap</p>
                      <TableHeatmap questions={selectedSession.questions_json} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center py-12 text-gray-300">
                  <p className="text-sm text-gray-400">Selecteer een sessie</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Tafelvierkant() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'students'>('overview');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setRefreshing(true);
    try {
      const [practiceRes, tafeltestRes, deeltestRes, studentsRes, schoolsRes] = await Promise.all([
        supabase
          .from('exercise_tablesquare_sessions')
          .select('id,student_id,school_id,created_at,exercise_type,game_mode,tables_selected,correct_answers,mistake_count,completion_pct,avg_seconds_per_answer,duration_seconds,completed')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('tafeltest_sessions')
          .select('id,student_id,school_id,created_at,operation,tables_selected,correct_count,mistake_count,avg_seconds_per_answer,duration_seconds,total_questions,completed,questions_json,table_second_factor')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('deeltest_sessions')
          .select('id,student_id,school_id,created_at,operation,tables_selected,correct_count,mistake_count,avg_seconds_per_answer,duration_seconds,total_questions,completed,questions_json,table_second_factor')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('students').select('id,first_name,last_name,school_id'),
        supabase.from('schools').select('id,name'),
      ]);

      const practice: PracticeSession[] = (practiceRes.data || []).map(r => ({ ...r, kind: 'practice' as const }));
      const tafeltest: TestSession[] = (tafeltestRes.data || []).map(r => ({ ...r, kind: 'tafeltest' as const }));
      const deeltest: TestSession[] = (deeltestRes.data || []).map(r => ({ ...r, kind: 'deeltest' as const }));

      const all: Session[] = [...practice, ...tafeltest, ...deeltest].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setSessions(all);
      setStudents(studentsRes.data || []);
      setSchools(schoolsRes.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const studentMap = useMemo(() => {
    const m: Record<string, Student> = {};
    for (const s of students) m[s.id] = s;
    return m;
  }, [students]);

  const schoolMap = useMemo(() => {
    const m: Record<string, School> = {};
    for (const s of schools) m[s.id] = s;
    return m;
  }, [schools]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl">
            <Grid3x3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tafelvierkant</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Platformoverzicht — {sessions.length.toLocaleString()} sessies · {new Set(sessions.map(s => s.student_id)).size} leerlingen
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'overview', label: 'Overzicht', icon: TrendingUp },
          { key: 'students', label: 'Per leerling', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab allSessions={sessions} studentMap={studentMap} schoolMap={schoolMap} />
      )}
      {activeTab === 'students' && (
        <StudentTab allSessions={sessions} studentMap={studentMap} schoolMap={schoolMap} schools={schools} />
      )}
    </div>
  );
}
