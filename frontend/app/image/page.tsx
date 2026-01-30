import Header from "@/components/layout/Header"
import { ImageGenerator } from "@/components/generators/ImageGenerator"

export default function CreateImagePage() {
    return (
        <div className="flex flex-col min-h-screen bg-background-dark font-sans">
            <Header />
            <main className="flex-1">
                <ImageGenerator />
            </main>
        </div>
    )
}
