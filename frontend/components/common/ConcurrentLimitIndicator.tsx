
import React from 'react';
import { useConcurrencyLimits } from '@/hooks/useConcurrencyLimits';
import { Activity, Image as ImageIcon, Video } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const ConcurrentLimitIndicator = () => {
    const { limits, isLoading } = useConcurrencyLimits(10000); // Poll every 5s

    if (isLoading) return null;
    if (!limits) return null;

    const { active_counts: active, limits: max, pending_counts: pending } = limits;

    const renderBar = (current: number, total: number, queued: number, label: string, icon: React.ReactNode) => {
        const isUnlimited = total === -1;
        const percent = isUnlimited ? 0 : Math.min((current / total) * 100, 100);
        const isFull = !isUnlimited && current >= total;
        
        return (
            <div className="flex flex-col gap-1 mb-3 last:mb-0">
                <div className="flex justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                        {icon}
                        <span>{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {queued > 0 && (
                            <span className="text-yellow-500 font-medium">
                                Hàng chờ: {queued}
                            </span>
                        )}
                        <span className={cn(isFull && "text-red-400 font-medium")}>
                            {current} / {isUnlimited ? '∞' : total}
                        </span>
                    </div>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isFull ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-gradient-to-r from-purple-600 to-blue-500"
                        )}
                        style={{ width: `${isUnlimited ? 100 : percent}%`, opacity: isUnlimited ? 0.3 : 1 }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="p-3 bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-xl w-full shadow-xl">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3 flex items-center justify-between">
                <span>Quản lý các luồng</span>
                <span className="text-purple-400 text-[10px] px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
                    {limits.plan_id}
                </span>
            </h3>
            
            {renderBar(active.total, max.total, pending.total, "Giới hạn luồng", <Activity size={12} />)}
            {renderBar(active.image, max.image, pending.image, "Tạo Ảnh", <ImageIcon size={12} />)}
            {renderBar(active.video, max.video, pending.video, "Tạo Video", <Video size={12} />)}
        </div>
    );
};
