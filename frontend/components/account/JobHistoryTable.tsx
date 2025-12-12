"use client"

// components/account/JobHistoryTable.tsx
/**
 * Table component for displaying job history
 */

import { useState } from 'react';
import { Job } from '@/hooks/useJobs';
import { CheckCircle, XCircle, Clock, Loader2, ChevronLeft, ChevronRight, Ban, X } from 'lucide-react';
import Button from '../common/Button';
import { TableSkeleton } from '../common/SkeletonLoader';
import JobDetailsModal from './JobDetailsModal';

interface JobHistoryTableProps {
    jobs: Job[];
    loading: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onFilterChange: (status: string | undefined) => void;
    selectedFilter?: string;
    onCancelJob?: (jobId: string) => Promise<boolean | void>;
}

const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Hoàn thành' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Thất bại' },
    pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Đang chờ' },
    processing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Đang xử lý' },
    cancelled: { icon: Ban, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Đã hủy' },
};

const typeLabels: Record<string, string> = {
    t2i: 'Text to Image',
    i2i: 'Image to Image',
    t2v: 'Text to Video',
    i2v: 'Image to Video',
};

export default function JobHistoryTable({
    jobs,
    loading,
    currentPage,
    totalPages,
    onPageChange,
    onFilterChange,
    selectedFilter,
    onCancelJob,
}: JobHistoryTableProps) {
    const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);

    const handleCancel = async (jobId: string) => {
        if (!onCancelJob) return;
        setCancellingJobId(jobId);
        try {
            await onCancelJob(jobId);
        } finally {
            setCancellingJobId(null);
        }
    };
    const filters = [
        { value: undefined, label: 'Tất cả' },
        { value: 'completed', label: 'Hoàn thành' },
        { value: 'failed', label: 'Thất bại' },
        { value: 'pending', label: 'Đang chờ' },
    ];


    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground mb-3">Lịch sử tạo ảnh/video</h3>
                
                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    {filters.map((filter) => (
                        <button
                            key={filter.value ?? 'all'}
                            onClick={() => onFilterChange(filter.value)}
                            className={`
                                px-3 py-1.5 text-sm rounded-lg transition-colors
                                ${selectedFilter === filter.value
                                    ? 'bg-[#0F766E] text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }
                            `}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Loại</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Model</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Prompt</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Trạng thái</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Credits</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Xem lại</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-4">
                                    <TableSkeleton rows={5} />
                                </td>
                            </tr>
                        ) : jobs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                    Chưa có lịch sử tạo ảnh/video
                                </td>
                            </tr>
                        ) : (
                            jobs.map((job) => {
                                const status = statusConfig[job.status] || statusConfig.pending;
                                const StatusIcon = status.icon;
                                
                                return (
                                    <tr key={job.job_id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-foreground">
                                                {typeLabels[job.type] || job.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-foreground">{job.model}</span>
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <span className="text-sm text-muted-foreground truncate block" title={job.prompt}>
                                                {job.prompt.length > 50 ? `${job.prompt.slice(0, 50)}...` : job.prompt}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                                <StatusIcon className={`h-3 w-3 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-sm font-medium ${job.credits_refunded ? 'text-green-500' : 'text-red-500'}`}>
                                                {job.credits_refunded ? '+' : '-'}{job.credits_cost}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {(job.status === 'pending' || job.status === 'processing') && onCancelJob && (
                                                    <Button 
                                                        onClick={() => handleCancel(job.job_id)}
                                                        disabled={cancellingJobId === job.job_id}
                                                        className="h-8 px-2 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                    >
                                                        {cancellingJobId === job.job_id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <X className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                                <Button 
                                                    onClick={() => setSelectedJob(job)}
                                                    className="h-8 px-2 text-primary hover:text-primary/80 hover:bg-primary/10"
                                                >
                                                    Chi tiết
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        Trang {currentPage} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground h-8 px-3"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground h-8 px-3"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
            
            {/* Details Modal */}
            {selectedJob && (
                <JobDetailsModal 
                    job={selectedJob} 
                    open={!!selectedJob} 
                    onClose={() => setSelectedJob(null)} 
                />
            )}
        </div>
    );
}
