import { MotionGenerator } from "@/components/generators/MotionGenerator"
import Header from "@/components/layout/Header"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Motion Control | Trạm Sáng Tạo",
    description: "Chuyển động từ video mẫu sang hình ảnh nhân vật",
}

export default function MotionPage() {
    return (
        <div className="flex flex-col h-screen bg-background-dark overflow-hidden">
            <Header />
            <main className="flex-1 overflow-hidden">
                <MotionGenerator />
            </main>
        </div>
    )
}
