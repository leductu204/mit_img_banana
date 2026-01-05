"use client"

import Header from "@/components/layout/Header"
import { cn } from "@/lib/utils"
import { ExternalLink, Play, Info, Download, Music, Shirt, Film, FileText, Layout, Code } from "lucide-react"
import Link from "next/link"

interface Tool {
    id: string
    title: string
    description: string
    image: string
    badge: "FREE" | "PAID"
    price?: string
    author: {
        name: string
        avatar: string
    }
    link: string
    icon: any
}

const TOOLS: Tool[] = [
    {
        id: "sora-downloader",
        title: "Sora Downloader",
        description: "Tải video từ Sora.me không có hình mờ (watermark) với chất lượng cao nhất.",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop",
        badge: "FREE",
        author: {
            name: "ĐỨC TÚ",
            avatar: "https://unavatar.io/github/shadcn"
        },
        link: "/sora",
        icon: Download
    },
    {
        id: "ai-fashion",
        title: "AI Fashion Affiliate",
        description: "Giúp tạo ảnh, tạo KOC, tạo video review làm Affiliate nhanh chóng.",
        image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1887&auto=format&fit=crop",
        badge: "FREE",
        author: {
            name: "Tu AI",
            avatar: "https://unavatar.io/twitter/tuanai"
        },
        link: "/studio?category=fashion&feature=fashion-studio",
        icon: Shirt
    },
    {
        id: "video-demo",
        title: "Tạo Video Demo",
        description: "Công cụ giúp bạn tạo các video demo sản phẩm, giới thiệu tính năng một cách chuyên nghiệp.",
        image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2071&auto=format&fit=crop",
        badge: "FREE",
        author: {
            name: "Tram Sang Tao",
            avatar: "https://unavatar.io/github/shadcn"
        },
        link: "video",
        icon: Film
    },
    {
        id: "ai-art-studio",
        title: "AI Art Studio",
        description: "AI Art Studio - Thay đổi hình ảnh của bạn theo các phong cách điện ảnh nhất hiện nay.",
        image: "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=1974&auto=format&fit=crop",
        badge: "FREE",
        author: {
            name: "ĐỨC TÚ",
            avatar: "https://unavatar.io/twitter/finkd"
        },
        link: "/studio",
        icon: Layout
    },
    {
        id: "api-docs",
        title: "API Docs",
        description: "Hướng dẫn tích hợp API - AI AUTO. Cung cấp danh sách các API hệ thống cho nhà phát triển.",
        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop",
        badge: "FREE",
        author: {
            name: "Admin",
            avatar: "https://unavatar.io/twitter/finkd"
        },
        link: "/docs",
        icon: Code
    }
]

function ToolCard({ tool }: { tool: Tool }) {
    const Icon = tool.icon
    
    return (
        <Link 
            href={tool.link}
            className="group relative flex flex-col bg-[#111827] rounded-[24px] overflow-hidden border border-white/5 hover:border-[#00BCD4]/30 transition-all duration-300 shadow-lg hover:shadow-[#00BCD4]/10 hover:-translate-y-1"
        >
            {/* Top Image Section */}
            <div className="relative h-[200px] overflow-hidden">
                <img 
                    src={tool.image} 
                    alt={tool.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent opacity-60"></div>
                
                {/* Badge */}
                <div className="absolute top-4 right-4">
                    {tool.badge === "FREE" ? (
                        <span className="px-3 py-1 rounded-lg bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold border border-[#10B981]/20 backdrop-blur-md">
                            MIỄN PHÍ
                        </span>
                    ) : (
                        <span className="px-3 py-1 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-bold border border-[#F59E0B]/20 backdrop-blur-md">
                            {tool.price}
                        </span>
                    )}
                </div>

                {/* Center Icon Overlay on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="size-12 rounded-full bg-[#00BCD4] flex items-center justify-center shadow-lg shadow-[#00BCD4]/40">
                        <Icon className="text-white w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Bottom Content Section */}
            <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="space-y-1.5 flex-1">
                    <h3 className="text-white text-lg font-bold group-hover:text-[#00BCD4] transition-colors">
                        {tool.title}
                    </h3>
                    <p className="text-[#9CA3AF] text-sm line-clamp-2 leading-relaxed">
                        {tool.description}
                    </p>
                </div>

                {/* Author Info */}
                <div className="pt-4 border-t border-white/5 flex items-center gap-2.5">
                    <div className="size-6 rounded-full overflow-hidden ring-1 ring-white/10">
                        <img 
                            src={tool.author.avatar} 
                            alt={tool.author.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <span className="text-[#6B7280] text-[11px] font-medium uppercase tracking-tight">
                        {tool.author.name}
                    </span>
                </div>
            </div>
        </Link>
    )
}

export default function ToolsPage() {
    return (
        <div className="min-h-screen bg-[#0A0E13]">
            <Header />
            
            <main className="max-w-[1400px] mx-auto px-6 py-12">
                <div className="flex flex-col gap-2 mb-12">
                    <div className="flex items-center gap-2 text-[#00BCD4] text-sm font-bold uppercase tracking-widest">
                        <Layout className="w-4 h-4" />
                        Tiện ích & Công cụ
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Khám phá hệ sinh thái AI
                    </h1>
                    <p className="text-[#9CA3AF] max-w-2xl text-lg">
                        Tăng tốc quy trình làm việc của bạn với bộ công cụ AI chuyên dụng từ StudioGen và cộng đồng.
                    </p>
                </div>

                {/* Search & Filter Bar (Optional visual) */}
                <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/5">
                    <div className="flex gap-4">
                        <button className="px-6 py-2.5 rounded-xl bg-[#00BCD4] text-white text-sm font-bold shadow-lg shadow-[#00BCD4]/20 transition-all">
                            Tất cả
                        </button>
                        <button className="px-6 py-2.5 rounded-xl bg-[#1F2937] text-[#9CA3AF] text-sm font-bold hover:text-white transition-all">
                            Miễn phí
                        </button>
                        <button className="px-6 py-2.5 rounded-xl bg-[#1F2937] text-[#9CA3AF] text-sm font-bold hover:text-white transition-all">
                            Trả phí
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {TOOLS.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                    ))}
                </div>
            </main>
        </div>
    )
}
