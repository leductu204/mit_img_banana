"use client"

import { useEffect, useState } from "react"
import { useJobs, Job } from "@/hooks/useJobs"
import { useGlobalJobs } from "@/contexts/JobsContext"
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
    const { jobs, loading, removeJob } = useGlobalJobs();
    const { isAuthenticated } = useAuth();
    const { preferences, toggleHistorySidebar } = useUserPreferences();

    const filteredJobs = (jobs || []).filter(job => {
        if (type === 'image') return job.type === 't2i' || job.type === 'i2i';
        if (type === 'video') return job.type === 't2v' || job.type === 'i2v' || job.type === 'motion';
        return true;
    });

    const handleDelete = async (e: React.MouseEvent, jobId: string) => {
        e.stopPropagation(); // Don't trigger job selection
        
        if (!confirm('Bạn có chắc muốn xóa công việc này?')) {
            return;
        }

        try {
            await removeJob(jobId);
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Không thể xóa công việc. Vui lòng thử lại.');
        }
    };

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
                                type === 'image' && !job.type.includes('v') && job.type !== 'motion' ? (
                                    <img 
                                        src={job.output_url} 
                                        alt={job.prompt} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full relative">
                                         {job.type.includes('v') || job.type === 'motion' ? (
                                            <video 
                                                src={job.output_url} 
                                                className="w-full h-full object-cover"
                                                preload="metadata"
                                                muted
                                            />
                                         ) : (
                                              <img 
                                                src={job.output_url} 
                                                alt={job.prompt} 
                                                className="w-full h-full object-cover"
                                            />
                                         )}
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
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs">Error</span>
                                             {job.status === 'failed' && <span className="text-[10px] text-center px-1">Failed</span>}
                                        </div>
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
                    
                    {loading && filteredJobs.length === 0 && (
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
