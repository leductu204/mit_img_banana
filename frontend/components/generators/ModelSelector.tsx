import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/lib/models-config';

interface ModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    mode: 'image' | 'video';
    options?: any[]; // Optional override for dynamic filtering
}

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
            <label className="text-sm font-medium text-foreground">Model AI</label>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <selectedOption.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{selectedOption.label}</span>
                        {selectedOption.badge && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-medium">
                                {selectedOption.badge}
                            </span>
                        )}
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg max-h-[400px] overflow-y-auto">
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
                                        className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                                            isSelected 
                                                ? 'bg-accent text-accent-foreground' 
                                                : 'hover:bg-accent/50 text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{option.label}</span>
                                                {option.badge && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-medium">
                                                        {option.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                {option.description}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <Check className="h-4 w-4 text-primary shrink-0" />
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
