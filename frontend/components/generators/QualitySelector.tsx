import React from 'react';

interface QualitySelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export default function QualitySelector({ value, onChange }: QualitySelectorProps) {
    const options = [
        { value: '1k', label: '1K' },
        { value: '2k', label: '2K' },
        { value: '4k', label: '4K' },
    ];

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Chất lượng</label>
            <div className="grid grid-cols-3 gap-2">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`py-2 px-3 text-sm font-medium rounded-md border transition-all ${value === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input bg-background hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
