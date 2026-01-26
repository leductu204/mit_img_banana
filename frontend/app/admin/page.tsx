'use client';

import { useEffect, useState } from 'react';
import { getAdminToken } from '@/contexts/AdminAuthContext';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { 
  Users, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';

interface DashboardStats {
  total_users: number;
  new_users_today: number;
  total_credits_issued: number;
  jobs_today: number;
  jobs_success_rate: number;
  failed_jobs_today: number;
  pending_jobs: number;
}

interface RecentUser {
  user_id: string;
  email: string;
  username?: string;
  credits: number;
  created_at: string;
}

interface RecentJob {
  job_id: string;
  user_email: string;
  model: string;
  type: string;
  status: string;
  credits_cost: number;
  created_at: string;
}

interface DashboardData {
  stats: DashboardStats;
  recent_users: RecentUser[];
  recent_jobs: RecentJob[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getAdminToken();
        const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/stats`, {
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
  }, []);

  if (isLoading) {
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

  const stats = data.stats;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of system statistics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.total_users}
          subtitle={`+${stats.new_users_today} today`}
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Total Credits"
          value={stats.total_credits_issued.toLocaleString()}
          subtitle="Issued to users"
          icon={CreditCard}
          color="purple"
        />
        <StatCard
          title="Jobs Today"
          value={stats.jobs_today}
          subtitle={`${stats.jobs_success_rate}% success rate`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Failed Jobs"
          value={stats.failed_jobs_today}
          subtitle={`${stats.pending_jobs} pending`}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Users</h2>
          <div className="space-y-3">
            {data.recent_users.slice(0, 5).map((user) => (
              <div key={user.user_id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                <div>
                  <p className="text-white text-sm">{user.email}</p>
                  <p className="text-gray-400 text-xs">{formatTimeAgo(user.created_at)}</p>
                </div>
                <span className="text-teal-400 font-medium">{user.credits} credits</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Jobs</h2>
          <div className="space-y-3">
            {data.recent_jobs.slice(0, 5).map((job) => (
              <div key={job.job_id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                <div className="flex items-center gap-3">
                  <StatusIcon status={job.status} />
                  <div>
                    <p className="text-white text-sm">{job.model}</p>
                    <p className="text-gray-400 text-xs">{job.user_email}</p>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">-{job.credits_cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: { 
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  color: 'teal' | 'purple' | 'green' | 'red';
}) {
  const colorClasses = {
    teal: 'from-teal-500/20 to-teal-600/20 text-teal-400 border-teal-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 text-purple-400 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/20 text-green-400 border-green-500/30',
    red: 'from-red-500/20 to-red-600/20 text-red-400 border-red-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-8 h-8" />
        <TrendingUp className="w-4 h-4 text-gray-400" />
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm mt-1">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const icons: Record<string, { icon: React.ElementType; color: string }> = {
    completed: { icon: CheckCircle, color: 'text-green-400' },
    failed: { icon: XCircle, color: 'text-red-400' },
    pending: { icon: Clock, color: 'text-yellow-400' },
    processing: { icon: Clock, color: 'text-blue-400' }
  };

  const config = icons[status] || icons.pending;
  const Icon = config.icon;

  return <Icon className={`w-5 h-5 ${config.color}`} />;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
