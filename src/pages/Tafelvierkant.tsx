import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Grid3x3, Users, BarChart2, Clock, CheckCircle, XCircle,
  RefreshCw, ChevronDown, Search, Award
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
  exercise_type: string;
  game_mode: number | null;
  tables_selected: number[];
  correct_answers: number;
  mistake_count: number;
  completion_pct: number;
  avg_seconds_per_answer: number;
  duration_seconds: number;
  completed: boolean;
  questions_json: QuestionEntry[] | null;
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
  avg_seconds_per_answer: number;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KIND_CONFIG = {
  practice: { label: 'Oefenen', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  tafeltest: { label: 'Tafels ×', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  deeltest: { label: 'Tafels :', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
};

const EXERCISE_LABELS: Record<string, string> = {
  square: 'Vierkant',
  quiz: 'Quiz',
};

function accuracy(correct: number, total: number): number {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

function accuracyColor(pct: number): string {
  if (pct >= 90) return 'text-green-600';
  if (pct >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function accuracyBg(pct: number): string {
  if (pct >= 90) return '#16a34a';
  if (pct >= 70) return '#d97706';
  return '#dc2626';
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${s}s`;
}

function studentName(s: Student): string {
  return `${s.first_name} ${s.last_name}`.trim();
}

function sessionAccuracy(s: Session): { correct: number; total: number } {
  if (s.kind === 'practice') {
    const total = s.correct_answers + s.mistake_count;
    return { correct: s.correct_answers, total };
  }
  const total = s.correct_count + s.mistake_count;
  return { correct: s.correct_count, total };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`${iconBg} p-4 rounded-full`}>
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function TableHeatmap({ questions }: { questions: QuestionEntry[] }) {
  // Build 10×10 grid (tables 1-10)
  const grid: Record<string, { correct: number; total: number }> = {};
  for (const q of questions) {
    const key = `${q.col}-${q.row}`;
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
            <th className="w-8 text-gray-400 font-normal">×</th>
            {tables.map(c => (
              <th key={c} className="w-8 font-semibold text-gray-500">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tables.map(row => (
            <tr key={row}>
              <td className="font-semibold text-gray-500">{row}</td>
              {tables.map(col => {
                const cell = grid[`${col}-${row}`] ?? grid[`${row}-${col}`];
                if (!cell) {
                  return <td key={col} className="w-8 h-8 rounded bg-gray-100" />;
                }
                const pct = accuracy(cell.correct, cell.total);
                const bg = accuracyBg(pct);
                return (
                  <td key={col} className="w-8 h-8 rounded relative group cursor-default"
                    style={{ backgroundColor: bg + '33' }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: bg }}>{pct}%</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
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

function AccuracyBar({ pct, correct, total }: { pct: number; correct: number; total: number }) {
  const color = accuracyBg(pct);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{correct} correct / {total - correct} fout</span>
        <span className="font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
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

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterKind, setFilterKind] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setRefreshing(true);
    try {
      const [practiceRes, tafeltestRes, deeltestRes, studentsRes, schoolsRes] = await Promise.all([
        supabase
          .from('exercise_tablesquare_sessions')
          .select('id,student_id,school_id,created_at,exercise_type,game_mode,tables_selected,correct_answers,mistake_count,completion_pct,avg_seconds_per_answer,duration_seconds,completed,questions_json')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('tafeltest_sessions')
          .select('id,student_id,school_id,created_at,operation,tables_selected,correct_count,mistake_count,avg_seconds_per_answer,duration_seconds,total_questions,completed,questions_json,table_second_factor')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('deeltest_sessions')
          .select('id,student_id,school_id,created_at,operation,tables_selected,correct_count,mistake_count,avg_seconds_per_answer,duration_seconds,total_questions,completed,questions_json,table_second_factor')
          .order('created_at', { ascending: false })
          .limit(200),
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
    } catch (err) {
      console.error(err);
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

  // Schools that have sessions
  const activeSchools = useMemo(() => {
    const ids = new Set(sessions.map(s => s.school_id));
    return schools.filter(s => ids.has(s.id));
  }, [sessions, schools]);

  // Students filtered by school
  const filteredStudentsForDropdown = useMemo(() => {
    if (filterSchool === 'all') {
      const ids = new Set(sessions.map(s => s.student_id));
      return students.filter(s => ids.has(s.id));
    }
    const ids = new Set(sessions.filter(s => s.school_id === filterSchool).map(s => s.student_id));
    return students.filter(s => s.school_id === filterSchool && ids.has(s.id));
  }, [students, sessions, filterSchool]);

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (filterSchool !== 'all' && s.school_id !== filterSchool) return false;
      if (filterStudent !== 'all' && s.student_id !== filterStudent) return false;
      if (filterKind !== 'all' && s.kind !== filterKind) return false;
      if (search) {
        const q = search.toLowerCase();
        const st = studentMap[s.student_id];
        const name = st ? studentName(st).toLowerCase() : '';
        const school = schoolMap[s.school_id]?.name.toLowerCase() ?? '';
        return name.includes(q) || school.includes(q);
      }
      return true;
    });
  }, [sessions, filterSchool, filterStudent, filterKind, search, studentMap, schoolMap]);

  // Summary stats
  const uniqueStudents = useMemo(() => new Set(sessions.map(s => s.student_id)).size, [sessions]);
  const uniqueSchools = useMemo(() => new Set(sessions.map(s => s.school_id)).size, [sessions]);
  const avgAcc = useMemo(() => {
    if (!sessions.length) return 0;
    const total = sessions.reduce((sum, s) => {
      const { correct, total } = sessionAccuracy(s);
      return sum + accuracy(correct, total);
    }, 0);
    return Math.round(total / sessions.length);
  }, [sessions]);

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
            <p className="text-sm text-gray-500 mt-0.5">Voortgang leerlingen — oefenen, tafeltests &amp; deeltests</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sessies totaal" value={sessions.length} icon={BarChart2} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Unieke leerlingen" value={uniqueStudents} icon={Users} iconBg="bg-teal-50" iconColor="text-teal-600" />
        <StatCard label="Scholen" value={uniqueSchools} icon={Award} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard label="Gem. nauwkeurigheid" value={`${avgAcc}%`} sub="over alle sessies" icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
      </div>

      {/* Type breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(['practice', 'tafeltest', 'deeltest'] as const).map(kind => {
          const cfg = KIND_CONFIG[kind];
          const count = sessions.filter(s => s.kind === kind).length;
          const kindSessions = sessions.filter(s => s.kind === kind);
          const kindAvg = kindSessions.length
            ? Math.round(kindSessions.reduce((sum, s) => {
                const { correct, total } = sessionAccuracy(s);
                return sum + accuracy(correct, total);
              }, 0) / kindSessions.length)
            : 0;
          return (
            <div key={kind} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400 mt-1">gem. {kindAvg}% nauwkeurig</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek op naam of school..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <select
            value={filterSchool}
            onChange={e => { setFilterSchool(e.target.value); setFilterStudent('all'); }}
            className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">Alle scholen</option>
            {activeSchools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterStudent}
            onChange={e => setFilterStudent(e.target.value)}
            className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            disabled={filteredStudentsForDropdown.length === 0}
          >
            <option value="all">Alle leerlingen</option>
            {filteredStudentsForDropdown.map(s => (
              <option key={s.id} value={s.id}>{studentName(s)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <select
          value={filterKind}
          onChange={e => setFilterKind(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alle types</option>
          <option value="practice">Oefenen</option>
          <option value="tafeltest">Tafels ×</option>
          <option value="deeltest">Tafels :</option>
        </select>
      </div>

      {/* Master / detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Sessies</h2>
            <span className="text-sm text-gray-500">{filtered.length} resultaten</span>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[calc(100vh-520px)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Grid3x3 className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Geen sessies gevonden</p>
              </div>
            ) : (
              filtered.map(s => {
                const { correct, total } = sessionAccuracy(s);
                const pct = accuracy(correct, total);
                const cfg = KIND_CONFIG[s.kind];
                const st = studentMap[s.student_id];
                const school = schoolMap[s.school_id];
                const tables = s.tables_selected?.slice(0, 5).join(', ') +
                  (s.tables_selected?.length > 5 ? '…' : '');

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 transition-colors ${
                      selectedSession?.id === s.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          selectedSession?.id === s.id ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {st ? st.first_name[0] : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {st ? studentName(st) : s.student_id.slice(0, 8)}
                          </p>
                          {school && (
                            <p className="text-xs text-gray-400 truncate">{school.name}</p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-sm font-bold ${accuracyColor(pct)}`}>{pct}%</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accuracyBg(pct) }} />
                      </div>
                      {tables && (
                        <span className="text-xs text-gray-400 shrink-0">tafel {tables}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(s.duration_seconds)}
                      </span>
                      <span>{new Date(s.created_at).toLocaleDateString('nl-BE')}</span>
                      {s.completed
                        ? <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />
                        : <XCircle className="w-3 h-3 text-gray-300 ml-auto" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div>
          {selectedSession ? (
            <SessionDetail
              session={selectedSession}
              student={studentMap[selectedSession.student_id]}
              school={schoolMap[selectedSession.school_id]}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-gray-300">
              <Grid3x3 className="w-14 h-14 mb-3" />
              <p className="text-gray-400 text-sm">Selecteer een sessie om te bekijken</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Session detail ───────────────────────────────────────────────────────────

function SessionDetail({ session, student, school }: {
  session: Session;
  student: Student | undefined;
  school: School | undefined;
}) {
  const cfg = KIND_CONFIG[session.kind];
  const { correct, total } = sessionAccuracy(session);
  const pct = accuracy(correct, total);

  const isPractice = session.kind === 'practice';
  const ps = session as PracticeSession;
  const ts = session as TestSession;

  const hasHeatmap = !isPractice && session.questions_json && session.questions_json.length > 0;

  // Per-table accuracy from questions_json
  const perTableAcc = useMemo(() => {
    const q = session.questions_json;
    if (!q || !q.length) return [];
    const map: Record<number, { correct: number; total: number }> = {};
    for (const entry of q) {
      const table = entry.col; // the table number is usually the col
      if (!map[table]) map[table] = { correct: 0, total: 0 };
      map[table].total++;
      if (entry.correct) map[table].correct++;
    }
    return Object.entries(map)
      .map(([t, v]) => ({ table: Number(t), ...v, pct: accuracy(v.correct, v.total) }))
      .sort((a, b) => a.table - b.table);
  }, [session]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
            {student ? student.first_name[0] : '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {student ? studentName(student) : 'Onbekende leerling'}
            </p>
            {school && <p className="text-sm text-gray-500">{school.name}</p>}
          </div>
          <span className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        {/* Accuracy hero */}
        <div className="mt-2">
          <AccuracyBar pct={pct} correct={correct} total={total} />
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-360px)] overflow-y-auto">
        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Datum</p>
            <p className="text-gray-900">{new Date(session.created_at).toLocaleString('nl-BE')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Duur</p>
            <p className="text-gray-900">{formatDuration(session.duration_seconds)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Gem. seconden/antwoord</p>
            <p className="text-gray-900">
              {session.avg_seconds_per_answer != null
                ? `${Number(session.avg_seconds_per_answer).toFixed(1)}s`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Voltooid</p>
            <p className={session.completed ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {session.completed ? 'Ja' : 'Nee'}
            </p>
          </div>
          {isPractice && ps.exercise_type && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Oefentype</p>
              <p className="text-gray-900">{EXERCISE_LABELS[ps.exercise_type] ?? ps.exercise_type}</p>
            </div>
          )}
          {!isPractice && ts.operation && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Operatie</p>
              <p className="text-gray-900 capitalize">{ts.operation}</p>
            </div>
          )}
        </div>

        {/* Tables selected */}
        {session.tables_selected?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Geselecteerde tafels</p>
            <div className="flex flex-wrap gap-1.5">
              {session.tables_selected.map(t => (
                <span key={t} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 text-sm font-bold border border-blue-100">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Per-table accuracy breakdown */}
        {perTableAcc.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Nauwkeurigheid per tafel</p>
            <div className="space-y-2">
              {perTableAcc.map(({ table, correct, total, pct }) => (
                <div key={table} className="flex items-center gap-3">
                  <span className="w-6 text-xs font-bold text-gray-600 text-right shrink-0">{table}×</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accuracyBg(pct) }} />
                  </div>
                  <span className="text-xs font-semibold w-8 text-right shrink-0" style={{ color: accuracyBg(pct) }}>
                    {pct}%
                  </span>
                  <span className="text-xs text-gray-400 w-14 text-right shrink-0">
                    {correct}/{total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap for tests */}
        {hasHeatmap && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Heatmap tafels</p>
            <TableHeatmap questions={session.questions_json!} />
            <p className="text-xs text-gray-400 mt-2">Groen = hoog, oranje = matig, rood = laag</p>
          </div>
        )}
      </div>
    </div>
  );
}
