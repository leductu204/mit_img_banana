'use client';

import { useState } from 'react';
import { Loader2, ArrowRight, Wallet, AlertCircle, X } from 'lucide-react';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { getAuthHeader } from '@/lib/auth';
import { useAuthContext } from '@/contexts/AuthContext';

interface TopUpModalProps {
  keyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TopUpModal({ keyId, onClose, onSuccess }: TopUpModalProps) {
  const { user, refreshUser } = useAuthContext();
  const [amount, setAmount] = useState<number>(100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!user || user.credits < amount) {
      setError('Không đủ số dư trong ví chính.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${NEXT_PUBLIC_API}/api/keys/${keyId}/top-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          amount: amount
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to transfer credits');
      }

      await refreshUser(); // Refresh main wallet balance
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Chuyển Credits</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Từ (Ví chính)</p>
              <div className="flex items-center gap-2 text-white font-medium">
                <Wallet className="w-4 h-4 text-purple-400" />
                {user?.credits || 0} Credits
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500" />
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Đến (API Key)</p>
              <div className="font-mono text-sm text-teal-400 truncate max-w-[100px]">
                {keyId}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Số lượng cần chuyển
            </label>
            <input
              type="number"
              min="1"
              max={user?.credits}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-mono text-lg"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || amount <= 0 || (user?.credits || 0) < amount}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
