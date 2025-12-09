'use client';

import { useState, useEffect } from 'react';
import { Save, Bell, Check, AlertTriangle, Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useRouter } from 'next/navigation';

interface Setting {
    setting_key: string;
    setting_value: string;
    description: string;
    is_public: boolean;
}

export default function AdminSettingsPage() {
    const { admin, isLoading: authLoading } = useAdminAuth();
    const router = useRouter();
    
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!authLoading && !admin) {
            router.push('/admin/auth/login');
        }
    }, [admin, authLoading, router]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch settings');

            const data: Setting[] = await res.json();
            const settingsMap: Record<string, string> = {};
            data.forEach(s => settingsMap[s.setting_key] = s.setting_value);
            
            setSettings(settingsMap);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (admin) fetchSettings();
    }, [admin]);

    const handleSave = async (key: string, value: string) => {
        setSaving(true);
        setSuccess('');
        setError('');
        
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/admin/settings/${key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ value })
            });

            if (!res.ok) throw new Error('Failed to update setting');
            
            setSuccess(`Saved ${key}`);
            setTimeout(() => setSuccess(''), 3000);
            
            // Update local state
            setSettings(prev => ({ ...prev, [key]: value }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAll = async (e: React.FormEvent) => {
        e.preventDefault();
        // Just save notification settings for now sequentially
        handleSave('notification_title', settings['notification_title']);
        handleSave('notification_message', settings['notification_message']);
        handleSave('notification_active', settings['notification_active']);
    }

    if (authLoading || !admin) return null;

    return (
        <div className="min-h-screen bg-black text-white flex">
            <AdminSidebar />
            
            <main className="flex-1 p-8 ml-64">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">System Settings</h1>
                    <p className="text-gray-400 mt-2">Manage global system configurations.</p>
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
                    <div className="text-center py-12 text-gray-500">Loading settings...</div>
                ) : (
                    <div className="space-y-6 max-w-2xl">
                        
                        {/* Notification Settings Card */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3">
                                <Bell className="w-5 h-5 text-purple-400" />
                                <h3 className="font-semibold text-white">Global Notification Popup</h3>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                {/* Active Toggle */}
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-300">Enable Notification</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={settings['notification_active'] === 'true'}
                                            onChange={(e) => {
                                                const newVal = e.target.checked ? 'true' : 'false';
                                                setSettings(prev => ({ ...prev, 'notification_active': newVal }));
                                                handleSave('notification_active', newVal);
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">
                                        Notification Title
                                    </label>
                                    <input
                                        type="text"
                                        value={settings['notification_title'] || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, 'notification_title': e.target.value }))}
                                        className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>

                                {/* Message (HTML) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">
                                        Notification Message (HTML Support)
                                    </label>
                                    <textarea
                                        rows={5}
                                        value={settings['notification_message'] || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, 'notification_message': e.target.value }))}
                                        className="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Supported tags: &lt;b&gt;, &lt;i&gt;, &lt;span&gt;, &lt;a&gt;, &lt;br&gt;
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-gray-800 flex justify-end">
                                    <button
                                        onClick={handleSaveAll}
                                        disabled={saving}
                                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
