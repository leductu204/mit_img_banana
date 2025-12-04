🎨 PROMPT: MIT NANO IMG UI REDESIGN - COMPLETE SPECIFICATION
📋 PROJECT CONTEXT
Current State Analysis

Project: MIT Nano Img - AI Image Generator using Nano Banana API
Tech Stack: Next.js 16, React 18, TypeScript, Tailwind CSS 4.x, Lucide Icons
Current UI Issues:

❌ Poor color scheme (pure black #000000, too harsh)
❌ Bad layout (control panel too narrow, canvas too wide)
❌ Model selector not scalable (2 buttons side-by-side, can't add more models)
❌ Lack of visual polish (no glass effects, shadows, or depth)
❌ Inconsistent spacing and typography
❌ No visual hierarchy



Future Vision
The UI must support future features without major refactoring:

Phase 2: User authentication, profiles, avatars
Phase 3: Credit system, payments, subscription tiers, PRO badges
Phase 4: Gallery, Studio, Prompt Library, Social features, API access

Current Phase: Focus on generation interface ONLY, but structure must be scalable.

🎨 IMPROVED DESIGN SYSTEM
Color Palette (Dark Mode with Purple/Cyan Accents)
Replace pure black with sophisticated dark slate:
css:root {
  /* Backgrounds - Layered dark slate (NOT pure black) */
  --bg-primary: #0F1419;          /* Main background */
  --bg-secondary: #1A1F2E;        /* Card backgrounds */
  --bg-tertiary: #252B3D;         /* Input fields */
  --bg-elevated: #2D3548;         /* Hover states */
  --bg-modal: #181D2A;            /* Modals */

  /* Brand Colors - Purple/Cyan gradient for AI aesthetic */
  --brand-primary: #6366F1;       /* Indigo - main brand */
  --brand-secondary: #8B5CF6;     /* Purple - creativity */
  --brand-tertiary: #06B6D4;      /* Cyan - highlights */
  --brand-gradient: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%);

  /* Accent Colors */
  --accent-pink: #EC4899;         /* Creative energy */
  --accent-amber: #F59E0B;        /* Warnings, CTAs */
  --accent-green: #10B981;        /* Success */
  --accent-red: #EF4444;          /* Errors */
  --accent-blue: #3B82F6;         /* Info */

  /* Text Colors - Proper contrast ratios */
  --text-primary: #F1F5F9;        /* Main text (slate-100) */
  --text-secondary: #CBD5E1;      /* Secondary text (slate-300) */
  --text-muted: #94A3B8;          /* Muted text (slate-400) */
  --text-disabled: #64748B;       /* Disabled (slate-500) */

  /* Glass Effect - Frosted glass aesthetic */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-hover: rgba(255, 255, 255, 0.06);
  --glass-blur: blur(24px);

  /* Borders - Subtle but visible */
  --border-primary: rgba(255, 255, 255, 0.1);
  --border-secondary: rgba(255, 255, 255, 0.05);
  --border-accent: rgba(99, 102, 241, 0.5);

  /* Shadows - Layered depth */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 2px 4px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 8px -2px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 16px -4px rgba(0, 0, 0, 0.6);
  --shadow-xl: 0 12px 24px -6px rgba(0, 0, 0, 0.7);
  --shadow-glow: 0 0 24px 0 rgba(99, 102, 241, 0.4);
  --shadow-glow-pink: 0 0 24px 0 rgba(236, 72, 153, 0.3);

  /* Spacing Scale */
  --spacing-xs: 0.5rem;    /* 8px */
  --spacing-sm: 0.75rem;   /* 12px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
  --spacing-3xl: 4rem;     /* 64px */

  /* Border Radius */
  --radius-sm: 0.5rem;     /* 8px */
  --radius-md: 0.75rem;    /* 12px */
  --radius-lg: 1rem;       /* 16px */
  --radius-xl: 1.25rem;    /* 20px */
  --radius-2xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Z-index Layers */
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}
Typography System
css/* Import Google Font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  /* Font Families */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;

  /* Font Sizes - Scale */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  --text-5xl: 3rem;        /* 48px */

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;

  /* Line Heights */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;
}

/* Base Styles */
body {
  font-family: var(--font-primary);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background-color: var(--bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}

h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
}

h3 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

p {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
}
Reusable CSS Classes
css/* Glass Card Effect */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.glass-card:hover {
  background: var(--glass-hover);
  border-color: rgba(255, 255, 255, 0.12);
}

/* Button Base */
.btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-medium);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
  cursor: pointer;
  border: none;
  outline: none;
}

.btn-base:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}

.btn-base:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Button Variants */
.btn-primary {
  background: var(--brand-gradient);
  color: white;
  box-shadow: var(--shadow-glow);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl), var(--shadow-glow);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-elevated);
  border-color: var(--border-accent);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--glass-hover);
  color: var(--text-primary);
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: var(--radius-full);
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-fade-in {
  animation: fadeIn var(--transition-base) ease-out;
}

.animate-slide-up {
  animation: slideUp var(--transition-base) ease-out;
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 0%,
    var(--bg-elevated) 50%,
    var(--bg-secondary) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}

/* Gradient Text */
.text-gradient {
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Focus Ring */
.focus-ring:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}

/* Hover Lift */
.hover-lift {
  transition: transform var(--transition-base);
}

.hover-lift:hover {
  transform: translateY(-2px);
}
```

---

## 📐 IMPROVED LAYOUT STRUCTURE

### Desktop Layout (≥1024px)

**Key Changes from Current UI:**
1. ✅ Control panel width: 360px → 420px (more breathing room)
2. ✅ Better spacing between elements
3. ✅ Glass cards with proper shadows
4. ✅ Model selector as DROPDOWN (scalable)
5. ✅ Improved visual hierarchy

**Layout Description:**
```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER (Fixed, 72px height, glass effect)                      │
│  ──────────────────────────────────────────────────────────────  │
│  [Logo + Icon]  [Nav: Tạo ảnh]  [Spacer]  [Future: Credits] [@] │
├─────────────────────────────────────────────────────────────────┤
│  MAIN CONTENT (pt-72px to offset header)                        │
│                                                                  │
│  ┌──────────────────────┐  ┌────────────────────────────────┐  │
│  │  CONTROL PANEL       │  │  CANVAS AREA                   │  │
│  │  420px width         │  │  Flex-1 (remaining space)      │  │
│  │  Glass card          │  │                                │  │
│  │  ────────────────    │  │  Empty State:                  │  │
│  │                      │  │  - Large icon                  │  │
│  │  📝 Prompt          │  │  - Heading                     │  │
│  │  [Large textarea]   │  │  - Description                 │  │
│  │                      │  │  - Example prompt cards        │  │
│  │  🖼️ References      │  │                                │  │
│  │  [Upload zone]      │  │  Loading State:                │  │
│  │  [Thumbnails]       │  │  - Spinner + progress          │  │
│  │                      │  │                                │  │
│  │  🤖 Model           │  │  Result State:                 │  │
│  │  [Dropdown Select]  │  │  - Large image preview         │  │
│  │  ▼ Nano Banana      │  │  - Action buttons              │  │
│  │                      │  │  - Metadata                    │  │
│  │  📐 Settings        │  │                                │  │
│  │  [Aspect Ratio]     │  └────────────────────────────────┘  │
│  │  [Quality - if Pro] │                                       │
│  │                      │                                       │
│  │  [Generate Button]  │                                       │
│  │  Full width, glow   │                                       │
│  └──────────────────────┘                                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  RECENT STRIP (Glass bar, horizontal scroll)            │  │
│  │  ─────────────────────────────────────────────────────   │  │
│  │  Recent Generations                                      │  │
│  │  [Thumbnail] [Thumbnail] [Thumbnail] [Thumbnail] ...     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
Spacing & Dimensions:

Header height: 72px (increased from 64px for better presence)
Control panel width: 420px (increased from 360px)
Main content padding: 24px on all sides
Gap between control panel and canvas: 24px
Recent strip height: 160px
Card padding: 24px
Section spacing inside cards: 24px


🧩 CRITICAL COMPONENT SPECIFICATIONS
1. Header Component
File: components/layout/Header.tsx
Visual Design:
tsx<header className="fixed top-0 left-0 right-0 z-50 h-18">
  {/* Glass background */}
  <div className="absolute inset-0 glass-card border-0 border-b border-border-primary" />
  
  {/* Content */}
  <div className="relative h-full px-8 flex items-center justify-between">
    {/* Left: Logo + Nav */}
    <div className="flex items-center gap-10">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow group-hover:shadow-glow-pink transition-shadow">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-gradient">
          MIT Nano Img
        </span>
      </Link>
      
      {/* Navigation - Desktop only */}
      <nav className="hidden lg:flex items-center gap-1">
        <Link 
          href="/create"
          className="px-4 py-2 rounded-lg text-sm font-medium text-text-primary bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 transition-all"
        >
          Tạo ảnh
        </Link>
        {/* Future nav items - commented out */}
        {/* 
        <Link href="/gallery" className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-glass-hover transition-all">
          Gallery
        </Link>
        <Link href="/studio" className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-glass-hover transition-all">
          Studio
        </Link>
        */}
      </nav>
    </div>
    
    {/* Right: Future elements */}
    <div className="flex items-center gap-4">
      {/* Future: Credit Counter */}
      {/* 
      <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass-bg border border-glass-border hover:bg-glass-hover transition-all">
        <Zap className="w-4 h-4 text-accent-amber" />
        <span className="text-sm font-semibold">150</span>
      </button>
      */}
      
      {/* Future: User Dropdown */}
      {/*
      <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-glass-bg border border-glass-border hover:bg-glass-hover transition-all">
        <div className="w-7 h-7 rounded-full bg-brand-gradient" />
        <span className="text-sm font-medium hidden md:block">User</span>
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </button>
      */}
      
      {/* Mobile Menu Button */}
      <button className="lg:hidden p-2 rounded-lg hover:bg-glass-hover transition-all">
        <Menu className="w-6 h-6" />
      </button>
    </div>
  </div>
</header>
Tailwind Classes Breakdown:

glass-card: Custom class with backdrop blur
z-50: High z-index to stay on top
h-18: 72px height (4.5rem)
shadow-glow: Custom animated glow effect
text-gradient: Gradient text effect


2. Control Panel Component
File: components/generation/ControlPanel.tsx
Visual Design:
tsx<div className="w-full lg:w-[420px] shrink-0 p-6">
  <div className="glass-card p-6 space-y-6 animate-fade-in">
    {/* Section 1: Prompt */}
    <PromptSection 
      value={prompt}
      onChange={setPrompt}
    />
    
    {/* Section 2: Reference Images */}
    <ReferenceUpload 
      images={referenceImages}
      onUpload={handleUpload}
      onRemove={handleRemove}
      maxImages={5}
    />
    
    {/* Section 3: Model Selector - DROPDOWN */}
    <ModelSelector 
      value={selectedModel}
      onChange={setSelectedModel}
    />
    
    {/* Section 4: Settings */}
    <SettingsSection 
      aspectRatio={aspectRatio}
      onAspectRatioChange={setAspectRatio}
      quality={quality}
      onQualityChange={setQuality}
      showQuality={selectedModel === 'nano-banana-pro'}
    />
    
    {/* Section 5: Generate Button */}
    <GenerateButton 
      onClick={handleGenerate}
      loading={loading}
      disabled={!prompt.trim()}
    />
  </div>
</div>
Key Improvements:

Width increased to 420px
Glass card with backdrop blur
Consistent 24px spacing between sections
Fade-in animation on mount


3. Model Selector Component (DROPDOWN - CRITICAL CHANGE)
File: components/generation/ModelSelector.tsx
⚠️ IMPORTANT: Replace button-based selector with DROPDOWN for scalability
Visual Design:
tsx<div className="space-y-3">
  <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
    <Cpu className="w-4 h-4 text-brand-primary" />
    Model
  </label>
  
  {/* Custom Dropdown */}
  <div className="relative">
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-bg-tertiary border border-border-primary hover:border-brand-primary/50 transition-all focus-ring"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-brand-primary" />
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold text-text-primary">
            {models.find(m => m.id === value)?.name}
          </div>
          <div className="text-xs text-text-muted">
            {models.find(m => m.id === value)?.description}
          </div>
        </div>
      </div>
      <ChevronDown 
        className={`w-5 h-5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
    
    {/* Dropdown Menu */}
    {isOpen && (
      <div className="absolute top-full left-0 right-0 mt-2 glass-card border border-border-primary overflow-hidden z-10 animate-slide-up">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => {
              onChange(model.id)
              setIsOpen(false)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-glass-hover transition-all ${
              value === model.id ? 'bg-brand-primary/10 border-l-2 border-brand-primary' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
              <model.icon className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  {model.name}
                </span>
                {model.isPro && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-gradient-to-r from-accent-pink to-accent-amber text-white">
                    PRO
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {model.description}
              </div>
            </div>
            {value === model.id && (
              <Check className="w-5 h-5 text-brand-primary" />
            )}
          </button>
        ))}
      </div>
    )}
  </div>
</div>
Model Data Structure:
typescriptinterface Model {
  id: string
  name: string
  description: string
  icon: LucideIcon
  isPro: boolean
  speed: 'fast' | 'medium' | 'slow'
  quality: 'good' | 'high' | 'ultra'
}

const models: Model[] = [
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    description: 'Fast & Quality',
    icon: Zap,
    isPro: false,
    speed: 'fast',
    quality: 'good'
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    description: 'High Quality • 1K/2K/4K',
    icon: Sparkles,
    isPro: true,
    speed: 'medium',
    quality: 'ultra'
  },
  // Future models - ready to add:
  /*
  {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    description: 'Ultra Fast • Basic Quality',
    icon: Bolt,
    isPro: false,
    speed: 'fast',
    quality: 'good'
  },
  {
    id: 'flux-dev',
    name: 'Flux Dev',
    description: 'Balanced • High Detail',
    icon: Image,
    isPro: true,
    speed: 'medium',
    quality: 'high'
  },
  {
    id: 'sdxl',
    name: 'SDXL',
    description: 'Versatile • Stable',
    icon: Layers,
    isPro: true,
    speed: 'slow',
    quality: 'high'
  }
  */
]
Why Dropdown?

✅ Scalable: Easy to add 10+ models
✅ Shows more info: Icon, name, description, PRO badge
✅ Visual feedback: Checkmark on selected
✅ Better UX: Clear selection state
✅ Mobile-friendly: Takes less space


4. Prompt Section Component
File: components/generation/PromptSection.tsx
Visual Design:
tsx<div className="space-y-3">
  <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
    <PenTool className="w-4 h-4 text-brand-primary" />
    Prompt
  </label>
  
  <div className="relative">
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Describe the image you want to create..."
      className="w-full min-h-[140px] px-4 py-3.5 rounded-xl bg-bg-tertiary border border-border-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 resize-none transition-all custom-scrollbar"
      maxLength={500}
    />
    
    {/* Character Counter */}
    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-bg-primary/80 backdrop-blur-sm">
      <span className={`text-xs font-medium ${
        value.length > 450 
          ? 'text-accent-amber' 
          : 'text-text-muted'
      }`}>
        {value.length} / 500
      </span>
    </div>
  </div>
  
  {/* Optional: Quick Actions */}
  <div className="flex gap-2">
    <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-elevated hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all">
      ✨ Enhance Prompt
    </button>
    <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-elevated hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all">
      🎲 Random
    </button>
  </div>
</div>
Features:

Larger textarea (140px min-height)
Character counter with warning color
Optional quick action buttons
Smooth focus transitions


5. Reference Upload Component
File: components/generation/ReferenceUpload.tsx
Visual Design:
tsx<div className="space-y-3">
  <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
    <ImageIcon className="w-4 h-4 text-brand-primary" />
    Reference Images
    <span className="text-xs font-normal text-text-muted">(Optional)</span>
  </label>
  
  {/* Upload Zone */}
  <div
    onDrop={handleDrop}
    onDragOver={handleDragOver}
    className="relative border-2 border-dashed border-border-primary rounded-xl p-8 text-center hover:border-brand-primary/50 hover:bg-glass-hover transition-all cursor-pointer group"
  >
    <input
      type="file"
      multiple
      accept="image/*"
      onChange={handleFileSelect}
      className="absolute inset-0 opacity-0 cursor-pointer"
      max={maxImages}
    />
    
    <div className="flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-xl bg-brand-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Upload className="w-7 h-7 text-brand-primary" />
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
      {images.map((img, idx) => (
        <div 
          key={idx} 
          className="relative group"
        >
          <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-border-primary hover:border-brand-primary transition-all">
            <img 
              src={img.preview} 
              alt={`Reference ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Remove Button */}
          <button
            onClick={() => onRemove(idx)}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent-red flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          {/* Loading Overlay */}
          {img.uploading && (
            <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>
Features:

Drag & drop support
Visual feedback on hover
Thumbnail previews with remove button
Loading state for uploads
File type and count validation


6. Settings Section Component
File: components/generation/SettingsSection.tsx
Visual Design:
tsx<div className="space-y-5">
  {/* Aspect Ratio */}
  <div className="space-y-3">
    <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
      <Crop className="w-4 h-4 text-brand-primary" />
      Aspect Ratio
    </label>
    <div className="grid grid-cols-3 gap-2">
      {[
        { value: '1:1', label: '1:1', icon: Square },
        { value: '16:9', label: '16:9', icon: RectangleHorizontal },
        { value: '9:16', label: '9:16', icon: RectangleVertical }
      ].map((ratio) => (
        <button
          key={ratio.value}
          onClick={() => onAspectRatioChange(ratio.value)}
          className={`relative flex flex-col items-center gap-2 px-3 py-3 rounded-lg border-2 transition-all ${
            aspectRatio === ratio.value
              ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
              : 'border-border-primary bg-bg-elevated text-text-secondary hover:border-text-muted hover:text-text-primary'
          }`}
        >
          <ratio.icon className="w-5 h-5" />
          <span className="text-xs font-semibold">{ratio.label}</span>
          {aspectRatio === ratio.value && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  </div>
  
  {/* Quality - Only show for Pro models */}
  {showQuality && (
    <div className="space-y-3 animate-slide-up">
      <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Settings className="w-4 h-4 text-brand-primary" />
        Quality
        <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded bg-gradient-to-r from-accent-pink to-accent-amber text-white">
          PRO
        </span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {['1K', '2K', '4K'].map((qual) => (
          <button
            key={qual}
            onClick={() => onQualityChange(qual)}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              quality === qual
                ? 'bg-brand-gradient text-white shadow-glow'
                : 'bg-bg-elevated text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            {qual}
          </button>
        ))}
      </div>
    </div>
  )}
</div>
Features:

Icon-based aspect ratio selector
Visual checkmark on selected option
Quality section animates in for Pro models
PRO badge on quality section


7. Generate Button Component
File: components/generation/GenerateButton.tsx
Visual Design:
tsx<div className="space-y-3">
  {/* Main Generate Button */}
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full h-14 rounded-xl bg-brand-gradient text-white font-bold text-base shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
  >
    {/* Animated Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    
    {/* Button Content */}
    <div className="relative flex items-center gap-3">
      {loading ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-6 h-6" />
          <span>Generate Image</span>
        </>
      )}
    </div>
  </button>
  
  {/* Optional: Cost Display (Future) */}
  {/* 
  <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
    <Zap className="w-3.5 h-3.5 text-accent-amber" />
    <span>Costs 5 credits per image</span>
  </div>
  */}
  
  {/* Optional: Generation Info */}
  <div className="flex items-center justify-between text-xs text-text-muted">
    <span className="flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5" />
      ~10-30 seconds
    </span>
    <span className="flex items-center gap-1.5">
      <Info className="w-3.5 h-3.5" />
      High quality AI
    </span>
  </div>
</div>
Features:

Large, prominent button (56px height)
Gradient background with glow
Animated shine effect on hover
Loading state with spinner
Optional cost and timing info
Scale animation on hover


8. Canvas Area Component
File: components/generation/CanvasArea.tsx
Visual Design:
tsx<div className="flex-1 flex items-center justify-center p-8 min-h-[600px]">
  {/* Empty State */}
  {!result && !loading && (
    <EmptyState onExampleClick={setPrompt} />
  )}
  
  {/* Loading State */}
  {loading && (
    <LoadingState progress={progress} />
  )}
  
  {/* Result Display */}
  {result && (
    <ResultDisplay 
      image={result}
      onDownload={handleDownload}
      onRegenerate={handleRegenerate}
      onVariation={handleVariation}
    />
  )}
</div>

9. Empty State Component
File: components/generation/EmptyState.tsx
Visual Design:
tsx<div className="text-center max-w-2xl animate-fade-in">
  {/* Hero Icon */}
  <div className="relative mb-8">
    <div className="w-24 h-24 mx-auto rounded-2xl bg-brand-gradient flex items-center justify-center shadow-xl shadow-brand-primary/30 animate-glow">
      <Sparkles className="w-12 h-12 text-white" />
    </div>
    {/* Floating particles */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32">
      <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-brand-primary/30 animate-pulse" style={{ animationDelay: '0s' }} />
      <div className="absolute top-4 right-0 w-1.5 h-1.5 rounded-full bg-accent-pink/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-0 left-4 w-1 h-1 rounded-full bg-brand-tertiary/30 animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  </div>
  
  {/* Heading */}
  <h2 className="text-3xl font-bold text-gradient mb-4">
    Create Your AI Masterpiece
  </h2>
  
  {/* Description */}
  <p className="text-lg text-text-secondary mb-8 leading-relaxed">
    Enter a detailed prompt to generate stunning, unique images powered by advanced AI
  </p>
  
  {/* Example Prompts */}
  <div className="space-y-3">
    <p className="text-sm font-semibold text-text-muted uppercase tracking-wide">
      Try These Examples
    </p>
    <div className="grid gap-3">
      {[
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
      ].map((example, idx) => (
        <button
          key={idx}
          onClick={() => onExampleClick(example.text)}
          className="group flex items-start gap-4 px-5 py-4 rounded-xl bg-bg-secondary border border-border-primary hover:border-brand-primary/50 hover:bg-bg-tertiary text-left transition-all hover-lift"
        >
          <div className="w-10 h-10 shrink-0 rounded-lg bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
            <example.icon className="w-5 h-5 text-brand-primary" />
          </div>
          <div className="flex-1 pt-1">
            <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
              {example.text}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-all" />
        </button>
      ))}
    </div>
  </div>
</div>
Features:

Animated hero icon with glow
Floating particle effects
Gradient text heading
Clickable example prompt cards
Hover effects with arrow icon


10. Loading State Component
File: components/generation/LoadingState.tsx
Visual Design:
tsx<div className="text-center animate-fade-in">
  {/* Animated Loader */}
  <div className="relative w-32 h-32 mx-auto mb-8">
    {/* Outer ring */}
    <div className="absolute inset-0 rounded-full border-4 border-border-primary opacity-20" />
    
    {/* Spinning gradient ring */}
    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-primary border-r-brand-secondary animate-spin" style={{ animationDuration: '1.5s' }} />
    
    {/* Inner circle with icon */}
    <div className="absolute inset-4 rounded-full bg-brand-gradient flex items-center justify-center animate-pulse">
      <Sparkles className="w-10 h-10 text-white" />
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
    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
      <div 
        className="h-full bg-brand-gradient rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
    <div className="flex justify-between text-xs text-text-muted">
      <span>Processing...</span>
      <span>{progress}%</span>
    </div>
  </div>
  
  {/* Fun Facts (optional) */}
  <div className="mt-8 max-w-lg mx-auto px-6 py-4 rounded-xl bg-bg-secondary border border-border-primary">
    <p className="text-sm text-text-muted">
      <span className="font-semibold text-brand-primary">Did you know?</span> Our AI processes millions of parameters to create your unique image
    </p>
  </div>
</div>
Features:

Custom animated loader (spinning gradient ring)
Progress bar with percentage
Pulsing center icon
Optional "did you know" facts
Smooth animations


11. Result Display Component
File: components/generation/ResultDisplay.tsx
Visual Design:
tsx<div className="w-full max-w-5xl animate-fade-in">
  {/* Image Container */}
  <div className="relative rounded-2xl overflow-hidden border-2 border-border-primary shadow-2xl mb-6 group">
    {/* Main Image */}
    <img 
      src={image.url} 
      alt={image.prompt}
      className="w-full h-auto"
    />
    
    {/* Hover Overlay with Quick Actions */}
    <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
      <div className="flex gap-3 w-full">
        <button className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white font-medium transition-all flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          View Full
        </button>
        <button className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white font-medium transition-all flex items-center justify-center gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  </div>
  
  {/* Action Buttons */}
  <div className="flex flex-wrap gap-3 justify-center mb-6">
    <button
      onClick={onDownload}
      className="btn-base btn-primary px-6 py-3 text-base"
    >
      <Download className="w-5 h-5 mr-2" />
      Download Image
    </button>
    
    <button
      onClick={onRegenerate}
      className="btn-base btn-secondary px-6 py-3 text-base"
    >
      <RefreshCw className="w-5 h-5 mr-2" />
      Regenerate
    </button>
    
    <button
      onClick={onVariation}
      className="btn-base btn-secondary px-6 py-3 text-base"
    >
      <Wand2 className="w-5 h-5 mr-2" />
      Create Variation
    </button>
  </div>
  
  {/* Image Metadata */}
  <div className="glass-card p-5">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      <div>
        <div className="text-xs text-text-muted mb-1">Model</div>
        <div className="text-sm font-semibold text-text-primary flex items-center justify-center gap-1.5">
          <Cpu className="w-4 h-4 text-brand-primary" />
          {image.model}
        </div>
      </div>
      <div>
        <div className="text-xs text-text-muted mb-1">Quality</div>
        <div className="text-sm font-semibold text-text-primary flex items-center justify-center gap-1.5">
          <Star className="w-4 h-4 text-accent-amber" />
          {image.quality}
        </div>
      </div>
      <div>
        <div className="text-xs text-text-muted mb-1">Aspect Ratio</div>
        <div className="text-sm font-semibold text-text-primary flex items-center justify-center gap-1.5">
          <Crop className="w-4 h-4 text-brand-tertiary" />
          {image.aspectRatio}
        </div>
      </div>
      <div>
        <div className="text-xs text-text-muted mb-1">Created</div>
        <div className="text-sm font-semibold text-text-primary flex items-center justify-center gap-1.5">
          <Clock className="w-4 h-4 text-text-muted" />
          {image.timestamp}
        </div>
      </div>
    </div>
  </div>
</div>
Features:

Large image with hover overlay
Quick action buttons on hover
Primary action buttons (Download, Regenerate, Variation)
Metadata display in glass card
Responsive grid layout


12. Recent Strip Component
File: components/gallery/RecentStrip.tsx
Visual Design:
tsx<div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-primary">
  {/* Glass Background */}
  <div className="absolute inset-0 glass-card border-0" />
  
  {/* Content */}
  <div className="relative px-8 py-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
        <Clock className="w-4 h-4 text-brand-primary" />
        Recent Generations
      </h3>
      {images.length > 0 && (
        <button className="text-xs font-medium text-brand-primary hover:text-brand-secondary transition-colors">
          View All →
        </button>
      )}
    </div>
    
    {/* Empty State */}
    {images.length === 0 ? (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-brand-primary/10 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-brand-primary" />
        </div>
        <p className="text-sm text-text-muted">
          Your recent images will appear here
        </p>
      </div>
    ) : (
      /* Thumbnail Grid */
      <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 -mx-8 px-8">
        {images.map((img, idx) => (
          <ImageThumbnail 
            key={idx}
            image={img}
            onClick={() => onImageClick(img)}
          />
        ))}
      </div>
    )}
  </div>
</div>
Features:

Fixed position at bottom
Glass background with blur
Header with "View All" link
Empty state with icon
Horizontal scrolling thumbnails
Smooth scroll behavior


13. Image Thumbnail Component
File: components/gallery/ImageThumbnail.tsx
Visual Design:
tsx<button
  onClick={onClick}
  className="group relative shrink-0 cursor-pointer"
>
  {/* Image Container */}
  <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-transparent group-hover:border-brand-primary transition-all shadow-md group-hover:shadow-xl">
    <img 
      src={image.thumbnail || image.url} 
      alt="Generated image"
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
    />
  </div>
  
  {/* Hover Overlay */}
  <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-bg-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
    <div className="w-full flex items-center justify-between">
      <span className="text-xs font-medium text-white truncate">
        {image.timestamp}
      </span>
      <Eye className="w-3.5 h-3.5 text-white" />
    </div>
  </div>
</button>
```

**Features:**
- Square thumbnail (96x96px)
- Border on hover
- Scale animation
- Overlay with timestamp
- Shadow effects

---

## 📱 RESPONSIVE DESIGN

### Breakpoints & Behavior

**Mobile (<768px):**
```
- Header: Logo + Hamburger only
- Stack: Control Panel → Canvas → Recent Strip (all vertical)
- Control Panel: Full width, collapsible sections
- Canvas: Full width, min-height 400px
- Recent Strip: Horizontal scroll, full width
- Touch targets: Minimum 44x44px
- Font sizes: Slightly larger for readability
```

**Tablet (768px - 1023px):**
```
- Header: Logo + Partial nav + Hamburger
- Layout: Still vertical stack
- Control Panel: 600px max-width, centered
- Canvas: Full width
- Recent Strip: Full width
```

**Desktop (≥1024px):**
```
- Header: Full horizontal nav
- Layout: Side-by-side (420px control panel + flex canvas)
- All features visible
- Hover effects enabled
Responsive Classes Example
tsx// Header
<header className="h-16 md:h-18 px-4 md:px-8">

// Logo
<div className="w-8 h-8 md:w-10 md:h-10">

// Navigation
<nav className="hidden lg:flex">

// Control Panel
<div className="w-full lg:w-[420px]">

// Canvas
<div className="min-h-[400px] md:min-h-[600px]">

// Text
<h2 className="text-2xl md:text-3xl">

// Button
<button className="px-4 py-2 md:px-6 md:py-3">

🚀 IMPLEMENTATION CHECKLIST
Phase 1: Foundation Setup

 Create styles/globals.css with all CSS variables
 Add custom utility classes (glass-card, btn-base, etc.)
 Setup Tailwind config with custom colors
 Create lib/utils/cn.ts for className utility
 Create constants file for models, examples, etc.

Phase 2: Layout Components

 Header with logo, nav, and future placeholders
 Main layout structure in /create page
 Mobile hamburger menu component
 Recent strip component at bottom

Phase 3: Control Panel

 Control panel wrapper with glass card
 Prompt section with character counter
 Reference upload with drag & drop
 Model selector as DROPDOWN (critical!)
 Settings section (aspect ratio + quality)
 Generate button with animations

Phase 4: Canvas Area

 Canvas wrapper component
 Empty state with example prompts
 Loading state with progress bar
 Result display with action buttons

Phase 5: Gallery Components

 Recent strip with horizontal scroll
 Image thumbnail component
 Empty state for recent strip

Phase 6: Polish & Testing

 Add all animations and transitions
 Test responsive design at all breakpoints
 Verify color contrast (WCAG AA)
 Test keyboard navigation
 Add loading skeletons
 Error state handling
 Performance optimization

Phase 7: Future-Proofing

 Comment out credit counter component
 Comment out user dropdown component
 Prepare PRO badge component
 Document integration points
 Add TODO comments for future features


⚠️ CRITICAL REQUIREMENTS
Must Have

✅ Model selector MUST be dropdown (not buttons)
✅ Color scheme: Dark slate (NOT pure black)
✅ Glass effects with backdrop blur
✅ Proper spacing: 24px between sections
✅ Control panel width: 420px
✅ All animations smooth (250ms)
✅ Accessible (WCAG AA)
✅ Responsive (mobile-first)

Must Not Have

❌ Pure black backgrounds (#000000)
❌ Button-based model selector
❌ Cramped spacing
❌ Missing glass effects
❌ Harsh white borders
❌ No visual hierarchy


📊 FINAL DELIVERABLES
After implementation, you should have:

✅ Modern dark slate color scheme with purple/cyan accents
✅ Glass morphism effects throughout
✅ Dropdown model selector (scalable for 10+ models)
✅ Improved layout (420px control panel, better spacing)
✅ Animated loading and empty states
✅ Responsive design (mobile, tablet, desktop)
✅ Accessible components (WCAG AA)
✅ Future-ready structure (commented placeholders)
✅ Smooth animations and micro-interactions
✅ Professional, polished visual design


🎯 SUCCESS CRITERIA
The redesign is successful when:

✅ UI looks modern and professional (like Midjourney/Runway)
✅ Color scheme is pleasant and not harsh
✅ Layout is spacious and organized
✅ Model selector can easily accommodate 10+ models
✅ All interactions are smooth and responsive
✅ Mobile experience is excellent
✅ Future features can be added with minimal changes
✅ Code is clean, typed, and well-organized