import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  PenTool,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  TrendingUp,
  BookOpen,
  Gamepad2,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Users,
  Target,
} from 'lucide-react';

interface WritingExercise {
  id?: string;
  title: string;
  emoji: string;
  goal_codes: string[];
  description: string | null;
  instructions: string | null;
  tips: string[];
  exercise_type: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

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

interface PracticeLog {
  id: string;
  exercise_id: string;
  group_id: string;
  practiced_at: string;
  notes: string;
  created_by: string;
  exercise_title?: string;
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
  totalExercises: number;
  activeExercises: number;
  totalGames: number;
  totalPracticeLogs: number;
  totalGameSessions: number;
  growth: {
    thisMonth: number;
    lastMonth: number;
    percentage: number;
  };
}

type SortField = 'title' | 'name' | 'sort_order' | 'created_at' | 'exercise_type' | 'game_type';
type SortOrder = 'asc' | 'desc';
type TabType = 'exercises' | 'games' | 'logs' | 'sessions';

export default function WritingExercises() {
  const [activeTab, setActiveTab] = useState<TabType>('exercises');
  const [exercises, setExercises] = useState<WritingExercise[]>([]);
  const [games, setGames] = useState<LearningGame[]>([]);
  const [practiceLogs, setPracticeLogs] = useState<PracticeLog[]>([]);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalExercises: 0,
    activeExercises: 0,
    totalGames: 0,
    totalPracticeLogs: 0,
    totalGameSessions: 0,
    growth: { thisMonth: 0, lastMonth: 0, percentage: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('sort_order');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [exerciseForm, setExerciseForm] = useState<WritingExercise>({
    title: '',
    emoji: '✏️',
    goal_codes: [],
    description: '',
    instructions: '',
    tips: [],
    exercise_type: 'practical',
    sort_order: 0,
    is_active: true,
  });

  const [gameForm, setGameForm] = useState<LearningGame>({
    name: '',
    emoji: '🎮',
    description: '',
    question_count: 10,
    goal_codes: [],
    game_type: 'quiz',
    difficulty_level: 1,
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchExercises(),
      fetchGames(),
      fetchPracticeLogs(),
      fetchGameSessions(),
      fetchStats(),
    ]);
    setLoading(false);
  };

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('writing_exercises')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      showNotification('error', 'Fout bij ophalen oefeningen');
    }
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
      showNotification('error', 'Fout bij ophalen spelletjes');
    }
  };

  const fetchPracticeLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('writing_practice_log')
        .select(`
          *,
          writing_exercises(title)
        `)
        .order('practiced_at', { ascending: false });

      if (error) throw error;
      const logs = (data || []).map((log: any) => ({
        ...log,
        exercise_title: log.writing_exercises?.title || 'Onbekend',
      }));
      setPracticeLogs(logs);
    } catch (error) {
      console.error('Error fetching practice logs:', error);
      showNotification('error', 'Fout bij ophalen oefenlogs');
    }
  };

  const fetchGameSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select(`
          *,
          learning_games(name)
        `)
        .order('played_at', { ascending: false });

      if (error) throw error;
      const sessions = (data || []).map((session: any) => ({
        ...session,
        game_name: session.learning_games?.name || 'Onbekend',
      }));
      setGameSessions(sessions);
    } catch (error) {
      console.error('Error fetching game sessions:', error);
      showNotification('error', 'Fout bij ophalen spelsessies');
    }
  };

  const fetchStats = async () => {
    try {
      const [exercisesData, gamesData, logsData, sessionsData] = await Promise.all([
        supabase.from('writing_exercises').select('created_at, is_active'),
        supabase.from('learning_games').select('created_at, is_active'),
        supabase.from('writing_practice_log').select('practiced_at'),
        supabase.from('game_sessions').select('played_at'),
      ]);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const totalExercises = exercisesData.data?.length || 0;
      const activeExercises = exercisesData.data?.filter((e) => e.is_active).length || 0;
      const totalGames = gamesData.data?.length || 0;
      const totalPracticeLogs = logsData.data?.length || 0;
      const totalGameSessions = sessionsData.data?.length || 0;

      const allData = [
        ...(exercisesData.data || []).map((e) => ({ date: e.created_at })),
        ...(gamesData.data || []).map((g) => ({ date: g.created_at })),
      ];

      const thisMonth = allData.filter((item) => new Date(item.date || '') >= thisMonthStart).length;
      const lastMonth = allData.filter(
        (item) => new Date(item.date || '') >= lastMonthStart && new Date(item.date || '') < thisMonthStart
      ).length;

      const percentage = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;

      setStats({
        totalExercises,
        activeExercises,
        totalGames,
        totalPracticeLogs,
        totalGameSessions,
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

  const handleCreateExercise = () => {
    setEditingId(null);
    setExerciseForm({
      title: '',
      emoji: '✏️',
      goal_codes: [],
      description: '',
      instructions: '',
      tips: [],
      exercise_type: 'practical',
      sort_order: exercises.length,
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEditExercise = (exercise: WritingExercise) => {
    setEditingId(exercise.id || null);
    setExerciseForm(exercise);
    setShowModal(true);
  };

  const handleSaveExercise = async () => {
    if (!exerciseForm.title.trim()) {
      showNotification('error', 'Titel is verplicht');
      return;
    }

    setSaving(true);
    try {
      const exerciseData = {
        title: exerciseForm.title.trim(),
        emoji: exerciseForm.emoji,
        goal_codes: exerciseForm.goal_codes,
        description: exerciseForm.description?.trim() || '',
        instructions: exerciseForm.instructions?.trim() || '',
        tips: exerciseForm.tips,
        exercise_type: exerciseForm.exercise_type,
        sort_order: exerciseForm.sort_order,
        is_active: exerciseForm.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from('writing_exercises')
          .update(exerciseData)
          .eq('id', editingId);

        if (error) throw error;
        showNotification('success', 'Oefening succesvol bijgewerkt');
      } else {
        const { error } = await supabase
          .from('writing_exercises')
          .insert([exerciseData]);

        if (error) throw error;
        showNotification('success', 'Oefening succesvol toegevoegd');
      }

      await fetchAllData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving exercise:', error);
      showNotification('error', 'Fout bij opslaan oefening');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze oefening wilt verwijderen?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('writing_exercises').delete().eq('id', id);

      if (error) throw error;
      showNotification('success', 'Oefening succesvol verwijderd');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      showNotification('error', 'Fout bij verwijderen oefening');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateGame = () => {
    setEditingId(null);
    setGameForm({
      name: '',
      emoji: '🎮',
      description: '',
      question_count: 10,
      goal_codes: [],
      game_type: 'quiz',
      difficulty_level: 1,
      sort_order: games.length,
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEditGame = (game: LearningGame) => {
    setEditingId(game.id || null);
    setGameForm(game);
    setShowModal(true);
  };

  const handleSaveGame = async () => {
    if (!gameForm.name.trim()) {
      showNotification('error', 'Naam is verplicht');
      return;
    }

    setSaving(true);
    try {
      const gameData = {
        name: gameForm.name.trim(),
        emoji: gameForm.emoji,
        description: gameForm.description?.trim() || '',
        question_count: gameForm.question_count,
        goal_codes: gameForm.goal_codes,
        game_type: gameForm.game_type,
        difficulty_level: gameForm.difficulty_level,
        sort_order: gameForm.sort_order,
        is_active: gameForm.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from('learning_games')
          .update(gameData)
          .eq('id', editingId);

        if (error) throw error;
        showNotification('success', 'Spelletje succesvol bijgewerkt');
      } else {
        const { error } = await supabase
          .from('learning_games')
          .insert([gameData]);

        if (error) throw error;
        showNotification('success', 'Spelletje succesvol toegevoegd');
      }

      await fetchAllData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving game:', error);
      showNotification('error', 'Fout bij opslaan spelletje');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit spelletje wilt verwijderen?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('learning_games').delete().eq('id', id);

      if (error) throw error;
      showNotification('success', 'Spelletje succesvol verwijderd');
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting game:', error);
      showNotification('error', 'Fout bij verwijderen spelletje');
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

  const filteredAndSortedExercises = exercises
    .filter((exercise) =>
      exercise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exercise.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortField as keyof WritingExercise];
      let bValue: any = b[sortField as keyof WritingExercise];

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

  const filteredAndSortedGames = games
    .filter((game) =>
      game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (game.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
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
          <h1 className="text-3xl font-bold text-gray-900">Schrijfvaardigheden</h1>
          <p className="text-gray-600 mt-1">Beheer schrijfoefeningen en spelletjes</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'exercises') handleCreateExercise();
            else if (activeTab === 'games') handleCreateGame();
          }}
          disabled={activeTab === 'logs' || activeTab === 'sessions'}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'exercises' ? 'Nieuwe Oefening' : 'Nieuw Spelletje'}
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
              <p className="text-sm text-gray-600">Oefeningen</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalExercises}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.activeExercises} actief</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <PenTool className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Spelletjes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalGames}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Gamepad2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Oefenlogs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPracticeLogs}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Spelsessies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalGameSessions}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('exercises')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'exercises'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                Schrijfoefeningen ({stats.totalExercises})
              </div>
            </button>
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
                Spelletjes ({stats.totalGames})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'logs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Oefenlogs ({stats.totalPracticeLogs})
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
                <Activity className="w-4 h-4" />
                Spelsessies ({stats.totalGameSessions})
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {(activeTab === 'exercises' || activeTab === 'games') && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={`Zoek ${activeTab === 'exercises' ? 'oefeningen' : 'spelletjes'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {activeTab === 'exercises' && (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Beschrijving
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('exercise_type')}
                        className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                      >
                        Type
                        <SortIcon field="exercise_type" />
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
                  {filteredAndSortedExercises.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        Geen oefeningen gevonden
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedExercises.map((exercise) => (
                      <tr key={exercise.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-2xl">{exercise.emoji}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{exercise.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{exercise.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{exercise.exercise_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{exercise.sort_order}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              exercise.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {exercise.is_active ? 'Actief' : 'Inactief'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditExercise(exercise)}
                              disabled={deletingId === exercise.id}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Bewerken"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => exercise.id && handleDeleteExercise(exercise.id)}
                              disabled={deletingId === exercise.id}
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
          )}

          {activeTab === 'games' && (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Beschrijving
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Vragen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Niveau
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
                        Geen spelletjes gevonden
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedGames.map((game) => (
                      <tr key={game.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-2xl">{game.emoji}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{game.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{game.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{game.game_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{game.question_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{game.difficulty_level}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              game.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Oefening
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
                  {practiceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        Geen oefenlogs gevonden
                      </td>
                    </tr>
                  ) : (
                    practiceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{log.exercise_title}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(log.practiced_at).toLocaleDateString('nl-NL', {
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

          {activeTab === 'sessions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Spelletje
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Correcte Antwoorden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Duur
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gameSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Geen spelsessies gevonden
                      </td>
                    </tr>
                  ) : (
                    gameSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{session.game_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(session.played_at).toLocaleDateString('nl-NL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-gray-900">{session.score}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {session.correct_answers} / {session.total_questions}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
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

      {showModal && activeTab === 'exercises' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Oefening Bewerken' : 'Nieuwe Oefening'}
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
                    value={exerciseForm.title}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, title: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                  <input
                    type="text"
                    value={exerciseForm.emoji}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, emoji: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                <textarea
                  value={exerciseForm.description || ''}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                  disabled={saving}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructies</label>
                <textarea
                  value={exerciseForm.instructions}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, instructions: e.target.value })}
                  disabled={saving}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <input
                    type="text"
                    value={exerciseForm.exercise_type}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, exercise_type: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Volgorde</label>
                  <input
                    type="number"
                    value={exerciseForm.sort_order}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, sort_order: parseInt(e.target.value) || 0 })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exerciseForm.is_active}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, is_active: e.target.checked })}
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
                onClick={handleSaveExercise}
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

      {showModal && activeTab === 'games' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Spelletje Bewerken' : 'Nieuw Spelletje'}
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <input
                    type="text"
                    value={gameForm.game_type}
                    onChange={(e) => setGameForm({ ...gameForm, game_type: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aantal Vragen</label>
                  <input
                    type="number"
                    value={gameForm.question_count}
                    onChange={(e) => setGameForm({ ...gameForm, question_count: parseInt(e.target.value) || 10 })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
                  <input
                    type="number"
                    value={gameForm.difficulty_level}
                    onChange={(e) => setGameForm({ ...gameForm, difficulty_level: parseInt(e.target.value) || 1 })}
                    disabled={saving}
                    min="1"
                    max="5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
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
