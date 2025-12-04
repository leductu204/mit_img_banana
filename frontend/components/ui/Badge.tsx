import * as React from "react"
import { cn } from "@/lib/utils/cn"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-brand-primary text-white hover:bg-brand-primary/80",
    secondary: "border-transparent bg-bg-secondary text-text-primary hover:bg-bg-tertiary",
    outline: "text-text-primary border-border-primary",
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
    success: "border-transparent bg-accent-green text-white hover:bg-accent-green/80",
  }

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )} 
      {...props} 
    />
  )
}
