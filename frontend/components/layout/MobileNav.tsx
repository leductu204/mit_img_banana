"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Video, Menu, X, User, BookOpenText, CreditCard, Palette } from 'lucide-react';
import CreditsBadge from '../common/CreditsBadge';
import { useAuth } from '@/hooks/useAuth';

export default function MobileNav() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { user, isAuthenticated } = useAuth();

    const navItems = [
        { href: '/image', icon: Sparkles, label: 'Tạo ảnh' },
        { href: '/studio', icon: Palette, label: 'Studio' },
        { href: '/prompts', icon: BookOpenText, label: 'Kho Prompt Mẫu' },
        { href: '/video', icon: Video, label: 'Tạo Video' },
        { href: '/pricing', icon: CreditCard, label: 'Bảng giá' },
        { href: '/account', icon: User, label: 'Tài khoản' },
    ];

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                     <div className="relative h-8 w-8 overflow-hidden rounded-lg">
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
                <div className="flex items-center gap-2">
                    {isAuthenticated && user && (
                        <CreditsBadge amount={user.credits} size="sm" />
                    )}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div 
                    className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                >
                    <div 
                        className="fixed top-[57px] left-0 right-0 bg-card border-b border-border shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <nav className="flex flex-col p-4 space-y-2">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`
                                            flex items-center gap-2 p-3 rounded-lg transition-colors
                                            ${isActive 
                                                ? 'bg-[#0F766E]/10 text-[#0F766E] font-medium' 
                                                : 'text-foreground hover:bg-muted hover:text-primary'
                                            }
                                        `}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User info in mobile menu */}
                        {isAuthenticated && user && (
                            <div className="p-4 border-t border-border">
                                <div className="flex items-center gap-3">
                                    {user.avatar_url ? (
                                        <img 
                                            src={user.avatar_url} 
                                            alt={user.username}
                                            className="h-10 w-10 rounded-full"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            <User className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {user.username || user.email.split('@')[0]}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
