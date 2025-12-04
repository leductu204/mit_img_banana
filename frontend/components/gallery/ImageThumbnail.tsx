"use client"

import { Eye } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface ImageThumbnailProps {
  image: {
    url: string
    prompt: string
    timestamp: string
    thumbnail?: string
  }
  onClick: () => void
}

export function ImageThumbnail({ image, onClick }: ImageThumbnailProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full h-full cursor-pointer focus:outline-none"
    >
      {/* Image Container */}
      <div className="w-full h-full rounded-xl overflow-hidden border-2 border-border-primary group-hover:border-brand-primary transition-all duration-300 shadow-md group-hover:shadow-glow">
        <img 
          src={image.thumbnail || image.url} 
          alt={image.prompt}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-bg-primary/90 via-bg-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-medium text-white/90 truncate max-w-[70%]">
            {image.timestamp}
          </span>
          <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Eye className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </button>
  )
}
