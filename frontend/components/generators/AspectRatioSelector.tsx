import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, RectangleHorizontal, Square, RectangleVertical, Maximize, ScanLine, Sparkles } from 'lucide-react';

interface AspectRatioSelectorProps {
    value: string;
    onChange: (value: string) => void;
    options?: string[];
}

// Icon mapping for each aspect ratio
const getIcon = (ratio: string) => {
    switch(ratio) {
        case 'auto': return Sparkles;
        case '1:1': return Square;
        case '16:9': return RectangleHorizontal;
        case '21:9': return ScanLine;
        case '4:3': return RectangleHorizontal;
        case '5:4': return RectangleHorizontal;
        case '3:2': return RectangleHorizontal;
        case '9:16': return RectangleVertical;
        case '3:4': return RectangleVertical;
        case '4:5': return RectangleVertical;
        case '2:3': return RectangleVertical;
        default: return Square;
    }
};

const DEFAULT_OPTIONS = ['auto', '1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '5:4'];

export default function AspectRatioSelector({ value, onChange, options: providedOptions }: AspectRatioSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Use provided options or defaults
    const options = providedOptions || DEFAULT_OPTIONS;
    
    // Find selected option
    const selectedLabel = value || options[0];
    const SelectedIcon = getIcon(selectedLabel);

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
        <div ref={containerRef}>
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
                        <SelectedIcon className="w-4 h-4 text-[#6B7280]" />
                        <span className="text-sm font-medium text-white">{selectedLabel}</span>
                    </div>
                    <ChevronDown className={cn(
                        "h-4 w-4 text-[#6B7280] transition-transform duration-200",
                        isOpen && "rotate-180"
                    )} />
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-[#1F2833] shadow-2xl shadow-black/40 max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2">
                            {options.map((ratio) => {
                                const isSelected = value === ratio;
                                const Icon = getIcon(ratio);
                                return (
                                    <button
                                        key={ratio}
                                        onClick={() => {
                                            onChange(ratio);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150",
                                            isSelected 
                                                ? 'bg-[#00BCD4]/15 border border-[#00BCD4]/30' 
                                                : 'hover:bg-[#252D3D] border border-transparent'
                                        )}
                                    >
                                        {/* Icon */}
                                        <Icon className={cn(
                                            "w-4 h-4",
                                            isSelected ? "text-[#00BCD4]" : "text-[#6B7280]"
                                        )} />

                                        {/* Label */}
                                        <span className={cn(
                                            "text-sm font-medium flex-1",
                                            isSelected ? "text-[#00BCD4]" : "text-white"
                                        )}>{ratio}</span>

                                        {/* Checkmark */}
                                        {isSelected && (
                                            <Check className="h-4 w-4 text-[#00BCD4]" />
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
