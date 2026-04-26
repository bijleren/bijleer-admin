import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Gamepad2, Plus, CreditCard as Edit2, Trash2, Search, X, Save, TrendingUp, Play, Trophy, Filter, ArrowUpDown, ArrowUp, ArrowDown, BarChart3, Target } from 'lucide-react';

interface LearningGame {
  id?: string;
  name: string;
  emoji: string;
  description: string | null;
  question_count: number;
  goal_codes: string[];
  game_type: string;
  difficulty_level: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface GameQuestion {
  id?: string;
  game_id: string;
  question: string;
  visual: string;
  answer: string;
  options: string[];
  sort_order: number;
  created_at?: string;
}

interface GameSession {
  id: string;
  game_id: string;
  group_id: string;
  played_at: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  duration_seconds: number;
  created_by: string;
  game_name?: string;
}

interface Stats {
  totalGames: number;
  activeGames: number;
  totalQuestions: number;
  totalSessions: number;
  avgScore: number;
  categoryBreakdown: { category: string; count: number }[];
  growth: {
    thisMonth: number;
    lastMonth: number;
    percentage: number;
  };
}

type SortField = 'name' | 'game_type' | 'difficulty_level' | 'question_count' | 'created_at' | 'sort_order';
type SortOrder = 'asc' | 'desc';
type TabType = 'games' | 'questions' | 'sessions';

const GAME_TYPES = [
  { value: 'rhyme', label: 'Rijmen', emoji: '🎵', category: 'taal' },
  { value: 'letters', label: 'Letters', emoji: '🔤', category: 'taal' },
  { value: 'line_recognition', label: 'Lijn Herkennen', emoji: '📐', category: 'taal' },
  { value: 'direction_quiz', label: 'Richting', emoji: '➡️', category: 'taal' },
  { value: 'counting', label: 'Tellen', emoji: '🔢', category: 'wiskunde' },
  { value: 'shapes', label: 'Vormen', emoji: '🔷', category: 'wiskunde' },
  { value: 'sorting', label: 'Vergelijken', emoji: '📦', category: 'wiskunde' },
  { value: 'days', label: 'Dagen', emoji: '📅', category: 'wiskunde' },
  { value: 'patterns', label: 'Patronen', emoji: '🔶', category: 'wiskunde' },
  { value: 'ranking', label: 'Rangorde', emoji: '🏆', category: 'wiskunde' },
  { value: 'subitize', label: 'Flitsen', emoji: '👀', category: 'wiskunde' },
  { value: 'money', label: 'Geld', emoji: '💶', category: 'wiskunde' },
  { value: 'animals', label: 'Dieren', emoji: '🐾', category: 'wereldoriëntatie' },
  { value: 'body', label: 'Lichaamsdelen', emoji: '🦶', category: 'wereldoriëntatie' },
  { value: 'senses', label: 'Zintuigen', emoji: '👁️', category: 'wereldoriëntatie' },
  { value: 'lifecycle', label: 'Levenscyclus', emoji: '🔄', category: 'wereldoriëntatie' },
  { value: 'weather', label: 'Weer', emoji: '🌤️', category: 'wereldoriëntatie' },
  { value: 'seasons', label: 'Seizoenen', emoji: '🍂', category: 'wereldoriëntatie' },
  { value: 'geography', label: 'Aardrijkskunde', emoji: '🌍', category: 'wereldoriëntatie' },
  { value: 'colors', label: 'Kleuren', emoji: '🎨', category: 'kunst' },
  { value: 'emotions', label: 'Gevoelens', emoji: '😊', category: 'sociaal' },
  { value: 'position', label: 'Positie', emoji: '📍', category: 'ruimtelijk' },
];

const CATEGORIES = [
  { value: 'taal', label: 'Taal', emoji: '📚' },
  { value: 'wiskunde', label: 'Wiskunde', emoji: '🔢' },
  { value: 'wereldoriëntatie', label: 'Wereldoriëntatie', emoji: '🌍' },
  { value: 'kunst', label: 'Kunst', emoji: '🎨' },
  { value: 'sociaal', label: 'Sociaal', emoji: '🤝' },
  { value: 'ruimtelijk', label: 'Ruimtelijk', emoji: '📍' },
];

export default function LearningGames() {
  const [activeTab, setActiveTab] = useState<TabType>('games');
  const [games, setGames] = useState<LearningGame[]>([]);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalGames: 0,
    activeGames: 0,
    totalQuestions: 0,
    totalSessions: 0,
    avgScore: 0,
    categoryBreakdown: [],
    growth: { thisMonth: 0, lastMonth: 0, percentage: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [gameTypeFilter, setGameTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('sort_order');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [goalCodesInput, setGoalCodesInput] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionGameFilter, setQuestionGameFilter] = useState<string>('all');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [questionOptionsInput, setQuestionOptionsInput] = useState('');
  const [questionForm, setQuestionForm] = useState<Omit<GameQuestion, 'id' | 'created_at'>>({
    game_id: '',
    question: '',
    visual: '',
    answer: '',
    options: [],
    sort_order: 0,
  });
  const [deleteQuestionConfirm, setDeleteQuestionConfirm] = useState<{ show: boolean; id: string | null; question: string }>({
    show: false,
    id: null,
    question: '',
  });

  const [gameForm, setGameForm] = useState<LearningGame>({
    name: '',
    emoji: '🎮',
    description: null,
    question_count: 10,
    goal_codes: [],
    game_type: 'rhyme',
    difficulty_level: 1,
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchGames(), fetchQuestions(), fetchSessions(), fetchStats()]);
    setLoading(false);
  };

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_games')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      showNotification('error', 'Fout bij ophalen spellen');
    }
  };

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('game_questions')
        .select(`
          *,
          learning_games(name)
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      showNotification('error', 'Fout bij ophalen vragen');
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select(`
          *,
          learning_games(name)
        `)
        .order('played_at', { ascending: false });

      if (error) throw error;
      const sessionsData = (data || []).map((session: any) => ({
        ...session,
        game_name: session.learning_games?.name || 'Onbekend',
      }));
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showNotification('error', 'Fout bij ophalen sessies');
    }
  };

  const fetchStats = async () => {
    try {
      const [gamesData, questionsData, sessionsData] = await Promise.all([
        supabase.from('learning_games').select('created_at, is_active, game_type'),
        supabase.from('game_questions').select('id'),
        supabase.from('game_sessions').select('score, total_questions, played_at'),
      ]);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const totalGames = gamesData.data?.length || 0;
      const activeGames = gamesData.data?.filter((g) => g.is_active).length || 0;
      const totalQuestions = questionsData.data?.length || 0;
      const totalSessions = sessionsData.data?.length || 0;

      const avgScore =
        totalSessions > 0
          ? (sessionsData.data || []).reduce((acc, s) => acc + (s.total_questions > 0 ? (s.score / s.total_questions) * 100 : 0), 0) / totalSessions
          : 0;

      const categoryBreakdown = CATEGORIES.map((cat) => ({
        category: cat.label,
        count: gamesData.data?.filter((g) => {
          const gameType = GAME_TYPES.find((t) => t.value === g.game_type);
          return gameType?.category === cat.value;
        }).length || 0,
      }));

      const thisMonth = gamesData.data?.filter((g) => new Date(g.created_at || '') >= thisMonthStart).length || 0;
      const lastMonth =
        gamesData.data?.filter(
          (g) => new Date(g.created_at || '') >= lastMonthStart && new Date(g.created_at || '') < thisMonthStart
        ).length || 0;

      const percentage = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;

      setStats({
        totalGames,
        activeGames,
        totalQuestions,
        totalSessions,
        avgScore,
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

  const handleCreateGame = () => {
    setEditingId(null);
    setGameForm({
      name: '',
      emoji: '🎮',
      description: null,
      question_count: 10,
      goal_codes: [],
      game_type: 'rhyme',
      difficulty_level: 1,
      sort_order: games.length,
      is_active: true,
    });
    setGoalCodesInput('');
    setShowModal(true);
  };

  const handleEditGame = (game: LearningGame) => {
    setEditingId(game.id || null);
    setGameForm(game);
    setGoalCodesInput(game.goal_codes.join(', '));
    setShowModal(true);
  };

  const handleSaveGame = async () => {
    if (!gameForm.name.trim()) {
      showNotification('error', 'Naam is verplicht');
      return;
    }

    setSaving(true);
    try {
      const goalCodes = goalCodesInput
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g);

      const gameData = {
        name: gameForm.name.trim(),
        emoji: gameForm.emoji,
        description: gameForm.description?.trim() || '',
        question_count: gameForm.question_count,
        goal_codes: goalCodes,
        game_type: gameForm.game_type,
        difficulty_level: gameForm.difficulty_level,
        sort_order: gameForm.sort_order,
        is_active: gameForm.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('learning_games').update(gameData).eq('id', editingId);

        if (error) throw error;
        showNotification('success', 'Spel succesvol bijgewerkt');
      } else {
        const { error } = await supabase.from('learning_games').insert([gameData]);

        if (error) throw error;
        showNotification('success', 'Spel succesvol toegevoegd');
      }

      await fetchAllData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving game:', error);
      showNotification('error', 'Fout bij opslaan spel');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit spel wilt verwijderen?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('learning_games').delete().eq('id', id);

      if (error) throw error;
      showNotification('success', 'Spel succesvol verwijderd');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting game:', error);
      showNotification('error', 'Fout bij verwijderen spel');
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

  const handleCreateQuestion = () => {
    setEditingQuestionId(null);
    const defaultGameId = games[0]?.id || '';
    setQuestionForm({
      game_id: questionGameFilter !== 'all' ? questionGameFilter : defaultGameId,
      question: '',
      visual: '',
      answer: '',
      options: [],
      sort_order: questions.length,
    });
    setQuestionOptionsInput('');
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (q: GameQuestion) => {
    setEditingQuestionId(q.id || null);
    setQuestionForm({
      game_id: q.game_id,
      question: q.question,
      visual: q.visual,
      answer: q.answer,
      options: q.options,
      sort_order: q.sort_order,
    });
    setQuestionOptionsInput(q.options.join(', '));
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question.trim() || !questionForm.answer.trim() || !questionForm.game_id) {
      showNotification('error', 'Spel, vraag en antwoord zijn verplicht');
      return;
    }

    setSavingQuestion(true);
    try {
      const opts = questionOptionsInput
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o);

      const payload = {
        game_id: questionForm.game_id,
        question: questionForm.question.trim(),
        visual: questionForm.visual.trim(),
        answer: questionForm.answer.trim(),
        options: opts,
        sort_order: questionForm.sort_order,
      };

      if (editingQuestionId) {
        const { error } = await supabase.from('game_questions').update(payload).eq('id', editingQuestionId);
        if (error) throw error;
        showNotification('success', 'Vraag bijgewerkt');
      } else {
        const { error } = await supabase.from('game_questions').insert([payload]);
        if (error) throw error;
        showNotification('success', 'Vraag aangemaakt');
      }

      await fetchAllData();
      setShowQuestionModal(false);
    } catch (error) {
      console.error('Error saving question:', error);
      showNotification('error', 'Fout bij opslaan vraag');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestionClick = (q: GameQuestion) => {
    setDeleteQuestionConfirm({ show: true, id: q.id || null, question: q.question });
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionConfirm.id) return;
    try {
      const { error } = await supabase.from('game_questions').delete().eq('id', deleteQuestionConfirm.id);
      if (error) throw error;
      showNotification('success', 'Vraag verwijderd');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting question:', error);
      showNotification('error', 'Fout bij verwijderen vraag');
    } finally {
      setDeleteQuestionConfirm({ show: false, id: null, question: '' });
    }
  };

  const filteredQuestions = questions.filter((q: any) => {
    const matchesSearch =
      q.question.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.answer.toLowerCase().includes(questionSearch.toLowerCase());
    const matchesGame = questionGameFilter === 'all' || q.game_id === questionGameFilter;
    return matchesSearch && matchesGame;
  });

  const getGameTypeInfo = (gameType: string) => {
    return GAME_TYPES.find((t) => t.value === gameType) || { label: gameType, emoji: '🎮', category: 'overig' };
  };

  const getCategoryEmoji = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.emoji || '📋';
  };

  const filteredAndSortedGames = games
    .filter((game) => {
      const matchesSearch =
        game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (game.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const gameTypeInfo = getGameTypeInfo(game.game_type);
      const matchesCategory = categoryFilter === 'all' || gameTypeInfo.category === categoryFilter;
      const matchesGameType = gameTypeFilter === 'all' || game.game_type === gameTypeFilter;

      return matchesSearch && matchesCategory && matchesGameType;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField as keyof LearningGame];
      let bValue: any = b[sortField as keyof LearningGame];

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
          <h1 className="text-3xl font-bold text-gray-900">Leerspellen</h1>
          <p className="text-gray-600 mt-1">Beheer interactieve spellen en vragen</p>
        </div>
        <button
          onClick={handleCreateGame}
          disabled={activeTab !== 'games'}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Nieuw Spel
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
              <p className="text-sm text-gray-600">Totaal Spellen</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalGames}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.activeGames} actief</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Gamepad2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totaal Vragen</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalQuestions}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gespeeld</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSessions}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Play className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gem. Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgScore.toFixed(0)}%</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <Trophy className="w-6 h-6 text-yellow-600" />
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              onClick={() => setActiveTab('games')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'games'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                Spellen ({stats.totalGames})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'questions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Vragen ({stats.totalQuestions})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sessions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Sessies ({stats.totalSessions})
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'games' && (
            <>
              <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Zoek spellen..."
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
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={gameTypeFilter}
                    onChange={(e) => setGameTypeFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">Kies een spelletje</option>
                    {GAME_TYPES.map((type) => (
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
                          onClick={() => handleSort('game_type')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Type
                          <SortIcon field="game_type" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('question_count')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Vragen
                          <SortIcon field="question_count" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('difficulty_level')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                        >
                          Niveau
                          <SortIcon field="difficulty_level" />
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
                    {filteredAndSortedGames.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          Geen spellen gevonden
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedGames.map((game) => {
                        const typeInfo = getGameTypeInfo(game.game_type);
                        return (
                          <tr key={game.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="text-2xl">{game.emoji}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{game.name}</p>
                                <p className="text-sm text-gray-500 truncate max-w-xs">{game.description}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {typeInfo.emoji} {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{game.question_count}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">Niveau {game.difficulty_level}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{game.sort_order}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                  game.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {game.is_active ? 'Actief' : 'Inactief'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditGame(game)}
                                  disabled={deletingId === game.id}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Bewerken"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => game.id && handleDeleteGame(game.id)}
                                  disabled={deletingId === game.id}
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

          {activeTab === 'questions' && (
            <>
              <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Zoek vragen..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={questionGameFilter}
                    onChange={(e) => setQuestionGameFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">Alle Spellen</option>
                    {games.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.emoji} {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleCreateQuestion}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nieuwe Vraag
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Spel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Vraag
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Antwoord
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Opties
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredQuestions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          Geen vragen gevonden
                        </td>
                      </tr>
                    ) : (
                      filteredQuestions.map((question: any) => (
                        <tr key={question.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{question.learning_games?.name || 'Onbekend'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">{question.question}</td>
                          <td className="px-6 py-4 text-sm font-medium text-green-600">{question.answer}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{question.options.join(', ')}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditQuestion(question)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Bewerken"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuestionClick(question)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

          {activeTab === 'sessions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Spel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Duur
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        Geen sessies gevonden
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{session.game_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(session.played_at).toLocaleDateString('nl-NL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {session.correct_answers}/{session.total_questions}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({session.total_questions > 0 ? ((session.score / session.total_questions) * 100).toFixed(0) : 0}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {Math.floor(session.duration_seconds / 60)}:{(session.duration_seconds % 60).toString().padStart(2, '0')}
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

      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingQuestionId ? 'Vraag Bewerken' : 'Nieuwe Vraag'}
                </h2>
                <button
                  onClick={() => setShowQuestionModal(false)}
                  disabled={savingQuestion}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Spel *</label>
                <select
                  value={questionForm.game_id}
                  onChange={(e) => setQuestionForm({ ...questionForm, game_id: e.target.value })}
                  disabled={savingQuestion}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">Selecteer een spel...</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.emoji} {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vraag *</label>
                <input
                  type="text"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                  disabled={savingQuestion}
                  placeholder="bijv. Wat rijmt op 'kat'?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visueel (HTML/emoji)</label>
                <textarea
                  value={questionForm.visual}
                  onChange={(e) => setQuestionForm({ ...questionForm, visual: e.target.value })}
                  disabled={savingQuestion}
                  rows={2}
                  placeholder='bijv. een emoji of HTML zoals <div style="..."></div>'
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Antwoord *</label>
                  <input
                    type="text"
                    value={questionForm.answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, answer: e.target.value })}
                    disabled={savingQuestion}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Volgorde</label>
                  <input
                    type="number"
                    value={questionForm.sort_order}
                    onChange={(e) => setQuestionForm({ ...questionForm, sort_order: parseInt(e.target.value) || 0 })}
                    disabled={savingQuestion}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opties (gescheiden door komma's)
                </label>
                <input
                  type="text"
                  value={questionOptionsInput}
                  onChange={(e) => setQuestionOptionsInput(e.target.value)}
                  disabled={savingQuestion}
                  placeholder="optie1, optie2, optie3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Het correcte antwoord moet ook als optie voorkomen
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowQuestionModal(false)}
                disabled={savingQuestion}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleSaveQuestion}
                disabled={savingQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingQuestion ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteQuestionConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-full flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Vraag verwijderen?</h3>
                <p className="text-gray-600 text-sm mb-2">Deze actie kan niet ongedaan worden gemaakt.</p>
                <p className="text-gray-900 font-medium text-sm bg-gray-50 p-3 rounded-lg border border-gray-200 line-clamp-2">
                  {deleteQuestionConfirm.question}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteQuestionConfirm({ show: false, id: null, question: '' })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuleren
              </button>
              <button
                onClick={confirmDeleteQuestion}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Spel Bewerken' : 'Nieuw Spel'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Naam *</label>
                  <input
                    type="text"
                    value={gameForm.name}
                    onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                  <input
                    type="text"
                    value={gameForm.emoji}
                    onChange={(e) => setGameForm({ ...gameForm, emoji: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                <textarea
                  value={gameForm.description || ''}
                  onChange={(e) => setGameForm({ ...gameForm, description: e.target.value })}
                  disabled={saving}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Speltype</label>
                  <select
                    value={gameForm.game_type}
                    onChange={(e) => setGameForm({ ...gameForm, game_type: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {GAME_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aantal Vragen</label>
                  <input
                    type="number"
                    value={gameForm.question_count}
                    onChange={(e) => setGameForm({ ...gameForm, question_count: parseInt(e.target.value) || 0 })}
                    disabled={saving}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Niveau (1-3)</label>
                  <input
                    type="number"
                    value={gameForm.difficulty_level}
                    onChange={(e) => setGameForm({ ...gameForm, difficulty_level: parseInt(e.target.value) || 1 })}
                    disabled={saving}
                    min="1"
                    max="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Volgorde</label>
                  <input
                    type="number"
                    value={gameForm.sort_order}
                    onChange={(e) => setGameForm({ ...gameForm, sort_order: parseInt(e.target.value) || 0 })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
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
                  placeholder="1.1.1, 1.4.4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={gameForm.is_active}
                    onChange={(e) => setGameForm({ ...gameForm, is_active: e.target.checked })}
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
                onClick={handleSaveGame}
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
