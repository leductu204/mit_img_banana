import React from 'react';
import Link from 'next/link';
import { Sparkles, Video } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Sidebar() {
    return (
        <aside className="w-64 bg-card border-r border-border h-full p-4 hidden md:block">
            <div className="mb-8 px-2">
                <h1 className="text-xl font-bold text-foreground">MIT Img Video</h1>
            </div>
            <nav className="flex flex-col space-y-2">
                <Link href="/create-image" className="flex items-center gap-2 hover:bg-muted p-2 rounded text-foreground hover:text-primary transition-colors">
                    <Sparkles className="h-4 w-4" />
                    Tạo ảnh
                </Link>
                <Link href="/create-image" className="flex items-center gap-2 hover:bg-muted p-2 rounded text-foreground hover:text-primary transition-colors">
                    <Sparkles className="h-4 w-4" />
                    Kho Prompt Mẫu
                </Link>
                <Link href="/create-video" className="flex items-center gap-2 hover:bg-muted p-2 rounded text-foreground hover:text-primary transition-colors">
                    <Video className="h-4 w-4" />
                    Tạo Video
                </Link>
            </nav>
            
            <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium text-foreground">Giao diện</span>
                    <ThemeToggle />
                </div>
            </div>
        </aside>
    );
}
