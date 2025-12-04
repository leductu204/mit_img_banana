"use client"

import Link from "next/link"
import { Sparkles, Menu } from "lucide-react"
import { useState } from "react"
import { MobileNav } from "@/components/layout/MobileNav"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-18 z-50 backdrop-blur-xl bg-bg-secondary/80 border-b border-border-primary px-6 md:px-8 flex items-center justify-between shadow-lg shadow-brand-primary/5">
        {/* Left Section */}
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow group-hover:shadow-glow-pink transition-shadow duration-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">
              MIT Nano Img
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link 
              href="/create" 
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-primary bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 transition-all"
            >
              Tạo ảnh
            </Link>
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden p-2 rounded-lg hover:bg-glass-hover transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6 text-text-primary" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  )
}
