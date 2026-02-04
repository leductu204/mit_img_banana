"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useJobs, Job } from '@/hooks/useJobs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/api';

interface JobsContextType {
    jobs: Job[];
    loading: boolean;
    refreshJobs: () => Promise<void>;
    addOptimisticJob: (job: Partial<Job>) => string; // Returns temp ID
    updateOptimisticJob: (tempId: string, realJobId: string, status?: string) => void;
    removeJob: (jobId: string) => Promise<void>;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export function JobsProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const { getMyJobs, deleteJob } = useJobs(); // We use the fetch logic from the existing hook
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const [optimisticJobs, setOptimisticJobs] = useState<Job[]>([]);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initial fetch
    const fetchJobs = useCallback(async () => {
        if (!isAuthenticated) return;
        
        try {
            setLoading(true);
            const res = await getMyJobs(1, 20); // Fetch top 20 recent jobs
            if (res && res.jobs) {
                setJobs(res.jobs);
            }
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, getMyJobs]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // Polling for active jobs
    useEffect(() => {
        if (!isAuthenticated) return;

        // Stop existing interval
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

        const checkForUpdates = async () => {
            // Check if we have any pending/processing jobs (real or optimistic)
            const hasActiveJobs = [...jobs, ...optimisticJobs].some(
                j => ['pending', 'processing'].includes(j.status)
            );

            if (hasActiveJobs) {
                 // Silent refresh to update statuses
                 const res = await getMyJobs(1, 20);
                 if (res && res.jobs) {
                     setJobs(currentRealJobs => {
                        // Merge logic could be complex, simple replacement for now is safe for "Recent" list
                        // But we want to keep current selection state if we were managing that... 
                        // actually selection is local to components usually.
                        return res.jobs;
                     });
                     
                     // Also check if optimistic jobs have appeared in the real list, if so remove them
                     setOptimisticJobs(prev => prev.filter(optJob => 
                         !res.jobs.some(realJob => realJob.job_id === optJob.job_id)
                     ));
                 }
            }
        };

        pollingIntervalRef.current = setInterval(checkForUpdates, 3000); // Poll every 3s if active

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, [isAuthenticated, jobs, optimisticJobs, getMyJobs]);


    // Combined list: Optimistic jobs first, then real jobs
    // Filter out optimistic jobs that might have been added to real jobs list already (by ID match)
    const displayJobs = [
        ...optimisticJobs, 
        ...jobs.filter(realJob => !optimisticJobs.some(opt => opt.job_id === realJob.job_id))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


    const addOptimisticJob = useCallback((jobData: Partial<Job>) => {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newJob: Job = {
            job_id: tempId,
            user_id: 'me',
            type: 't2i', // default, can be overridden
            model: 'unknown',
            prompt: '',
            status: 'pending', // Optimistic jobs start as pending/queued
            credits_cost: 0,
            credits_refunded: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...jobData,
        } as Job;

        setOptimisticJobs(prev => [newJob, ...prev]);
        return tempId;
    }, []);

    const updateOptimisticJob = useCallback((tempId: string, realJobId: string, status?: string) => {
        setOptimisticJobs(prev => prev.map(job => {
            if (job.job_id === tempId) {
                return {
                    ...job,
                    job_id: realJobId, // Replace temp ID with real ID
                    status: (status as any) || job.status
                };
            }
            return job;
        }));
        // Trigger a fetch to ensure data consistency soon
        setTimeout(() => fetchJobs(), 1000);
    }, [fetchJobs]);

    const removeJob = useCallback(async (jobId: string) => {
        // If it's a temp job, just remove from optimistic
        if (jobId.startsWith('temp_')) {
            setOptimisticJobs(prev => prev.filter(j => j.job_id !== jobId));
            return;
        }

        // Real job
        const success = await deleteJob(jobId);
        if (success) {
            setJobs(prev => prev.filter(j => j.job_id !== jobId));
            toast.success("Đã xóa job");
        } else {
            toast.error("Không thể xóa job");
        }
    }, [deleteJob, toast]);

    const refreshJobs = async () => {
        await fetchJobs();
    };

    return (
        <JobsContext.Provider value={{ 
            jobs: displayJobs, 
            loading, 
            refreshJobs, 
            addOptimisticJob, 
            updateOptimisticJob, 
            removeJob 
        }}>
            {children}
        </JobsContext.Provider>
    );
}

export function useGlobalJobs() {
    const context = useContext(JobsContext);
    if (context === undefined) {
        throw new Error('useGlobalJobs must be used within a JobsProvider');
    }
    return context;
}
