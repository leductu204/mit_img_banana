
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

export interface ConcurrentLimitDetails {
    total: number;
    image: number;
    video: number;
}

export interface UserLimitsResponse {
    plan_id: string;
    limits: ConcurrentLimitDetails;
    active_counts: ConcurrentLimitDetails;
    pending_counts: ConcurrentLimitDetails;
}

export function useConcurrencyLimits(refreshInterval = 0) {
    const [limits, setLimits] = useState<UserLimitsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchLimits = async () => {
        try {
            // Check if we have a token first (simple check to avoid 401 loops on public pages)
            const token = localStorage.getItem('token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            const data = await apiRequest<UserLimitsResponse>('/api/users/me/limits');
            setLimits(data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch limits:", err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLimits();
        
        let interval: NodeJS.Timeout;
        if (refreshInterval > 0) {
            interval = setInterval(fetchLimits, refreshInterval);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [refreshInterval]);

    return { limits, isLoading, error, refresh: fetchLimits };
}
