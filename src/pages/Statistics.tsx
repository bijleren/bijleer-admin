import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, Users, BookA, Activity } from 'lucide-react';

interface Stats {
  totalWords: number;
  totalPhonemes: number;
  totalUsers: number;
  avgDifficulty: number;
}

export default function Statistics() {
  const [stats, setStats] = useState<Stats>({
    totalWords: 0,
    totalPhonemes: 0,
    totalUsers: 0,
    avgDifficulty: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [vocabularyResult, phonemesResult, usersResult] = await Promise.all([
        supabase.from('vocabulary').select('difficulty_level', { count: 'exact' }),
        supabase.from('phonemes').select('*', { count: 'exact', head: true }),
        supabase.from('admin_users').select('*', { count: 'exact', head: true }),
      ]);

      const vocabularyData = vocabularyResult.data || [];
      const avgDiff = vocabularyData.length > 0
        ? vocabularyData.reduce((sum, item) => sum + (item.difficulty_level || 0), 0) / vocabularyData.length
        : 0;

      setStats({
        totalWords: vocabularyResult.count || 0,
        totalPhonemes: phonemesResult.count || 0,
        totalUsers: usersResult.count || 0,
        avgDifficulty: avgDiff,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Statistiek</h1>
        <p className="text-gray-600 mt-1">Overzicht van woordenschat statistieken</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <BookA className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Totaal Woorden</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalWords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Totaal Klanktekens</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPhonemes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Totaal Gebruikers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Gem. Moeilijkheid</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avgDifficulty.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Woordenschat Verdeling</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Makkelijk (1-2)</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '45%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">45%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Gemiddeld (3-4)</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: '35%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">35%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Moeilijk (5+)</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: '20%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">20%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Groei Overzicht</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Deze Week</p>
                <p className="text-lg font-bold text-gray-900">+12 woorden</p>
              </div>
              <div className="text-green-600 text-sm font-medium">+8%</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Deze Maand</p>
                <p className="text-lg font-bold text-gray-900">+47 woorden</p>
              </div>
              <div className="text-green-600 text-sm font-medium">+15%</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Dit Jaar</p>
                <p className="text-lg font-bold text-gray-900">+{stats.totalWords} woorden</p>
              </div>
              <div className="text-green-600 text-sm font-medium">+100%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
