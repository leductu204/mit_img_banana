"use client"

import { VideoGenerator } from "@/components/generators/VideoGenerator"
import Header from "@/components/layout/Header"
import ProtectedRoute from "@/components/auth/ProtectedRoute"

export default function CreateVideoPage() {
    return (
            <div className="flex flex-col h-screen bg-background-dark overflow-hidden font-sans">
                <Header />
                <main className="flex-1 overflow-auto">
                    <VideoGenerator />
                </main>
            </div>
    )
}
