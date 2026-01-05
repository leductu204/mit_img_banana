"use client"

import React, { useRef, useEffect } from "react";
import { STUDIO_CATEGORIES } from "@/lib/studio-config";
import { useStudio } from "./StudioContext";
import { cn } from "@/lib/utils";

export default function CategoryTabs() {
  const { currentCategory, setCategory } = useStudio();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to active tab
  useEffect(() => {
    if (scrollContainerRef.current) {
        const activeTab = scrollContainerRef.current.querySelector('[data-active="true"]');
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
  }, [currentCategory]);

  return (
    <div className="border-b border-white/10 bg-[#1A1F2E] sticky top-0 z-20">
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto hide-scrollbar px-4 py-3 gap-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {STUDIO_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isActive = currentCategory === category.id;
          
          return (
            <button
              key={category.id}
              data-active={isActive}
              onClick={() => setCategory(category.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                isActive 
                  ? "bg-[#00BCD4] text-white shadow-sm shadow-[#00BCD4]/30" 
                  : "bg-[#252D3D] text-[#B0B8C4] hover:bg-[#1F2833] hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
