
'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Check, AlertTriangle, Loader2, Server, Eye, EyeOff, Activity, RefreshCw, Upload, Download } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useRouter } from 'next/navigation';

interface SoraAccount {
    id: number;
    email: string;
    access_token: string;
    session_token?: string;
    refresh_token?: string;
    name?: string;
    client_id?: string;
    proxy_url?: string;
    expiration_time?: number;
    is_active: boolean;
    is_expired?: boolean;
    remark?: string;
    priority: number;
    
    // Stats & Plan
    plan_type?: string;
    sora2_supported?: boolean;
    sora2_remaining_count?: number;
    sora2_total_count?: number;
    image_concurrency?: number;
    video_concurrency?: number;
    image_enabled?: boolean;
    video_enabled?: boolean;
    
    created_at: string;
    updated_at: string;
}

export default function SoraAccountsPage() {
    const { admin, isLoading: authLoading } = useAdminAuth();
    const router = useRouter();
    
    const [accounts, setAccounts] = useState<SoraAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<SoraAccount | null>(null);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    
    // Global settings state
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        access_token: '',
        session_token: '',
        refresh_token: '',
        remark: '',
        name: '',
        client_id: '',
        proxy_url: '',
        priority: 100,
        is_active: true,
        image_concurrency: -1,
        video_concurrency: -1,
        image_enabled: true,
        video_enabled: true
    });

    const [showInactive, setShowInactive] = useState(true);

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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/sora/accounts`, {
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
            access_token: '',
            session_token: '',
            refresh_token: '',
            remark: '',
            name: '',
            client_id: '',
            proxy_url: '',
            priority: 100,
            is_active: true,
            image_concurrency: -1,
            video_concurrency: -1,
            image_enabled: true,
            video_enabled: true
        });
        setShowModal(true);
    };

    const openEditModal = (account: SoraAccount) => {
        setEditingAccount(account);
        setFormData({
            access_token: account.access_token,
            session_token: account.session_token || '',
            refresh_token: account.refresh_token || '',
            remark: account.remark || '',
            name: account.name || '',
            client_id: account.client_id || '',
            proxy_url: account.proxy_url || '',
            priority: account.priority,
            is_active: account.is_active,
            image_concurrency: account.image_concurrency ?? -1,
            video_concurrency: account.video_concurrency ?? -1,
            image_enabled: account.image_enabled ?? true,
            video_enabled: account.video_enabled ?? true
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
                ? `${process.env.NEXT_PUBLIC_API}/api/admin/sora/accounts/${editingAccount.id}`
                : `${process.env.NEXT_PUBLIC_API}/api/admin/sora/accounts`;

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

    const handleDelete = async (account: SoraAccount) => {
        if (!confirm('Are you sure you want to delete this account?')) return;

        try {
            const token = localStorage.getItem('admin_token');
            const url = `${process.env.NEXT_PUBLIC_API}/api/admin/sora/accounts/${account.id}`;

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

    // Helper functions for conversions
    const handleSTtoAT = async () => {
        if (!formData.session_token) return setError('Enter Session Token first');
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/sora/accounts/convert/st`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ session_token: formData.session_token })
            });
            if (!res.ok) throw new Error('Conversion failed');
            const data = await res.json();
            setFormData(prev => ({ ...prev, access_token: data.access_token }));
            setSuccess('ST converted!');
        } catch (err: any) { setError(err.message); }
    };

    const handleRTtoAT = async () => {
        if (!formData.refresh_token) return setError('Enter Refresh Token first');
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/sora/accounts/convert/rt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ refresh_token: formData.refresh_token })
            });
            if (!res.ok) throw new Error('Conversion failed');
            const data = await res.json();
            setFormData(prev => ({ ...prev, access_token: data.access_token, refresh_token: data.refresh_token || prev.refresh_token }));
            setSuccess('RT converted!');
        } catch (err: any) { setError(err.message); }
    };

    const handleTestUpdate = async (account?: SoraAccount) => {
        const token = localStorage.getItem('admin_token');
        const targets = account ? [account] : accounts.filter(a => a.is_active);
        
        setLoading(true);
        let successCount = 0;
        
        for (const target of targets) {
             try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/sora/accounts/${target.id}/test`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) successCount++;
             } catch (e) {
                 console.error(e);
             }
        }
        
        setLoading(false);
        setSuccess(`Tested/Updated ${successCount} accounts successfully.`);
        fetchAccounts();
    };

    const filteredAccounts = accounts.filter(acc => showInactive || acc.is_active);
    const toggleSecret = (key: string) => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    const formatExpiry = (ts?: number) => ts ? new Date(ts * 1000).toLocaleString() : '-';

    // Stats
    const totalTokens = accounts.length;
    const activeTokens = accounts.filter(a => a.is_active && !a.is_expired).length;
    
    if (authLoading || !admin) return null;

    return (
        <div className="min-h-screen bg-black text-white flex">
            <AdminSidebar />
            
            <main className="flex-1 p-8 ml-64">
                {/* Stats Cards */}
                <div className="grid grid-cols-5 gap-4 mb-8">
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <p className="text-gray-400 text-sm">Total number of tokens</p>
                        <p className="text-2xl font-bold mt-1">{totalTokens}</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <p className="text-gray-400 text-sm">Active Token</p>
                        <p className="text-2xl font-bold mt-1 text-green-400">{activeTokens}</p>
                    </div>
                     <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <p className="text-gray-400 text-sm">Today's picture/Total</p>
                        <p className="text-2xl font-bold mt-1 text-blue-400">0/0</p>
                    </div>
                     <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <p className="text-gray-400 text-sm">Today's Video / Total</p>
                        <p className="text-2xl font-bold mt-1 text-purple-400">0/0</p>
                    </div>
                     <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <p className="text-gray-400 text-sm">Today's Errors / Total</p>
                        <p className="text-2xl font-bold mt-1 text-red-500">0/0</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-gray-900 border border-gray-800 rounded-t-xl p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">Token List</h2>
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2 mr-4">
                            <span className="text-sm text-gray-400">Automatic refresh AT</span>
                            <button 
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`w-10 h-6 rounded-full relative transition-colors ${autoRefresh ? 'bg-teal-600' : 'bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-4' : ''}`} />
                            </button>
                            <RefreshCw className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => fetchAccounts()} />
                        </div>
                        
                        <button onClick={() => handleTestUpdate()} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-1">
                            <Activity className="w-4 h-4" /> Test Update
                        </button>
                         <button className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded text-sm flex items-center gap-1">
                            <Check className="w-4 h-4" /> Batch enable
                        </button>
                        <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm flex items-center gap-1">
                            <Trash2 className="w-4 h-4" /> Clean up disabled
                        </button>
                         <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1">
                            <Download className="w-4 h-4" /> Export
                        </button>
                         <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1">
                            <Upload className="w-4 h-4" /> Import
                        </button>
                        <button onClick={openCreateModal} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-sm flex items-center gap-1">
                            <Plus className="w-4 h-4" /> New
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-gray-900 border-x border-b border-gray-800 rounded-b-xl overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-gray-800/50 text-gray-300">
                            <tr>
                                <th className="px-6 py-3">Mail</th>
                                <th className="px-6 py-3">State</th>
                                <th className="px-6 py-3">Client ID</th>
                                <th className="px-6 py-3">Expiration time</th>
                                <th className="px-6 py-3">Account Type</th>
                                <th className="px-6 py-3">Sora2</th>
                                <th className="px-6 py-3">Available times</th>
                                <th className="px-6 py-3">Remark</th>
                                <th className="px-6 py-3 text-right">Operate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="text-center py-8"><Loader2 className="animate-spin inline mr-2"/> Loading...</td></tr>
                            ) : filteredAccounts.map(account => (
                                <tr key={account.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                                    <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate" title={account.email}>{account.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-xs ${account.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {account.is_active ? 'active' : 'inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{account.client_id ? 'Yes' : '-'}</td>
                                    <td className="px-6 py-4">{formatExpiry(account.expiration_time)}</td>
                                    <td className="px-6 py-4">
                                        {account.plan_type ? <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">{account.plan_type}</span> : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {account.sora2_supported ? (
                                            <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">support</span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-white font-mono">
                                        {account.sora2_remaining_count !== undefined ? account.sora2_remaining_count : '-'}
                                    </td>
                                    <td className="px-6 py-4">{account.remark || '-'}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => handleTestUpdate(account)} className="text-blue-400 hover:text-blue-300">test</button>
                                        <button onClick={() => openEditModal(account)} className="text-gray-400 hover:text-white">edit</button>
                                        <button onClick={() => handleDelete(account)} className="text-red-400 hover:text-red-300">delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-800 flex justify-between sticky top-0 bg-gray-900 z-10">
                                <h2 className="text-xl font-bold">{editingAccount ? 'Edit Account' : 'Add Token'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <textarea
                                    className="w-full bg-black/50 border border-gray-800 rounded px-4 py-2 text-white text-xs font-mono focus:border-teal-500 outline-none"
                                    rows={3}
                                    placeholder="Please enter your Access Token (JWT format)..."
                                    value={formData.access_token}
                                    onChange={e => setFormData({ ...formData, access_token: e.target.value })}
                                />
                                {/* Conversion Utils (Compact) */}
                                <div className="space-y-4 p-4 bg-gray-950/50 rounded-lg">
                                    <div className="flex gap-2">
                                        <input 
                                            placeholder="Session Token (ST)" 
                                            value={formData.session_token}
                                            onChange={e => setFormData({...formData, session_token: e.target.value})}
                                            className="flex-1 bg-black/50 border border-gray-800 rounded px-2 py-1 text-xs"
                                        />
                                        <button type="button" onClick={handleSTtoAT} className="px-3 py-1 bg-blue-600 text-white text-xs rounded">ST→AT</button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            placeholder="Refresh Token (RT)" 
                                            value={formData.refresh_token}
                                            onChange={e => setFormData({...formData, refresh_token: e.target.value})}
                                            className="flex-1 bg-black/50 border border-gray-800 rounded px-2 py-1 text-xs"
                                        />
                                        <button type="button" onClick={handleRTtoAT} className="px-3 py-1 bg-green-600 text-white text-xs rounded">RT→AT</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="text-sm text-gray-400">Client ID (Optional)</label>
                                        <input 
                                            className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 mt-1"
                                            value={formData.client_id}
                                            onChange={e => setFormData({...formData, client_id: e.target.value})} 
                                            placeholder="Auto-filled usually"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">Proxy (Optional)</label>
                                        <input 
                                            className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 mt-1"
                                            value={formData.proxy_url}
                                            onChange={e => setFormData({...formData, proxy_url: e.target.value})}
                                            placeholder="http://..."
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-sm text-gray-400">Notes</label>
                                    <input 
                                        className="w-full bg-black/50 border border-gray-800 rounded px-3 py-2 mt-1"
                                        value={formData.remark}
                                        onChange={e => setFormData({...formData, remark: e.target.value})}
                                    />
                                </div>

                                <div className="border-t border-gray-800 pt-4">
                                    <h3 className="text-sm font-bold mb-3">Function switch</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={formData.image_enabled} onChange={e => setFormData({...formData, image_enabled: e.target.checked})} />
                                                <span className="text-sm">Enable image generation</span>
                                            </label>
                                            <input 
                                                type="number" 
                                                className="w-20 bg-black/50 border border-gray-800 rounded px-2 py-1 text-xs text-center"
                                                value={formData.image_concurrency}
                                                onChange={e => setFormData({...formData, image_concurrency: parseInt(e.target.value)})}
                                                placeholder="-1"
                                            />
                                        </div>
                                         <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={formData.video_enabled} onChange={e => setFormData({...formData, video_enabled: e.target.checked})} />
                                                <span className="text-sm">Enable video generation</span>
                                            </label>
                                            <input 
                                                type="number" 
                                                className="w-20 bg-black/50 border border-gray-800 rounded px-2 py-1 text-xs text-center"
                                                value={formData.video_concurrency}
                                                onChange={e => setFormData({...formData, video_concurrency: parseInt(e.target.value)})}
                                                placeholder="-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 pt-4 border-t border-gray-800">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>
                                    <button type="submit" className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 rounded text-white flex justify-center items-center gap-2">
                                        <Save className="w-4 h-4"/> {editingAccount ? 'Update' : 'Add to'}
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
