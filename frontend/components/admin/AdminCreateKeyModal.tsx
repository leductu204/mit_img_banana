'use client';

import { useState } from 'react';
import { X, Copy, Check, Loader2, AlertTriangle } from 'lucide-react';

interface AdminCreateKeyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminCreateKeyModal({ onClose, onSuccess }: AdminCreateKeyModalProps) {
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name,
          mode: 'live',
          initial_balance: parseInt(credits.toString())
        })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Failed to create key');
      
      setSecretKey(data.secret_key); // The backend returns this only once
      onSuccess(); // Trigger list refresh in background
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (secretKey) {
      navigator.clipboard.writeText(secretKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-6 text-white">Create Standalone API Key</h2>

        {!secretKey ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Client / Key Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="e.g. Acme Corp Production"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Initial Credits
              </label>
              <input
                type="number"
                value={credits}
                onChange={(e) => setCredits(parseInt(e.target.value))}
                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                min="0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                1 USD ≈ 100 Credits (Approx)
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2 font-medium transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Key...
                  </>
                ) : (
                  'Generate Key'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Key Created Successfully</h3>
              <p className="text-gray-400 text-sm">
                This key is active and ready for use.
              </p>
            </div>

            <div className="p-4 bg-black/50 border border-yellow-500/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Save this key immediately!
              </div>
              <p className="text-xs text-gray-400">
                For security, we cannot display this secret key again. If you lose it, you will need to generate a new one.
              </p>
              
              <div className="relative group">
                <code className="block w-full bg-black border border-gray-800 rounded p-3 text-sm text-green-400 font-mono break-all pr-10">
                  {secretKey}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="absolute top-2 right-2 p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
