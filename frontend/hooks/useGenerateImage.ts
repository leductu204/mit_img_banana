// useGenerateImage.ts
import { useState } from 'react';
import { apiRequest } from '@/lib/api';
import { GenerationResponse } from '@/lib/models';

export function useGenerateImage() {
    const [result, setResult] = useState<GenerationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generate = async (payload: {
        prompt: string;
        model: string;
        image_url?: string;
        aspect_ratio?: string;
        resolution?: string;
        strength?: number;
        keep_style?: boolean;
        input_images?: any[];
    }) => {
        setLoading(true);
        setError(null);
        try {
            // Use the correct API endpoint for Nano Banana image generation
            const data = await apiRequest<GenerationResponse>('/api/nano-banana/generate', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            setResult(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return { generate, result, loading, error, setResult, setLoading, setError };
}
