"use client"

import Link from "next/link"
import { X, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-[1040] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 w-[300px] bg-bg-secondary border-l border-border-primary z-[1050] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-6 border-b border-border-primary flex items-center justify-between bg-bg-primary/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gradient">Menu</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors border border-transparent hover:border-border-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-4">
          <Link 
            href="/create" 
            className="block px-4 py-3 rounded-xl bg-brand-primary/10 text-brand-primary font-medium border border-brand-primary/20 shadow-glow-pink"
            onClick={onClose}
          >
            Tạo ảnh
          </Link>
        </nav>

        <div className="p-6 border-t border-border-primary text-center text-xs text-text-muted bg-bg-primary/30">
          MIT Nano Img &copy; 2025
        </div>
      </div>
    </>
  )
}
