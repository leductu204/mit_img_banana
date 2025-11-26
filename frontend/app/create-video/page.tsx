import { VideoGenerator } from "@/components/generators/VideoGenerator"
import Sidebar from "@/components/layout/Sidebar"

export default function CreateVideoPage() {
    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1">
                <VideoGenerator />
            </main>
        </div>
    )
}
