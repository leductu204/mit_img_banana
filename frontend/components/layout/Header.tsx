"use client";

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { CreditCard, ChevronDown, Coins, Menu, X, Sparkles, Video, Palette, Wrench, Home, User, LogOut, Code } from "lucide-react"
import { useCredits } from "@/hooks/useCredits"
import { useAuth } from "@/hooks/useAuth"
import { LoginModal } from "@/components/auth/LoginModal"

export default function Header() {
  const pathname = usePathname()
  const { balance } = useCredits()
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const navItems = [
    { name: "Trang chủ", href: "/", icon: Home },
    { name: "Ảnh", href: "/image", icon: Sparkles },
    { name: "Video", href: "/video", icon: Video },
    { name: "Motion Control", href: "/motion-control", icon: Video },
    { name: "Studio", href: "/studio", icon: Palette },
    { name: "API", href: "/docs", icon: Code },
    { name: "Tiện ích", href: "/tools", icon: Wrench },
  ]

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0A0E13]/95 backdrop-blur-md px-4 md:px-6 py-3 transition-all">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-white shrink-0">
          <div className="relative size-8 md:size-9">
            <Image src="/icon.png" alt="Logo" fill className="object-contain" />
          </div>
          <h2 className="text-white text-lg md:text-xl font-bold tracking-tight hidden sm:block">Trạm Sáng Tạo</h2>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 justify-center gap-1 xl:gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "px-3 xl:px-4 py-2 text-sm font-medium transition-all rounded-lg relative whitespace-nowrap",
                  isActive 
                    ? "text-[#00BCD4] bg-[#00BCD4]/10" 
                    : "text-[#B0B8C4] hover:text-white hover:bg-white/5"
                )}
              >
                {item.name}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#00BCD4] rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
          {/* Language Selector */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#252D3D] text-[#B0B8C4] hover:bg-[#2A3245] transition-colors text-sm font-medium min-h-[40px]">
            VI
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Pricing Button */}
          <Link 
            href="/pricing"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white font-semibold text-sm hover:from-[#FBBF24] hover:to-[#F59E0B] transition-all shadow-lg shadow-orange-500/20 min-h-[40px]"
          >
            <CreditCard className="w-4 h-4" />
            <span className="hidden xl:inline">Bảng giá</span>
          </Link>

          {/* Credits Display */}
          {isAuthenticated && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#252D3D] text-sm min-h-[40px]">
              <span className="text-[#6B7280] hidden xl:inline">SỐ DƯ</span>
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#00BCD4]" />
                <span className="text-white font-semibold tabular-nums">{balance.toLocaleString()}</span>
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
              <button className="px-5 py-2 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-colors min-h-[40px]">
                Đăng nhập
              </button>
            </LoginModal>
          )}
        </div>

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Credits */}
          {isAuthenticated && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#252D3D] text-xs">
              <Coins className="w-3.5 h-3.5 text-[#00BCD4]" />
              <span className="text-white font-semibold tabular-nums">{balance.toLocaleString()}</span>
            </div>
          )}
          
          {/* Hamburger Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl bg-[#252D3D] text-[#B0B8C4] hover:bg-[#2A3245] hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Panel */}
      <div 
        className={cn(
          "fixed top-[57px] left-0 right-0 z-50 bg-[#0A0E13] border-b border-white/10 shadow-2xl md:hidden transform transition-all duration-300 ease-out overflow-hidden",
          mobileMenuOpen ? "max-h-[calc(100vh-57px)] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={closeMobileMenu}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all min-h-[48px]",
                  isActive 
                    ? "text-[#00BCD4] bg-[#00BCD4]/10" 
                    : "text-[#B0B8C4] hover:text-white hover:bg-white/5 active:bg-white/10"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Mobile Menu Actions */}
        <div className="p-4 pt-0 space-y-3 border-t border-white/10 mt-2">
          {/* Pricing Link */}
          <Link 
            href="/pricing"
            onClick={closeMobileMenu}
            className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white font-semibold text-sm hover:from-[#FBBF24] hover:to-[#F59E0B] transition-all shadow-lg shadow-orange-500/20 min-h-[48px]"
          >
            <CreditCard className="w-4 h-4" />
            Xem bảng giá
          </Link>

          {/* User Section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1F2833] border border-white/10">
              <div 
                className="h-11 w-11 rounded-full bg-cover bg-center border-2 border-white/10 shrink-0"
                style={{ 
                  backgroundImage: user?.avatar_url 
                    ? `url('${user.avatar_url}')` 
                    : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB1KxYmdvPTReXmusUu1jCkzaaZmGIiBSY-a59exHdU6qN-sKGwIc-TYs-IkSV92P57e9_NQCiCPvmc8c_yyOcCCPqDMd2q4INysTASevcJZyQeYNIEf9-0U7JFyS3kc5LdqMOTusXt_DuYMNobC2HIKgawNPUrpUb5jWv7Uelfe0PBsQ6szvupgEPK5gymWgOV155NXImA7hS-PXkrKtdoPOe6qTQRVAwSog1DrrG6JfqARJu8M7nw-sCSpbUXe98XVxGSiDpYqkg')" 
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.username || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-[#6B7280] truncate">{user?.email}</p>
              </div>
              <div className="flex gap-2">
                <Link 
                  href="/account" 
                  onClick={closeMobileMenu}
                  className="p-2.5 rounded-lg bg-[#252D3D] text-[#B0B8C4] hover:text-white hover:bg-[#2A3245] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Tài khoản"
                >
                  <User className="w-4 h-4" />
                </Link>
                <button 
                  onClick={() => { logout(); closeMobileMenu(); }}
                  className="p-2.5 rounded-lg bg-[#252D3D] text-[#B0B8C4] hover:text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <LoginModal>
              <button 
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-colors min-h-[48px]"
                onClick={closeMobileMenu}
              >
                <User className="w-4 h-4" />
                Đăng nhập
              </button>
            </LoginModal>
          )}
        </div>
      </div>
    </>
  )
}
