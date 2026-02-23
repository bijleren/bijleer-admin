import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  TrendingUp,
  Target,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Tag,
  BookMarked,
} from 'lucide-react';

interface VocabularyCategory {
  id?: string;
  name: string;
  emoji: string;
  description: string | null;
  goal_codes: string[];
  word_count: number;
  category_type: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface VocabularyWord {
  id?: string;
  category_id: string;
  word: string;
  goal_codes: string[];
  sort_order: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
}

interface CustomVocabulary {
  id: string;
  school_id: string;
  category_id: string;
  word: string;
  goal_codes: string[];
  is_deleted: boolean;
  created_by: string;
  created_at: string;
  category_name?: string;
}

interface PracticeLog {
  id: string;
  group_id: string;
  word: string;
  goal_codes: string[] | null;
  clicked_at: string;
  created_by: string;
}

interface Stats {
  totalCategories: number;
  activeCategories: number;
  totalWords: number;
  totalCustomWords: number;
  totalPracticeLogs: number;
  avgScore: number;
  typeBreakdown: { type: string; count: number }[];
  growth: {
    thisMonth: number;
    lastMonth: number;
    percentage: number;
  };
}

type SortField = 'name' | 'category_type' | 'word_count' | 'created_at' | 'sort_order';
type SortOrder = 'asc' | 'desc';
type TabType = 'categories' | 'words' | 'custom' | 'practice';

const CATEGORY_TYPES = [
  { value: 'wereldoriëntatie', label: 'Wereldoriëntatie', emoji: '🌍' },
  { value: 'wiskunde', label: 'Wiskunde', emoji: '🔢' },
  { value: 'kunst', label: 'Kunst & Taal', emoji: '🎨' },
  { value: 'verkeer', label: 'Verkeer', emoji: '🚦' },
];

export default function VocabularyManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [categories, setCategories] = useState<VocabularyCategory[]>([]);
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [customWords, setCustomWords] = useState<CustomVocabulary[]>([]);
  const [practiceLogs, setPracticeLogs] = useState<PracticeLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCategories: 0,
    activeCategories: 0,
    totalWords: 0,
    totalCustomWords: 0,
    totalPracticeLogs: 0,
    avgScore: 0,
    typeBreakdown: [],
    growth: { thisMonth: 0, lastMonth: 0, percentage: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('sort_order');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [goalCodesInput, setGoalCodesInput] = useState('');

  const [categoryForm, setCategoryForm] = useState<VocabularyCategory>({
    name: '',
    emoji: '📚',
    description: null,
    goal_codes: [],
    word_count: 0,
    category_type: 'wereldoriëntatie',
    sort_order: 0,
    is_active: true,
  });

  const [wordForm, setWordForm] = useState<VocabularyWord>({
    category_id: '',
    word: '',
    goal_codes: [],
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchWords(), fetchCustomWords(), fetchPracticeLogs(), fetchStats()]);
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('vocabulary_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showNotification('error', 'Fout bij ophalen categorieën');
    }
  };

  const fetchWords = async () => {
    try {
      const { data, error } = await supabase
        .from('vocabulary_words')
        .select(`
          *,
          vocabulary_categories(name)
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const wordsData = (data || []).map((word: any) => ({
        ...word,
        category_name: word.vocabulary_categories?.name || 'Onbekend',
      }));
      setWords(wordsData);
    } catch (error) {
      console.error('Error fetching words:', error);
      showNotification('error', 'Fout bij ophalen woorden');
    }
  };

  const fetchCustomWords = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_vocabulary')
        .select(`
          *,
          vocabulary_categories(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const customData = (data || []).map((word: any) => ({
        ...word,
        category_name: word.vocabulary_categories?.name || 'Onbekend',
      }));
      setCustomWords(customData);
    } catch (error) {
      console.error('Error fetching custom words:', error);
      showNotification('error', 'Fout bij ophalen custom woorden');
    }
  };

  const fetchPracticeLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('vocabulary_practice_log')
        .select('*')
        .order('clicked_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPracticeLogs(data || []);
    } catch (error) {
      console.error('Error fetching practice logs:', error);
      showNotification('error', 'Fout bij ophalen oefenlogs');
    }
  };

  const fetchStats = async () => {
    try {
      const [categoriesData, wordsData, customData, logsData] = await Promise.all([
        supabase.from('vocabulary_categories').select('created_at, is_active, category_type'),
        supabase.from('vocabulary_words').select('id'),
        supabase.from('custom_vocabulary').select('id'),
        supabase.from('vocabulary_practice_log').select('id, clicked_at'),
      ]);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const totalCategories = categoriesData.data?.length || 0;
      const activeCategories = categoriesData.data?.filter((c) => c.is_active).length || 0;
      const totalWords = wordsData.data?.length || 0;
      const totalCustomWords = customData.data?.length || 0;
      const totalPracticeLogs = logsData.data?.length || 0;

      const avgScore = 0;

      const typeBreakdown = CATEGORY_TYPES.map((type) => ({
        type: type.label,
        count: categoriesData.data?.filter((c) => c.category_type === type.value).length || 0,
      }));

      const thisMonth = categoriesData.data?.filter((c) => new Date(c.created_at || '') >= thisMonthStart).length || 0;
      const lastMonth =
        categoriesData.data?.filter(
          (c) => new Date(c.created_at || '') >= lastMonthStart && new Date(c.created_at || '') < thisMonthStart
        ).length || 0;

      const percentage = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;

      setStats({
        totalCategories,
        activeCategories,
        totalWords,
        totalCustomWords,
        totalPracticeLogs,
        avgScore,
        typeBreakdown,
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

  const handleCreateCategory = () => {
    setEditingId(null);
    setCategoryForm({
      name: '',
      emoji: '📚',
      description: null,
      goal_codes: [],
      word_count: 0,
      category_type: 'wereldoriëntatie',
      sort_order: categories.length,
      is_active: true,
    });
    setGoalCodesInput('');
    setShowModal(true);
  };

  const handleEditCategory = (category: VocabularyCategory) => {
    setEditingId(category.id || null);
    setCategoryForm(category);
    setGoalCodesInput(category.goal_codes.join(', '));
    setShowModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      showNotification('error', 'Naam is verplicht');
      return;
    }

    setSaving(true);
    try {
      const goalCodes = goalCodesInput
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g);

      const categoryData = {
        name: categoryForm.name.trim(),
        emoji: categoryForm.emoji,
        description: categoryForm.description?.trim() || '',
        goal_codes: goalCodes,
        word_count: categoryForm.word_count,
        category_type: categoryForm.category_type,
        sort_order: categoryForm.sort_order,
        is_active: categoryForm.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('vocabulary_categories').update(categoryData).eq('id', editingId);

        if (error) throw error;
        showNotification('success', 'Categorie succesvol bijgewerkt');
      } else {
        const { error } = await supabase.from('vocabulary_categories').insert([categoryData]);

        if (error) throw error;
        showNotification('success', 'Categorie succesvol toegevoegd');
      }

      await fetchAllData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving category:', error);
      showNotification('error', 'Fout bij opslaan categorie');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze categorie wilt verwijderen?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('vocabulary_categories').delete().eq('id', id);

      if (error) throw error;
      showNotification('success', 'Categorie succesvol verwijderd');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification('error', 'Fout bij verwijderen categorie');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateWord = () => {
    setEditingId(null);
    setWordForm({
      category_id: categories.length > 0 ? categories[0].id || '' : '',
      word: '',
      goal_codes: [],
      sort_order: words.length,
      is_active: true,
    });
    setGoalCodesInput('');
    setShowModal(true);
  };

  const handleEditWord = (word: VocabularyWord) => {
    setEditingId(word.id || null);
    setWordForm(word);
    setGoalCodesInput(word.goal_codes.join(', '));
    setShowModal(true);
  };

  const handleSaveWord = async () => {
    if (!wordForm.word.trim()) {
      showNotification('error', 'Woord is verplicht');
      return;
    }
    if (!wordForm.category_id) {
      showNotification('error', 'Categorie is verplicht');
      return;
    }

    setSaving(true);
    try {
      const goalCodes = goalCodesInput
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g);

      const wordData = {
        category_id: wordForm.category_id,
        word: wordForm.word.trim(),
        goal_codes: goalCodes,
        sort_order: wordForm.sort_order,
        is_active: wordForm.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('vocabulary_words').update(wordData).eq('id', editingId);

        if (error) throw error;
        showNotification('success', 'Woord succesvol bijgewerkt');
      } else {
        const { error } = await supabase.from('vocabulary_words').insert([wordData]);

        if (error) throw error;
        showNotification('success', 'Woord succesvol toegevoegd');
      }

      await fetchAllData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving word:', error);
      showNotification('error', 'Fout bij opslaan woord');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWord = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit woord wilt verwijderen?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('vocabulary_words').delete().eq('id', id);

      if (error) throw error;
      showNotification('success', 'Woord succesvol verwijderd');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting word:', error);
      showNotification('error', 'Fout bij verwijderen woord');
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

  const getCategoryTypeInfo = (type: string) => {
    return CATEGORY_TYPES.find((t) => t.value === type) || { label: type, emoji: '📋' };
  };

  const filteredAndSortedCategories = categories
    .filter((category) => {
      const matchesSearch =
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || category.category_type === typeFilter;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField as keyof VocabularyCategory];
      let bValue: any = b[sortField as keyof VocabularyCategory];

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

  const filteredWords = words.filter((word) => {
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || word.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
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
          <h1 className="text-3xl font-bold text-gray-900">Woordenschat</h1>
          <p className="text-gray-600 mt-1">Beheer woordenschat categorieën en woorden</p>
        </div>
        <button
          onClick={activeTab === 'categories' ? handleCreateCategory : handleCreateWord}
          disabled={activeTab !== 'categories' && activeTab !== 'words'}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'categories' ? 'Nieuwe Categorie' : 'Nieuw Woord'}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categorieën</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCategories}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.activeCategories} actief</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Tag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Woorden</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalWords}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Custom</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCustomWords}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <BookMarked className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Oefensessies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPracticeLogs}</p>
              <p className="text-xs text-gray-500 mt-1">Gem: {stats.avgScore.toFixed(0)}%</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <Target className="w-6 h-6 text-yellow-600" />
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Verdeling per Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.typeBreakdown.map((type) => {
            const typeInfo = CATEGORY_TYPES.find((t) => t.label === type.type);
            return (
              <div key={type.type} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{typeInfo?.emoji || '📋'}</span>
                  <span className="text-2xl font-bold text-gray-900">{type.count}</span>
                </div>
                <p className="text-sm text-gray-600">{type.type}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'categories'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categorieën ({stats.totalCategories})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('words')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'words'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Woorden ({stats.totalWords})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'custom'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4" />
                Custom ({stats.totalCustomWords})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'practice'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Oefensessies ({stats.totalPracticeLogs})
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'categories' && (
            <>
              <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Zoek categorieën..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">Alle Types</option>
                    {CATEGORY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label}
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
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Naam
                          <SortIcon field="name" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('category_type')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Type
                          <SortIcon field="category_type" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('word_count')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Woorden
                          <SortIcon field="word_count" />
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
                    {filteredAndSortedCategories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          Geen categorieën gevonden
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedCategories.map((category) => {
                        const typeInfo = getCategoryTypeInfo(category.category_type);
                        return (
                          <tr key={category.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="text-2xl">{category.emoji}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{category.name}</p>
                                <p className="text-sm text-gray-500 truncate max-w-xs">{category.description}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {typeInfo.emoji} {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{category.word_count}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{category.sort_order}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                  category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {category.is_active ? 'Actief' : 'Inactief'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditCategory(category)}
                                  disabled={deletingId === category.id}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Bewerken"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => category.id && handleDeleteCategory(category.id)}
                                  disabled={deletingId === category.id}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Verwijderen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'words' && (
            <>
              <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Zoek woorden..."
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
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
                  >
                    <option value="all">Alle Categorieën</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.name}
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
                        Categorie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Woord
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Doelcodes
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actief
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredWords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          Geen woorden gevonden
                        </td>
                      </tr>
                    ) : (
                      filteredWords.map((word) => (
                      <tr key={word.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{word.category_name}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{word.word}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {word.goal_codes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {word.goal_codes.map((code, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  {code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">Geen doelcodes</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {word.is_active ? (
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                          ) : (
                            <span className="inline-block w-2 h-2 bg-gray-300 rounded-full"></span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditWord(word)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Bewerken"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => word.id && handleDeleteWord(word.id)}
                              disabled={deletingId === word.id}
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

          {activeTab === 'custom' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Categorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Woord
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Doelcodes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customWords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        Geen custom woorden gevonden
                      </td>
                    </tr>
                  ) : (
                    customWords.map((word) => (
                      <tr key={word.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{word.category_name}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{word.word}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {word.goal_codes && word.goal_codes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {word.goal_codes.map((code, idx) => (
                                <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                  {code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(word.created_at).toLocaleDateString('nl-NL')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'practice' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Woord
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Doelcodes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {practiceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        Geen oefensessies gevonden
                      </td>
                    </tr>
                  ) : (
                    practiceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{log.word}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.goal_codes && log.goal_codes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {log.goal_codes.map((code, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  {code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(log.clicked_at).toLocaleDateString('nl-NL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {activeTab === 'categories'
                    ? editingId
                      ? 'Categorie Bewerken'
                      : 'Nieuwe Categorie'
                    : editingId
                    ? 'Woord Bewerken'
                    : 'Nieuw Woord'}
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
              {activeTab === 'categories' ? (
                <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Naam *</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                  <input
                    type="text"
                    value={categoryForm.emoji}
                    onChange={(e) => setCategoryForm({ ...categoryForm, emoji: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                <textarea
                  value={categoryForm.description || ''}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  disabled={saving}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={categoryForm.category_type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, category_type: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {CATEGORY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aantal Woorden</label>
                  <input
                    type="number"
                    value={categoryForm.word_count}
                    onChange={(e) => setCategoryForm({ ...categoryForm, word_count: parseInt(e.target.value) || 0 })}
                    disabled={saving}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Volgorde</label>
                <input
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })}
                  disabled={saving}
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
                  placeholder="4.1.3, 2.4.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_active}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                    disabled={saving}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-medium text-gray-700">Actief</span>
                </label>
              </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categorie *</label>
                    <select
                      value={wordForm.category_id}
                      onChange={(e) => setWordForm({ ...wordForm, category_id: e.target.value })}
                      disabled={saving}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Selecteer categorie...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Woord *</label>
                    <input
                      type="text"
                      value={wordForm.word}
                      onChange={(e) => setWordForm({ ...wordForm, word: e.target.value })}
                      disabled={saving}
                      placeholder="bijv. appelbloom, verkeersdrempel"
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
                      placeholder="4.1.3, 2.4.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Volgorde</label>
                      <input
                        type="number"
                        value={wordForm.sort_order || 0}
                        onChange={(e) => setWordForm({ ...wordForm, sort_order: parseInt(e.target.value) || 0 })}
                        disabled={saving}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 h-full pt-8">
                        <input
                          type="checkbox"
                          checked={wordForm.is_active}
                          onChange={(e) => setWordForm({ ...wordForm, is_active: e.target.checked })}
                          disabled={saving}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm font-medium text-gray-700">Actief</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
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
                onClick={activeTab === 'categories' ? handleSaveCategory : handleSaveWord}
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
