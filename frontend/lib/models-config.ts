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
    aspectRatios?: string[]; // If undefined, hide selector. If array with values, show only those options.
    qualities?: string[]; // If undefined, hide selector. If array with values, show only those options.
    resolutions?: string[]; // If undefined, hide selector. If array with values, show only those options.
    durations?: string[]; // If undefined, hide selector. If array with values, show only those options.
    audio?: boolean;
    note?: string; // Specific note to display in the generator UI
}

export const IMAGE_MODELS: ModelConfig[] = [
    { 
        value: 'Nano Banana', 
        label: 'Nano Banana', 
        description: 'Phiên bản Nano Banana của Google',
        icon: Banana,
        aspectRatios: ['1:1', '9:16', '16:9', '4:3', '3:4']
    },
    { 
        value: 'Nano Banana PRO', 
        label: 'Nano Banana PRO', 
        description: 'Phiên bản "Chuối" PRO của Google',
        icon: Banana,
        badge: 'HOT',
        colors: 'yellow',
        // PRO supports resolution selection
        resolutions: ['1k', '2k', '4k'],  // Lowercase as required by API
        aspectRatios: undefined // Show all
    }
];

export const VIDEO_MODELS: ModelConfig[] = [
    // { 
    //     value: 'higgsfield', 
    //     label: 'Higgsfield', 
    //     description: 'Advanced camera controls and effect presets',
    //     icon: Sparkles,
    //     durations: ['5s', '10s'],
    //     qualities: ['720p', '1080p']
    // },
    // { 
    //     value: 'minimax-hailuo', 
    //     label: 'Minimax Hailuo', 
    //     description: 'High-dynamic VFX-ready, fastest and most affordable',
    //     icon: Zap,
    //     badge: 'Unlimited',
    //     durations: ['5s', '10s'],
    //     qualities: ['720p']
    // },
    // { 
    //     value: 'openai-sora-2', 
    //     label: 'OpenAI Sora 2', 
    //     description: 'Multi-shot video with sound generation',
    //     icon: Video,
    //     durations: ['4s', '8s', '12s'],
    //     qualities: ['1080p']
    // },
    // { 
    //     value: 'google-veo', 
    //     label: 'Google Veo', 
    //     description: 'Precision video with sound control',
    //     icon: Globe,
    //     durations: ['5s'],
    //     qualities: ['1080p']
    // },
    // { 
    //     value: 'wan', 
    //     label: 'Wan', 
    //     description: 'Camera-controlled video with sound, more freedom',
    //     icon: Wind,
    //     durations: ['5s'],
    //     qualities: ['720p', '1080p']
    // },
    { 
        value: 'kling-2.5-turbo', 
        label: 'Kling 2.5 Turbo', 
        description: 'Chỉ hỗ trợ IMG to Video',
        icon: Clapperboard,
        badge: 'Unlimited',
        durations: ['5s'],
        resolutions: ['720p'],
        note: 'Chỉ hỗ trợ IMG to Video. Tốc độ nhanh nhất',
    },
    { 
        value: 'kling-o1-video', 
        label: 'Kling O1 Video', 
        description: 'Chỉ hỗ trợ IMG to Video',
        icon: Clapperboard,
        badge: 'Unlimited',
        durations: ['5s'],
        aspectRatios: ['9:16', '16:9', '1:1'],
        note: 'Chỉ hỗ trợ IMG to Video. Tốc độ trung bình',
    },
    { 
        value: 'kling-2.6', 
        label: 'Kling 2.6', 
        description: 'Bao gồm cả T2V và I2V',
        icon: Clapperboard,
        badge: 'Unlimited',
        durations: ['5s'],
        aspectRatios: ['9:16', '16:9', '1:1'],
        audio: true,
        note: 'Bao gồm cả T2V và I2V. Tốc độ chậm',
    },
    // { 
    //     value: 'seedance', 
    //     label: 'Seedance', 
    //     description: 'Cinematic multi-shot video creation',
    //     icon: BarChart3,
    //     badge: 'Unlimited',
    //     durations: ['5s', '10s'],
    //     qualities: ['720p', '1080p']
    // },
];

export const getModelConfig = (value: string, mode: 'image' | 'video'): ModelConfig | undefined => {
    const list = mode === 'image' ? IMAGE_MODELS : VIDEO_MODELS;
    return list.find(m => m.value === value);
};
