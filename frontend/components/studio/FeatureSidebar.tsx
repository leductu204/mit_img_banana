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
    <div className={cn("flex flex-col h-full bg-[#1A1F2E] border-r border-white/10", className)}>
      <div className="p-4 border-b border-white/10 flex items-center gap-3 overflow-hidden">
        <div className="shrink-0 w-8 h-8 flex items-center justify-center">
             {categoryInfo?.icon && <categoryInfo.icon className="w-6 h-6 text-[#00BCD4]" />}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-full whitespace-nowrap">
            <h2 className="font-semibold text-white">{categoryInfo?.label}</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
                {features.length} công cụ hỗ trợ
            </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar">
        {features.map((feature) => {
            const Icon = feature.icon;
            const isActive = currentFeature?.id === feature.id;

            return (
                <button
                    key={feature.id}
                    onClick={() => setFeature(feature.id)}
                    className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all mb-1 relative overflow-hidden",
                        isActive 
                            ? "bg-[#00BCD4]/10 text-[#00BCD4] border border-[#00BCD4]/20" 
                            : "hover:bg-[#252D3D] text-[#B0B8C4] hover:text-white border border-transparent"
                    )}
                >
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                        isActive ? "bg-[#00BCD4] text-white" : "bg-[#252D3D]"
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                        <div className="flex items-center justify-between mb-0.5 gap-2">
                            <span className="text-sm font-medium truncate">{feature.label}</span>
                            {feature.badge && (
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0",
                                    feature.badge === 'Free' ? "bg-green-500/20 text-green-400" :
                                    feature.badge === 'Pro' ? "bg-[#E040FB]/20 text-[#E040FB]" :
                                    "bg-[#00BCD4]/20 text-[#00BCD4]"
                                )}>
                                    {feature.badge}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#6B7280] truncate opacity-80 max-w-[200px]">
                            {feature.description}
                        </p>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0">
                         {isActive && <ChevronRight className="w-4 h-4 text-[#00BCD4]" />}
                    </div>
                </button>
            );
        })}
      </div>
    </div>
  );
}
