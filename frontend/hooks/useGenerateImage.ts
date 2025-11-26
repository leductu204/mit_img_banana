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
        model_key: string;
        image_url?: string;
        aspect_ratio?: string;
        quality?: string;
        strength?: number;
        keep_style?: boolean;
    }) => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiRequest<GenerationResponse>('/api/generate/t2i', {
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
