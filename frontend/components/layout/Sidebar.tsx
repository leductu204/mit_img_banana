"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Video, User, BookOpenText, CreditCard } from 'lucide-react';
import CreditsBadge from '../common/CreditsBadge';
import { useAuth } from '@/hooks/useAuth';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, isAuthenticated } = useAuth();

    const navItems = [
        { href: '/create-image', icon: Sparkles, label: 'Tạo ảnh' },
        // { href: '/prompts', icon: BookOpenText, label: 'Kho Prompt Mẫu' },
        { href: '/create-video', icon: Video, label: 'Tạo Video' },
        { href: '/pricing', icon: CreditCard, label: 'Bảng giá' },
        { href: '/account', icon: User, label: 'Tài khoản' },
    ];

    return (
        <aside className="w-64 bg-card border-r border-border h-full p-4 hidden md:flex md:flex-col">
            <div className="mb-8 px-2">
                <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-xl">
                        <img 
                            src="/logo.png" 
                            alt="Logo" 
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                        Trạm Sáng Tạo
                    </span>
                </div>
            </div>
            
            <nav className="flex flex-col space-y-2 flex-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-2 p-2 rounded transition-colors
                                ${isActive 
                                    ? 'bg-[#0F766E]/10 text-[#0F766E] font-medium' 
                                    : 'text-foreground hover:bg-muted hover:text-primary'
                                }
                            `}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Credits section at bottom */}
            {isAuthenticated && user && (
                <div className="pt-4 border-t border-border mt-4">
                    <div className="flex flex-col gap-2 px-2">
                        <div className="flex items-center gap-2">
                            {user.avatar_url ? (
                                <img 
                                    src={user.avatar_url} 
                                    alt={user.username}
                                    className="h-8 w-8 rounded-full"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                </div>
                            )}
                            <span className="text-sm font-medium text-foreground truncate">
                                {user.username || user.email.split('@')[0]}
                            </span>
                        </div>
                        <CreditsBadge amount={user.credits} size="sm" />
                    </div>
                </div>
            )}
        </aside>
    );
}
