import * as React from "react"
import { cn } from "@/lib/utils/cn"

interface CardProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
}

export function Card({ children, className = '', glass = true }: CardProps) {
  return (
    <div className={cn(glass ? 'glass-card' : 'bg-bg-secondary border border-border-primary rounded-xl', className)}>
      {children}
    </div>
  )
}
