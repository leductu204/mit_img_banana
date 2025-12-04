"use client"

import { useState } from "react"
import { cn } from "@/lib/utils/cn"
import { Square, RectangleHorizontal, RectangleVertical, Settings2, Check, ChevronDown } from "lucide-react"

interface SettingsSectionProps {
  aspectRatio: string
  setAspectRatio: (ratio: string) => void
  quality: string
  setQuality: (quality: string) => void
  model: string
}

const aspectRatios = [
  { value: '1:1', label: '1:1', icon: Square },
  { value: '16:9', label: '16:9', icon: RectangleHorizontal },
  { value: '9:16', label: '9:16', icon: RectangleVertical },
]

const qualities = ['1K', '2K', '4K']

export function SettingsSection({ 
  aspectRatio, 
  setAspectRatio,
  quality,
  setQuality,
  model
}: SettingsSectionProps) {
  const [isQualityOpen, setIsQualityOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Aspect Ratio */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-brand-primary" />
          Aspect Ratio
        </label>
        <div className="grid grid-cols-3 gap-2">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => setAspectRatio(ratio.value)}
              className={cn(
                "ratio-button group",
                aspectRatio === ratio.value && "ratio-button-selected"
              )}
            >
              <ratio.icon className={cn(
                "w-5 h-5 transition-transform duration-200",
                aspectRatio === ratio.value ? "scale-110" : "group-hover:scale-105"
              )} />
              <span className="text-xs font-semibold">{ratio.label}</span>
              {aspectRatio === ratio.value && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary flex items-center justify-center shadow-glow-pink animate-fade-in z-10">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quality Selector - Dropdown - Only for Pro models */}
      {model.includes('pro') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-brand-primary" />
              Quality
            </label>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-primary/20 text-brand-primary border border-brand-primary/20">
              PRO
            </span>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsQualityOpen(!isQualityOpen)}
              className="quality-dropdown group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">{quality}</span>
                <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors">
                  {quality === '1K' ? 'Standard' : quality === '2K' ? 'High Detail' : 'Ultra HD'}
                </span>
              </div>
              <ChevronDown 
                className={cn(
                  "w-4 h-4 text-text-muted group-hover:text-brand-primary transition-all duration-300",
                  isQualityOpen && "rotate-180 text-brand-primary"
                )}
              />
            </button>

            {isQualityOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setIsQualityOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 glass-card border border-border-primary overflow-hidden z-20 animate-slide-up bg-bg-secondary/95 backdrop-blur-xl">
                  {qualities.map((qual) => (
                    <button
                      key={qual}
                      onClick={() => {
                        setQuality(qual)
                        setIsQualityOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 hover:bg-brand-primary/10 transition-all duration-200 border-l-2 border-transparent cursor-pointer",
                        quality === qual && "bg-brand-primary/5 border-brand-primary"
                      )}
                    >
                      <div className="flex flex-col items-start">
                        <span className={cn(
                          "text-sm font-bold transition-colors",
                          quality === qual ? "text-brand-primary" : "text-text-primary"
                        )}>
                          {qual}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {qual === '1K' ? 'Standard' : qual === '2K' ? 'High Detail' : 'Ultra HD'}
                        </span>
                      </div>
                      {quality === qual && (
                        <Check className="w-4 h-4 text-brand-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
