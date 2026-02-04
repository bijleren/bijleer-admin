import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, School, TrendingUp, Loader2, AlertCircle } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalSchools: number;
  userGrowth: number;
  schoolGrowth: number;
  schoolsNeedingOnboarding: number;
}

interface GrowthData {
  month: string;
  users: number;
  schools: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSchools: 0,
    userGrowth: 0,
    schoolGrowth: 0,
    schoolsNeedingOnboarding: 0,
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

      const { count: schoolsNeedingOnboarding } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .eq('onboarded', 0);

      const userGrowth = userCount ? ((recentUsers || 0) / userCount) * 100 : 0;
      const schoolGrowth = schoolCount ? ((recentSchools || 0) / schoolCount) * 100 : 0;

      setStats({
        totalUsers: userCount || 0,
        totalSchools: schoolCount || 0,
        userGrowth: Math.round(userGrowth * 10) / 10,
        schoolGrowth: Math.round(schoolGrowth * 10) / 10,
        schoolsNeedingOnboarding: schoolsNeedingOnboarding || 0,
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/schools?onboarded=0')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Needs Onboarding</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.schoolsNeedingOnboarding.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-orange-600 font-medium">
                  Click to view schools
                </span>
              </div>
            </div>
            <div className="bg-orange-100 p-4 rounded-full">
              <AlertCircle className="w-8 h-8 text-orange-600" />
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
              <span className="text-gray-500 text-xs ml-auto">Click bars to filter</span>
            </div>

            <div className="flex items-end justify-around gap-2 h-64 border-b border-gray-200 pb-2">
              {growthData.map((data, index) => {
                const maxOverall = Math.max(...growthData.map(d => Math.max(d.users, d.schools)), 1);
                const userHeight = (data.users / maxOverall) * 100;
                const schoolHeight = (data.schools / maxOverall) * 100;

                return (
                  <div key={index} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    <div className="flex items-end gap-1 h-48 w-full justify-center">
                      <div
                        className="bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer relative group w-8"
                        style={{ height: `${userHeight}%`, minHeight: data.users > 0 ? '8px' : '0' }}
                        onClick={() => navigate(`/users?month=${encodeURIComponent(data.month)}`)}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {data.users} users
                        </div>
                      </div>
                      <div
                        className="bg-green-600 rounded-t hover:bg-green-700 transition-colors cursor-pointer relative group w-8"
                        style={{ height: `${schoolHeight}%`, minHeight: data.schools > 0 ? '8px' : '0' }}
                        onClick={() => navigate(`/schools?month=${encodeURIComponent(data.month)}`)}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {data.schools} schools
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 text-center truncate w-full">
                      {data.month.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
