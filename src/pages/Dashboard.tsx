import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, School, TrendingUp, Loader2 } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalSchools: number;
  userGrowth: number;
  schoolGrowth: number;
}

interface GrowthData {
  month: string;
  users: number;
  schools: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSchools: 0,
    userGrowth: 0,
    schoolGrowth: 0,
  });
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchGrowthData();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: schoolCount } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: recentSchools } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const userGrowth = userCount ? ((recentUsers || 0) / userCount) * 100 : 0;
      const schoolGrowth = schoolCount ? ((recentSchools || 0) / schoolCount) * 100 : 0;

      setStats({
        totalUsers: userCount || 0,
        totalSchools: schoolCount || 0,
        userGrowth: Math.round(userGrowth * 10) / 10,
        schoolGrowth: Math.round(schoolGrowth * 10) / 10,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchGrowthData = async () => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: userData } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at');

      const { data: schoolData } = await supabase
        .from('schools')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at');

      const monthlyData: Record<string, { users: number; schools: number }> = {};

      userData?.forEach((item) => {
        const month = new Date(item.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });
        if (!monthlyData[month]) monthlyData[month] = { users: 0, schools: 0 };
        monthlyData[month].users++;
      });

      schoolData?.forEach((item) => {
        const month = new Date(item.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });
        if (!monthlyData[month]) monthlyData[month] = { users: 0, schools: 0 };
        monthlyData[month].schools++;
      });

      const formattedData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        users: data.users,
        schools: data.schools,
      }));

      setGrowthData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching growth data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const maxValue = Math.max(
    ...growthData.map((d) => Math.max(d.users, d.schools)),
    1
  );

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your platform statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalUsers.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">
                  +{stats.userGrowth}% this month
                </span>
              </div>
            </div>
            <div className="bg-blue-100 p-4 rounded-full">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Schools</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalSchools.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">
                  +{stats.schoolGrowth}% this month
                </span>
              </div>
            </div>
            <div className="bg-green-100 p-4 rounded-full">
              <School className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Growth Over Time</h2>

        {growthData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No growth data available</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span className="text-gray-600">Users</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className="text-gray-600">Schools</span>
              </div>
            </div>

            <div className="space-y-4">
              {growthData.map((data, index) => (
                <div key={index} className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">{data.month}</div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-20 text-sm text-gray-600">Users</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-600 rounded-full flex items-center justify-end pr-3"
                            style={{ width: `${(data.users / maxValue) * 100}%` }}
                          >
                            <span className="text-white text-sm font-medium">
                              {data.users}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-20 text-sm text-gray-600">Schools</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-green-600 rounded-full flex items-center justify-end pr-3"
                            style={{ width: `${(data.schools / maxValue) * 100}%` }}
                          >
                            <span className="text-white text-sm font-medium">
                              {data.schools}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
