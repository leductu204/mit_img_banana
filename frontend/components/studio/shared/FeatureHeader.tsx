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
          <div className="w-10 h-10 rounded-xl bg-[#00BCD4]/10 flex items-center justify-center text-[#00BCD4]">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {badge && (
                <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    badge === 'Free' ? "bg-green-500/20 text-green-400" :
                    badge === 'Pro' ? "bg-[#E040FB]/20 text-[#E040FB]" :
                    "bg-[#00BCD4]/20 text-[#00BCD4]"
                )}>
                    {badge}
                </span>
            )}
          </div>
          <p className="text-sm text-[#6B7280]">{description}</p>
        </div>
      </div>
    </div>
  );
}
