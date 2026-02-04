"use client"

import React from 'react';
import { useGlobalJobs } from '@/contexts/JobsContext';
import { Job } from '@/hooks/useJobs';
import { 
    Image as LucideImage, 
    Video as VideoIcon, 
    Loader2, 
    Check as CheckIcon, 
    Trash2, 
    Play,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface RecentGenerationsProps {
    onSelectJob: (job: Job) => void;
    currentJobId?: string | null;
}

export default function RecentGenerations({ onSelectJob, currentJobId }: RecentGenerationsProps) {
    const { jobs, removeJob } = useGlobalJobs();
    const toast = useToast();
    const [displayLimit, setDisplayLimit] = React.useState(5);

    if (jobs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <LucideImage className="w-6 h-6 text-[#6B7280]" />
                </div>
                <p className="text-xs text-[#6B7280]">Chưa có lịch sử tạo gần đây</p>
                <p className="text-[10px] text-[#4B5563] mt-1">Các tác vụ của bạn sẽ xuất hiện tại đây</p>
            </div>
        );
    }

    const visibleJobs = jobs.slice(0, displayLimit);

    return (
        <div className="flex flex-col gap-3">
            {visibleJobs.map(job => (
                <div 
                    key={job.job_id} 
                    onClick={() => {
                        if (job.status === 'completed') {
                            onSelectJob(job);
                        } else if (job.status === 'failed') {
                            toast.error(job.error_message || "Job failed");
                        }
                    }}
                    className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl border border-transparent cursor-pointer transition-all group",
                        currentJobId === job.job_id ? "bg-white/10 border-white/10" : "hover:bg-white/5",
                        job.status === 'pending' || job.status === 'processing' ? "opacity-80" : "opacity-100"
                    )}
                >
                    {/* Thumbnail / Icon */}
                    <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-[#0A0E13] relative">
                         {job.output_url ? (
                            job.type.includes('v') || job.type === 'motion' ? (
                                <video src={job.output_url} className="w-full h-full object-cover" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                            ) : (
                                <img src={job.output_url} alt="Thumbnail" className="w-full h-full object-cover" />
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/50">
                                {job.type.includes('v') || job.type === 'motion' ? (
                                    <VideoIcon className="w-5 h-5 text-[#6B7280]" />
                                ) : (
                                    <LucideImage className="w-5 h-5 text-[#6B7280]" />
                                )}
                            </div>
                        )}
                        
                        {/* Type Badge */}
                        <div className="absolute bottom-0 right-0 bg-black/60 backdrop-blur-[2px] px-1 py-0.5 rounded-tl-md">
                            {job.type.includes('v') ? (
                                <VideoIcon className="w-2.5 h-2.5 text-white/70" />
                            ) : (
                                <LucideImage className="w-2.5 h-2.5 text-white/70" />
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">
                                {job.model}
                            </span>
                            <span className="text-[10px] text-[#6B7280]">
                                {new Date(job.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        <p className={cn(
                            "text-xs font-medium truncate transition-colors",
                            job.status === 'failed' ? "text-red-400" : "text-white group-hover:text-[#00BCD4]"
                        )}>
                            {job.prompt || (job.status === 'pending' ? 'Đang chuẩn bị...' : 'Không có mô tả')}
                        </p>
                        
                        {/* Status Message */}
                        {(job.status === 'pending' || job.status === 'processing') && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-[#00BCD4] animate-pulse">
                                    {job.status === 'pending' ? 'Đang hàng đợi...' : 'Đang xử lý...'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Status Icon / Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className={cn(
                            "size-6 rounded-full flex items-center justify-center border",
                            job.status === 'completed' ? "border-green-500/30 bg-green-500/10" : 
                            job.status === 'failed' ? "border-red-500/30 bg-red-500/10" :
                            "border-[#00BCD4]/30 bg-[#00BCD4]/10"
                        )}>
                            {job.status === 'completed' ? (
                                <CheckIcon className="text-green-500 w-3 h-3" />
                            ) : job.status === 'failed' ? (
                                <AlertCircle className="text-red-500 w-3 h-3" />
                            ) : (
                                <Loader2 className="text-[#00BCD4] w-3 h-3 animate-spin" />
                            )}
                        </div>
                        
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Xóa kết quả này?')) {
                                    removeJob(job.job_id);
                                }
                            }}
                            className="size-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Xóa"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            ))}
            
            {jobs.length > displayLimit && (
                <button 
                    onClick={() => setDisplayLimit(prev => prev + 5)}
                    className="w-full py-2 text-xs text-[#6B7280] hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
                >
                    Xem thêm ({jobs.length - displayLimit})
                </button>
            )}
        </div>
    );
}
