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
  Plus,
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
      let baseQuery = supabase.from('schools').select('*');

      if (onboardedFilter !== null) {
        baseQuery = baseQuery.eq('onboarded', parseInt(onboardedFilter));
      }

      if (monthFilter) {
        const date = new Date(monthFilter);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        baseQuery = baseQuery
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());
      }

      const allData: School[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await baseQuery
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (data) allData.push(...data);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      setSchools(allData);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolStats = async () => {
    setStatsLoading(true);
    try {
      const allSchools: { id: string; name: string; school_code: string; city: string }[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name, school_code, city')
          .order('name')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (data) allSchools.push(...data);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      if (allSchools.length === 0) return;

      const schoolIds = allSchools.map((s) => s.id);

      const [coachesRes, classesRes, studentsRes] = await Promise.all([
        supabase
          .from('school_teammembers')
          .select('school_id')
          .in('school_id', schoolIds),
        supabase
          .from('groups')
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const emptyForm = {
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'België',
    phone: '',
    email: '',
    principal_name: '',
    website: '',
    description: '',
    internal_note: '',
  };
  const [createForm, setCreateForm] = useState(emptyForm);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError('Naam is verplicht.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const { data, error } = await supabase
        .from('schools')
        .insert({
          name: createForm.name.trim(),
          address: createForm.address.trim() || null,
          city: createForm.city.trim() || null,
          postal_code: createForm.postal_code.trim() || null,
          country: createForm.country.trim() || null,
          phone: createForm.phone.trim() || null,
          email: createForm.email.trim() || null,
          principal_name: createForm.principal_name.trim() || null,
          website: createForm.website.trim() || null,
          description: createForm.description.trim() || null,
          internal_note: createForm.internal_note.trim() || null,
          onboarded: 0,
          premium_school: 0,
        })
        .select('id')
        .single();
      if (error) throw error;
      setShowCreateModal(false);
      setCreateForm(emptyForm);
      navigate(`/schools/${data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Er is een fout opgetreden.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const allSchools: School[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .order('name', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (data) allSchools.push(...data);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      if (allSchools.length === 0) return;

      const schoolIds = allSchools.map((s) => s.id);

      const [coachesRes, classesRes, studentsRes] = await Promise.all([
        supabase.from('school_teammembers').select('school_id').in('school_id', schoolIds),
        supabase.from('groups').select('school_id').in('school_id', schoolIds),
        supabase.from('students').select('school_id').in('school_id', schoolIds),
      ]);

      const coachCounts: Record<string, number> = {};
      coachesRes.data?.forEach((r) => { coachCounts[r.school_id] = (coachCounts[r.school_id] || 0) + 1; });
      const classCounts: Record<string, number> = {};
      classesRes.data?.forEach((r) => { classCounts[r.school_id] = (classCounts[r.school_id] || 0) + 1; });
      const studentCounts: Record<string, number> = {};
      studentsRes.data?.forEach((r) => { studentCounts[r.school_id] = (studentCounts[r.school_id] || 0) + 1; });

      const escapeCell = (v: unknown): string => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const fmtDate = (v: string | null) =>
        v ? new Date(v).toLocaleDateString('nl-BE') : '';

      const headers = [
        'Naam',
        'Schoolcode',
        'Adres',
        'Postcode',
        'Stad',
        'Land',
        'Telefoon',
        'E-mail',
        'Website',
        'Directeur',
        'Organisatietype',
        'Onboarded',
        'Premium',
        'Coaches',
        'Klassen',
        'Leerlingen (app)',
        'Leerlingen (opgegeven)',
        'Interne nota',
        'Campagne notities',
        'Campagne contact op',
        'Aangemaakt op',
        'Bijgewerkt op',
      ];

      const rows = allSchools.map((s) => [
        escapeCell(s.name),
        escapeCell(s.school_code),
        escapeCell(s.address),
        escapeCell(s.postal_code),
        escapeCell(s.city),
        escapeCell(s.country),
        escapeCell(s.phone),
        escapeCell(s.email),
        escapeCell(s.website),
        escapeCell(s.principal_name),
        escapeCell(s.organization_type),
        s.onboarded === 1 ? 'Ja' : 'Nee',
        s.premium_school === 1 ? 'Ja' : 'Nee',
        coachCounts[s.id] || 0,
        classCounts[s.id] || 0,
        studentCounts[s.id] || 0,
        s.student_count ?? '',
        escapeCell(s.internal_note),
        escapeCell(s.campaign_notes),
        fmtDate(s.campaign_contacted_at),
        fmtDate(s.created_at),
        fmtDate(s.updated_at),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => { setCreateForm(emptyForm); setCreateError(''); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nieuwe school
          </button>
        </div>
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                  <SchoolIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Nieuwe school aanmaken</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchool} className="px-6 py-6 space-y-5">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Naam <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Naam van de school"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                  <input
                    type="text"
                    value={createForm.address}
                    onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Straat en nummer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Stad"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                  <input
                    type="text"
                    value={createForm.postal_code}
                    onChange={(e) => setCreateForm((f) => ({ ...f, postal_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Postcode"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
                  <input
                    type="text"
                    value={createForm.country}
                    onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Land"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="+32 ..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="school@voorbeeld.be"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Directeur</label>
                  <input
                    type="text"
                    value={createForm.principal_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, principal_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Naam directeur"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={createForm.website}
                    onChange={(e) => setCreateForm((f) => ({ ...f, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  placeholder="Optionele beschrijving"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interne nota</label>
                <textarea
                  value={createForm.internal_note}
                  onChange={(e) => setCreateForm((f) => ({ ...f, internal_note: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  placeholder="Interne notities (niet zichtbaar voor de school)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  School aanmaken
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
