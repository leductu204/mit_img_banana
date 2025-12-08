'use client';

import { useEffect, useState } from 'react';
import { getAdminToken } from '@/contexts/AdminAuthContext';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { 
  Loader2, 
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  X
} from 'lucide-react';

interface AuditLog {
  id: number;
  admin_id: string;
  admin_username?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface LogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

export default function AdminLogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const token = getAdminToken();
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (action) params.append('action', action);

      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, action]);

  const actionOptions = ['', 'login', 'add_credits', 'set_credits', 'ban_user', 'unban_user', 'update_cost'];

  const actionColors: Record<string, string> = {
    login: 'bg-blue-500/20 text-blue-400',
    add_credits: 'bg-green-500/20 text-green-400',
    set_credits: 'bg-yellow-500/20 text-yellow-400',
    ban_user: 'bg-red-500/20 text-red-400',
    unban_user: 'bg-teal-500/20 text-teal-400',
    update_cost: 'bg-purple-500/20 text-purple-400'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
        <p className="text-gray-400 mt-1">Track all admin actions</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="">All Actions</option>
          {actionOptions.slice(1).map((a) => (
            <option key={a} value={a}>{a.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Time</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Admin</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Action</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Target</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {data?.logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-700/30">
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {log.admin_username || log.admin_id.slice(0, 12)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      actionColors[log.action] || 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {log.target_type && (
                      <span className="text-gray-400">{log.target_type}: </span>
                    )}
                    {log.target_id ? log.target_id.slice(0, 20) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                        onClick={() => setSelectedLog(log)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-lg transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Page {data.page} of {data.pages} ({data.total} logs)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setSelectedLog(null)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
             <div className="flex items-start justify-between">
                <div>
                   <h3 className="text-xl font-bold text-white">Log Details</h3>
                   <p className="text-gray-400 text-sm mt-1">ID: {selectedLog.id}</p>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
             </div>

             <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                    <p className="text-gray-500">Action</p>
                    <p className="font-medium text-white font-mono bg-gray-800 px-2 py-1 rounded inline-block">{selectedLog.action}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500">Admin</p>
                    <p className="text-white">{selectedLog.admin_username || selectedLog.admin_id}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-gray-500">Target</p>
                    <p className="text-white font-mono text-xs">{selectedLog.target_type} / {selectedLog.target_id}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500">Time</p>
                     <p className="text-white">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
             </div>

             <div className="space-y-2">
                <p className="text-gray-500 text-sm font-medium">Details Payload</p>
                <div className="bg-gray-950 rounded-lg p-4 font-mono text-sm text-blue-300 overflow-x-auto border border-gray-800">
                    <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
