import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Search,
  Loader2,
  School as SchoolIcon,
  MapPin,
  Calendar,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  GraduationCap,
  LayoutGrid,
  List,
  Download,
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  school_code: string;
  city: string;
  created_at: string;
  updated_at: string;
  onboarded: number;
}

interface SchoolStats {
  id: string;
  name: string;
  school_code: string;
  city: string;
  coaches: number;
  classes: number;
  students: number;
}

type SortField = 'name' | 'school_code' | 'city' | 'onboarded' | 'created_at' | 'updated_at';
type StatsSortField = 'name' | 'city' | 'coaches' | 'classes' | 'students';
type SortDirection = 'asc' | 'desc';
type TabType = 'list' | 'statistics';

export default function Schools() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [schoolStats, setSchoolStats] = useState<SchoolStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsSearchTerm, setStatsSearchTerm] = useState('');
  const [statsPage, setStatsPage] = useState(1);
  const [statsSortField, setStatsSortField] = useState<StatsSortField>('name');
  const [statsSortDirection, setStatsSortDirection] = useState<SortDirection>('asc');
  const itemsPerPage = 20;

  const monthFilter = searchParams.get('month');
  const onboardedFilter = searchParams.get('onboarded');

  useEffect(() => {
    fetchSchools();
  }, [monthFilter, onboardedFilter]);

  useEffect(() => {
    if (activeTab === 'statistics' && schoolStats.length === 0) {
      fetchSchoolStats();
    }
  }, [activeTab]);

  const fetchSchools = async () => {
    try {
      let query = supabase.from('schools').select('*');

      if (onboardedFilter !== null) {
        query = query.eq('onboarded', parseInt(onboardedFilter));
      }

      if (monthFilter) {
        const date = new Date(monthFilter);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        query = query
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolStats = async () => {
    setStatsLoading(true);
    try {
      const { data: allSchools, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name, school_code, city')
        .order('name');

      if (schoolsError) throw schoolsError;
      if (!allSchools) return;

      const schoolIds = allSchools.map((s) => s.id);

      const [coachesRes, classesRes, studentsRes] = await Promise.all([
        supabase
          .from('school_users')
          .select('school_id')
          .in('school_id', schoolIds),
        supabase
          .from('classes')
          .select('school_id')
          .in('school_id', schoolIds),
        supabase
          .from('students')
          .select('school_id')
          .in('school_id', schoolIds),
      ]);

      const coachCounts: Record<string, number> = {};
      coachesRes.data?.forEach((row) => {
        coachCounts[row.school_id] = (coachCounts[row.school_id] || 0) + 1;
      });

      const classCounts: Record<string, number> = {};
      classesRes.data?.forEach((row) => {
        classCounts[row.school_id] = (classCounts[row.school_id] || 0) + 1;
      });

      const studentCounts: Record<string, number> = {};
      studentsRes.data?.forEach((row) => {
        studentCounts[row.school_id] = (studentCounts[row.school_id] || 0) + 1;
      });

      const stats: SchoolStats[] = allSchools.map((school) => ({
        id: school.id,
        name: school.name,
        school_code: school.school_code,
        city: school.city,
        coaches: coachCounts[school.id] || 0,
        classes: classCounts[school.id] || 0,
        students: studentCounts[school.id] || 0,
      }));

      setSchoolStats(stats);
    } catch (error) {
      console.error('Error fetching school stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleStatsSort = (field: StatsSortField) => {
    if (statsSortField === field) {
      setStatsSortDirection(statsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setStatsSortField(field);
      setStatsSortDirection('asc');
    }
    setStatsPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  };

  const getStatsSortIcon = (field: StatsSortField) => {
    if (statsSortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return statsSortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  };

  const filteredSchools = schools
    .filter(
      (school) =>
        (school.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (school.school_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (school.city?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortField === 'onboarded') {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }

      if (sortField === 'created_at' || sortField === 'updated_at') {
        const aDate = new Date(aValue as string).getTime();
        const bDate = new Date(bValue as string).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }

      return 0;
    });

  const filteredStats = schoolStats
    .filter(
      (school) =>
        (school.name?.toLowerCase() || '').includes(statsSearchTerm.toLowerCase()) ||
        (school.school_code?.toLowerCase() || '').includes(statsSearchTerm.toLowerCase()) ||
        (school.city?.toLowerCase() || '').includes(statsSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const field = statsSortField;
      const dir = statsSortDirection;

      if (field === 'name' || field === 'city') {
        const aVal = (a[field] || '').toLowerCase();
        const bVal = (b[field] || '').toLowerCase();
        return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const aNum = a[field] as number;
      const bNum = b[field] as number;
      return dir === 'asc' ? aNum - bNum : bNum - aNum;
    });

  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSchools = filteredSchools.slice(startIndex, startIndex + itemsPerPage);

  const statsTotalPages = Math.ceil(filteredStats.length / itemsPerPage);
  const statsStartIndex = (statsPage - 1) * itemsPerPage;
  const paginatedStats = filteredStats.slice(statsStartIndex, statsStartIndex + itemsPerPage);

  const totalCoaches = schoolStats.reduce((sum, s) => sum + s.coaches, 0);
  const totalClasses = schoolStats.reduce((sum, s) => sum + s.classes, 0);
  const totalStudents = schoolStats.reduce((sum, s) => sum + s.students, 0);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Fetch all schools with full data
      const { data: allSchools, error } = await supabase
        .from('schools')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (!allSchools || allSchools.length === 0) return;

      const schoolIds = allSchools.map((s) => s.id);

      const [coachesRes, classesRes, studentsRes] = await Promise.all([
        supabase.from('school_users').select('school_id').in('school_id', schoolIds),
        supabase.from('classes').select('school_id').in('school_id', schoolIds),
        supabase.from('students').select('school_id').in('school_id', schoolIds),
      ]);

      const coachCounts: Record<string, number> = {};
      coachesRes.data?.forEach((r) => { coachCounts[r.school_id] = (coachCounts[r.school_id] || 0) + 1; });
      const classCounts: Record<string, number> = {};
      classesRes.data?.forEach((r) => { classCounts[r.school_id] = (classCounts[r.school_id] || 0) + 1; });
      const studentCounts: Record<string, number> = {};
      studentsRes.data?.forEach((r) => { studentCounts[r.school_id] = (studentCounts[r.school_id] || 0) + 1; });

      const headers = [
        'Naam',
        'Schoolcode',
        'Stad',
        'Onboarded',
        'Coaches',
        'Klassen',
        'Leerlingen',
        'Aangemaakt op',
        'Bijgewerkt op',
      ];

      const escapeCell = (v: string) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };

      const rows = allSchools.map((s) => [
        escapeCell(s.name || ''),
        escapeCell(s.school_code || ''),
        escapeCell(s.city || ''),
        s.onboarded === 1 ? 'Ja' : 'Nee',
        coachCounts[s.id] || 0,
        classCounts[s.id] || 0,
        studentCounts[s.id] || 0,
        escapeCell(s.created_at ? new Date(s.created_at).toLocaleDateString('nl-BE') : ''),
        escapeCell(s.updated_at ? new Date(s.updated_at).toLocaleDateString('nl-BE') : ''),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      // BOM for Excel to correctly interpret UTF-8
      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scholen-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schools</h1>
          <p className="text-gray-600 mt-1">
            Manage and view all schools ({schools.length} total)
          </p>
          {(monthFilter || onboardedFilter !== null) && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {monthFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  Month: {monthFilter}
                </span>
              )}
              {onboardedFilter !== null && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                  Onboarded: {onboardedFilter === '1' ? 'Yes' : 'No'}
                </span>
              )}
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleExportExcel}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Exporteer naar Excel
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
            School List
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'statistics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Statistics
          </button>
        </nav>
      </div>

      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search schools by name, code, or city..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      School Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('school_code')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      School Code
                      {getSortIcon('school_code')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('city')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      City
                      {getSortIcon('city')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('onboarded')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Onboarded
                      {getSortIcon('onboarded')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('created_at')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Created At
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('updated_at')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Updated At
                      {getSortIcon('updated_at')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedSchools.map((school) => (
                  <tr
                    key={school.id}
                    onClick={() => navigate(`/schools/${school.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <SchoolIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{school.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                        {school.school_code || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        {school.city || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {school.onboarded === 1 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(school.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(school.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing {startIndex + 1} to{' '}
                {Math.min(startIndex + itemsPerPage, filteredSchools.length)} of{' '}
                {filteredSchools.length} results
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'statistics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Coaches</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {totalCoaches.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Classes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {totalClasses.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <SchoolIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {totalStudents.toLocaleString()}
                  </p>
                </div>
                <div className="bg-teal-100 p-3 rounded-full">
                  <GraduationCap className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search schools by name, code, or city..."
                  value={statsSearchTerm}
                  onChange={(e) => {
                    setStatsSearchTerm(e.target.value);
                    setStatsPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {statsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th
                          onClick={() => handleStatsSort('name')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            School Name
                            {getStatsSortIcon('name')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleStatsSort('city')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            City
                            {getStatsSortIcon('city')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleStatsSort('coaches')}
                          className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-2">
                            Coaches
                            {getStatsSortIcon('coaches')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleStatsSort('classes')}
                          className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-2">
                            Classes
                            {getStatsSortIcon('classes')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleStatsSort('students')}
                          className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-2">
                            Students
                            {getStatsSortIcon('students')}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedStats.map((school) => (
                        <tr
                          key={school.id}
                          onClick={() => navigate(`/schools/${school.id}`)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <SchoolIcon className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-900">
                                  {school.name}
                                </span>
                                <span className="block text-xs font-mono text-gray-400">
                                  {school.school_code}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <MapPin className="w-4 h-4" />
                              {school.city || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex items-center justify-center min-w-[2rem] px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                school.coaches > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {school.coaches}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex items-center justify-center min-w-[2rem] px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                school.classes > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {school.classes}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex items-center justify-center min-w-[2rem] px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                school.students > 0
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {school.students}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {statsTotalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      Showing {statsStartIndex + 1} to{' '}
                      {Math.min(statsStartIndex + itemsPerPage, filteredStats.length)} of{' '}
                      {filteredStats.length} results
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStatsPage((p) => Math.max(1, p - 1))}
                        disabled={statsPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setStatsPage((p) => Math.min(statsTotalPages, p + 1))}
                        disabled={statsPage === statsTotalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
