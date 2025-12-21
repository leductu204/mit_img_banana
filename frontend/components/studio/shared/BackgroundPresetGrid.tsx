"use client"

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface BackgroundPreset {
  id: string;
  label: string;
  image: string; // Thumbnail URL
  prompt: string; // The specific scene description
  basePrompt?: string; // The instruction prefix (e.g. "Change the background of this image to...")
}

interface BackgroundPresetGridProps {
  presets: BackgroundPreset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function BackgroundPresetGrid({ presets, selectedId, onSelect }: BackgroundPresetGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {presets.map((preset) => {
        const isSelected = selectedId === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden border-2 transition-all group",
              isSelected 
                ? "border-primary ring-2 ring-primary/20" 
                : "border-transparent hover:border-border"
            )}
          >
            <img 
              src={preset.image} 
              alt={preset.label}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/150x150/2a2a2a/white?text=" + encodeURIComponent(preset.label.substring(0, 10));
              }}
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80" />
            
            {/* Label */}
            <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium text-white truncate max-w-[90%]">
              {preset.label}
            </span>

            {/* Selected Indicator */}
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                <Check className="w-3 h-3" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
