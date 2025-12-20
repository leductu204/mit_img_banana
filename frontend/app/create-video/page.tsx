"use client"

import { VideoGenerator } from "@/components/generators/VideoGenerator"
import Sidebar from "@/components/layout/Sidebar"
import MobileNav from "@/components/layout/MobileNav"
import ProtectedRoute from "@/components/auth/ProtectedRoute"

export default function CreateVideoPage() {
    return (
            <div className="flex min-h-screen bg-background">
                <MobileNav />
                <Sidebar />
                <main className="flex-1 pt-[57px] md:pt-0">
                    <VideoGenerator />
                </main>
            </div>
    )
}
