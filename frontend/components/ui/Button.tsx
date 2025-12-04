import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export function Button({ 
  variant = 'primary', 
  size = 'md',
  loading,
  disabled,
  children,
  className,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-brand-primary hover:bg-brand-primary/90 text-white focus:ring-brand-primary',
    secondary: 'bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border-primary',
    ghost: 'hover:bg-bg-secondary text-text-primary',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  )
}
