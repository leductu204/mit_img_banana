import * as React from "react"
import { cn } from "@/lib/utils/cn"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={cn("animate-shimmer rounded-lg", className)} />
  )
}
