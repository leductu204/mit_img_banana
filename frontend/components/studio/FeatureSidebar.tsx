"use client"

import React from "react";
import { useStudio } from "./StudioContext";
import { getFeaturesByCategory, STUDIO_CATEGORIES } from "@/lib/studio-config";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export default function FeatureSidebar({ className }: { className?: string }) {
  const { currentCategory, currentFeature, setFeature } = useStudio();
  const features = getFeaturesByCategory(currentCategory);
  const categoryInfo = STUDIO_CATEGORIES.find(c => c.id === currentCategory);

  return (
    <div className={cn("flex flex-col h-full bg-card border-r border-border", className)}>
      <div className="p-4 border-b border-border flex items-center gap-3 overflow-hidden">
        <div className="shrink-0 w-8 h-8 flex items-center justify-center">
             {categoryInfo?.icon && <categoryInfo.icon className="w-6 h-6 text-foreground" />}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-full whitespace-nowrap">
            <h2 className="font-semibold">{categoryInfo?.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
                {features.length} công cụ hỗ trợ
            </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        {features.map((feature) => {
            const Icon = feature.icon;
            const isActive = currentFeature?.id === feature.id;

            return (
                <button
                    key={feature.id}
                    onClick={() => setFeature(feature.id)}
                    className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all mb-1 relative overflow-hidden",
                        isActive 
                            ? "bg-primary/10 text-primary border border-primary/20" 
                            : "hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
                    )}
                >
                    <div className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center transition-colors shrink-0",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted group-hover/btn:bg-background"
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                        <div className="flex items-center justify-between mb-0.5 gap-2">
                            <span className="text-sm font-medium truncate">{feature.label}</span>
                            {feature.badge && (
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0",
                                    feature.badge === 'Free' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                    feature.badge === 'Pro' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                )}>
                                    {feature.badge}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate opacity-80 max-w-[200px]">
                            {feature.description}
                        </p>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0">
                         {isActive && <ChevronRight className="w-4 h-4 text-primary" />}
                    </div>
                </button>
            );
        })}
      </div>
    </div>
  );
}
