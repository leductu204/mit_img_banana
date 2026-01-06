"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Rocket, Check, ArrowRight, Zap, MousePointer, Search, ImageIcon, Loader2, Download, Share2, Heart, Sparkles, Flame } from "lucide-react"

export function HeroSection() {
  const [currentChar, setCurrentChar] = useState(0)
  const headline = "Tăng 100% hiệu suất"
  const [workflowStep, setWorkflowStep] = useState(0)
  const [typedPrompt, setTypedPrompt] = useState("")
  const promptText = "Tạo video review sản phẩm dép ..."

  useEffect(() => {
    if (currentChar < headline.length) {
      const timer = setTimeout(() => setCurrentChar((prev) => prev + 1), 100)
      return () => clearTimeout(timer)
    }
  }, [currentChar, headline.length])

  useEffect(() => {
    const stepDurations = [4000, 2500, 3500]
    const timer = setTimeout(() => {
      setWorkflowStep((prev) => (prev + 1) % 3)
      if (workflowStep === 2) setTypedPrompt("")
    }, stepDurations[workflowStep])
    return () => clearTimeout(timer)
  }, [workflowStep])

  useEffect(() => {
    if (workflowStep === 0 && typedPrompt.length < promptText.length) {
      const timer = setTimeout(() => {
        setTypedPrompt(promptText.substring(0, typedPrompt.length + 1))
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [workflowStep, typedPrompt])

  return (
    <section className="relative overflow-hidden pt-40 pb-20 sm:pt-48 sm:pb-28">
      <div className="absolute top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
            <span className="italic bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              StudioAI cho
            </span>
            <br />
            <span className="italic gradient-text">Affiliate & Creator</span>
          </h1>

            <div className="flex items-center gap-2 mb-8">
              <Zap className="w-8 h-8 text-warning fill-warning" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gradient-gold pb-1">
                {headline.substring(0, currentChar)}
                <span className="animate-pulse">|</span>
              </h2>
            </div>
  
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
            <div className="feature-pill flex items-center gap-3 px-5 py-3 rounded-full hover:scale-105 transition-transform duration-300 hover:shadow-lg hover:border-primary/20 cursor-default">
              <Check className="w-5 h-5 text-success" />
              <span className="text-foreground">1 ảnh</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">100 video review</span>
            </div>
            <div className="feature-pill flex items-center gap-3 px-5 py-3 rounded-full hover:scale-105 transition-transform duration-300 hover:shadow-lg hover:border-primary/20 cursor-default">
              <Check className="w-5 h-5 text-success" />
              <span className="text-foreground">1 prompt</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">1.000 ảnh đẹp</span>
            </div>
          </div>

          <p className="text-muted-foreground text-lg mb-10">Tiết kiệm 60% chi phí sản xuất content</p>

          <Button
            size="lg"
            className="btn-coral gap-3 font-bold text-lg h-14 px-10 rounded-full text-foreground"
            asChild
          >
            <a href="/login">
              <Rocket className="h-5 w-5" />
              Sử dụng ngay
            </a>
          </Button>
          </div>
  
          {/* Workflow Mockup - Right Column */}
          <div className="mt-12 lg:mt-0 relative">
            <div className="relative rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-xl overflow-hidden scale-90 sm:scale-100 origin-center lg:origin-top-right">
            {/* Mockup header bar */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-background-dark border-b border-border flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-success" />
              </div>
              <span className="text-xs text-muted-foreground ml-2">WORKFLOW TỰ ĐỘNG</span>
            </div>

            <div className="mt-6">
              {/* Step indicators */}
              <div className="flex items-center justify-center gap-4 mb-8">
                {["Nhập prompt", "AI xử lý", "Xuất video"].map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                        workflowStep === i
                          ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/50"
                          : workflowStep > i
                            ? "bg-success text-success-foreground"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {workflowStep > i ? "✓" : i + 1}
                    </div>
                    <span
                      className={`text-sm transition-colors ${workflowStep === i ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {label}
                    </span>
                    {i < 2 && <div className="w-12 h-0.5 bg-border mx-2" />}
                  </div>
                ))}
              </div>

              {/* Animated content area - Adjusted height */}
              <div className="relative min-h-[450px]">
                {/* Step 0: Input prompt */}
                <div
                  className={`absolute inset-0 transition-all duration-500 flex items-center justify-center ${workflowStep === 0 ? "opacity-100 translate-y-0 z-20" : "opacity-0 translate-y-4 pointer-events-none z-0"}`}
                >
                  <div className="w-full max-w-2xl bg-background-dark rounded-xl p-6 border border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                        <span className="text-foreground text-lg">✍️</span>
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Nhập ý tưởng của bạn</p>
                        <p className="text-muted-foreground text-sm">AI sẽ tự động tạo content</p>
                      </div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 border border-border/50">
                      <p className="text-foreground/80 font-mono">
                        {typedPrompt}
                        <span className="animate-pulse text-primary">|</span>
                      </p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {["🎬 Video", "📸 Ảnh", "✨ Style UGC"].map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-secondary rounded-full text-xs text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 1: Processing */}
                <div
                  className={`absolute inset-0 transition-all duration-500 flex items-center justify-center ${workflowStep === 1 ? "opacity-100 translate-y-0 z-20" : "opacity-0 translate-y-4 pointer-events-none z-0"}`}
                >
                  <div className="w-full max-w-2xl bg-background-dark rounded-xl p-6 border border-border flex flex-col items-center justify-center min-h-[280px]">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl">🤖</span>
                      </div>
                    </div>
                    <p className="text-foreground font-medium mt-6">Đang xử lý với Kling 2.0...</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-primary text-sm">Tạo 4 video từ 1 ảnh sản phẩm</span>
                    </div>
                    <div className="mt-4 flex gap-3">
                      {["Kling 2.0", "Veo3", "FLUX"].map((model, i) => (
                        <span
                          key={model}
                          className={`px-3 py-1 rounded-full text-xs ${
                            i === 0
                              ? "bg-primary/20 text-primary border border-primary/50"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 2: Output grid (Enhanced) */}
                <div
                  className={`absolute inset-0 transition-all duration-700 ${workflowStep === 2 ? "opacity-100 translate-y-0 z-30" : "opacity-0 translate-y-8 pointer-events-none z-0"}`}
                >
                  <div className="relative flex items-center justify-center p-4 sm:p-8 h-full bg-card/40 backdrop-blur-sm rounded-2xl overflow-hidden">
                    {/* Ambient Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/25 blur-[120px] rounded-full opacity-60 animate-pulse" />
                    
                    {/* Mesh Gradient Overlay for flair */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,188,212,0.1),transparent)]" />

                    {/* Floating Elements - Left */}
                    <div className="absolute left-4 sm:left-10 top-20 flex flex-col gap-4 z-20">
                      <div className="glass-card p-3 rounded-2xl animate-float shadow-xl border border-white/10 backdrop-blur-md">
                        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                      </div>
                      <div 
                        className="glass-card p-3 rounded-2xl animate-float shadow-xl border border-white/10 backdrop-blur-md"
                        style={{ animationDelay: "1s" }}
                      >
                        <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
                      </div>
                    </div>

                    {/* Main Phone Container - Adjusted Size */}
                    <div className="relative z-10 group mt-4">
                      <div className="relative w-[220px] h-[440px] rounded-[2.5rem] border-[8px] border-gray-950 bg-gray-950 shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-950 rounded-b-xl z-20" />
                        
                        {/* Screen Content */}
                        <div className="h-full w-full bg-black relative">
                          <img 
                            src="product.gif" 
                            alt="AI Result"
                            className="h-full w-full object-cover opacity-90"
                          />
                          
                          {/* Inside Overlay */}
                          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex -space-x-2">
                                {[1,2,3].map(i => (
                                  <div key={i} className="w-6 h-6 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[8px]">
                                    👤
                                  </div>
                                ))}
                                <div className="w-6 h-6 rounded-full border-2 border-black bg-primary flex items-center justify-center text-[8px] font-bold text-white">
                                  +12
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-white/60">LIVE PREVIEW</span>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 bg-white/10 hover:bg-white/20 border-white/10 backdrop-blur-md text-white font-bold h-10 gap-2">
                                <Download className="w-4 h-4" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" className="w-10 h-10 p-0 border-white/10 backdrop-blur-md">
                                <Share2 className="w-4 h-4 text-white" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Reflections/Glints */}
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-30" />
                      </div>

                      {/* Floating Badge - Right (Repositioned) */}
                      <div className="absolute -right-8 -top-4 z-20 animate-float-slow">
                        <div className="bg-success/20 backdrop-blur-xl border border-success/40 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg shadow-success/10">
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                          <span className="text-[10px] font-bold text-success uppercase tracking-widest whitespace-nowrap">Quality Match 100%</span>
                        </div>
                      </div>

                      <div 
                        className="absolute -right-4 bottom-12 z-20 animate-float-slow"
                        style={{ animationDelay: "1.5s" }}
                      >
                        <div className="bg-primary/20 backdrop-blur-xl border border-primary/40 rounded-2xl p-3 flex flex-col items-center shadow-lg">
                          <Sparkles className="w-5 h-5 text-primary mb-1" />
                          <span className="text-[9px] font-bold text-primary uppercase leading-none">Upscaled</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom toolbar */}
            {/* <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border">
                <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                  <MousePointer className="w-5 h-5 text-muted-foreground" />
                </button>
                <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-lg">👆</span>
                </button>
                <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </button>
                <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
