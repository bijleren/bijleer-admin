import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Settings, Clock, Users, TrendingUp, Play, Pause } from 'lucide-react';
import ActivityPresetsModal from '../components/ActivityPresetsModal';

interface ActivityBoard {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  board_icon: string;
  icon_url: string;
}

interface ActivityOption {
  id: number;
  board_id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  max_students: number;
  is_active: boolean;
}

interface ActivitySession {
  id: number;
  board_id: number;
  activity_option_id: number;
  student_id: number;
  start_time: string;
  end_time: string | null;
  feedback_rating: number | null;
  teacher_notes: string | null;
}

interface BoardWithStats extends ActivityBoard {
  optionsCount: number;
  sessionsCount: number;
  activeSessions: number;
}

export default function ActivityTime() {
  const [boards, setBoards] = useState<BoardWithStats[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<number | null>(null);
  const [options, setOptions] = useState<ActivityOption[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [stats, setStats] = useState({
    totalBoards: 0,
    activeBoards: 0,
    totalOptions: 0,
    totalSessions: 0,
    activeSessions: 0,
  });

  const fetchBoards = async () => {
    try {
      const { data: boardsData, error: boardsError } = await supabase
        .from('activity_boards')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (boardsError) throw boardsError;

      const boardsWithStats = await Promise.all(
        (boardsData || []).map(async (board) => {
          const { count: optionsCount } = await supabase
            .from('activity_options')
            .select('*', { count: 'exact', head: true })
            .eq('board_id', board.id)
            .eq('is_active', true);

          const { count: sessionsCount } = await supabase
            .from('activity_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('board_id', board.id);

          const { count: activeSessions } = await supabase
            .from('activity_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('board_id', board.id)
            .is('end_time', null);

          return {
            ...board,
            optionsCount: optionsCount || 0,
            sessionsCount: sessionsCount || 0,
            activeSessions: activeSessions || 0,
          };
        })
      );

      setBoards(boardsWithStats);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const fetchOptions = async (boardId: number) => {
    try {
      const { data, error } = await supabase
        .from('activity_options')
        .select('*')
        .eq('board_id', boardId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const fetchSessions = async (boardId: number) => {
    try {
      const { data, error } = await supabase
        .from('activity_sessions')
        .select('*')
        .eq('board_id', boardId)
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalBoards } = await supabase
        .from('activity_boards')
        .select('*', { count: 'exact', head: true });

      const { count: activeBoards } = await supabase
        .from('activity_boards')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: totalOptions } = await supabase
        .from('activity_options')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: totalSessions } = await supabase
        .from('activity_sessions')
        .select('*', { count: 'exact', head: true });

      const { count: activeSessions } = await supabase
        .from('activity_sessions')
        .select('*', { count: 'exact', head: true })
        .is('end_time', null);

      setStats({
        totalBoards: totalBoards || 0,
        activeBoards: activeBoards || 0,
        totalOptions: totalOptions || 0,
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleBoardClick = async (boardId: number) => {
    setSelectedBoard(boardId);
    await fetchOptions(boardId);
    await fetchSessions(boardId);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBoards(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const formatDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);

    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}u ${mins}m`;
  };

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activi-tijd</h1>
          <p className="text-gray-600 mt-1">Beheer activiteitenborden en voorinstellingen</p>
        </div>
        <button
          onClick={() => setShowPresetsModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Settings className="w-5 h-5" />
          Voorinstellingen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Totaal Borden</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalBoards}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Actieve Borden</p>
              <p className="text-2xl font-bold text-green-900">{stats.activeBoards}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Plus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Activiteiten</p>
              <p className="text-2xl font-bold text-purple-900">{stats.totalOptions}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-600 font-medium">Totaal Sessies</p>
              <p className="text-2xl font-bold text-orange-900">{stats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Pause className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600 font-medium">Lopende Sessies</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.activeSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Activiteitenborden</h2>
              <div className="space-y-2">
                {boards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => handleBoardClick(board.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedBoard === board.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{board.name}</h3>
                        {board.description && (
                          <p className="text-sm text-gray-600 mt-1">{board.description}</p>
                        )}
                      </div>
                      {board.activeSessions > 0 && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          {board.activeSessions} actief
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Plus className="w-4 h-4" />
                        {board.optionsCount} opties
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {board.sessionsCount} sessies
                      </span>
                    </div>
                  </button>
                ))}
                {boards.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Geen activiteitenborden gevonden</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedBoard ? (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Activiteitsopties</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {options.map((option) => (
                      <div
                        key={option.id}
                        className="p-4 rounded-lg border-2"
                        style={{ borderColor: option.color }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{option.name}</h3>
                            {option.description && (
                              <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Max {option.max_students}
                          </span>
                        </div>
                      </div>
                    ))}
                    {options.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        <p>Geen activiteitsopties gevonden</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Recente Sessies</h2>
                  <div className="space-y-2">
                    {sessions.slice(0, 10).map((session) => {
                      const option = options.find(o => o.id === session.activity_option_id);
                      return (
                        <div
                          key={session.id}
                          className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {option?.name || 'Onbekende activiteit'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Student ID: {session.student_id}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">
                                {formatDuration(session.start_time, session.end_time)}
                              </span>
                            </div>
                            {!session.end_time && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                Lopend
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {sessions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>Geen sessies gevonden</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecteer een bord</h2>
                <p className="text-gray-600">Klik op een activiteitenbord links om details te zien</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showPresetsModal && (
        <ActivityPresetsModal
          onClose={() => {
            setShowPresetsModal(false);
            fetchBoards();
            fetchStats();
            if (selectedBoard) {
              fetchOptions(selectedBoard);
              fetchSessions(selectedBoard);
            }
          }}
          onSave={() => {
            fetchBoards();
            fetchStats();
            if (selectedBoard) {
              fetchOptions(selectedBoard);
              fetchSessions(selectedBoard);
            }
          }}
        />
      )}
    </div>
  );
}
