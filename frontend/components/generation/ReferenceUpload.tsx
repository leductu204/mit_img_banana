"use client"

import { Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { useCallback, useState } from "react"
import { cn } from "@/lib/utils/cn"

interface ReferenceUploadProps {
  images: File[]
  setImages: (images: File[]) => void
}

export function ReferenceUpload({ images, setImages }: ReferenceUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const maxImages = 5

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
      setImages([...images, ...newFiles].slice(0, maxImages))
    }
  }, [images, setImages])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'))
      setImages([...images, ...newFiles].slice(0, maxImages))
    }
  }

  const removeImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    setImages(newImages)
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-brand-primary" />
        Reference Images
        <span className="text-xs font-normal text-text-muted">(Optional)</span>
      </label>
      
      {/* Upload Zone */}
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group",
          isDragging 
            ? "border-brand-primary bg-brand-primary/5" 
            : "border-border-primary hover:border-brand-primary/50 hover:bg-glass-hover"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
          max={maxImages}
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-4 rounded-xl bg-brand-primary/10 flex items-center justify-center group-hover:scale-120 transition-transform">
            <Upload className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">
              Drop images here or click to upload
            </p>
            <p className="text-xs text-text-muted">
              Up to {maxImages} images • PNG, JPG, WEBP
            </p>
          </div>
        </div>
      </div>
      
      {/* Image Previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((file, idx) => (
            <div key={idx} className="relative group">
              <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-border-primary hover:border-brand-primary transition-all">
                <img 
                  src={URL.createObjectURL(file)} 
                  alt={`Reference ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Remove Button */}
              <button 
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent-red flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
