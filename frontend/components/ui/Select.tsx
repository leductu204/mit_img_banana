import * as React from "react"
import { cn } from "@/lib/utils/cn"
import { ChevronDown } from "lucide-react"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            className={cn(
              "flex h-10 w-full appearance-none rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2 text-sm text-text-primary ring-offset-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all pr-8",
              error && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Select.displayName = "Select"
