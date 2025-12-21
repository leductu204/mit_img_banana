'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Check, AlertTriangle, Loader2, Server, Eye, EyeOff, TestTube, Activity } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useRouter } from 'next/navigation';

interface HiggsfieldAccount {
    account_id: number;
    name: string;
    sses?: string;
    cookie?: string;
    max_parallel_images: number;
    max_parallel_videos: number;
    max_slow_images: number;
    max_slow_videos: number;
    priority: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface AccountStats {
    total_jobs: number;
    image_jobs: number;
    video_jobs: number;
    slow_image_jobs: number;
    slow_video_jobs: number;
}

export default function HiggsfieldAccountsPage() {
    const { admin, isLoading: authLoading } = useAdminAuth();
    const router = useRouter();
    
    const [accounts, setAccounts] = useState<HiggsfieldAccount[]>([]);
    const [accountStats, setAccountStats] = useState<Record<number, AccountStats>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<HiggsfieldAccount | null>(null);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        sses: '',
        cookie: '',
        max_parallel_images: 8,
        max_parallel_videos: 8,
        max_slow_images: 4,
        max_slow_videos: 4,
        priority: 100,
        is_active: true
    });

    useEffect(() => {
        if (!authLoading && !admin) {
            router.push('/admin/auth/login');
        }
    }, [admin, authLoading, router]);

    const fetchAccounts = async () => {
        setLoading(true);
        setError('');
        
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/higgsfield/accounts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch accounts');

            const data = await res.json();
            setAccounts(data);
            
            // Fetch stats for each account
            await fetchAllStats(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllStats = async (accountsList: HiggsfieldAccount[]) => {
        const token = localStorage.getItem('admin_token');
        const statsPromises = accountsList.map(async (account) => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API}/api/admin/higgsfield/accounts/${account.account_id}/stats`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (res.ok) {
                    const data = await res.json();
                    return { id: account.account_id, stats: data.stats };
                }
            } catch (err) {
                console.error(`Failed to fetch stats for account ${account.account_id}`);
            }
            return null;
        });

        const results = await Promise.all(statsPromises);
        const statsMap: Record<number, AccountStats> = {};
        results.forEach(result => {
            if (result) {
                statsMap[result.id] = result.stats;
            }
        });
        setAccountStats(statsMap);
    };

    useEffect(() => {
        if (admin) {
            fetchAccounts();
        }
    }, [admin]);

    const openCreateModal = () => {
        setEditingAccount(null);
        setFormData({
            name: '',
            sses: '',
            cookie: '',
            max_parallel_images: 8,
            max_parallel_videos: 8,
            max_slow_images: 4,
            max_slow_videos: 4,
            priority: 100,
            is_active: true
        });
        setShowModal(true);
    };

    const openEditModal = async (account: HiggsfieldAccount) => {
        setEditingAccount(account);
        setFormData({
            name: account.name,
            sses: 'Loading...',
            cookie: 'Loading...',
            max_parallel_images: account.max_parallel_images,
            max_parallel_videos: account.max_parallel_videos,
            max_slow_images: account.max_slow_images,
            max_slow_videos: account.max_slow_videos,
            priority: account.priority,
            is_active: account.is_active
        });
        setShowModal(true);

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/higgsfield/accounts/${account.account_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const fullAccount = await res.json();
                setFormData(prev => ({
                    ...prev,
                    sses: fullAccount.sses || '',
                    cookie: fullAccount.cookie || ''
                }));
            }
        } catch (err) {
            console.error("Failed to fetch account details", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('admin_token');
            const url = editingAccount
                ? `${process.env.NEXT_PUBLIC_API}/api/admin/higgsfield/accounts/${editingAccount.account_id}`
                : `${process.env.NEXT_PUBLIC_API}/api/admin/higgsfield/accounts`;

            const res = await fetch(url, {
                method: editingAccount ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Failed to save account');
            }

            setSuccess(editingAccount ? 'Account updated successfully' : 'Account created successfully');
            setShowModal(false);
            fetchAccounts();
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (accountId: number) => {
        if (!confirm('Are you sure you want to deactivate this account?')) return;

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API}/api/admin/higgsfield/accounts/${accountId}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!res.ok) throw new Error('Failed to delete account');

            setSuccess('Account deactivated successfully');
            fetchAccounts();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const testCredentials = async (accountId: number) => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API}/api/admin/higgsfield/accounts/${accountId}/test`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            const data = await res.json();
            
            if (data.success) {
                setSuccess('✓ Credentials are valid!');
            } else {
                setError(`✗ Test failed: ${data.message}`);
            }
            
            setTimeout(() => {
                setSuccess('');
                setError('');
            }, 5000);
        } catch (err: any) {
            setError(`Test failed: ${err.message}`);
        }
    };

    const toggleSecret = (key: string) => {
        setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (authLoading || !admin) return null;

    return (
        <div className="min-h-screen bg-black text-white flex">
            <AdminSidebar />
            
            <main className="flex-1 p-8 ml-64">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Higgsfield Accounts</h1>
                        <p className="text-gray-400 mt-2">Manage multiple provider accounts with configurable job limits.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Account
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center gap-3">
                        <Check className="w-5 h-5" />
                        {success}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        Loading accounts...
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="text-center py-12">
                        <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-4">No accounts configured yet</p>
                        <button
                            onClick={openCreateModal}
                            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg inline-flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Create First Account
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {accounts.map(account => {
                            const stats = accountStats[account.account_id] || {
                                total_jobs: 0,
                                image_jobs: 0,
                                video_jobs: 0,
                                slow_image_jobs: 0,
                                slow_video_jobs: 0
                            };

                            return (
                                <div
                                    key={account.account_id}
                                    className={`bg-gray-900 border rounded-xl overflow-hidden ${
                                        account.is_active ? 'border-gray-800' : 'border-gray-800/50 opacity-60'
                                    }`}
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-bold text-white">{account.name}</h3>
                                                    {account.is_active ? (
                                                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                                                            Inactive
                                                        </span>
                                                    )}
                                                    <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                                                        Priority: {account.priority}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    ID: {account.account_id} • Created: {new Date(account.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => testCredentials(account.account_id)}
                                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                                                    title="Test Credentials"
                                                >
                                                    <TestTube className="w-4 h-4" />
                                                    Test
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(account)}
                                                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(account.account_id)}
                                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Usage Statistics */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            <div className="bg-black/30 p-4 rounded-lg border border-gray-800">
                                                <div className="text-2xl font-bold text-blue-400">
                                                    {stats.image_jobs} / {account.max_parallel_images}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Image Jobs</div>
                                                <div className="mt-2 w-full bg-gray-700/50 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, (stats.image_jobs / account.max_parallel_images) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="bg-black/30 p-4 rounded-lg border border-gray-800">
                                                <div className="text-2xl font-bold text-purple-400">
                                                    {stats.video_jobs} / {account.max_parallel_videos}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Video Jobs</div>
                                                <div className="mt-2 w-full bg-gray-700/50 rounded-full h-2">
                                                    <div
                                                        className="bg-purple-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, (stats.video_jobs / account.max_parallel_videos) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="bg-black/30 p-4 rounded-lg border border-gray-800">
                                                <div className="text-2xl font-bold text-orange-400">
                                                    {stats.slow_image_jobs} / {account.max_slow_images}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Slow Images</div>
                                                <div className="mt-2 w-full bg-gray-700/50 rounded-full h-2">
                                                    <div
                                                        className="bg-orange-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, (stats.slow_image_jobs / account.max_slow_images) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="bg-black/30 p-4 rounded-lg border border-gray-800">
                                                <div className="text-2xl font-bold text-pink-400">
                                                    {stats.slow_video_jobs} / {account.max_slow_videos}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Slow Videos</div>
                                                <div className="mt-2 w-full bg-gray-700/50 rounded-full h-2">
                                                    <div
                                                        className="bg-pink-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, (stats.slow_video_jobs / account.max_slow_videos) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Create/Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
                                <h2 className="text-2xl font-bold">
                                    {editingAccount ? 'Edit Account' : 'Create New Account'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Account Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Account Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                        placeholder="e.g., Main Account, Backup Account"
                                        required
                                    />
                                </div>

                                {/* Credentials */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            SSES Token *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showSecrets['sses'] ? 'text' : 'password'}
                                                value={formData.sses}
                                                onChange={(e) => setFormData({ ...formData, sses: e.target.value })}
                                                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:border-teal-500 transition-colors font-mono text-sm"
                                                placeholder="ses_xxx..."
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => toggleSecret('sses')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                            >
                                                {showSecrets['sses'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Cookie *
                                        </label>
                                        <div className="relative">
                                            <textarea
                                                rows={3}
                                                value={formData.cookie}
                                                onChange={(e) => setFormData({ ...formData, cookie: e.target.value })}
                                                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:border-teal-500 transition-colors font-mono text-sm"
                                                placeholder="_stripe_mid=..."
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => toggleSecret('cookie')}
                                                className="absolute right-3 top-3 text-gray-400 hover:text-white"
                                            >
                                                {showSecrets['cookie'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Job Limits */}
                                <div className="border-t border-gray-800 pt-6">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-300">Job Limits</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                                Max Parallel Images
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={formData.max_parallel_images}
                                                onChange={(e) => setFormData({ ...formData, max_parallel_images: parseInt(e.target.value) })}
                                                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                                Max Parallel Videos
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={formData.max_parallel_videos}
                                                onChange={(e) => setFormData({ ...formData, max_parallel_videos: parseInt(e.target.value) })}
                                                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                                Max Slow Images
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                value={formData.max_slow_images}
                                                onChange={(e) => setFormData({ ...formData, max_slow_images: parseInt(e.target.value) })}
                                                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                                Max Slow Videos
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                value={formData.max_slow_videos}
                                                onChange={(e) => setFormData({ ...formData, max_slow_videos: parseInt(e.target.value) })}
                                                className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Priority & Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Priority (higher = preferred)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="1000"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                            className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Status
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer mt-2">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-300">
                                                {formData.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex gap-3 pt-4 border-t border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingAccount ? 'Update Account' : 'Create Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
