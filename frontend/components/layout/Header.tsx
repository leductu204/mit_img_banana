import React from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Header() {
    return (
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="h-8 w-8 rounded-lg bg-white/20 p-1"
                />
                <h1 className="text-2xl font-bold">Trạm sáng tạo</h1>
            </div>
            <div className="flex items-center gap-4">
                <nav>
                    <Link href="/" className="mr-4 hover:underline">Trang chủ</Link>
                    <Link href="/create-image" className="mr-4 hover:underline">Tạo ảnh</Link>
                    <Link href="/create-video" className="hover:underline">Tạo video</Link>
                </nav>
                <ThemeToggle />
            </div>
        </header>
    );
}
