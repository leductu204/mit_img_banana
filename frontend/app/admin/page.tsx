'use client';

import { useEffect, useState } from 'react';
import { getAdminToken } from '@/contexts/AdminAuthContext';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { 
  Users, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Loader2,
  Activity,
  AlertCircle,
  Zap
} from 'lucide-react';
import { CreditUsageChart } from '@/components/admin/charts/CreditUsageChart';

// --- Interfaces ---

interface DashboardStats {
  total_users: number;
  users_24h: number;
  
  credits_used_24h: number;
  credits_growth_pct: number;
  avg_credits_per_user_24h: number;
  
  jobs_24h: number;
  jobs_growth_pct: number;
  jobs_success_rate: number;
  
  failed_jobs_24h: number;
  failed_rate: number;
  pending_jobs: number;
}

interface LineChartPoint {
  date: string;
  value: number;
}

interface ActivityItem {
  id: string;
  type: 'job' | 'user' | 'credit' | 'error';
  title: string;
  subtitle: string;
  timestamp: string;
  value: string;
  value_type: 'success' | 'danger' | 'neutral' | 'warning';
  user_email?: string;
}

interface TopUserItem {
  email: string;
  credits_used: number;
  job_count: number;
}

interface TopServiceItem {
  name: string;
  usage_count: number;
}

interface DashboardData {
  stats: DashboardStats;
  credit_usage_history: LineChartPoint[];
  recent_activity: ActivityItem[];
  top_users: TopUserItem[];
  top_services: TopServiceItem[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(7);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true); // Show loading when range changes
        const token = getAdminToken();
        const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/stats?days=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error('Failed to fetch stats');

        const data = await res.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [timeRange]); // Re-fetch when timeRange changes

  if (isLoading && !data) { // Only showing full page loader on initial load
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-red-400 p-4">Error: {error}</div>
    );
  }

  const { stats } = data;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">System overview (Last 24h)</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.total_users}
          growth={`+${stats.users_24h} last 24h`}
          trend="up"
          secondaryMetric="New registrations"
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Credits Used (24h)"
          value={stats.credits_used_24h.toLocaleString()}
          growth={`${stats.credits_growth_pct > 0 ? '+' : ''}${stats.credits_growth_pct}% vs prev 24h`}
          trend={stats.credits_growth_pct >= 0 ? "up" : "down"}
          secondaryMetric={`Avg ${stats.avg_credits_per_user_24h}/user`}
          icon={Zap}
          color="purple"
        />
        <StatCard
          title="Jobs (24h)"
          value={stats.jobs_24h}
          growth={`${stats.jobs_growth_pct > 0 ? '+' : ''}${stats.jobs_growth_pct}% vs prev 24h`}
          trend={stats.jobs_growth_pct >= 0 ? "up" : "down"}
          secondaryMetric={`${stats.jobs_success_rate}% success`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Failed Jobs (24h)"
          value={stats.failed_jobs_24h}
          growth={`${stats.failed_rate}% failure rate`}
          trend="down"
          isInverseTrend
          secondaryMetric={`${stats.pending_jobs} pending`}
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8">
        {/* Credits Usage Line Chart - Full Width */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Credit Consumption Trend (Daily)</h2>
            <select 
              className="bg-gray-800 border-gray-700 text-xs rounded-md px-2 py-1 text-gray-300 focus:ring-teal-500 outline-none"
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>
          {isLoading ? (
             <div className="h-[350px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
             </div>
          ) : (
             <CreditUsageChart data={data.credit_usage_history} />
          )}
        </div>
      </div>

      {/* Bottom Section: Activity & Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" />
              Recent Activity
            </h2>
            <button 
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            {data.recent_activity.map((activity) => (
              <div key={activity.id} className="group flex items-start gap-4 p-3 rounded-lg hover:bg-gray-800/40 transition-colors border border-transparent hover:border-gray-800">
                <div className={`mt-1 p-2 rounded-full ${
                  activity.type === 'error' ? 'bg-red-500/10 text-red-400' :
                  activity.type === 'user' ? 'bg-blue-500/10 text-blue-400' :
                  activity.type === 'credit' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-teal-500/10 text-teal-400'
                }`}>
                  {activity.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
                   activity.type === 'user' ? <Users className="w-4 h-4" /> :
                   activity.type === 'credit' ? <CreditCard className="w-4 h-4" /> :
                   <CheckCircle className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium text-white truncate pr-2">
                      {activity.title}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-xs text-gray-400 truncate w-full">{activity.subtitle}</p>
                    {activity.value && (
                      <span className={`text-xs font-mono ml-2 px-1.5 py-0.5 rounded ${
                        activity.value_type === 'danger' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        activity.value_type === 'success' ? 'text-green-400' :
                        'text-gray-400'
                      }`}>
                        {activity.value}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Lists Column */}
        <div className="space-y-6">
          {/* Top Users Widget */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Top Users (24h)</h2>
            <div className="space-y-3">
              {data.top_users.map((user, idx) => (
                <div key={user.email} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 font-mono text-xs w-4">{idx + 1}</span>
                    <div>
                      <p className="text-gray-300 truncate max-w-[120px]" title={user.email}>{user.email}</p>
                      <p className="text-xs text-gray-500">{user.job_count} jobs</p>
                    </div>
                  </div>
                  <span className="text-teal-400 font-medium">{user.credits_used.toLocaleString()} cr</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Service Widget */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-2">Most Popular Service</h2>
            {data.top_services[0] && (
              <div className="mt-2">
                <p className="text-2xl font-bold text-indigo-400 capitalize">
                  {data.top_services[0].name.replace(/-/g, ' ')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-16 bg-indigo-500/30 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-full animate-pulse" />
                  </div>
                  <p className="text-xs text-indigo-300">
                    {data.top_services[0].usage_count} jobs (24h)
                  </p>
                </div>
              </div>
            )}
            {!data.top_services[0] && <p className="text-gray-500 text-sm">No jobs yet</p>}
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Helper Components ---

function StatCard({ 
  title, 
  value, 
  growth, 
  trend,
  secondaryMetric, 
  icon: Icon, 
  color,
  isInverseTrend = false,
  isDimmed = false
}: { 
  title: string;
  value: number | string;
  growth: string;
  trend: 'up' | 'down' | 'neutral';
  secondaryMetric: string;
  icon: React.ElementType;
  color: 'teal' | 'purple' | 'green' | 'red';
  isInverseTrend?: boolean;
  isDimmed?: boolean;
}) {
  const colorClasses = {
    teal: 'from-teal-500/10 to-teal-600/5 text-teal-400 border-teal-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 text-purple-400 border-purple-500/20',
    green: 'from-green-500/10 to-green-600/5 text-green-400 border-green-500/20',
    red: 'from-red-500/10 to-red-600/5 text-red-400 border-red-500/20'
  };

  const isPositive = trend === 'up';
  let trendColor = isPositive ? 'text-green-400' : 'text-red-400';
  if (isInverseTrend) {
    trendColor = isPositive ? 'text-red-400' : 'text-green-400';
  }
  if (trend === 'neutral') trendColor = 'text-gray-500';

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-5 relative overflow-hidden group hover:border-opacity-40 transition-all ${isDimmed ? 'opacity-60 grayscale' : ''}`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-16 h-16 transform rotate-12" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg bg-black/20 ${colorClasses[color].split(' ')[2]}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== 'neutral' && (
            <div className={`flex items-center text-xs font-medium ${trendColor}`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${trend === 'down' ? 'rotate-180' : ''}`} />
              {growth}
            </div>
          )}
          {trend === 'neutral' && (
             <span className="text-xs text-gray-500">{growth}</span> 
          )}
        </div>
        
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">{title}</p>
        
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
           <span className="text-xs text-gray-400">{secondaryMetric}</span>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const d = dateStr.endsWith('Z') ? new Date(dateStr) : new Date(dateStr + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
