import React from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';

export default function Header() {
    return (
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">MIT Nano Img</h1>
            <nav>
                <Link href="/" className="mr-4 hover:underline">Trang chủ</Link>
                <Link href="/create-image" className="mr-4 hover:underline">Tạo ảnh</Link>
                {/* <Link href="/create-video" className="hover:underline">Create Video</Link> */}
            </nav>
        </header>
    );
}
