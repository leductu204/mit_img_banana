import { User } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Coins, Settings, User as UserIcon, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface ProfileHeaderProps {
    user: User;
    planName?: string;
    planDescription?: string;
    planExpiresAt?: string;
}

export default function ProfileHeader({ user, planName, planDescription, planExpiresAt }: ProfileHeaderProps) {
    const { logout } = useAuth();
    
    return (
        <div className="lg:col-span-2 rounded-3xl bg-[#151A21] border border-white/5 p-8 relative overflow-hidden group shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)]">
            <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-[#22d3ee]/5 blur-[80px] transition-all duration-700 group-hover:bg-[#22d3ee]/10"></div>
            <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center relative z-10 transition-all duration-500">
                <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-[2rem] ring-4 ring-[#0A0E13] shadow-lg group-hover:scale-105 transition-transform duration-500">
                    {user.avatar_url ? (
                        <img 
                            src={user.avatar_url} 
                            alt={user.username}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="h-full w-full bg-[#1E2530] flex items-center justify-center">
                            <UserIcon className="h-12 w-12 text-slate-500" />
                        </div>
                    )}
                </div>
                <div className="flex-1 space-y-3">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">{user.username || user.email.split('@')[0]}</h2>
                        <p className="text-[#94A3B8] text-base font-medium">{user.email}</p>
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center rounded-xl bg-[#22d3ee]/10 px-3 py-1 text-xs font-semibold text-[#22d3ee] border border-[#22d3ee]/20 shadow-[0_0_10px_-2px_rgba(34,211,238,0.2)]">
                                {planName || 'Free Member'}
                            </span>
                            <span className="text-xs text-[#64748B] font-medium">Member since {new Date(user.created_at).getFullYear()}</span>
                        </div>
                        
                        {(planDescription || planExpiresAt) && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                {planDescription && (
                                    <p className="text-xs text-[#94A3B8] font-medium flex items-center gap-1.5">
                                        <span className="size-1 rounded-full bg-[#00BCD4]/50"></span>
                                        {planDescription}
                                    </p>
                                )}
                                {planExpiresAt && (
                                    <p className="text-xs text-[#94A3B8] font-medium flex items-center gap-1.5">
                                        <span className="size-1 rounded-full bg-amber-500/50"></span>
                                        Hạn sử dụng: {new Date(planExpiresAt).toLocaleDateString('vi-VN')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-col sm:items-end gap-5 w-full sm:w-auto mt-6 sm:mt-0">
                    <div className="text-right hidden sm:block delay-100 transition-all duration-500 group-hover:translate-x-1">
                        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Credits Available</p>
                        <div className="flex items-center justify-end gap-1.5">
                            <Coins className="text-[#22d3ee] w-6 h-6 fill-[#22d3ee]" />
                            <span className="text-4xl font-bold text-white tracking-tight tabular-nums">{user.credits.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Link href="/pricing" className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-b from-[#22d3ee] to-[#06b6d4] px-6 py-3 text-sm font-bold text-[#0A0E13] shadow-[0_4px_20px_-5px_rgba(34,211,238,0.4)] hover:shadow-[0_6px_25px_-5px_rgba(34,211,238,0.6)] hover:-translate-y-0.5 transition-all duration-300">
                            <span className="text-lg">+</span>
                            Nạp Credits
                        </Link>
                        <button className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-2xl bg-white/5 border border-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/10 transition-all duration-300">
                            <Settings className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={logout}
                            className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 hover:border-red-500/20 transition-all duration-300"
                            title="Đăng xuất"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
