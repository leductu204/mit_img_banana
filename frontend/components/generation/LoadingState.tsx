"use client"

import { Sparkles } from "lucide-react"

export function LoadingState() {
  return (
    <div className="text-center animate-fade-in">
      {/* Animated Loader */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-brand-primary/20" />
        
        {/* Spinning gradient ring */}
        <div 
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-primary border-r-brand-secondary animate-spin shadow-glow" 
          style={{ animationDuration: '1.5s' }}
        />
        
        {/* Inner circle with icon */}
        <div className="absolute inset-4 rounded-full bg-bg-secondary flex items-center justify-center animate-pulse border border-brand-primary/30">
          <Sparkles className="w-10 h-10 text-brand-primary" />
        </div>
      </div>
      
      {/* Status Text */}
      <h3 className="text-2xl font-bold text-text-primary mb-3">
        Generating Your Image
      </h3>
      <p className="text-text-secondary mb-8">
        This usually takes 10-30 seconds
      </p>
      
      {/* Progress Bar */}
      <div className="max-w-md mx-auto space-y-3">
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden border border-border-primary">
          <div 
            className="h-full bg-brand-gradient rounded-full animate-shimmer w-2/3 shadow-glow"
          />
        </div>
        <div className="flex justify-between text-xs text-text-muted">
          <span>Processing...</span>
          <span className="text-brand-primary font-medium">AI Working</span>
        </div>
      </div>
      
      {/* Fun Fact */}
      <div className="mt-8 max-w-lg mx-auto px-6 py-4 rounded-xl bg-bg-secondary/50 border border-brand-primary/20 backdrop-blur-sm">
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-brand-secondary">Did you know?</span> Our AI processes millions of parameters to create your unique image
        </p>
      </div>
    </div>
  )
}
