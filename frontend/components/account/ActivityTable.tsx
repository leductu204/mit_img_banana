import { useState } from 'react';
import { Job } from '@/hooks/useJobs';
import { 
    Download, Trash2, RefreshCw, X, Image as ImageIcon, Video, 
    AlertCircle, CheckCircle2, Clock, Loader2, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Transaction } from '@/hooks/useTransactions';

interface ActivityTableProps {
    jobs: Job[];
    loading: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onFilterChange: (status: string | undefined) => void;
    selectedFilter?: string;
    onCancelJob?: (jobId: string) => Promise<boolean | void>;
    onDeleteJob?: (jobId: string) => Promise<boolean | void>;
    onDeleteAll?: (jobIds: string[]) => Promise<boolean | void>;
    onRefresh?: () => void;
    // Transaction props
    transactions: Transaction[];
    transactionsLoading: boolean;
    transactionsTotalPages: number;
    onTransactionsPageChange: (page: number) => void;
    transactionsCurrentPage: number;
    totalJobs: number;
    totalTransactions: number;
}

const statusConfig = {
    completed: { 
        icon: CheckCircle2, 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        shadow: 'shadow-[0_0_10px_-3px_rgba(52,211,153,0.3)]',
        label: 'Hoàn thành' 
    },
    failed: { 
        icon: AlertCircle, 
        color: 'text-red-400', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/20',
        shadow: '',
        label: 'Thất bại' 
    },
    pending: { 
        icon: Clock, 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        shadow: '',
        label: 'Đang chờ' 
    },
    processing: { 
        icon: Loader2, 
        color: 'text-[#22d3ee]', 
        bg: 'bg-[#22d3ee]/10', 
        border: 'border-[#22d3ee]/20',
        shadow: 'shadow-[0_0_10px_-3px_rgba(34,211,238,0.3)]',
        label: 'Đang xử lý' 
    },
    cancelled: { 
        icon: X, 
        color: 'text-slate-400', 
        bg: 'bg-slate-500/10', 
        border: 'border-slate-500/20',
        shadow: '',
        label: 'Đã hủy' 
    },
};

export default function ActivityTable({
    jobs,
    loading,
    currentPage,
    totalPages,
    onPageChange,
    onFilterChange,
    selectedFilter,
    onCancelJob,
    onDeleteJob,
    onDeleteAll,
    onRefresh,
    transactions,
    transactionsLoading,
    transactionsTotalPages,
    onTransactionsPageChange,
    transactionsCurrentPage,
    totalJobs,
    totalTransactions,
}: ActivityTableProps) {
    const [activeTab, setActiveTab] = useState<'jobs' | 'transactions'>('jobs');
    const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    const handleCancel = async (jobId: string) => {
        if (!onCancelJob) return;
        setCancellingJobId(jobId);
        try {
            await onCancelJob(jobId);
        } finally {
            setCancellingJobId(null);
        }
    };

    const handleDelete = async (jobId: string) => {
        if (!onDeleteJob) return;
        if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
        
        setDeletingIds(prev => new Set(prev).add(jobId));
        try {
            await onDeleteJob(jobId);
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(jobId);
                return next;
            });
        }
    };
    
    const handleDeleteAll = async () => {
        if (!onDeleteAll || jobs.length === 0) return;
        if (!confirm(`Bạn có chắc chắn muốn xóa tất cả ${jobs.length} công việc này?`)) return;
        
        const jobIds = jobs.map(j => j.job_id);
        await onDeleteAll(jobIds);
    }

    const formatDate = (dateString: string) => {
        try {
            return new Intl.DateTimeFormat('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            }).format(new Date(dateString));
        } catch (e) {
            return dateString;
        }
    };

    const filters = [
        { value: undefined, label: 'Tất cả' },
        { value: 'completed', label: 'Hoàn thành' },
        { value: 'failed', label: 'Thất bại' },
        { value: 'pending', label: 'Đang chờ' },
    ];

    return (
        <div className="rounded-3xl bg-[#151A21] border border-white/5 flex flex-col min-h-[500px] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-white/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex space-x-1.5 rounded-2xl bg-[#0A0E13] p-1.5 w-fit shadow-inner border border-white/5">
                    <button 
                        onClick={() => setActiveTab('jobs')}
                        className={cn(
                            "rounded-xl px-5 py-2.5 text-sm transition-all",
                            activeTab === 'jobs' 
                                ? "bg-[#1E2530] font-semibold text-white shadow-sm ring-1 ring-white/5" 
                                : "font-medium text-[#94A3B8] hover:text-white hover:bg-white/5"
                        )}
                    >
                        Lịch sử tạo
                    </button>
                    <button 
                        onClick={() => setActiveTab('transactions')}
                        className={cn(
                            "rounded-xl px-5 py-2.5 text-sm transition-all",
                            activeTab === 'transactions' 
                                ? "bg-[#1E2530] font-semibold text-white shadow-sm ring-1 ring-white/5" 
                                : "font-medium text-[#94A3B8] hover:text-white hover:bg-white/5"
                        )}
                    >
                        Giao dịch Credits
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {activeTab === 'jobs' ? (
                        <>
                            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mr-2 hidden lg:inline-block">Lọc theo:</span>
                            {filters.map((filter) => (
                                <button
                                    key={filter.value || 'all'}
                                    onClick={() => onFilterChange(filter.value)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-xs font-medium transition-colors border",
                                        selectedFilter === filter.value
                                            ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20 font-semibold"
                                            : "bg-transparent text-[#94A3B8] border-white/5 hover:border-[#94A3B8] hover:text-white"
                                    )}
                                >
                                    {filter.label}
                                </button>
                            ))}
                            <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>
                            <button 
                                onClick={handleDeleteAll}
                                className="text-xs font-medium text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-red-500/10"
                            >
                                <Trash2 className="w-[18px] h-[18px]" />
                                Xóa tất cả
                            </button>
                        </>
                    ) : (
                        <div className="text-xs font-medium text-[#64748B] px-3 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Cập nhật theo thời gian thực
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                {activeTab === 'jobs' ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#1E2530]/50 text-xs uppercase text-[#94A3B8] font-semibold">
                            <tr>
                                <th className="px-8 py-5 tracking-wider font-semibold text-slate-400" scope="col">Asset Preview</th>
                                <th className="px-6 py-5 tracking-wider font-semibold text-slate-400" scope="col">Loại</th>
                                <th className="px-6 py-5 tracking-wider font-semibold text-slate-400" scope="col">Thời gian</th>
                                <th className="px-6 py-5 tracking-wider text-right font-semibold text-slate-400" scope="col">Chi phí</th>
                                <th className="px-6 py-5 tracking-wider font-semibold text-slate-400" scope="col">Trạng thái</th>
                                <th className="px-6 py-5 tracking-wider text-right font-semibold text-slate-400" scope="col">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-8 py-5"><div className="h-14 w-14 rounded-2xl bg-white/5"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 w-20 rounded bg-white/5"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 w-32 rounded bg-white/5"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 w-16 rounded bg-white/5"></div></td>
                                        <td className="px-6 py-5"><div className="h-6 w-24 rounded-full bg-white/5"></div></td>
                                        <td className="px-6 py-5"><div className="h-8 w-8 rounded-xl bg-white/5 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-[#94A3B8]">
                                        Chưa có lịch sử tạo ảnh/video
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job) => {
                                    const status = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.pending;
                                    const isVideo = job.type === 't2v' || job.type === 'i2v';

                                    return (
                                        <tr key={job.job_id} className="group hover:bg-[#22d3ee]/5 transition-colors duration-200">
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-5">
                                                    <div 
                                                        className="h-14 w-14 rounded-2xl bg-cover bg-center ring-1 ring-white/10 group-hover:ring-[#22d3ee]/40 group-hover:scale-105 transition-all shadow-md bg-[#0A0E13] flex items-center justify-center overflow-hidden"
                                                        style={job.output_url ? { backgroundImage: `url(${job.output_url})` } : {}}
                                                    >
                                                        {!job.output_url && (isVideo ? <Video className="w-6 h-6 text-slate-600" /> : <ImageIcon className="w-6 h-6 text-slate-600" />)}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-white truncate max-w-[160px] group-hover:text-[#22d3ee] transition-colors" title={job.prompt}>
                                                            {job.prompt}
                                                        </span>
                                                        <span className="text-xs text-[#64748B]">ID: #{job.job_id.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border",
                                                    isVideo 
                                                        ? "bg-purple-500/10 text-purple-400 border-purple-500/10"
                                                        : "bg-blue-500/10 text-blue-400 border-blue-500/10"
                                                )}>
                                                    {isVideo ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                                    {isVideo ? 'Video' : 'Image'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-[#94A3B8] font-medium">
                                                {formatDate(job.created_at)}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-slate-300">
                                                <span className={job.credits_refunded ? 'text-emerald-400' : ''}>
                                                    {job.credits_refunded ? '+' : '-'}{job.credits_cost} Credits
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={cn(
                                                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border",
                                                    status.bg, status.color, status.border, status.shadow
                                                )}>
                                                    {job.status === 'processing' ? (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee] animate-pulse shadow-[0_0_5px_rgba(34,211,238,0.8)]"></span>
                                                    ) : (
                                                        <span className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_5px_rgba(52,211,153,0.8)]", job.status === 'completed' ? 'bg-emerald-400' : (job.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'))}></span>
                                                    )}
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    {job.output_url && (
                                                        <Link 
                                                            href={job.output_url} 
                                                            target="_blank"
                                                            className="p-2 text-[#94A3B8] hover:text-white hover:bg-white/10 rounded-xl transition-all" 
                                                            title="Download"
                                                        >
                                                            <Download className="w-5 h-5" />
                                                        </Link>
                                                    )}
                                                    {job.status === 'failed' && (
                                                        <button className="p-2 text-[#94A3B8] hover:text-[#22d3ee] hover:bg-[#22d3ee]/10 rounded-xl transition-all" title="Retry">
                                                            <RefreshCw className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    {(job.status === 'pending' || job.status === 'processing') && onCancelJob ? (
                                                        <button 
                                                            onClick={() => handleCancel(job.job_id)}
                                                            disabled={cancellingJobId === job.job_id}
                                                            className="p-2 text-[#94A3B8] hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all" 
                                                            title="Cancel"
                                                        >
                                                            {cancellingJobId === job.job_id ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleDelete(job.job_id)}
                                                            disabled={deletingIds.has(job.job_id)}
                                                            className="p-2 text-[#94A3B8] hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all" 
                                                            title="Delete"
                                                        >
                                                            {deletingIds.has(job.job_id) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#1E2530]/50 text-xs uppercase text-[#94A3B8] font-semibold">
                            <tr>
                                <th className="px-8 py-5 tracking-wider font-semibold text-slate-400" scope="col">Loại giao dịch</th>
                                <th className="px-6 py-5 tracking-wider font-semibold text-slate-400" scope="col">Mô tả</th>
                                <th className="px-6 py-5 tracking-wider font-semibold text-slate-400" scope="col">Thời gian</th>
                                <th className="px-6 py-5 tracking-wider text-right font-semibold text-slate-400" scope="col">Số lượng</th>
                                <th className="px-8 py-5 tracking-wider text-right font-semibold text-slate-400" scope="col">Số dư</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactionsLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-8 py-5"><div className="h-4 w-24 rounded bg-white/5"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 w-40 rounded bg-white/5"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 w-32 rounded bg-white/5"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 w-16 rounded bg-white/5 ml-auto"></div></td>
                                        <td className="px-8 py-5"><div className="h-4 w-16 rounded bg-white/5 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-[#94A3B8]">
                                        Chưa có lịch sử giao dịch
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => {
                                    const isPositive = tx.type !== 'deduct';
                                    const txLabel = {
                                        deduct: 'Trừ credits',
                                        refund: 'Hoàn tiền',
                                        initial: 'Khởi tạo',
                                        admin_add: 'Hệ thống thêm'
                                    }[tx.type] || tx.type;

                                    return (
                                        <tr key={tx.id} className="group hover:bg-[#22d3ee]/5 transition-colors duration-200">
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border",
                                                    isPositive 
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
                                                        : "bg-red-500/10 text-red-400 border-red-500/10"
                                                )}>
                                                    {isPositive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                                    {txLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 font-medium text-slate-300 max-w-[240px] truncate">
                                                {tx.reason || '-'}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-[#94A3B8] font-medium">
                                                {formatDate(tx.created_at)}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <span className={cn(
                                                    "font-bold",
                                                    isPositive ? "text-emerald-400" : "text-red-400"
                                                )}>
                                                    {isPositive ? '+' : '-'}{Math.abs(tx.amount)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-right font-bold text-white">
                                                {tx.balance_after}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="border-t border-white/5 px-8 py-5 flex items-center justify-between bg-[#151A21]">
                <span className="text-sm text-[#94A3B8]">
                    Hiển thị <span className="text-white font-semibold">
                        {activeTab === 'jobs' 
                            ? (jobs.length > 0 ? `${(currentPage - 1) * 10 + 1}-${Math.min(currentPage * 10, (currentPage - 1) * 10 + jobs.length)}` : '0-0')
                            : (transactions.length > 0 ? `${(transactionsCurrentPage - 1) * 10 + 1}-${Math.min(transactionsCurrentPage * 10, (transactionsCurrentPage - 1) * 10 + transactions.length)}` : '0-0')
                        }
                    </span> trong <span className="text-white font-semibold">{activeTab === 'jobs' ? totalJobs : totalTransactions}</span> kết quả
                </span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => activeTab === 'jobs' ? onPageChange(currentPage - 1) : onTransactionsPageChange(transactionsCurrentPage - 1)}
                        disabled={activeTab === 'jobs' ? currentPage <= 1 : transactionsCurrentPage <= 1}
                        className="p-2.5 rounded-xl border border-white/5 text-[#94A3B8] hover:bg-white/5 hover:text-white hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => activeTab === 'jobs' ? onPageChange(currentPage + 1) : onTransactionsPageChange(transactionsCurrentPage + 1)}
                        disabled={activeTab === 'jobs' ? currentPage >= totalPages : transactionsCurrentPage >= transactionsTotalPages}
                        className="p-2.5 rounded-xl border border-white/5 text-[#94A3B8] hover:bg-white/5 hover:text-white hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
