import React, { useState, useRef, useEffect } from 'react';
import {
    Square,
    RectangleHorizontal,
    RectangleVertical,
    Monitor,
    Smartphone,
    Maximize,
    ChevronDown,
    Check
} from 'lucide-react';

interface AspectRatioSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export default function AspectRatioSelector({ value, onChange }: AspectRatioSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const options = [
        // { value: 'Auto', label: 'Auto', icon: Maximize },
        { value: '1:1', label: '1:1', icon: Square },
        { value: '16:9', label: '16:9', icon: RectangleHorizontal },
        { value: '9:16', label: '9:16', icon: Smartphone },
        // { value: '4:3', label: '4:3', icon: RectangleHorizontal },

        // { value: '21:9', label: '21:9', icon: Monitor },
        // { value: '5:4', label: '5:4', icon: RectangleHorizontal },
        // { value: '3:2', label: '3:2', icon: RectangleHorizontal },
        // { value: '2:3', label: '2:3', icon: RectangleVertical },

        // { value: '3:4', label: '3:4', icon: RectangleVertical },
        // { value: '4:5', label: '4:5', icon: RectangleVertical },
    ];

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
            <label className="text-sm font-medium text-foreground">Tỷ lệ khung hình</label>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <selectedOption.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedOption.label}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-border bg-popover shadow-md max-h-[300px] overflow-y-auto">
                        <div className="p-1">
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
                                        className={`w-full flex items-center justify-between p-2 rounded-sm text-sm transition-colors ${isSelected
                                                ? 'bg-accent text-accent-foreground'
                                                : 'hover:bg-accent/50 text-foreground'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                            <span>{option.label}</span>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-primary" />}
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
