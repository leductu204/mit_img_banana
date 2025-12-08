// app/account/page.tsx
/**
 * Account page with profile, job history, and transaction history
 */

"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import { useTransactions } from '@/hooks/useTransactions';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import JobHistoryTable from '@/components/account/JobHistoryTable';
import TransactionHistoryTable from '@/components/account/TransactionHistoryTable';
import CreditsBadge from '@/components/common/CreditsBadge';
import { User, LogOut, Coins } from 'lucide-react';
import Button from '@/components/common/Button';
import { CardSkeleton } from '@/components/common/SkeletonLoader';

function AccountContent() {
    const { user, logout } = useAuth();
    const { jobs, loading: jobsLoading, pagination: jobsPagination, getMyJobs } = useJobs();
    const { transactions, loading: txLoading, pagination: txPagination, getMyTransactions } = useTransactions();
    
    const [jobsFilter, setJobsFilter] = useState<string | undefined>(undefined);
    const [jobsPage, setJobsPage] = useState(1);
    const [txPage, setTxPage] = useState(1);

    useEffect(() => {
        getMyJobs(jobsPage, 10, jobsFilter);
    }, [getMyJobs, jobsPage, jobsFilter]);

    useEffect(() => {
        getMyTransactions(txPage, 10);
    }, [getMyTransactions, txPage]);

    const handleJobsFilterChange = (status: string | undefined) => {
        setJobsFilter(status);
        setJobsPage(1);
    };

    // Removed early return to allow skeleton rendering
    // if (!user) return null;

    return (
        <div className="flex min-h-screen bg-background">
            <MobileNav />
            <Sidebar />
            <main className="flex-1 pt-[57px] md:pt-0 overflow-auto">
                <div className="p-6 max-w-5xl mx-auto space-y-6">
                    {/* Profile Card */}
                    {/* Profile Card */}
                    {!user ? (
                        <CardSkeleton />
                    ) : (
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    {user.avatar_url ? (
                                        <img 
                                            src={user.avatar_url} 
                                            alt={user.username}
                                            className="h-20 w-20 rounded-full border-4 border-[#0F766E]/20"
                                        />
                                    ) : (
                                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-4 border-[#0F766E]/20">
                                            <User className="h-10 w-10 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-2xl font-bold text-foreground mb-1">
                                        {user.username || user.email.split('@')[0]}
                                    </h1>
                                    <p className="text-muted-foreground mb-4">{user.email}</p>
                                    
                                    {/* Credits Display */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F766E]/10 border border-[#0F766E]/20">
                                            <Coins className="h-5 w-5 text-[#0F766E]" />
                                            <span className="text-2xl font-bold text-[#0F766E]">{user.credits}</span>
                                            <span className="text-sm text-[#0F766E]/80">credits</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Logout Button */}
                                <div className="flex-shrink-0">
                                    <Button
                                        onClick={logout}
                                        className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Đăng xuất
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Job History */}
                    <JobHistoryTable
                        jobs={jobs}
                        loading={jobsLoading}
                        currentPage={jobsPage}
                        totalPages={jobsPagination.pages}
                        onPageChange={setJobsPage}
                        onFilterChange={handleJobsFilterChange}
                        selectedFilter={jobsFilter}
                    />

                    {/* Transaction History */}
                    <TransactionHistoryTable
                        transactions={transactions}
                        loading={txLoading}
                        currentPage={txPage}
                        totalPages={txPagination.pages}
                        onPageChange={setTxPage}
                    />
                </div>
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
