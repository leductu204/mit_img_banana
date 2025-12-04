import * as React from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface ErrorMessageProps {
  message?: string | null
  className?: string
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  if (!message) return null
  
  return (
    <div className={cn("p-3 rounded-md bg-red-500/10 text-red-500 text-sm flex items-start gap-2", className)}>
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
