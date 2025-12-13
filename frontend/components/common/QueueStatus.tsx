
import { useState, useEffect } from "react"
import { apiRequest } from "@/lib/api"
import { Loader2, ListOrdered } from "lucide-react"

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

export default function QueueStatus() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(false)

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

    return (
        <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-3 text-yellow-500 font-medium text-sm">
                <ListOrdered className="h-4 w-4" />
                <span>Hàng đợi ({jobs.length})</span>
                {loading && <Loader2 className="h-3 w-3 animate-spin ml-auto opacity-50" />}
            </div>
            
            <div className="h-[120px] pr-2 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                    {jobs.map((job, index) => (
                        <div key={job.job_id} className="flex items-center justify-between text-xs p-2 rounded bg-background/50 border border-border">
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                    #{index + 1} • {job.type === 'i2v' || job.type === 't2v' ? 'Video' : 'Image'}
                                </span>
                                <span className="text-muted-foreground text-[10px]">
                                    {job.model}
                                </span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-500 font-medium">
                                Pending
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
