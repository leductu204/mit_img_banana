// hooks/useJobs.ts
/**
 * Hook for fetching user job history
 */

import { useState, useCallback } from 'react';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { getAuthHeader } from '@/lib/auth';

export interface Job {
    job_id: string;
    user_id: string;
    type: 'i2i' | 't2i' | 'i2v' | 't2v';
    model: string;
    prompt: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    input_images?: string;
    input_params?: string;
    output_url?: string;
    error_message?: string;
    credits_cost: number;
    credits_refunded: boolean;
    created_at: string;
    updated_at: string;
}

export interface JobsResponse {
    jobs: Job[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export function useJobs() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ total: 0, pages: 0, page: 1 });

    const getMyJobs = useCallback(async (
        page: number = 1,
        limit: number = 10,
        status?: string,
        type?: string
    ): Promise<JobsResponse | null> => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (status) params.append('status', status);
            if (type) params.append('type', type);

            const response = await fetch(
                `${NEXT_PUBLIC_API}/api/users/me/jobs?${params}`,
                {
                    headers: {
                        ...getAuthHeader(),
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch jobs');
            }

            const data: JobsResponse = await response.json();
            setJobs(data.jobs);
            setPagination({
                total: data.total,
                pages: data.pages,
                page: data.page,
            });
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        jobs,
        loading,
        error,
        pagination,
        getMyJobs,
    };
}
