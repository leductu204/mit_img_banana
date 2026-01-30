import { MotionGenerator } from "@/components/generators/MotionGenerator"
import Header from "@/components/layout/Header"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Motion Control | Trạm Sáng Tạo",
    description: "Chuyển động từ video mẫu sang hình ảnh nhân vật",
}

export default function MotionPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background-dark">
            <Header />
            <main className="flex-1">
                <MotionGenerator />
            </main>
        </div>
    )
}
