"use client"

import { PenTool } from "lucide-react"

interface PromptSectionProps {
  prompt: string
  setPrompt: (value: string) => void
}

export function PromptSection({ prompt, setPrompt }: PromptSectionProps) {
  const maxLength = 500
  const isNearLimit = prompt.length > 450

  const handleRandom = () => {
    const examples = [
      "A futuristic city with neon lights and flying cars, cyberpunk style, highly detailed, 8k",
      "A serene mountain landscape at sunset with a lake reflection, oil painting style",
      "Portrait of a wise old wizard with a glowing staff, fantasy art, digital painting",
      "A cute robot gardening in a greenhouse, pixar style, vibrant colors"
    ]
    const random = examples[Math.floor(Math.random() * examples.length)]
    setPrompt(random)
  }

  const handleEnhance = () => {
    if (!prompt) return
    setPrompt(prompt + ", highly detailed, 8k, masterpiece, professional lighting")
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <PenTool className="w-4 h-4 text-brand-primary" />
        Prompt
      </label>
      
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to create..."
          className="w-full min-h-[140px] px-4 py-3.5 rounded-xl bg-bg-tertiary border border-border-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 resize-none transition-all custom-scrollbar"
          maxLength={maxLength}
        />
        
        {/* Character Counter Overlay */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-bg-primary/80 backdrop-blur-sm border border-border-primary">
          <span className={`text-xs font-medium ${
            isNearLimit 
              ? 'text-accent-amber' 
              : 'text-text-muted'
          }`}>
            {prompt.length} / {maxLength}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button 
          onClick={handleEnhance}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-elevated hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary hover:border-brand-primary/50 transition-all cursor-pointer"
        >
          ✨ Enhance Prompt
        </button>
        <button 
          onClick={handleRandom}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-elevated hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary hover:border-brand-primary/50 transition-all cursor-pointer"
        >
          🎲 Random
        </button>
      </div>
    </div>
  )
}
