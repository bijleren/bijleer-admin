import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  HandMetal,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  TrendingUp,
  ListChecks,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  Tag,
  Filter,
} from 'lucide-react';

interface PhysicalTask {
  id?: string;
  title: string;
  emoji: string;
  goal_codes: string[];
  description: string;
  instructions: string;
  duration_minutes: number;
  materials_needed: string[];
  task_category: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CompletionLog {
  id: string;
  task_id: string;
  group_id: string;
  completed_at: string;
  notes: string;
  created_by: string;
  task_title?: string;
}

interface Stats {
  totalTasks: number;
  activeTasks: number;
  totalCompletions: number;
  categoryBreakdown: { category: string; count: number }[];
  growth: {
    thisMonth: number;
    lastMonth: number;
    percentage: number;
  };
}

type SortField = 'title' | 'task_category' | 'duration_minutes' | 'created_at' | 'sort_order';
type SortOrder = 'asc' | 'desc';
type TabType = 'tasks' | 'completions';

const CATEGORIES = [
  { value: 'nederlands', label: 'Nederlands', emoji: '📚' },
  { value: 'wiskunde', label: 'Wiskunde', emoji: '🔢' },
  { value: 'motoriek', label: 'Motoriek', emoji: '🤸' },
  { value: 'sociaal', label: 'Sociaal', emoji: '🤝' },
  { value: 'wetenschap', label: 'Wetenschap', emoji: '🔬' },
  { value: 'geschiedenis', label: 'Geschiedenis', emoji: '🏛️' },
  { value: 'muziek', label: 'Muziek', emoji: '🎵' },
  { value: 'drama', label: 'Drama', emoji: '🎭' },
];

export default function PhysicalTasks() {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [tasks, setTasks] = useState<PhysicalTask[]>([]);
  const [completions, setCompletions] = useState<CompletionLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    activeTasks: 0,
    totalCompletions: 0,
    categoryBreakdown: [],
    growth: { thisMonth: 0, lastMonth: 0, percentage: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('sort_order');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [materialsInput, setMaterialsInput] = useState('');
  const [goalCodesInput, setGoalCodesInput] = useState('');

  const [taskForm, setTaskForm] = useState<PhysicalTask>({
    title: '',
    emoji: '✋',
    goal_codes: [],
    description: '',
    instructions: '',
    duration_minutes: 10,
    materials_needed: [],
    task_category: 'nederlands',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchTasks(), fetchCompletions(), fetchStats()]);
    setLoading(false);
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('physical_tasks')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showNotification('error', 'Fout bij ophalen opdrachten');
    }
  };

  const fetchCompletions = async () => {
    try {
      const { data, error } = await supabase
        .from('task_completion_log')
        .select(`
          *,
          physical_tasks(title)
        `)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      const logs = (data || []).map((log: any) => ({
        ...log,
        task_title: log.physical_tasks?.title || 'Onbekend',
      }));
      setCompletions(logs);
    } catch (error) {
      console.error('Error fetching completions:', error);
      showNotification('error', 'Fout bij ophalen logs');
    }
  };

  const fetchStats = async () => {
    try {
      const [tasksData, completionsData] = await Promise.all([
        supabase.from('physical_tasks').select('created_at, is_active, task_category'),
        supabase.from('task_completion_log').select('completed_at'),
      ]);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const totalTasks = tasksData.data?.length || 0;
      const activeTasks = tasksData.data?.filter((t) => t.is_active).length || 0;
      const totalCompletions = completionsData.data?.length || 0;

      const categoryBreakdown = CATEGORIES.map((cat) => ({
        category: cat.label,
        count: tasksData.data?.filter((t) => t.task_category === cat.value).length || 0,
      }));

      const thisMonth = tasksData.data?.filter((t) => new Date(t.created_at || '') >= thisMonthStart).length || 0;
      const lastMonth =
        tasksData.data?.filter(
          (t) => new Date(t.created_at || '') >= lastMonthStart && new Date(t.created_at || '') < thisMonthStart
        ).length || 0;

      const percentage = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;

      setStats({
        totalTasks,
        activeTasks,
        totalCompletions,
        categoryBreakdown,
        growth: { thisMonth, lastMonth, percentage },
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateTask = () => {
    setEditingId(null);
    setTaskForm({
      title: '',
      emoji: '✋',
      goal_codes: [],
      description: '',
      instructions: '',
      duration_minutes: 10,
      materials_needed: [],
      task_category: 'nederlands',
      sort_order: tasks.length,
      is_active: true,
    });
    setMaterialsInput('');
    setGoalCodesInput('');
    setShowModal(true);
  };

  const handleEditTask = (task: PhysicalTask) => {
    setEditingId(task.id || null);
    setTaskForm(task);
    setMaterialsInput(task.materials_needed.join(', '));
    setGoalCodesInput(task.goal_codes.join(', '));
    setShowModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      showNotification('error', 'Titel is verplicht');
      return;
    }

    setSaving(true);
    try {
      const materials = materialsInput
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m);
      const goalCodes = goalCodesInput
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g);

      const taskData = {
        title: taskForm.title.trim(),
        emoji: taskForm.emoji,
        goal_codes: goalCodes,
        description: taskForm.description.trim(),
        instructions: taskForm.instructions.trim(),
        duration_minutes: taskForm.duration_minutes,
        materials_needed: materials,
        task_category: taskForm.task_category,
        sort_order: taskForm.sort_order,
        is_active: taskForm.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('physical_tasks').update(taskData).eq('id', editingId);

        if (error) throw error;
        showNotification('success', 'Opdracht succesvol bijgewerkt');
      } else {
        const { error } = await supabase.from('physical_tasks').insert([taskData]);

        if (error) throw error;
        showNotification('success', 'Opdracht succesvol toegevoegd');
      }

      await fetchAllData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving task:', error);
      showNotification('error', 'Fout bij opslaan opdracht');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze opdracht wilt verwijderen?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('physical_tasks').delete().eq('id', id);

      if (error) throw error;
      showNotification('success', 'Opdracht succesvol verwijderd');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting task:', error);
      showNotification('error', 'Fout bij verwijderen opdracht');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedTasks = tasks
    .filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || task.task_category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField as keyof PhysicalTask];
      let bValue: any = b[sortField as keyof PhysicalTask];

      if (sortField === 'created_at') {
        aValue = new Date(aValue || '').getTime();
        bValue = new Date(bValue || '').getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const getCategoryEmoji = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.emoji || '📋';
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doe-opdrachten</h1>
          <p className="text-gray-600 mt-1">Beheer praktijkopdrachten en activiteiten</p>
        </div>
        <button
          onClick={handleCreateTask}
          disabled={activeTab === 'completions'}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Nieuwe Opdracht
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totaal Opdrachten</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTasks}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.activeTasks} actief</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <HandMetal className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Uitgevoerd</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCompletions}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <ListChecks className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categorieën</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{CATEGORIES.length}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <Tag className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Groei Maand</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.growth.percentage > 0 ? '+' : ''}
                {stats.growth.percentage.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.growth.thisMonth} vs {stats.growth.lastMonth}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stats.growth.percentage >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <TrendingUp className={`w-6 h-6 ${stats.growth.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Verdeling per Categorie</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.categoryBreakdown.map((cat) => (
            <div key={cat.category} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{getCategoryEmoji(cat.category.toLowerCase())}</span>
                <span className="text-2xl font-bold text-gray-900">{cat.count}</span>
              </div>
              <p className="text-sm text-gray-600">{cat.category}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <HandMetal className="w-4 h-4" />
                Doe-opdrachten ({stats.totalTasks})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('completions')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'completions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Uitvoeringslogs ({stats.totalCompletions})
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'tasks' && (
            <>
              <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Zoek opdrachten..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">Alle Categorieën</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Emoji
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('title')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Titel
                          <SortIcon field="title" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('task_category')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Categorie
                          <SortIcon field="task_category" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('duration_minutes')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Duur
                          <SortIcon field="duration_minutes" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('sort_order')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Volgorde
                          <SortIcon field="sort_order" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          Geen opdrachten gevonden
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="text-2xl">{task.emoji}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{task.title}</p>
                              <p className="text-sm text-gray-500 truncate max-w-xs">{task.description}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {getCategoryEmoji(task.task_category)}
                              {getCategoryLabel(task.task_category)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {task.duration_minutes} min
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{task.sort_order}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                task.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {task.is_active ? 'Actief' : 'Inactief'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditTask(task)}
                                disabled={deletingId === task.id}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Bewerken"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => task.id && handleDeleteTask(task.id)}
                                disabled={deletingId === task.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Verwijderen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'completions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Opdracht
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Notities
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        Geen uitvoeringslogs gevonden
                      </td>
                    </tr>
                  ) : (
                    completions.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{log.task_title}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(log.completed_at).toLocaleDateString('nl-NL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Opdracht Bewerken' : 'Nieuwe Opdracht'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titel *</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                  <input
                    type="text"
                    value={taskForm.emoji}
                    onChange={(e) => setTaskForm({ ...taskForm, emoji: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  disabled={saving}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructies</label>
                <textarea
                  value={taskForm.instructions}
                  onChange={(e) => setTaskForm({ ...taskForm, instructions: e.target.value })}
                  disabled={saving}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categorie</label>
                  <select
                    value={taskForm.task_category}
                    onChange={(e) => setTaskForm({ ...taskForm, task_category: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duur (minuten)</label>
                  <input
                    type="number"
                    value={taskForm.duration_minutes}
                    onChange={(e) => setTaskForm({ ...taskForm, duration_minutes: parseInt(e.target.value) || 0 })}
                    disabled={saving}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Materialen (gescheiden door komma's)
                </label>
                <input
                  type="text"
                  value={materialsInput}
                  onChange={(e) => setMaterialsInput(e.target.value)}
                  disabled={saving}
                  placeholder="papier, schaar, lijm"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doelcodes (gescheiden door komma's)
                </label>
                <input
                  type="text"
                  value={goalCodesInput}
                  onChange={(e) => setGoalCodesInput(e.target.value)}
                  disabled={saving}
                  placeholder="1.3.1, 1.3.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Volgorde</label>
                <input
                  type="number"
                  value={taskForm.sort_order}
                  onChange={(e) => setTaskForm({ ...taskForm, sort_order: parseInt(e.target.value) || 0 })}
                  disabled={saving}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={taskForm.is_active}
                    onChange={(e) => setTaskForm({ ...taskForm, is_active: e.target.checked })}
                    disabled={saving}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-medium text-gray-700">Actief</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuleren
              </button>
              <button
                onClick={handleSaveTask}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
