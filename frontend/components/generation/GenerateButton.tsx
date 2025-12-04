"use client"

import { Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface GenerateButtonProps {
  onClick: () => void
  loading: boolean
  disabled: boolean
}

export function GenerateButton({ onClick, loading, disabled }: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "generate-btn",
        (disabled || loading) && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Background Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shimmer" />
      
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          <span>Generate Image</span>
        </>
      )}
      
      {/* Glow Ring */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-300" />
    </button>
  )
}
