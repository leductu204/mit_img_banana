import { ImageGenerator } from "@/components/generators/ImageGenerator"

import Sidebar from "@/components/layout/Sidebar"

export default function CreateImagePage() {
    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1">
                <ImageGenerator />
            </main>
        </div>
    )
}
