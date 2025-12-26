"use client"

import { useEffect, useState } from "react"
import { useJobs, Job } from "@/hooks/useJobs"
import { cleanPrompt } from "@/lib/prompt-utils"
import { getAuthHeader } from "@/lib/auth"
import { Loader2, Image as ImageIcon, Video as VideoIcon, Play, Trash2, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useUserPreferences } from "@/hooks/useUserPreferences"

interface HistorySidebarProps {
    type: 'image' | 'video';
    onSelect: (job: Job) => void;
    selectedJobId?: string;
}

export default function HistorySidebar({ type, onSelect, selectedJobId }: HistorySidebarProps) {
    const { jobs, getMyJobs, loading } = useJobs();
    const { isAuthenticated } = useAuth();
    const { preferences, toggleHistorySidebar } = useUserPreferences();
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);

    // Initial fetch - get ALL jobs to show pending, processing, and completed
    useEffect(() => {
        if (isAuthenticated) {
            // Fetch all jobs without status filter to show queue status
            getMyJobs(1, 20); // No status filter = all jobs
        }
    }, [isAuthenticated, getMyJobs]);

    const filteredJobs = (jobs || []).filter(job => {
        if (type === 'image') return job.type === 't2i' || job.type === 'i2i';
        if (type === 'video') return job.type === 't2v' || job.type === 'i2v';
        return true;
    });

    const handleDelete = async (e: React.MouseEvent, jobId: string) => {
        e.stopPropagation(); // Don't trigger job selection
        
        if (!confirm('Bạn có chắc muốn xóa công việc này?')) {
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/jobs/${jobId}`, {
                method: 'DELETE',
                headers: {
                    ...getAuthHeader()
                },
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Failed to delete');
            }

            // Refresh the job list
            getMyJobs(1, 20); // Fetch all jobs
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Không thể xóa công việc. Vui lòng thử lại.');
        }
    };

    // cleanPrompt is now imported from @/lib/prompt-utils

    if (!isAuthenticated) return null;

    return (
        <div className="w-full h-full flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card/30 group">
            <div className="p-3 group-hover:p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between overflow-hidden">
                <div className="flex items-center gap-3">
                    <div className="shrink-0">
                        {type === 'image' ? <ImageIcon className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                    </div>
                    <h3 className="font-semibold text-sm text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        Lịch sử
                    </h3>
                </div>
                <button
                    onClick={toggleHistorySidebar}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 hover:bg-muted rounded-md shrink-0"
                    title="Ẩn lịch sử"
                >
                    <EyeOff className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 group-hover:p-4 custom-scrollbar">
                <div className="grid grid-cols-1 group-hover:grid-cols-2 gap-2 group-hover:gap-3 transition-all duration-300">
                    {filteredJobs.map((job) => (
                        <div 
                            key={job.job_id}
                            onClick={() => onSelect(job)}
                            className={`
                                relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group/item
                                ${selectedJobId === job.job_id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'}
                                bg-muted/50 w-full max-w-[140px] mx-auto group-hover:max-w-full group-hover:mx-0
                            `}
                        >
                            {/* Status Badge */}
                            {job.status !== 'completed' && (
                                <div className="absolute top-2 left-2 z-10">
                                    <div className={`
                                        px-2 py-1 rounded-md text-[10px] font-medium backdrop-blur-sm
                                        ${job.status === 'pending' ? 'bg-yellow-500/90 text-white' : ''}
                                        ${job.status === 'processing' ? 'bg-blue-500/90 text-white' : ''}
                                        ${job.status === 'failed' ? 'bg-red-500/90 text-white' : ''}
                                    `}>
                                        {job.status === 'pending' && 'Đang chờ'}
                                        {job.status === 'processing' && (
                                            <span className="flex items-center gap-1">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Đang xử lý
                                            </span>
                                        )}
                                        {job.status === 'failed' && 'Thất bại'}
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            {job.output_url ? (
                                type === 'image' ? (
                                    <img 
                                        src={job.output_url} 
                                        alt={job.prompt} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full relative">
                                         <video 
                                            src={job.output_url} 
                                            className="w-full h-full object-cover"
                                            preload="metadata"
                                            muted
                                        />
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                            <Play className="w-8 h-8 text-white/80 fill-white/20" />
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                                    {job.status === 'pending' || job.status === 'processing' ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <span className="text-xs">Error</span>
                                    )}
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <p className="text-[10px] text-white line-clamp-2 leading-tight">
                                    {cleanPrompt(job.prompt)}
                                </p>
                            </div>

                            {/* Delete Button */}
                            <button
                                onClick={(e) => handleDelete(e, job.job_id)}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity z-10"
                                title="Xóa"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    
                    {loading && (
                        <div className="col-span-full flex justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    
                    {!loading && filteredJobs.length === 0 && (
                        <div className="col-span-full text-center py-8 text-muted-foreground text-xs">
                            Chưa có lịch sử
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
