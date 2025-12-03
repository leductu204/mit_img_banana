import { Sparkles, Zap, Video, Globe, Wind, Clapperboard, BarChart3, Banana } from 'lucide-react';
import React from 'react';

export interface ModelConfig {
    value: string;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: string;
    colors?: string;
    // Capabilities
    aspectRatios?: string[]; // If undefined, show all. If empty array, hide selector.
    qualities?: string[]; // If undefined, show all. If empty array, hide selector.
    durations?: string[]; // If undefined, show all. If empty array, hide selector.
}

export const IMAGE_MODELS: ModelConfig[] = [
    { 
        value: 'Nano Banana', 
        label: 'Nano Banana', 
        description: 'Phiên bản Nano Banana của Google',
        icon: Banana,
        // Nano Banana might be simple, maybe no quality selection?
        qualities: [], // Hide quality selector
        aspectRatios: ['1:1', '9:16', '16:9', '4:3', '3:4']
    },
    { 
        value: 'Nano Banana PRO', 
        label: 'Nano Banana PRO', 
        description: 'Phiên bản "Chuối" PRO của Google',
        icon: Banana,
        badge: 'HOT',
        colors: 'yellow',
        // PRO supports everything
        qualities: ['1K', '2K', '4K'],
        aspectRatios: undefined // Show all
    }
];

export const VIDEO_MODELS: ModelConfig[] = [
    { 
        value: 'higgsfield', 
        label: 'Higgsfield', 
        description: 'Advanced camera controls and effect presets',
        icon: Sparkles,
        durations: ['5s', '10s'],
        qualities: ['720p', '1080p']
    },
    { 
        value: 'minimax-hailuo', 
        label: 'Minimax Hailuo', 
        description: 'High-dynamic VFX-ready, fastest and most affordable',
        icon: Zap,
        badge: 'Unlimited',
        durations: ['5s', '10s'],
        qualities: ['720p']
    },
    { 
        value: 'openai-sora-2', 
        label: 'OpenAI Sora 2', 
        description: 'Multi-shot video with sound generation',
        icon: Video,
        durations: ['4s', '8s', '12s'],
        qualities: ['1080p']
    },
    { 
        value: 'google-veo', 
        label: 'Google Veo', 
        description: 'Precision video with sound control',
        icon: Globe,
        durations: ['5s'],
        qualities: ['1080p']
    },
    { 
        value: 'wan', 
        label: 'Wan', 
        description: 'Camera-controlled video with sound, more freedom',
        icon: Wind,
        durations: ['5s'],
        qualities: ['720p', '1080p']
    },
    { 
        value: 'kling', 
        label: 'Kling', 
        description: 'Perfect motion with advanced video control',
        icon: Clapperboard,
        badge: 'Unlimited',
        durations: ['5s', '10s'],
        qualities: ['720p', '1080p']
    },
    { 
        value: 'seedance', 
        label: 'Seedance', 
        description: 'Cinematic multi-shot video creation',
        icon: BarChart3,
        badge: 'Unlimited',
        durations: ['5s', '10s'],
        qualities: ['720p', '1080p']
    },
];

export const getModelConfig = (value: string, mode: 'image' | 'video'): ModelConfig | undefined => {
    const list = mode === 'image' ? IMAGE_MODELS : VIDEO_MODELS;
    return list.find(m => m.value === value);
};
