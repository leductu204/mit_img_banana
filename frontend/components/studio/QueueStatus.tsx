"use client"

import React, { useMemo } from 'react';

import { useGlobalJobs } from '@/contexts/JobsContext';
import { useConcurrencyLimits } from '@/hooks/useConcurrencyLimits';
import { 
    Info as InfoIcon,
    Loader2,
} from 'lucide-react';

export default function QueueStatus() {
    const { jobs } = useGlobalJobs();
    const { limits } = useConcurrencyLimits();

    // Determine Queue Limit based on plan name (since API doesn't return queue limit explicitly yet)
    // Map plan_name (from backend) to queue slots
    const queueLimit = useMemo(() => {
        const plan = limits?.plan_name?.toLowerCase() || 'free';
        if (plan.includes('free')) return 0;
        
        // Tier 3: Business / Creative (Gói Sáng Tạo)
        if (plan.includes('business') || plan.includes('creative') || plan.includes('sáng tạo')) return 30;
        
        // Tier 2: Professional / Saver (Gói Tiết Kiệm)
        if (plan.includes('professional') || plan.includes('pro') || plan.includes('saver') || plan.includes('tiết kiệm')) return 15;
        
        // Tier 1: Starter / Experience (Gói Trải Nghiệm)
        if (plan.includes('starter') || plan.includes('experience') || plan.includes('trải nghiệm')) return 5;
        
        return 5; // Default fallback for paid plans
    }, [limits?.plan_name]);

    // Use server limits or fallbacks
    const THREAD_LIMITS = {
        image: limits?.limits?.image || 1,
        video: limits?.limits?.video || 1,
        queue: queueLimit
    };
    
    // Normalized plan name for display
    const planName = limits?.plan_name || 'Free';
    const isFree = planName.toLowerCase().includes('free');
    const isPro = planName.toLowerCase().includes('pro') || planName.toLowerCase().includes('professional') || planName.toLowerCase().includes('saver');
    const isBusiness = planName.toLowerCase().includes('business') || planName.toLowerCase().includes('creative') || planName.toLowerCase().includes('sáng tạo');
    const isStarter = planName.toLowerCase().includes('starter') || planName.toLowerCase().includes('experience');

    // Calculate active threads and queue
    const stats = useMemo(() => {
        // Processing = Active Threads (Running)
        const processingJobs = jobs.filter(j => j.status === 'processing');
        
        const processingImage = processingJobs.filter(j => ['t2i', 'i2i'].includes(j.type)).length;
        const processingVideo = processingJobs.filter(j => ['t2v', 'i2v', 'motion', 'video'].includes(j.type)).length;

        // Pending = Queue (Waiting)
        const pendingJobs = jobs.filter(j => j.status === 'pending');
        const queueCount = pendingJobs.length;

        return {
            image: processingImage,
            video: processingVideo,
            queue: queueCount
        };
    }, [jobs]);

    return (
        <div className="bg-[#1F2833] rounded-2xl border border-white/10 shadow-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-white text-sm font-bold flex items-center gap-2">
                    <Loader2 className="text-[#00BCD4] w-4 h-4" />
                    Quản Lý Các Luồng
                </h3>
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold border",
                        isBusiness ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        isPro ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                        isStarter ? "bg-[#00BCD4]/20 text-[#00BCD4] border-[#00BCD4]/30" :
                        "bg-gray-500/20 text-gray-400 border-gray-500/30" // Free/Default
                    )}>
                        {planName.toUpperCase()}
                    </span>
                    <InfoIcon className="w-3.5 h-3.5 text-[#6B7280]" />
                </div>
            </div>

            <div className="space-y-4">
                {/* Image Gen */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-[#E3E5E8]">Tạo Ảnh (Image Gen)</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#00BCD4]/10 text-[#00BCD4] border border-[#00BCD4]/20 font-bold">
                            {stats.image} / {THREAD_LIMITS.image} Active
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#0A0E13] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#00BCD4] rounded-full transition-all duration-500"
                            style={{ width: `${THREAD_LIMITS.image > 0 ? Math.min((stats.image / THREAD_LIMITS.image) * 100, 100) : (stats.image > 0 ? 100 : 0)}%` }}
                        />
                    </div>
                </div>

                {/* Video Gen */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-[#E3E5E8]">Tạo Video (Video Gen)</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#00BCD4]/10 text-[#00BCD4] border border-[#00BCD4]/20 font-bold">
                            {stats.video} / {THREAD_LIMITS.video} Active
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#0A0E13] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#00BCD4] rounded-full transition-all duration-500"
                            style={{ width: `${THREAD_LIMITS.video > 0 ? Math.min((stats.video / THREAD_LIMITS.video) * 100, 100) : (stats.video > 0 ? 100 : 0)}%` }}
                        />
                    </div>
                </div>

                {/* Queue Status */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-[#E3E5E8]">Hàng đợi (Task Queue)</span>
                        <span className={cn(
                            "px-2 py-0.5 rounded-full border font-bold transition-colors",
                            stats.queue >= THREAD_LIMITS.queue 
                                ? "bg-red-500/10 text-red-500 border-red-500/20" 
                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        )}>
                            {stats.queue} / {THREAD_LIMITS.queue} Task
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#0A0E13] rounded-full overflow-hidden">
                        <div 
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                stats.queue >= THREAD_LIMITS.queue ? "bg-red-500" : "bg-yellow-500"
                            )}
                            style={{ width: `${THREAD_LIMITS.queue > 0 ? Math.min((stats.queue / THREAD_LIMITS.queue) * 100, 100) : (stats.queue > 0 ? 100 : 0)}%` }}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

// Helper for conditional class names if not already imported
import { cn } from "@/lib/utils";
