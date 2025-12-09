'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2, CreditCard, Key, AlertTriangle } from 'lucide-react';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { getAuthHeader } from '@/lib/auth';
import TopUpModal from './TopUpModal';

interface APIKey {
  key_id: string;
  key_prefix: string;
  balance: number;
  is_active: boolean;
  created_at: string;
}

interface APIKeyListProps {
  refreshTrigger: number;
}

export default function APIKeyList({ refreshTrigger }: APIKeyListProps) {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topUpKeyId, setTopUpKeyId] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${NEXT_PUBLIC_API}/api/keys`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (err) {
      console.error('Failed to fetch keys', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [refreshTrigger]);

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this key? This action cannot be undone.')) {
      return;
    }
    
    setRevokingKeyId(keyId);
    try {
      const res = await fetch(`${NEXT_PUBLIC_API}/api/keys/${keyId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      
      if (res.ok) {
        setKeys(keys.filter(k => k.key_id !== keyId));
      }
    } catch (err) {
      console.error('Failed to revoke key', err);
    } finally {
      setRevokingKeyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800">
        <div className="bg-gray-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No API Keys Found</h3>
        <p className="text-gray-400 max-w-sm mx-auto">
          Generate your first API key to start using our Public API endpoints.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden bg-gray-900 border border-gray-800 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Key Name/Prefix</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {keys.map((key) => (
              <tr key={key.key_id} className="group hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg">
                      <Key className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <div className="font-mono text-sm text-white">{key.key_prefix}</div>
                      <div className="text-xs text-gray-500">{key.key_id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    key.is_active 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {key.is_active ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{key.balance}</span>
                    <span className="text-xs text-gray-500">Credits</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {new Date(key.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setTopUpKeyId(key.key_id)}
                      className="p-2 text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"
                      title="Transfer Credits"
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRevoke(key.key_id)}
                      disabled={revokingKeyId === key.key_id}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Revoke Key"
                    >
                      {revokingKeyId === key.key_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {topUpKeyId && (
        <TopUpModal 
          keyId={topUpKeyId}
          onClose={() => setTopUpKeyId(null)}
          onSuccess={() => {
            fetchKeys();
            setTopUpKeyId(null);
          }}
        />
      )}
    </>
  );
}
