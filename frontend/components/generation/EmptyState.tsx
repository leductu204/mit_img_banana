"use client"

import { Sparkles, Mountain, Building, User, ArrowRight } from "lucide-react"

interface EmptyStateProps {
  setPrompt: (prompt: string) => void
}

const examples = [
  {
    text: 'A serene mountain landscape at sunset, oil painting style',
    icon: Mountain
  },
  {
    text: 'Futuristic cyberpunk city with neon lights and flying cars',
    icon: Building
  },
  {
    text: 'Portrait of a wise old wizard with glowing staff, fantasy art',
    icon: User
  }
]

export function EmptyState({ setPrompt }: EmptyStateProps) {
  return (
    <div className="text-center max-w-2xl animate-fade-in">
      {/* Hero Icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 mx-auto rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow animate-glow">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        {/* Floating particles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 pointer-events-none">
          <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-brand-primary/50 animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="absolute top-4 right-0 w-1.5 h-1.5 rounded-full bg-brand-secondary/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-0 left-4 w-1 h-1 rounded-full bg-brand-tertiary/50 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>
      
      {/* Heading */}
      <h2 className="text-4xl font-extrabold text-gradient mb-4 tracking-tight">
        Create Your AI Masterpiece
      </h2>
      
      {/* Description */}
      <p className="text-lg text-text-secondary mb-8 leading-relaxed max-w-lg mx-auto">
        Enter a detailed prompt to generate stunning, unique images powered by advanced AI
      </p>
      
      {/* Example Prompts */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-4">
          Try These Examples
        </p>
        <div className="grid gap-3">
          {examples.map((example, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(example.text)}
              className="group flex items-start gap-4 px-5 py-4 rounded-xl bg-bg-secondary border border-border-primary hover:border-brand-primary/50 hover:bg-bg-elevated text-left transition-all hover-lift shadow-sm hover:shadow-glow"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                <example.icon className="w-5 h-5 text-brand-primary" />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors font-medium">
                  {example.text}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-brand-primary/50 group-hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
