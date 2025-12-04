"use client"

import { useState } from "react"
import { cn } from "@/lib/utils/cn"
import { Sparkles, Zap, ChevronDown, Check, Cpu } from "lucide-react"

interface Model {
  id: string
  name: string
  description: string
  icon: typeof Sparkles
  isPro: boolean
}

const models: Model[] = [
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    description: 'Fast & Quality',
    icon: Zap,
    isPro: false
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    description: 'High Quality • 1K/2K/4K',
    icon: Sparkles,
    isPro: true
  },
]

interface ModelSelectorProps {
  model: string
  setModel: (model: string) => void
}

export function ModelSelector({ model, setModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedModel = models.find(m => m.id === model) || models[0]

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Cpu className="w-4 h-4 text-brand-primary" />
        Model
      </label>
      
      {/* Custom Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="model-selector group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors duration-200">
              <selectedModel.icon className="w-5 h-5 text-brand-primary group-hover:scale-110 transition-transform duration-200" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                {selectedModel.name}
                {selectedModel.isPro && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-gradient-to-r from-brand-secondary to-accent-amber text-white shadow-glow-pink">
                    PRO
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted group-hover:text-text-secondary transition-colors duration-200">
                {selectedModel.description}
              </div>
            </div>
          </div>
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-text-muted group-hover:text-brand-primary transition-all duration-300",
              isOpen && "rotate-180 text-brand-primary"
            )}
          />
        </button>
        
        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            <div className="absolute top-full left-0 right-0 mt-2 glass-card border border-border-primary overflow-hidden z-20 animate-slide-up bg-bg-secondary/95 backdrop-blur-xl">
              {models.map((modelOption) => (
                <button
                  key={modelOption.id}
                  onClick={() => {
                    setModel(modelOption.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "model-option",
                    model === modelOption.id && "model-option-selected"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                    <modelOption.icon className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-semibold transition-colors",
                        model === modelOption.id ? "text-brand-primary" : "text-text-primary"
                      )}>
                        {modelOption.name}
                      </span>
                      {modelOption.isPro && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-gradient-to-r from-brand-secondary to-accent-amber text-white">
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {modelOption.description}
                    </div>
                  </div>
                  {model === modelOption.id && (
                    <Check className="w-5 h-5 text-brand-primary" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
