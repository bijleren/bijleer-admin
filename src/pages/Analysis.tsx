import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LineChart, PieChart, Activity, TrendingUp, AlertCircle } from 'lucide-react';

interface AnalysisData {
  categoryDistribution: { category: string; count: number }[];
  difficultyTrend: { level: number; count: number }[];
  recentActivity: { date: string; action: string; count: number }[];
}

export default function Analysis() {
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    categoryDistribution: [],
    difficultyTrend: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);

      const { data: vocabularyData } = await supabase
        .from('vocabulary')
        .select('category, difficulty_level');

      if (vocabularyData) {
        const categoryMap = new Map<string, number>();
        const difficultyMap = new Map<number, number>();

        vocabularyData.forEach((item) => {
          categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
          difficultyMap.set(
            item.difficulty_level,
            (difficultyMap.get(item.difficulty_level) || 0) + 1
          );
        });

        setAnalysisData({
          categoryDistribution: Array.from(categoryMap.entries()).map(([category, count]) => ({
            category,
            count,
          })),
          difficultyTrend: Array.from(difficultyMap.entries())
            .map(([level, count]) => ({ level, count }))
            .sort((a, b) => a.level - b.level),
          recentActivity: [
            { date: '2026-02-04', action: 'Woorden toegevoegd', count: 12 },
            { date: '2026-02-03', action: 'Woorden toegevoegd', count: 8 },
            { date: '2026-02-02', action: 'Woorden gewijzigd', count: 5 },
          ],
        });
      }
    } catch (error) {
      console.error('Error fetching analysis data:', error);
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
        <h1 className="text-3xl font-bold text-gray-900">Analyse</h1>
        <p className="text-gray-600 mt-1">Gedetailleerde analyse van woordenschat data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-lg">
              <PieChart className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Categorie Verdeling</h2>
          </div>
          {analysisData.categoryDistribution.length > 0 ? (
            <div className="space-y-3">
              {analysisData.categoryDistribution.map((item, index) => {
                const total = analysisData.categoryDistribution.reduce((sum, i) => sum + i.count, 0);
                const percentage = ((item.count / total) * 100).toFixed(1);
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];

                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 font-medium">{item.category}</span>
                      <span className="text-gray-600">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Geen data beschikbaar</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 p-2 rounded-lg">
              <LineChart className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Moeilijkheidsgraad Verdeling</h2>
          </div>
          {analysisData.difficultyTrend.length > 0 ? (
            <div className="space-y-3">
              {analysisData.difficultyTrend.map((item) => {
                const total = analysisData.difficultyTrend.reduce((sum, i) => sum + i.count, 0);
                const percentage = ((item.count / total) * 100).toFixed(1);
                const getColor = (level: number) => {
                  if (level <= 2) return 'bg-green-500';
                  if (level <= 4) return 'bg-yellow-500';
                  return 'bg-red-500';
                };

                return (
                  <div key={item.level} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 font-medium">Niveau {item.level}</span>
                      <span className="text-gray-600">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getColor(item.level)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Geen data beschikbaar</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Recente Activiteit</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aantal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysisData.recentActivity.map((activity, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {new Date(activity.date).toLocaleDateString('nl-NL')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{activity.action}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{activity.count}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">Positief</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Meest Gebruikte Categorie</h3>
          <p className="text-3xl font-bold">
            {analysisData.categoryDistribution.length > 0
              ? analysisData.categoryDistribution.reduce((max, item) =>
                  item.count > max.count ? item : max
                ).category
              : 'N/A'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Gemiddeld Niveau</h3>
          <p className="text-3xl font-bold">
            {analysisData.difficultyTrend.length > 0
              ? (
                  analysisData.difficultyTrend.reduce((sum, item) => sum + item.level * item.count, 0) /
                  analysisData.difficultyTrend.reduce((sum, item) => sum + item.count, 0)
                ).toFixed(1)
              : 'N/A'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Totaal Categorieën</h3>
          <p className="text-3xl font-bold">{analysisData.categoryDistribution.length}</p>
        </div>
      </div>
    </div>
  );
}
