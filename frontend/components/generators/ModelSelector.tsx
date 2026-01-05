import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles, Zap, Clapperboard } from 'lucide-react';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/lib/models-config';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    mode: 'image' | 'video';
    options?: any[]; // Optional override for dynamic filtering
}

// Badge color mapping
const getBadgeStyle = (badge: string) => {
    const normalizedBadge = badge.toUpperCase();
    if (normalizedBadge === 'HOT' || normalizedBadge.includes('HOT')) {
        return 'bg-orange-500/20 text-orange-400';
    }
    if (normalizedBadge === 'RẺ' || normalizedBadge.includes('RẺ')) {
        return 'bg-green-500/20 text-green-400';
    }
    if (normalizedBadge === 'NHANH') {
        return 'bg-[#00BCD4]/20 text-[#00BCD4]';
    }
    if (normalizedBadge === 'PRO') {
        return 'bg-[#E040FB]/20 text-[#E040FB]';
    }
    if (normalizedBadge === 'NEW') {
        return 'bg-blue-500/20 text-blue-400';
    }
    return 'bg-yellow-500/20 text-yellow-400';
};

export default function ModelSelector({ value, onChange, mode, options: customOptions }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const options = customOptions || (mode === 'image' ? IMAGE_MODELS : VIDEO_MODELS);
    const selectedOption = options.find(opt => opt.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-2" ref={containerRef}>
            <label className="text-sm font-medium text-[#B0B8C4]">Model AI</label>
            <div className="relative">
                {/* Trigger Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                        isOpen 
                            ? "border-[#00BCD4] bg-[#252D3D] ring-1 ring-[#00BCD4]/30" 
                            : "border-[#6B7280] bg-[#252D3D] hover:border-[#B0B8C4]"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1F2833] flex items-center justify-center text-[#00BCD4]">
                            <selectedOption.icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-white">{selectedOption.label}</span>
                        {selectedOption.badge && (
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                getBadgeStyle(selectedOption.badge)
                            )}>
                                {selectedOption.badge}
                            </span>
                        )}
                    </div>
                    <ChevronDown className={cn(
                        "h-4 w-4 text-[#6B7280] transition-transform duration-200",
                        isOpen && "rotate-180"
                    )} />
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-[#1F2833] shadow-2xl shadow-black/40 max-h-[350px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2">
                            {options.map((option) => {
                                const Icon = option.icon;
                                const isSelected = value === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 mb-1",
                                            isSelected 
                                                ? 'bg-[#00BCD4]/15 border border-[#00BCD4]/30' 
                                                : 'hover:bg-[#252D3D] border border-transparent'
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors",
                                            isSelected ? "bg-[#00BCD4]/20 text-[#00BCD4]" : "bg-[#252D3D] text-[#6B7280]"
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    isSelected ? "text-[#00BCD4]" : "text-white"
                                                )}>{option.label}</span>
                                                {option.badge && (
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                                        getBadgeStyle(option.badge)
                                                    )}>
                                                        {option.badge}
                                                    </span>
                                                )}
                                            </div>
                                            {option.description && (
                                                <p className="text-[11px] text-[#6B7280] mt-0.5 line-clamp-1">
                                                    {option.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Checkmark */}
                                        {isSelected && (
                                            <Check className="h-4 w-4 text-[#00BCD4] shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
