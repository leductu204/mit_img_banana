"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Video, Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function MobileNav() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold text-foreground">MIT Img Video</h1>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
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
                            <Link 
                                href="/create-image" 
                                className="flex items-center gap-2 hover:bg-muted p-3 rounded-lg text-foreground hover:text-primary transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                <Sparkles className="h-4 w-4" />
                                Tạo ảnh
                            </Link>
                            <Link 
                                href="/create-image" 
                                className="flex items-center gap-2 hover:bg-muted p-3 rounded-lg text-foreground hover:text-primary transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                <Sparkles className="h-4 w-4" />
                                Kho Prompt Mẫu
                            </Link>
                            <Link 
                                href="/create-video" 
                                className="flex items-center gap-2 hover:bg-muted p-3 rounded-lg text-foreground hover:text-primary transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                <Video className="h-4 w-4" />
                                Tạo Video
                            </Link>
                            
                            <div className="pt-4 mt-4 border-t border-border">
                                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                    <span className="text-sm font-medium text-foreground">Giao diện</span>
                                    <ThemeToggle />
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
}
