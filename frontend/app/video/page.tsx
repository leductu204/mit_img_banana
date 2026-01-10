"use client"

import { Suspense } from "react"
import { VideoGenerator } from "@/components/generators/VideoGenerator"
import Header from "@/components/layout/Header"

export default function CreateVideoPage() {
    return (
            <div className="flex flex-col h-screen bg-background-dark overflow-hidden font-sans">
                <Header />
                <main className="flex-1 overflow-auto">
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-white">Loading...</div>}>
                        <VideoGenerator />
                    </Suspense>
                </main>
            </div>
    )
}
