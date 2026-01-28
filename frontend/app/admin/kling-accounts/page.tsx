'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useRouter } from 'next/navigation';

interface KlingAccount {
    account_id: number;
    name: string;
    cookie: string;
    priority: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function KlingAccountsPage() {
    const { admin, isLoading: authLoading } = useAdminAuth();
    const router = useRouter();
    
    const [accounts, setAccounts] = useState<KlingAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<KlingAccount | null>(null);
    const [showCookies, setShowCookies] = useState<Record<number, boolean>>({});
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        cookie: '',
        priority: 100,
        is_active: true
    });

    const [showInactive, setShowInactive] = useState(true);

    useEffect(() => {
        if (!authLoading && !admin) {
            router.push('/admin/login');
        }
    }, [admin, authLoading, router]);

    const fetchAccounts = async () => {
        setLoading(true);
        setError('');
        
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/kling/accounts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch accounts');

            const data = await res.json();
            setAccounts(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
            cookie: '',
            priority: 100,
            is_active: true
        });
        setShowModal(true);
    };

    const openEditModal = (account: KlingAccount) => {
        setEditingAccount(account);
        setFormData({
            name: account.name,
            cookie: account.cookie,
            priority: account.priority,
            is_active: account.is_active
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('admin_token');
            const url = editingAccount
                ? `${process.env.NEXT_PUBLIC_API}/api/admin/kling/accounts/${editingAccount.account_id}`
                : `${process.env.NEXT_PUBLIC_API}/api/admin/kling/accounts`;

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

    const handleDelete = async (account: KlingAccount) => {
        if (!confirm('Are you sure you want to delete this account?')) return;

        try {
            const token = localStorage.getItem('admin_token');
            const url = `${process.env.NEXT_PUBLIC_API}/api/admin/kling/accounts/${account.account_id}`;

            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to delete account');

            setSuccess('Account deleted successfully');
            fetchAccounts();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const toggleCookie = (id: number) => {
        setShowCookies(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredAccounts = accounts.filter(acc => showInactive || acc.is_active);

    // Stats
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(a => a.is_active).length;
    
    if (authLoading || !admin) return null;

    return (
        <div className="min-h-screen bg-black text-white flex">
            <AdminSidebar />
            
            <main className="flex-1 p-8 ml-64">
                {/* Messages */}
                {error && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400">
                        {success}
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <p className="text-gray-400 text-sm">Total Accounts</p>
                        <p className="text-2xl font-bold mt-1">{totalAccounts}</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <p className="text-gray-400 text-sm">Active Accounts</p>
                        <p className="text-2xl font-bold mt-1 text-green-400">{activeAccounts}</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <p className="text-gray-400 text-sm">Inactive Accounts</p>
                        <p className="text-2xl font-bold mt-1 text-red-400">{totalAccounts - activeAccounts}</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-gray-900 border border-gray-800 rounded-t-xl p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">Kling Account List</h2>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 mr-4">
                            <span className="text-sm text-gray-400">Show Inactive</span>
                            <button 
                                onClick={() => setShowInactive(!showInactive)}
                                className={`w-10 h-6 rounded-full relative transition-colors ${showInactive ? 'bg-teal-600' : 'bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${showInactive ? 'translate-x-4' : ''}`} />
                            </button>
                            <RefreshCw className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" onClick={() => fetchAccounts()} />
                        </div>
                        
                        <button onClick={openCreateModal} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded text-sm flex items-center gap-1">
                            <Plus className="w-4 h-4" /> New Account
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-gray-900 border-x border-b border-gray-800 rounded-b-xl overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-gray-800/50 text-gray-300">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Cookie</th>
                                <th className="px-6 py-3">Priority</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Created At</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-8"><Loader2 className="animate-spin inline mr-2"/> Loading...</td></tr>
                            ) : filteredAccounts.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No accounts found</td></tr>
                            ) : filteredAccounts.map(account => (
                                <tr key={account.account_id} className="border-b border-gray-800 hover:bg-gray-800/30">
                                    <td className="px-6 py-4 font-medium text-white">{account.account_id}</td>
                                    <td className="px-6 py-4 font-medium text-white">{account.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="max-w-[300px] truncate">
                                                {showCookies[account.account_id] ? account.cookie : '••••••••••••••••'}
                                            </span>
                                            <button 
                                                onClick={() => toggleCookie(account.account_id)}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                {showCookies[account.account_id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{account.priority}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-xs ${account.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {account.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{new Date(account.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => openEditModal(account)} className="text-gray-400 hover:text-white">Edit</button>
                                        <button onClick={() => handleDelete(account)} className="text-red-400 hover:text-red-300">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full">
                            <div className="p-6 border-b border-gray-800 flex justify-between">
                                <h2 className="text-xl font-bold">{editingAccount ? 'Edit Account' : 'Add New Account'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Account Name</label>
                                    <input 
                                        className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 text-white focus:border-teal-500 outline-none"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Kling Account 1"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Cookie</label>
                                    <textarea
                                        className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 text-white text-xs font-mono focus:border-teal-500 outline-none"
                                        rows={4}
                                        placeholder="Paste Kling cookie value here..."
                                        value={formData.cookie}
                                        onChange={e => setFormData({ ...formData, cookie: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Priority</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 text-white focus:border-teal-500 outline-none"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                        min={1}
                                        max={1000}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Higher priority accounts are used first</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <label htmlFor="is_active" className="text-sm text-gray-400">Active</label>
                                </div>
                                
                                <div className="flex gap-3 pt-4 border-t border-gray-800">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>
                                    <button type="submit" className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 rounded text-white flex justify-center items-center gap-2">
                                        <Save className="w-4 h-4"/> {editingAccount ? 'Update' : 'Create'}
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
