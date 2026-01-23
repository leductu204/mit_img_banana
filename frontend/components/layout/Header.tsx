"use client";

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { CreditCard, ChevronDown, Coins } from "lucide-react"
import { useCredits } from "@/hooks/useCredits"
import { useAuth } from "@/hooks/useAuth"
import { LoginModal } from "@/components/auth/LoginModal"

export default function Header() {
  const pathname = usePathname()
  const { balance } = useCredits()
  const { user, isAuthenticated } = useAuth()
  
  const navItems = [
    { name: "Trang chủ", href: "/" },
    { name: "Ảnh", href: "/image" },
    { name: "Video", href: "/video" },
    { name: "Motion Control", href: "/motion-control" },
    { name: "Studio", href: "/studio" },
    { name: "Tiện ích", href: "/tools" },
  ]

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0A0E13]/90 backdrop-blur-md px-6 py-3 h-[72px]">
      <Link href="/" className="flex items-center gap-3 text-white">
        <div className="relative size-9">
          <Image src="/icon.png" alt="Logo" fill className="object-contain" />
        </div>
        <h2 className="text-white text-2xl font-bold tracking-tight">Trạm Sáng Tạo</h2>
      </Link>

      <nav className="hidden md:flex flex-1 justify-center gap-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "text-sm font-medium transition-all relative py-1",
                isActive 
                  ? "text-[#00BCD4] font-bold after:absolute after:bottom-[-24px] after:left-0 after:h-[2px] after:w-full after:bg-[#00BCD4]" 
                  : "text-[#B0B8C4] hover:text-white"
              )}
            >
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-3">
        {/* Language Selector */}
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#252D3D] text-[#B0B8C4] hover:bg-[#2A3245] transition-colors text-sm font-medium">
          VI
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Pricing Button */}
        <Link 
          href="/pricing"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white font-semibold text-sm hover:from-[#FBBF24] hover:to-[#F59E0B] transition-all shadow-lg shadow-orange-500/20"
        >
          <CreditCard className="w-4 h-4" />
          Bảng giá
        </Link>

        {/* Credits Display */}
        {isAuthenticated && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#252D3D] text-sm">
            <span className="text-[#6B7280]">SỐ DƯ</span>
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-[#00BCD4]" />
              <span className="text-white font-semibold">{balance}</span>
            </div>
          </div>
        )}

        {/* User Avatar or Login Button */}
        {isAuthenticated ? (
          <Link href="/account">
            <div 
              className="h-10 w-10 rounded-full bg-cover bg-center border-2 border-white/10 cursor-pointer hover:border-[#00BCD4] transition-colors overflow-hidden"
              style={{ 
                backgroundImage: user?.avatar_url 
                  ? `url('${user.avatar_url}')` 
                  : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB1KxYmdvPTReXmusUu1jCkzaaZmGIiBSY-a59exHdU6qN-sKGwIc-TYs-IkSV92P57e9_NQCiCPvmc8c_yyOcCCPqDMd2q4INysTASevcJZyQeYNIEf9-0U7JFyS3kc5LdqMOTusXt_DuYMNobC2HIKgawNPUrpUb5jWv7Uelfe0PBsQ6szvupgEPK5gymWgOV155NXImA7hS-PXkrKtdoPOe6qTQRVAwSog1DrrG6JfqARJu8M7nw-sCSpbUXe98XVxGSiDpYqkg')" 
              }}
            />
          </Link>
        ) : (
          <LoginModal>
            <button className="px-5 py-2 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-colors">
              Đăng nhập
            </button>
          </LoginModal>
        )}
      </div>
    </header>
  )
}
