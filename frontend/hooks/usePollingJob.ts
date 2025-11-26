// usePollingJob.ts
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { JobInfo } from '@/lib/models';
import { delay } from '@/lib/helpers';

export function usePollingJob(jobId: string, intervalMs = 2000) {
    const [job, setJob] = useState<JobInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            try {
                const data = await apiRequest<JobInfo>(`/api/jobs/${jobId}`);
                if (!cancelled) {
                    setJob(data);
                    setLoading(false);
                    if (data.status !== 'completed' && data.status !== 'failed') {
                        await delay(intervalMs);
                        poll();
                    }
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e.message);
                    setLoading(false);
                }
            }
        };
        poll();
        return () => {
            cancelled = true;
        };
    }, [jobId, intervalMs]);

    return { job, loading, error };
}
