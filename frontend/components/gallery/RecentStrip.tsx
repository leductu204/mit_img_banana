"use client"

import { Clock, ImageIcon, ChevronRight } from "lucide-react"
import { ImageThumbnail } from "./ImageThumbnail"
import { cn } from "@/lib/utils/cn"

interface RecentStripProps {
  images: Array<{
    url: string
    prompt: string
    timestamp: string
    model: string
    aspectRatio: string
    quality?: string
  }>
  onImageClick: (image: any) => void
}

export function RecentStrip({ images, onImageClick }: RecentStripProps) {
  return (
    <div className="relative w-full h-[180px]">
      {/* Glass Background with Purple Tint */}
      <div className="absolute inset-0 glass-card border-0 border-t border-border-primary bg-bg-secondary/80 backdrop-blur-xl" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="px-8 py-3 flex items-center justify-between border-b border-border-secondary/50">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            Recent Generations
          </h3>
          {images.length > 0 && (
            <button className="text-xs font-medium text-brand-primary hover:text-brand-secondary transition-colors flex items-center gap-1 group">
              View All 
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-x-auto custom-scrollbar px-8 py-4">
          {images.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="w-10 h-10 mb-3 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center border border-brand-primary/20">
                <ImageIcon className="w-5 h-5 text-brand-primary" />
              </div>
              <p className="text-sm font-medium text-text-primary">No generations yet</p>
              <p className="text-xs text-text-muted mt-1">
                Your recent images will appear here
              </p>
            </div>
          ) : (
            /* Thumbnail Grid */
            <div className="flex gap-4 h-full items-center">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  className="w-28 h-28 shrink-0 animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <ImageThumbnail 
                    image={img}
                    onClick={() => onImageClick(img)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
