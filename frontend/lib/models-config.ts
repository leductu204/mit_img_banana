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
    speeds?: string[]; // If undefined, hide selector.
    audio?: boolean;
    note?: string; // Specific note to display in the generator UI
}

export const IMAGE_MODELS: ModelConfig[] = [
    // Higgsfield Models
    { 
        value: 'nano-banana', 
        label: 'Nano Banana', 
        description: 'Phiên bản Nano Banana của Google',
        icon: Banana,
        aspectRatios: ['auto', '1:1', '4:3', '16:9', '21:9', '5:4', '3:2', '2:3', '9:16', '3:4', '4:5'],
        speeds: ['fast', 'slow']
    },
    { 
        value: 'nano-banana-pro', 
        label: 'Nano Banana PRO', 
        description: 'Phiên bản "Chuối" PRO của Google',
        icon: Banana,
        badge: 'HOT',
        colors: 'yellow',
        // PRO supports resolution selection
        resolutions: ['1k', '2k', '4k'],  // Lowercase as required by API
        aspectRatios: ['auto', '1:1', '4:3', '16:9', '21:9', '5:4', '3:2', '2:3', '9:16', '3:4', '4:5'],
        speeds: ['fast', 'slow']
    },

    // Google Client Models
    { 
        value: 'nano-banana-cheap', 
        label: 'Nano Banana Fast', 
        description: 'Phiên bản Nano Banana của Google - Nhanh',
        icon: Banana,
        aspectRatios: ['9:16', '16:9']
    },
    { 
        value: 'nano-banana-pro-cheap', 
        label: 'Nano Banana PRO Fast', 
        description: 'Phiên bản "Chuối" PRO của Google - Nhanh',
        icon: Banana,
        badge: 'HOT',
        colors: 'yellow',
        aspectRatios: ['9:16', '16:9']
    },
    { 
        value: 'image-4.0', 
        label: 'Imagen 4.0', 
        description: 'Mô hình tạo ảnh mới nhất - Imagen 4.0',
        icon: Sparkles,
        badge: 'NEW',
        colors: 'blue',
        aspectRatios: ['9:16', '16:9']
    }
];

export const VIDEO_MODELS: ModelConfig[] = [
    { 
        value: 'kling-2.5-turbo', 
        label: 'Kling 2.5 Turbo', 
        description: 'Chỉ hỗ trợ IMG to Video',
        icon: Clapperboard,
        badge: 'NHANH',
        durations: ['5s','10s'],
        qualities: ['720p', '1080p'],
        note: 'Chỉ hỗ trợ IMG to Video. Tốc độ nhanh nhất',
    },
    { 
        value: 'kling-o1-video', 
        label: 'Kling O1 Video', 
        description: 'Chỉ hỗ trợ IMG to Video',
        icon: Clapperboard,
        durations: ['5s', '10s'],
        aspectRatios: ['9:16', '16:9', '1:1'],
        note: 'Chỉ hỗ trợ IMG to Video. Tốc độ trung bình',
    },
    { 
        value: 'kling-2.6', 
        label: 'Kling 2.6', 
        description: 'Bao gồm cả T2V và I2V',
        icon: Clapperboard,
        badge: 'RẺ',
        durations: ['5s','10s'],
        aspectRatios: ['9:16', '16:9', '1:1'],
        audio: true,
        note: 'Bao gồm cả T2V và I2V. Tốc độ chậm',
    },
    { 
        value: 'veo3.1-low', 
        label: 'Veo 3.1', 
        description: 'Mô hình veo3.1 - RẺ',
        icon: Video,
        badge: 'HOT - RẺ',
        aspectRatios: ['9:16', '16:9'],
        note: 'Hỗ trợ cả T2V và I2V. Video 8 giây - RẺ',
    },
    { 
        value: 'veo3.1-fast', 
        label: 'Veo 3.1 FAST', 
        description: 'Mô hình veo3.1 - NHANH',
        icon: Zap,
        badge: 'NHANH',
        colors: 'green',
        aspectRatios: ['9:16', '16:9'],
        note: 'Hỗ trợ cả T2V và I2V. Video 8 giây - NHANH',
    },
    {
        value: 'veo3.1-high',
        label: 'Veo 3.1 HIGH',
        description: 'Chất lượng tốt nhất',
        icon: Sparkles,
        colors: 'yellow',
        aspectRatios: ['9:16', '16:9'],
        note: 'Hỗ trợ cả T2V và I2V. Video 8 giây - CHẤT LƯỢNG CAO',
    },
    {
        value: 'sora-2.0',
        label: 'Sora 2.0',
        description: 'Tạo video siêu thực từ OpenAI',
        icon: Sparkles,
        badge: 'NEW',
        colors: 'purple',
        durations: ['10s', '15s'],
        aspectRatios: ['16:9', '9:16'], 
        note: 'Hỗ trợ T2V và I2V. Chất lượng phù hợp làm Aff.'
    }
];

export const getModelConfig = (value: string, mode: 'image' | 'video'): ModelConfig | undefined => {
    const list = mode === 'image' ? IMAGE_MODELS : VIDEO_MODELS;
    return list.find(m => m.value === value);
};
