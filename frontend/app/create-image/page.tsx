import { ImageGenerator } from "@/components/generators/ImageGenerator"

import Sidebar from "@/components/layout/Sidebar"
import MobileNav from "@/components/layout/MobileNav"

export default function CreateImagePage() {
    return (
        <div className="flex min-h-screen bg-background">
            <MobileNav />
            <Sidebar />
            <main className="flex-1 pt-[57px] md:pt-0">
                <ImageGenerator />
            </main>
        </div>
    )
}
