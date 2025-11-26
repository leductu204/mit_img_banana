import React from 'react';

interface ModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
    const options = [
        { value: 'nano-banana', label: 'Nano Banana' },
        { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
    ];

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Model</label>
            <div className="flex p-1 bg-muted rounded-lg">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${value === option.value
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
