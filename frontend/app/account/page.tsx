"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import { useTransactions } from '@/hooks/useTransactions';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ProfileHeader from '@/components/account/ProfileHeader';
import UsageStats from '@/components/account/UsageStats';
import ActivityTable from '@/components/account/ActivityTable';
import { CardSkeleton } from '@/components/common/SkeletonLoader';
import Header from "@/components/layout/Header";
import { useConcurrencyLimits } from '@/hooks/useConcurrencyLimits';

function AccountContent() {
    const { user, logout } = useAuth();
    const { 
        jobs, 
        loading: jobsLoading, 
        pagination: jobsPagination, 
        getMyJobs, 
        cancelJob,
        deleteJob,
        batchDeleteJobs
    } = useJobs();
    const { 
        transactions, 
        loading: transactionsLoading, 
        pagination: transactionsPagination, 
        getMyTransactions 
    } = useTransactions();
    const { limits, refresh: refreshLimits } = useConcurrencyLimits(5000);
    
    const [jobsFilter, setJobsFilter] = useState<string | undefined>(undefined);
    const [jobsPage, setJobsPage] = useState(1);
    const [transactionsPage, setTransactionsPage] = useState(1);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        getMyJobs(jobsPage, 10, jobsFilter);
        getMyTransactions(transactionsPage, 10);
        refreshLimits();
    }, [getMyJobs, getMyTransactions, jobsPage, transactionsPage, jobsFilter, refreshTrigger, refreshLimits]);

    const handleJobsFilterChange = (status: string | undefined) => {
        setJobsFilter(status);
        setJobsPage(1);
    };

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
        refreshLimits();
    };

    const usageStats = {
        imageThreads: { 
            active: limits?.active_counts?.image || 0, 
            total: limits?.limits?.image || 3 
        },
        videoThreads: { 
            active: limits?.active_counts?.video || 0, 
            total: limits?.limits?.video || 1 
        },
        totalThreads: limits?.limits?.total || 3
    };

    return (
        <div className="min-h-screen bg-[#0A0E13] text-slate-200 font-sans selection:bg-[#22d3ee]/30 selection:text-[#67e8f9]">
            <Header />
            
            <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-8">
                {!user ? (
                    <CardSkeleton />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <ProfileHeader 
                            user={user} 
                            planName={limits?.plan_name} 
                            planDescription={limits?.plan_description}
                            planExpiresAt={limits?.plan_expires_at}
                        />
                        <UsageStats 
                            imageThreads={usageStats.imageThreads}
                            videoThreads={usageStats.videoThreads}
                            totalThreads={usageStats.totalThreads}
                        />
                    </div>
                )}

                <ActivityTable
                    jobs={jobs}
                    loading={jobsLoading}
                    currentPage={jobsPage}
                    totalPages={jobsPagination.pages}
                    onPageChange={setJobsPage}
                    onFilterChange={handleJobsFilterChange}
                    selectedFilter={jobsFilter}
                    onCancelJob={cancelJob}
                    onDeleteJob={deleteJob}
                    onDeleteAll={batchDeleteJobs}
                    onRefresh={handleRefresh}
                    
                    transactions={transactions}
                    transactionsLoading={transactionsLoading}
                    transactionsTotalPages={transactionsPagination.pages}
                    onTransactionsPageChange={setTransactionsPage}
                    transactionsCurrentPage={transactionsPage}
                    totalJobs={jobsPagination.total}
                    totalTransactions={transactionsPagination.total}
                />
            </main>
        </div>
    );
}

export default function AccountPage() {
    return (
        <ProtectedRoute>
            <AccountContent />
        </ProtectedRoute>
    );
}
