"use client"

import { Card } from "@/components/ui/Card"
import { PromptSection } from "./PromptSection"
import { ReferenceUpload } from "./ReferenceUpload"
import { ModelSelector } from "./ModelSelector"
import { SettingsSection } from "./SettingsSection"
import { GenerateButton } from "./GenerateButton"

interface ControlPanelProps {
  prompt: string
  setPrompt: (value: string) => void
  images: File[]
  setImages: (images: File[]) => void
  model: string
  setModel: (model: string) => void
  aspectRatio: string
  setAspectRatio: (ratio: string) => void
  quality: string
  setQuality: (quality: string) => void
  loading: boolean
  onGenerate: () => void
}

export function ControlPanel({
  prompt, setPrompt,
  images, setImages,
  model, setModel,
  aspectRatio, setAspectRatio,
  quality, setQuality,
  loading,
  onGenerate
}: ControlPanelProps) {
  return (
    <div className="w-full lg:w-[420px] shrink-0 p-6">
      <Card className="glass-card p-6 space-y-6 animate-fade-in border-border-primary bg-bg-secondary/50">
        <PromptSection prompt={prompt} setPrompt={setPrompt} />
        
        <ReferenceUpload images={images} setImages={setImages} />
        
        <ModelSelector model={model} setModel={setModel} />
        
        <SettingsSection 
          aspectRatio={aspectRatio} 
          setAspectRatio={setAspectRatio}
          quality={quality}
          setQuality={setQuality}
          model={model}
        />
        
        <div className="pt-2">
          <GenerateButton 
            onClick={onGenerate}
            loading={loading}
            disabled={!prompt.trim()}
          />
        </div>
      </Card>
    </div>
  )
}
