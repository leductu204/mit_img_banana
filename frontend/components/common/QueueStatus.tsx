import { useState, useEffect } from "react"
import { apiRequest } from "@/lib/api"
import { Loader2, ListOrdered, Clock, Sparkles, Video, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface Job {
    job_id: string
    status: string
    type: string
    created_at: string
    model: string
}

interface JobsResponse {
    items: Job[]
    total: number
}

interface QueueStatusProps {
    className?: string
    compact?: boolean
}

export default function QueueStatus({ className, compact = false }: QueueStatusProps) {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(false)
    const [expanded, setExpanded] = useState(!compact)

    const fetchQueue = async () => {
        try {
            setLoading(true)
            const res = await apiRequest<JobsResponse>('/api/jobs?status=pending&limit=10')
            setJobs(res.items)
        } catch (error) {
            console.error("Failed to fetch queue", error)
        } finally {
            setLoading(false)
        }
    }

    // Initial fetch and poll every 10 seconds
    useEffect(() => {
        fetchQueue()
        const interval = setInterval(fetchQueue, 10000)
        return () => clearInterval(interval)
    }, [])

    if (jobs.length === 0) return null

    const getJobIcon = (type: string) => {
        if (type === 'i2v' || type === 't2v') return Video
        return Sparkles
    }

    const getEstimatedTime = (position: number, type: string) => {
        // Rough estimate: images ~30s, videos ~2min per job
        const timePerJob = (type === 'i2v' || type === 't2v') ? 120 : 30
        const totalSeconds = position * timePerJob
        if (totalSeconds < 60) return `~${totalSeconds}s`
        return `~${Math.ceil(totalSeconds / 60)}m`
    }

    return (
        <div className={cn(
            "rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 overflow-hidden transition-all",
            className
        )}>
            {/* Header */}
            <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-amber-500/5 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/20">
                        <ListOrdered className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-semibold text-amber-500">
                            Hàng đợi
                        </span>
                        <span className="text-xs text-amber-500/70 tabular-nums">
                            {jobs.length} công việc đang chờ
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500/50" />}
                    {expanded ? (
                        <ChevronUp className="h-4 w-4 text-amber-500/50" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-amber-500/50" />
                    )}
                </div>
            </button>

            {/* Expandable Content */}
            <div className={cn(
                "overflow-hidden transition-all duration-300",
                expanded ? "max-h-[200px]" : "max-h-0"
            )}>
                <div className="px-3 pb-3">
                    <div className="max-h-[160px] overflow-y-auto custom-scrollbar space-y-2">
                        {jobs.map((job, index) => {
                            const Icon = getJobIcon(job.type)
                            const isFirst = index === 0
                            
                            return (
                                <div 
                                    key={job.job_id} 
                                    className={cn(
                                        "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                                        isFirst 
                                            ? "bg-amber-500/10 border-amber-500/30" 
                                            : "bg-[#0A0E13]/50 border-white/5"
                                    )}
                                >
                                    {/* Position Badge */}
                                    <div className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums shrink-0",
                                        isFirst 
                                            ? "bg-amber-500 text-black" 
                                            : "bg-[#252D3D] text-[#B0B8C4]"
                                    )}>
                                        {index + 1}
                                    </div>

                                    {/* Job Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <Icon className={cn(
                                                "w-3.5 h-3.5 shrink-0",
                                                isFirst ? "text-amber-500" : "text-[#6B7280]"
                                            )} />
                                            <span className={cn(
                                                "text-xs font-medium truncate",
                                                isFirst ? "text-white" : "text-[#B0B8C4]"
                                            )}>
                                                {job.type === 'i2v' || job.type === 't2v' ? 'Video' : 'Ảnh'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-[#6B7280] truncate block">
                                            {job.model}
                                        </span>
                                    </div>

                                    {/* Estimated Time */}
                                    <div className="flex items-center gap-1 text-[10px] text-[#6B7280] shrink-0">
                                        <Clock className="w-3 h-3" />
                                        <span className="tabular-nums">{getEstimatedTime(index + 1, job.type)}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
