"use client"

import { Zap } from "lucide-react"

interface CreditCounterProps {
  credits: number
}

export function CreditCounter({ credits }: CreditCounterProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary rounded-full border border-border-primary">
      <Zap className="w-4 h-4 text-accent-amber fill-accent-amber" />
      <span className="text-sm font-medium text-text-primary">{credits}</span>
    </div>
  )
}
