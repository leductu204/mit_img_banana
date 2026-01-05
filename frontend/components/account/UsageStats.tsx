import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Network } from 'lucide-react';

interface UsageStatsProps {
    imageThreads: {
        active: number;
        total: number;
    };
    videoThreads: {
        active: number;
        total: number;
    };
    totalThreads: number;
}

export default function UsageStats({ imageThreads, videoThreads, totalThreads }: UsageStatsProps) {
    const imagePercentage = Math.min((imageThreads.active / imageThreads.total) * 100, 100);
    const videoPercentage = Math.min((videoThreads.active / videoThreads.total) * 100, 100);

    return (
        <div className="lg:col-span-1 flex flex-col justify-between rounded-3xl bg-[#1E2530] border border-white/5 p-8 relative shadow-[0_0_40px_-10px_rgba(34,211,238,0.15)]">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-[#22d3ee]/10 text-[#22d3ee]">
                        <Network className="w-5 h-5" />
                    </div>
                    Quản Lý Các Luồng
                </h3>
                <div className="group relative flex cursor-help">
                    <Info className="w-5 h-5 text-[#64748B] hover:text-white transition-colors" />
                    <div className="absolute bottom-full right-0 mb-3 w-56 rounded-xl bg-[#0A0E13] border border-white/5 p-3 text-xs text-[#94A3B8] opacity-0 shadow-xl transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 pointer-events-none z-20">
                        Số lượng tác vụ xử lý đồng thời tối đa cho tài khoản của bạn.
                    </div>
                </div>
            </div>
            
            <div className="space-y-8 flex-1">
                <div>
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-sm font-medium text-slate-300">Tạo Ảnh (Image Gen)</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#22d3ee]/10 text-xs font-bold text-[#22d3ee] border border-[#22d3ee]/20">
                            {imageThreads.active} / {imageThreads.total} Active
                        </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-black/40 p-0.5">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] to-[#67e8f9] shadow-[0_0_10px_rgba(34,211,238,0.4)] transition-all duration-1000 ease-out" 
                            style={{ width: `${imagePercentage}%` }}
                        ></div>
                    </div>
                </div>
                
                <div>
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-sm font-medium text-slate-300">Tạo Video (Video Gen)</span>
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-xs font-bold text-[#94A3B8] border border-white/5">
                            {videoThreads.active} / {videoThreads.total} Active
                        </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-black/40 p-0.5">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all duration-1000 ease-out" 
                            style={{ width: `${videoPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between text-sm text-[#94A3B8]">
                    <span>Giới hạn tổng luồng:</span>
                    <span className="font-bold text-white bg-white/5 px-3 py-1 rounded-lg">{totalThreads} Threads</span>
                </div>
            </div>
        </div>
    );
}
