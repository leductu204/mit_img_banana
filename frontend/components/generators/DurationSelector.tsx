import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DurationSelectorProps {
    value: string;
    onChange: (value: string) => void;
    options?: string[];
}

export default function DurationSelector({ value, onChange, options: propOptions }: DurationSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const defaultOptions = [
        { value: '5s', label: '5 giây' },
        { value: '10s', label: '10 giây' },
    ];

    const options = propOptions 
        ? propOptions.map(opt => ({ value: opt, label: opt === '5s' ? '5 giây' : '10 giây' }))
        : defaultOptions;

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
            <label className="text-sm font-medium text-[#B0B8C4]">Thời lượng</label>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                        isOpen 
                            ? "border-[#00BCD4] bg-[#252D3D] ring-1 ring-[#00BCD4]/30" 
                            : "border-[#6B7280] bg-[#252D3D] hover:border-[#B0B8C4]"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#00BCD4]" />
                        <span className="text-sm text-white">{selectedOption.label}</span>
                    </div>
                    <ChevronDown className={cn(
                        "h-4 w-4 text-[#6B7280] transition-transform duration-200",
                        isOpen && "rotate-180"
                    )} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-[#1F2833] shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2">
                            {options.map((option) => {
                                const isSelected = value === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all duration-150",
                                            isSelected 
                                                ? 'bg-[#00BCD4]/15 text-[#00BCD4] border border-[#00BCD4]/30' 
                                                : 'text-white hover:bg-[#252D3D] border border-transparent'
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-[#6B7280]" />
                                            <span>{option.label}</span>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-[#00BCD4]" />}
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
