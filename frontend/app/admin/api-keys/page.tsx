'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Key, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext'; // Corrected Import
import AdminCreateKeyModal from '@/components/admin/AdminCreateKeyModal';

interface APIKey {
  key_id: string;
  name: string;
  key_prefix: string;
  user_id: string | null;
  balance: number;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function AdminAPIKeysPage() {
  const { admin, isLoading: authLoading } = useAdminAuth(); // Corrected Hook
  const router = useRouter();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Revocation state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !admin) {
        router.push('/admin/auth/login');
    }
  }, [admin, authLoading, router]);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/keys`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to fetch keys');

      const data = await res.json();
      setKeys(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
        fetchKeys();
    }
  }, [admin]);

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this key? This action cannot be undone.')) return;

    setRevokingId(keyId);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to revoke key');

      // Refresh list
      await fetchKeys();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRevokingId(null);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  if (!admin) return null;

  return (
    <div className="min-h-screen bg-black text-white flex">
      <AdminSidebar />
      
      <main className="flex-1 p-8 ml-64">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">API Key Management</h1>
            <p className="text-gray-400 mt-2">Manage all system API keys, including standalone keys.</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Standalone Key
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
             <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Search keys..." 
                  className="w-full bg-black/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button 
                onClick={fetchKeys}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Refresh List"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-900/80 text-gray-400 text-sm">
                  <th className="px-6 py-4 font-medium">Name / Prefix</th>
                  <th className="px-6 py-4 font-medium">Owner</th>
                  <th className="px-6 py-4 font-medium">Balance</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading && keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Loading keys...
                    </td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No API keys found.
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.key_id} className="group hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${key.is_active ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800 text-gray-500'}`}>
                            <Key className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{key.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{key.key_prefix}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {key.user_id ? (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                             User: {key.user_id.substring(0, 8)}...
                           </span>
                        ) : (
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                             Standalone
                           </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-white">{key.balance.toLocaleString()}</span>
                        <span className="text-gray-500 text-xs ml-1">credits</span>
                      </td>
                      <td className="px-6 py-4">
                         {key.is_active ? (
                          <div className="flex items-center gap-2 text-green-400 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                            Active
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-400 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Revoked
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {key.is_active && (
                          <button
                            onClick={() => handleRevoke(key.key_id)}
                            disabled={revokingId === key.key_id}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Revoke Key"
                          >
                             {revokingId === key.key_id ? (
                               <RefreshCw className="w-4 h-4 animate-spin" />
                             ) : (
                               <Trash2 className="w-4 h-4" />
                             )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <AdminCreateKeyModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchKeys(); // Refresh list but keep modal open to show secret
          }}
        />
      )}
    </div>
  );
}
