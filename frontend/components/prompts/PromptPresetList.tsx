// PromptPresetList.tsx
import React from 'react';

// Simple placeholder list of prompt presets
const presets = [
    { id: 1, label: 'Sunset over mountains', prompt: 'A vivid sunset over snow-capped mountains' },
    { id: 2, label: 'Futuristic city', prompt: 'A neon-lit futuristic cityscape at night' },
    { id: 3, label: 'Cute cat', prompt: 'A cute fluffy cat sitting on a windowsill' },
];

export default function PromptPresetList({ onSelect }: { onSelect: (prompt: string) => void }) {
    return (
        <div className="space-y-2">
            {presets.map((p) => (
                <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
                    onClick={() => onSelect(p.prompt)}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}
