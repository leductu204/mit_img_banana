import React from "react";
import { cn } from "@/lib/utils";

interface FeatureHeaderProps {
  title: string;
  description: string;
  icon?: any;
  badge?: string;
  className?: string;
}

export default function FeatureHeader({ title, description, icon: Icon, badge, className }: FeatureHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center gap-3 mb-2">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {badge && (
                <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    badge === 'Free' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    badge === 'Pro' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                    {badge}
                </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
