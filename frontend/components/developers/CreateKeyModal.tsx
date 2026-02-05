'use client';

import { useState } from 'react';
import { Loader2, Copy, Check, AlertTriangle, X } from 'lucide-react';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { getAuthHeader } from '@/lib/auth';

interface CreateKeyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateKeyModal({ onClose, onSuccess }: CreateKeyModalProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ key_id: string; secret_key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${NEXT_PUBLIC_API}/api/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          name: name || "My API Key", 
          initial_balance: 0, // Default 0, user must top up
          mode: 'live'
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create key');
      }

      const data = await res.json();
      setCreatedKey(data);
      onSuccess(); // Refresh parent list
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey.secret_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Tạo API Key</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!createdKey ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-teal-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Quan trọng
              </h3>
              <p className="text-sm text-teal-100/80">
                Tạo một API key mới để truy cập Public API của chúng tôi. Bạn sẽ cần chuyển credits vào key này để sử dụng.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tên Key
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ví dụ: Ứng dụng Production"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-600"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
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
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-teal-500/20"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Tạo Key
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-emerald-500/20 rounded-full">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-emerald-100">API Key đã được tạo!</h3>
              <p className="text-sm text-emerald-200/70 mt-1">
                Sao chép key này ngay. Bạn sẽ không thể thấy nó lần nữa.
              </p>
            </div>

            <div className="relative">
              <pre className="p-4 bg-gray-950 border border-gray-800 rounded-lg font-mono text-sm text-gray-300 break-all pr-12">
                {createdKey.secret_key}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors border border-gray-700"
                title="Sao chép"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
