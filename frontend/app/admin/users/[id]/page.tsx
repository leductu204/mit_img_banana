'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAdminToken } from '@/contexts/AdminAuthContext';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { 
  ArrowLeft,
  Loader2,
  Ban,
  CheckCircle,
  Plus,
  Minus,
  Settings,
  CreditCard
} from 'lucide-react';

interface User {
  user_id: string;
  google_id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  credits: number;
  is_banned: boolean;
  created_at: string;
  last_login_at?: string;
  plan_id?: number;
}

interface Plan {
  plan_id: number;
  name: string;
  price: number;
  total_concurrent_limit: number;
  image_concurrent_limit: number;
  video_concurrent_limit: number;
  description?: string;
}

interface Job {
  job_id: string;
  type: string;
  model: string;
  prompt: string;
  status: string;
  credits_cost: number;
  output_url?: string;
  created_at: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

interface UserDetailData {
  user: User;
  jobs: Job[];
  transactions: Transaction[];
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<UserDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal state
  const [showAddCredits, setShowAddCredits] = useState(false);
  const [showDeductCredits, setShowDeductCredits] = useState(false);
  const [creditsAmount, setCreditsAmount] = useState('');
  const [creditsReason, setCreditsReason] = useState('');
  
  // Tier management
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showTierModal, setShowTierModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const fetchUser = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      setData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/users/subscription-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchPlans();
  }, [userId]);

  const handleAddCredits = async () => {
    if (!creditsAmount || !creditsReason) return;
    
    setActionLoading(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/users/${userId}/credits/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseInt(creditsAmount),
          reason: creditsReason
        })
      });

      if (!res.ok) throw new Error('Failed to add credits');
      
      setShowAddCredits(false);
      setCreditsAmount('');
      setCreditsReason('');
      fetchUser();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeductCredits = async () => {
    if (!creditsAmount || !creditsReason) return;
    
    setActionLoading(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/users/${userId}/credits/deduct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseInt(creditsAmount),
          reason: creditsReason
        })
      });

      if (!res.ok) throw new Error('Failed to deduct credits');
      
      setShowDeductCredits(false);
      setCreditsAmount('');
      setCreditsReason('');
      fetchUser();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanToggle = async () => {
    if (!data) return;
    
    setActionLoading(true);
    try {
      const token = getAdminToken();
      const endpoint = data.user.is_banned 
        ? `${NEXT_PUBLIC_API}/api/admin/users/${userId}/unban`
        : `${NEXT_PUBLIC_API}/api/admin/users/${userId}/ban`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Admin action' })
      });

      if (!res.ok) throw new Error('Action failed');
      fetchUser();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTierChange = async () => {
    if (!selectedPlanId) return;
    
    setActionLoading(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/users/${userId}/tier`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          reason: 'Admin changed subscription tier'
        })
      });

      if (!res.ok) throw new Error('Failed to change tier');
      
      setShowTierModal(false);
      setSelectedPlanId(null);
      fetchUser();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-400">User not found</div>;
  }

  const { user, jobs, transactions } = data;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      {/* User Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl font-bold">
                {user.email[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{user.email}</h1>
              <p className="text-gray-400">{user.username || 'No username'}</p>
              <div className="flex items-center gap-4 mt-2">
                {user.is_banned ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
                    <Ban className="w-4 h-4" />
                    Banned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </span>
                )}
                <span className="text-gray-400 text-sm">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddCredits(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Credits
            </button>
            <button
              onClick={() => setShowDeductCredits(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <Minus className="w-4 h-4" />
              Remove Credits
            </button>
            <button
              onClick={handleBanToggle}
              disabled={actionLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                user.is_banned
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              <Ban className="w-4 h-4" />
              {user.is_banned ? 'Unban' : 'Ban'}
            </button>
            <button
              onClick={() => {
                setSelectedPlanId(user.plan_id || 1);
                setShowTierModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Change Tier
            </button>
          </div>
        </div>

        {/* Credits */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700/30 rounded-lg flex items-center gap-4">
            <CreditCard className="w-8 h-8 text-teal-400" />
            <div>
              <p className="text-3xl font-bold text-white">{user.credits}</p>
              <p className="text-gray-400">Current Credits</p>
            </div>
          </div>
          <div className="p-4 bg-gray-700/30 rounded-lg flex items-center gap-4">
            <Settings className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {plans.find(p => p.plan_id === user.plan_id)?.name || 'Free'}
              </p>
              <p className="text-gray-400">Subscription Tier</p>
            </div>
          </div>
        </div>
      </div>

      {/* Job History */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Job History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm">
                <th className="text-left py-2">Model</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Cost</th>
                <th className="text-left py-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {jobs.map((job) => (
                <tr key={job.job_id}>
                  <td className="py-3 text-white">{job.model}</td>
                  <td className="py-3 text-gray-400">{job.type}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400">-{job.credits_cost}</td>
                  <td className="py-3 text-gray-400 text-sm">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Credit Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm">
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">Balance</th>
                <th className="text-left py-2">Reason</th>
                <th className="text-left py-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-3 text-gray-400">{tx.type}</td>
                  <td className={`py-3 font-medium ${
                    tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </td>
                  <td className="py-3 text-white">{tx.balance_after}</td>
                  <td className="py-3 text-gray-400 text-sm">{tx.reason}</td>
                  <td className="py-3 text-gray-400 text-sm">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Credits Modal */}
      {showAddCredits && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Add Credits</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount</label>
                <input
                  type="number"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason</label>
                <input
                  type="text"
                  value={creditsReason}
                  onChange={(e) => setCreditsReason(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Promotion, compensation, etc."
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddCredits(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCredits}
                  disabled={actionLoading || !creditsAmount || !creditsReason}
                  className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
                >
                  {actionLoading ? 'Adding...' : 'Add Credits'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deduct Credits Modal */}
      {showDeductCredits && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Remove Credits</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount to Remove</label>
                <input
                  type="number"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason</label>
                <input
                  type="text"
                  value={creditsReason}
                  onChange={(e) => setCreditsReason(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Violation, refund reversal, etc."
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeductCredits(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeductCredits}
                  disabled={actionLoading || !creditsAmount || !creditsReason}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {actionLoading ? 'Removing...' : 'Remove Credits'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Change Subscription Tier</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Select Plan</label>
                {plans.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading plans...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {plans.map((plan) => (
                      <button
                        key={plan.plan_id}
                        onClick={() => setSelectedPlanId(plan.plan_id)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          selectedPlanId === plan.plan_id
                            ? 'border-purple-500 bg-purple-500/20 text-white ring-2 ring-purple-500'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-base">{plan.name}</p>
                              {plan.price === 0 && (
                                <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded-full">FREE</span>
                              )}
                            </div>
                            {plan.description && (
                              <p className="text-xs text-gray-400 mb-2">{plan.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <span className="text-gray-400">Total:</span>
                                <span className="font-medium text-purple-400">{plan.total_concurrent_limit}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-gray-400">Img:</span>
                                <span className="font-medium text-blue-400">{plan.image_concurrent_limit}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-gray-400">Vid:</span>
                                <span className="font-medium text-green-400">{plan.video_concurrent_limit}</span>
                              </span>
                            </div>
                          </div>
                          {plan.price > 0 && (
                            <div className="ml-3 text-right">
                              <span className="text-sm font-medium text-white">{plan.price.toLocaleString()}đ</span>
                              <p className="text-xs text-gray-400">/month</p>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTierModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTierChange}
                  disabled={actionLoading || !selectedPlanId || plans.length === 0}
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Update Tier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
