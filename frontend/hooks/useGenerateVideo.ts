// useGenerateVideo.ts
import { useState } from 'react';
import { apiRequest } from '@/lib/api';
import { GenerationResponse } from '@/lib/models';

export function useGenerateVideo() {
    const [result, setResult] = useState<GenerationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generate = async (payload: { prompt: string; model_key: string }) => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiRequest<GenerationResponse>('/api/generate/t2v', {
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

    return { generate, result, loading, error };
}
