import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, RefreshCw, Clock, Database } from 'lucide-react';

interface KeyStat {
  stat_key: string;
  stat_value: number;
  last_updated: string;
}

export default function Statistics() {
  const [stats, setStats] = useState<Record<string, KeyStat>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('key_stats')
        .select('*');

      if (error) throw error;

      const statsMap: Record<string, KeyStat> = {};
      let latestUpdate = '';

      data?.forEach((stat) => {
        statsMap[stat.stat_key] = stat;
        if (!latestUpdate || new Date(stat.last_updated) > new Date(latestUpdate)) {
          latestUpdate = stat.last_updated;
        }
      });

      setStats(statsMap);
      setLastUpdated(latestUpdate);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      setRefreshing(true);
      const { error } = await supabase.rpc('refresh_key_stats');

      if (error) throw error;

      await fetchStats();
    } catch (error) {
      console.error('Error refreshing statistics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatValue = (key: string): number => {
    return stats[key]?.stat_value || 0;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculatePercentage = (value: number, total: number): string => {
    if (total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  };

  const totalWords = getStatValue('total_words');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8" />
              System Statistics
            </h1>
            <p className="mt-2 text-gray-600">
              Pre-calculated statistics updated nightly at 2 AM
            </p>
          </div>
          <button
            onClick={refreshStats}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>

        {lastUpdated && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-800">
              Last updated: {formatDate(lastUpdated)}
            </span>
          </div>
        )}

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-6 h-6" />
              Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Total Words</h3>
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalWords.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Words with Image</h3>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_with_image').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_with_image'), totalWords)}% of total
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Words with Audio</h3>
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_with_audio').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_with_audio'), totalWords)}% of total
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Words with Betekenis</h3>
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_with_betekenis').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_with_betekenis'), totalWords)}% of total
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Combinations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Image + Audio</h3>
                  <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_with_image_and_audio').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_with_image_and_audio'), totalWords)}% of total
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Image + Betekenis</h3>
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_with_image_and_betekenis').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_with_image_and_betekenis'), totalWords)}% of total
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Audio + Betekenis</h3>
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_with_audio_and_betekenis').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_with_audio_and_betekenis'), totalWords)}% of total
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">All Three</h3>
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_with_all_three').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_with_all_three'), totalWords)}% of total
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Completion Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Complete Words</h3>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_complete').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_complete'), totalWords)}% of total
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Missing Image</h3>
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_missing_image').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_missing_image'), totalWords)}% of total
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Missing Audio</h3>
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_missing_audio').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_missing_audio'), totalWords)}% of total
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Missing Betekenis</h3>
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_missing_betekenis').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_missing_betekenis'), totalWords)}% of total
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Missing Klankteken</h3>
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getStatValue('words_missing_klankteken').toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {calculatePercentage(getStatValue('words_missing_klankteken'), totalWords)}% of total
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Progress Overview</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Images</span>
                    <span className="text-sm font-medium text-gray-900">
                      {calculatePercentage(getStatValue('words_with_image'), totalWords)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${calculatePercentage(getStatValue('words_with_image'), totalWords)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Audio</span>
                    <span className="text-sm font-medium text-gray-900">
                      {calculatePercentage(getStatValue('words_with_audio'), totalWords)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-purple-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${calculatePercentage(getStatValue('words_with_audio'), totalWords)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Betekenis</span>
                    <span className="text-sm font-medium text-gray-900">
                      {calculatePercentage(getStatValue('words_with_betekenis'), totalWords)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-orange-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${calculatePercentage(getStatValue('words_with_betekenis'), totalWords)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Complete (All Data)</span>
                    <span className="text-sm font-medium text-gray-900">
                      {calculatePercentage(getStatValue('words_complete'), totalWords)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-emerald-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${calculatePercentage(getStatValue('words_complete'), totalWords)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
