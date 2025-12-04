"use client"

import { Download, RefreshCw, Wand2, Eye, Share2 } from "lucide-react"

interface ResultDisplayProps {
  image: {
    image_url?: string
    job_id: string
    status: string
  }
  onDownload?: () => void
  onRefresh?: () => void
}

export function ResultDisplay({ image, onDownload, onRefresh }: ResultDisplayProps) {
  const handleDownload = async () => {
    if (onDownload) {
      onDownload()
      return
    }
    
    if (!image.image_url) return

    try {
      const response = await fetch(image.image_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `generated-image-${Date.now()}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  if (!image.image_url) return null

  return (
    <div className="w-full max-w-5xl animate-fade-in">
      {/* Image Container */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-border-primary shadow-2xl mb-8 group bg-bg-secondary">
        {/* Main Image */}
        <img 
          src={image.image_url} 
          alt="Generated image"
          className="w-full h-auto"
        />
        
        {/* Hover Overlay with Quick Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
          <div className="flex gap-4 w-full">
            <button className="flex-1 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white font-medium transition-all flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg">
              <Eye className="w-5 h-5" />
              View Full
            </button>
            <button className="flex-1 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white font-medium transition-all flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg">
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center mb-8">
        <button
          onClick={handleDownload}
          className="btn-base btn-primary px-8 py-4 text-lg shadow-glow-pink"
        >
          <Download className="w-6 h-6 mr-2" />
          Download Image
        </button>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-base btn-secondary px-8 py-4 text-lg border-border-primary hover:border-brand-primary/50"
          >
            <RefreshCw className="w-6 h-6 mr-2" />
            Regenerate
          </button>
        )}
        
        <button
          className="btn-base btn-secondary px-8 py-4 text-lg border-border-primary hover:border-brand-primary/50"
        >
          <Wand2 className="w-6 h-6 mr-2" />
          Create Variation
        </button>
      </div>
    </div>
  )
}
