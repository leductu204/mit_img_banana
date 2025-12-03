import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Clock } from 'lucide-react';

interface DurationSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export default function DurationSelector({ value, onChange }: DurationSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const options = [
        { value: '5s', label: '5 giây' },
        { value: '10s', label: '10 giây' },
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
            <label className="text-sm font-medium text-foreground">Thời lượng</label>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedOption.label}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-border bg-popover shadow-md">
                        <div className="p-1">
                            {options.map((option) => {
                                const isSelected = value === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-2 rounded-sm text-sm transition-colors ${
                                            isSelected 
                                                ? 'bg-accent text-accent-foreground' 
                                                : 'hover:bg-accent/50 text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
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
