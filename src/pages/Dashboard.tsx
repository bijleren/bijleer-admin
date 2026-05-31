import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, School, TrendingUp, Loader2, AlertCircle, GraduationCap, Building2, Home } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalSchools: number;
  totalOrganisations: number;
  totalFamilies: number;
  totalStudents: number;
  userGrowth: number;
  schoolGrowth: number;
  organisationGrowth: number;
  familyGrowth: number;
  studentGrowth: number;
  schoolsNeedingOnboarding: number;
}

interface GrowthData {
  month: string;
  users: number;
  schools: number;
  organisations: number;
  families: number;
  students: number;
}

interface DailyProgress {
  day: string;
  phonemes_done: number;
  words_done: number;
  text_chars_read: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSchools: 0,
    totalOrganisations: 0,
    totalFamilies: 0,
    totalStudents: 0,
    userGrowth: 0,
    schoolGrowth: 0,
    organisationGrowth: 0,
    familyGrowth: 0,
    studentGrowth: 0,
    schoolsNeedingOnboarding: 0,
  });
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchGrowthData();
    fetchDailyProgress();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: schoolCount } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .eq('organization_type', 'school');

      const { count: organisationCount } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .eq('organization_type', 'organisation');

      const { count: familyCount } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .eq('organization_type', 'family');

      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: recentSchools } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .eq('organization_type', 'school')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: recentStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: recentOrganisations } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .eq('organization_type', 'organisation')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: recentFamilies } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .eq('organization_type', 'family')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: schoolsNeedingOnboarding } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .eq('onboarded', 0);

      const userGrowth = userCount ? ((recentUsers || 0) / userCount) * 100 : 0;
      const schoolGrowth = schoolCount ? ((recentSchools || 0) / schoolCount) * 100 : 0;
      const organisationGrowth = organisationCount ? ((recentOrganisations || 0) / organisationCount) * 100 : 0;
      const familyGrowth = familyCount ? ((recentFamilies || 0) / familyCount) * 100 : 0;
      const studentGrowth = studentCount ? ((recentStudents || 0) / studentCount) * 100 : 0;

      setStats({
        totalUsers: userCount || 0,
        totalSchools: schoolCount || 0,
        totalOrganisations: organisationCount || 0,
        totalFamilies: familyCount || 0,
        totalStudents: studentCount || 0,
        userGrowth: Math.round(userGrowth * 10) / 10,
        schoolGrowth: Math.round(schoolGrowth * 10) / 10,
        organisationGrowth: Math.round(organisationGrowth * 10) / 10,
        familyGrowth: Math.round(familyGrowth * 10) / 10,
        studentGrowth: Math.round(studentGrowth * 10) / 10,
        schoolsNeedingOnboarding: schoolsNeedingOnboarding || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchGrowthData = async () => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const from = sixMonthsAgo.toISOString();

      const [
        { data: userData },
        { data: schoolData },
        { data: orgData },
        { data: familyData },
        { data: studentData },
      ] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', from).order('created_at'),
        supabase.from('schools').select('created_at').eq('organization_type', 'school').gte('created_at', from).order('created_at'),
        supabase.from('schools').select('created_at').eq('organization_type', 'organisation').gte('created_at', from).order('created_at'),
        supabase.from('schools').select('created_at').eq('organization_type', 'family').gte('created_at', from).order('created_at'),
        supabase.from('students').select('created_at').gte('created_at', from).order('created_at'),
      ]);

      const monthly: Record<string, GrowthData> = {};

      const toMonth = (ts: string) =>
        new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const bump = (ts: string, key: keyof Omit<GrowthData, 'month'>) => {
        const m = toMonth(ts);
        if (!monthly[m]) monthly[m] = { month: m, users: 0, schools: 0, organisations: 0, families: 0, students: 0 };
        monthly[m][key]++;
      };

      userData?.forEach(r => bump(r.created_at, 'users'));
      schoolData?.forEach(r => bump(r.created_at, 'schools'));
      orgData?.forEach(r => bump(r.created_at, 'organisations'));
      familyData?.forEach(r => bump(r.created_at, 'families'));
      studentData?.forEach(r => bump(r.created_at, 'students'));

      setGrowthData(Object.values(monthly).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching growth data:', error);
      setLoading(false);
    }
  };

  const fetchDailyProgress = async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
    const fromDate = threeDaysAgo.toISOString().slice(0, 10);

    const { data } = await supabase
      .from('daily_progress')
      .select('day, phonemes_done, words_done, text_chars_read')
      .gte('day', fromDate)
      .order('day', { ascending: true });

    setDailyProgress(data || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const growthSeries = [
    { key: 'users' as const,         label: 'Gebruikers',   color: 'bg-blue-600',   hover: 'hover:bg-blue-700',   dot: 'bg-blue-600'   },
    { key: 'students' as const,      label: 'Leerlingen',   color: 'bg-teal-600',   hover: 'hover:bg-teal-700',   dot: 'bg-teal-600'   },
    { key: 'schools' as const,       label: 'Scholen',      color: 'bg-green-600',  hover: 'hover:bg-green-700',  dot: 'bg-green-600'  },
    { key: 'organisations' as const, label: 'Organisaties', color: 'bg-sky-500',    hover: 'hover:bg-sky-600',    dot: 'bg-sky-500'    },
    { key: 'families' as const,      label: 'Gezinnen',     color: 'bg-rose-500',   hover: 'hover:bg-rose-600',   dot: 'bg-rose-500'   },
  ];

  const growthMax = Math.max(
    ...growthData.flatMap(d => growthSeries.map(s => d[s.key])),
    1,
  );

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overzicht van je platformstatistieken</p>
      </div>

      {/* Row 1: Users, Students, Needs Onboarding */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gebruikers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalUsers.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className={`w-4 h-4 ${stats.userGrowth > 0 ? 'text-green-600' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${stats.userGrowth > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.userGrowth > 0 ? '+' : ''}{stats.userGrowth}% deze maand
                </span>
              </div>
            </div>
            <div className="bg-blue-100 p-4 rounded-full">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Leerlingen</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalStudents.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className={`w-4 h-4 ${stats.studentGrowth > 0 ? 'text-green-600' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${stats.studentGrowth > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.studentGrowth > 0 ? '+' : ''}{stats.studentGrowth}% deze maand
                </span>
              </div>
            </div>
            <div className="bg-teal-100 p-4 rounded-full">
              <GraduationCap className="w-8 h-8 text-teal-600" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/schools?onboarded=0')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Nog te onboarden</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.schoolsNeedingOnboarding.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-orange-600 font-medium">
                  Klik om te bekijken
                </span>
              </div>
            </div>
            <div className="bg-orange-100 p-4 rounded-full">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Organisation type breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/schools?type=school')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scholen</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalSchools.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className={`w-4 h-4 ${stats.schoolGrowth > 0 ? 'text-green-600' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${stats.schoolGrowth > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.schoolGrowth > 0 ? '+' : ''}{stats.schoolGrowth}% deze maand
                </span>
              </div>
            </div>
            <div className="bg-green-100 p-4 rounded-full">
              <School className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/schools?type=organisation')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Organisaties</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalOrganisations.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className={`w-4 h-4 ${stats.organisationGrowth > 0 ? 'text-green-600' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${stats.organisationGrowth > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.organisationGrowth > 0 ? '+' : ''}{stats.organisationGrowth}% deze maand
                </span>
              </div>
            </div>
            <div className="bg-sky-100 p-4 rounded-full">
              <Building2 className="w-8 h-8 text-sky-600" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/schools?type=family')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gezinnen</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalFamilies.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className={`w-4 h-4 ${stats.familyGrowth > 0 ? 'text-green-600' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${stats.familyGrowth > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.familyGrowth > 0 ? '+' : ''}{stats.familyGrowth}% deze maand
                </span>
              </div>
            </div>
            <div className="bg-rose-100 p-4 rounded-full">
              <Home className="w-8 h-8 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Unified growth chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Groei over tijd</h2>

        {growthData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Geen groeidata beschikbaar</p>
        ) : (() => {
          const chartH = 260;
          const chartW_per_group = 80;
          const barW = 10;
          const gap = 2;
          const yPad = 20;
          const xPad = 40;
          const groupCount = growthData.length;
          const totalW = xPad + groupCount * chartW_per_group;
          const plotH = chartH - yPad;

          const toY = (val: number) => yPad + plotH - (val / growthMax) * plotH;

          const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
            y: yPad + plotH - f * plotH,
            label: Math.round(growthMax * f),
          }));

          const seriesColors = ['#2563eb', '#0d9488', '#16a34a', '#0ea5e9', '#f43f5e'];

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-5 text-sm flex-wrap">
                {growthSeries.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: seriesColors[i] }} />
                    <span className="text-gray-600">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  width="100%"
                  viewBox={`0 0 ${totalW} ${chartH + 20}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="overflow-visible"
                >
                  {/* Grid lines + Y labels */}
                  {gridLines.map(({ y, label }) => (
                    <g key={label}>
                      <line x1={xPad} y1={y} x2={totalW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                      <text x={xPad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                        {label}
                      </text>
                    </g>
                  ))}

                  {/* Bars + X labels */}
                  {growthData.map((data, gi) => {
                    const groupX = xPad + gi * chartW_per_group + (chartW_per_group - growthSeries.length * (barW + gap)) / 2;
                    const labelX = xPad + gi * chartW_per_group + chartW_per_group / 2;
                    return (
                      <g key={gi}>
                        {growthSeries.map((s, si) => {
                          const val = data[s.key];
                          const barH = (val / growthMax) * plotH;
                          const x = groupX + si * (barW + gap);
                          const y = toY(val);
                          return (
                            <g key={s.key}>
                              <rect
                                x={x}
                                y={y}
                                width={barW}
                                height={barH}
                                fill={seriesColors[si]}
                                rx="2"
                              >
                                <title>{`${s.label} — ${data.month}: ${val}`}</title>
                              </rect>
                              {val > 0 && barH > 16 && (
                                <text
                                  x={x + barW / 2}
                                  y={y + 10}
                                  textAnchor="middle"
                                  fontSize="8"
                                  fill="white"
                                  fontWeight="600"
                                >
                                  {val}
                                </text>
                              )}
                            </g>
                          );
                        })}
                        <text
                          x={labelX}
                          y={chartH + 14}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#6b7280"
                        >
                          {data.month.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}

                  {/* Baseline */}
                  <line x1={xPad} y1={yPad + plotH} x2={totalW} y2={yPad + plotH} stroke="#d1d5db" strokeWidth="1" />
                </svg>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Daily Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Dagelijkse Activiteit</h2>

        {dailyProgress.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nog geen data beschikbaar</p>
        ) : (() => {
          const today = new Date();
          const days = [2, 1, 0].map(offset => {
            const d = new Date(today);
            d.setDate(d.getDate() - offset);
            const iso = d.toISOString().slice(0, 10);
            const row = dailyProgress.find(r => r.day === iso);
            const todayStr = new Date().toISOString().slice(0, 10);
            const yesterStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const label = iso === todayStr ? 'Vandaag' : iso === yesterStr ? 'Gisteren' :
              new Date(iso + 'T12:00:00').toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });
            return { label, phonemes: row?.phonemes_done ?? 0, words: row?.words_done ?? 0, chars: row?.text_chars_read ?? 0 };
          });

          const allVals = days.flatMap(d => [d.phonemes, d.words, d.chars]);
          const maxVal = Math.max(...allVals, 1);
          const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

          const metrics = [
            { key: 'phonemes' as const, label: 'Fonemen geoefend' },
            { key: 'words' as const,    label: 'Woorden geoefend' },
            { key: 'chars' as const,    label: 'Tekens gelezen'   },
          ];

          const dayColors = ['#2563eb', '#0d9488', '#f59e0b'];

          const chartH = 160;
          const yPad = 16;
          const xPad = 40;
          const groupW = 80;
          const barW = 16;
          const barGap = 4;
          const plotH = chartH - yPad;
          const totalW = xPad + metrics.length * groupW;
          const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
            y: yPad + plotH - f * plotH,
            label: fmt(Math.round(maxVal * f)),
          }));

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-6 text-sm flex-wrap">
                {days.map((day, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: dayColors[i] }} />
                    <span className="text-gray-600">{day.label}</span>
                  </div>
                ))}
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  width={totalW}
                  height={chartH + 20}
                  viewBox={`0 0 ${totalW} ${chartH + 20}`}
                  className="overflow-visible"
                >
                  {gridLines.map(({ y, label }) => (
                    <g key={label}>
                      <line x1={xPad} y1={y} x2={totalW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                      <text x={xPad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{label}</text>
                    </g>
                  ))}

                  {metrics.map((m, mi) => {
                    const groupX = xPad + mi * groupW + (groupW - days.length * (barW + barGap) + barGap) / 2;
                    const labelX = xPad + mi * groupW + groupW / 2;
                    return (
                      <g key={m.key}>
                        {days.map((day, di) => {
                          const val = day[m.key];
                          const barH = (val / maxVal) * plotH;
                          const x = groupX + di * (barW + barGap);
                          const y = yPad + plotH - barH;
                          return (
                            <g key={di}>
                              <rect x={x} y={y} width={barW} height={barH} fill={dayColors[di]} rx="2">
                                <title>{`${day.label}: ${val.toLocaleString('nl-BE')}`}</title>
                              </rect>
                              {val > 0 && barH > 18 && (
                                <text x={x + barW / 2} y={y + 12} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
                                  {fmt(val)}
                                </text>
                              )}
                            </g>
                          );
                        })}
                        <text x={labelX} y={chartH + 14} textAnchor="middle" fontSize="11" fill="#6b7280">
                          {m.label}
                        </text>
                      </g>
                    );
                  })}

                  <line x1={xPad} y1={yPad + plotH} x2={totalW} y2={yPad + plotH} stroke="#d1d5db" strokeWidth="1" />
                </svg>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
