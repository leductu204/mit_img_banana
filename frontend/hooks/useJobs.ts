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
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
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
            setJobs(data.jobs || []);
            setPagination({
                total: data.total || 0,
                pages: data.pages || 0,
                page: data.page || 1,
            });
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
        try {
            const response = await fetch(
                `${NEXT_PUBLIC_API}/api/jobs/${jobId}/cancel`,
                {
                    method: 'POST',
                    headers: {
                        ...getAuthHeader(),
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to cancel job');
            }

            // Update local state
            setJobs(prev => prev.map(job => 
                job.job_id === jobId 
                    ? { ...job, status: 'cancelled' as const }
                    : job
            ));

            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
        try {
            const response = await fetch(
                `${NEXT_PUBLIC_API}/api/jobs/${jobId}`,
                {
                    method: 'DELETE',
                    headers: {
                        ...getAuthHeader(),
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete job');
            }

            // Update local state
            setJobs(prev => prev.filter(job => job.job_id !== jobId));
            setPagination(prev => ({ ...prev, total: prev.total - 1 }));

            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    const batchDeleteJobs = useCallback(async (jobIds: string[]): Promise<boolean> => {
        try {
            const response = await fetch(
                `${NEXT_PUBLIC_API}/api/jobs/batch-delete`,
                {
                    method: 'POST',
                    headers: {
                        ...getAuthHeader(),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(jobIds),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete jobs');
            }

            // Update local state by removing all deleted IDs
            setJobs(prev => prev.filter(job => !jobIds.includes(job.job_id)));
            setPagination(prev => ({ ...prev, total: prev.total - jobIds.length }));

            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    return {
        jobs,
        loading,
        error,
        pagination,
        getMyJobs,
        cancelJob,
        deleteJob,
        batchDeleteJobs,
    };
}
