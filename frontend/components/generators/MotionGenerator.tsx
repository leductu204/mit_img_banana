"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"
import { cn } from "@/lib/utils"
import { getToken } from "@/lib/auth"
import { NEXT_PUBLIC_API } from "@/lib/config"

// UI Components
import FileUpload from "./FileUpload"
import { Switch } from "@/components/ui/switch"
import QualitySelector from "./QualitySelector"
import RecentGenerations from "../studio/RecentGenerations"
import QueueStatus from "../studio/QueueStatus"
import { useGlobalJobs } from "@/contexts/JobsContext"
import { Job } from "@/hooks/useJobs"

import { 
    Video as VideoIcon, 
    Image as LucideImage, 
    Clapperboard, 
    Loader2,
    Settings2,
    History as HistoryIcon,
    Download as DownloadIcon,
    RefreshCw as RefreshIcon,
    Plus,
    X,
    Coins,
    CircleHelp
} from "lucide-react"
import Button from "../common/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function MotionGenerator() {
    const { isAuthenticated, login, user } = useAuth()
    const toast = useToast()
    const { addOptimisticJob, updateOptimisticJob } = useGlobalJobs();
    // State
    const [motionVideo, setMotionVideo] = useState<File | null>(null)
    const [characterImage, setCharacterImage] = useState<File | null>(null)
    const [quality, setQuality] = useState("1080p")
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)

    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<string | null>(null)

    // Analysis State
    const [analyzing, setAnalyzing] = useState(false)
    const [videoData, setVideoData] = useState<{
        video_url: string
        video_cover_url: string
        account_id?: number
        costs: {
            "720p": number
            "1080p": number
        }
    } | null>(null)

    const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null)
    const [analyzingImage, setAnalyzingImage] = useState(false)

    // Analyze video when uploaded
    const handleVideoSelect = async (file: File | null) => {
        setMotionVideo(file)
        setVideoData(null)
        
        if (file) {
            if (!isAuthenticated) {
                toast.error("Vui lòng đăng nhập để phân tích video.")
                // trigger login modal if available, or let user click login
                return
            }

            const token = getToken()
            if (!token) {
                console.error("No token found")
                return
            }

            setAnalyzing(true)
            try {
                const formData = new FormData()
                formData.append("motion_video", file)
                
                const response = await fetch(`${NEXT_PUBLIC_API}/api/motion/estimate-cost`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                })
                
                if (!response.ok) {
                    if (response.status === 401) {
                        toast.error("Phiên đăng nhập hết hạn.")
                        login()
                        return
                    }
                    throw new Error("Analysis failed")
                }
                
                const data = await response.json()
                setVideoData(data)
                toast.success("Video đã phân tích thành công!")
            } catch (error) {
                console.error("Video analysis failed", error)
                toast.error("Không thể phân tích video. Vui lòng thử lại.")
            } finally {
                setAnalyzing(false)
            }
        }
    }

    // Upload Image when selected
    const handleImageSelect = async (file: File | null) => {
        setCharacterImage(file)
        setCharacterImageUrl(null)

        if (file) {
             if (!isAuthenticated) {
                toast.error("Vui lòng đăng nhập.")
                return
            }
            
            setAnalyzingImage(true)
            try {
                const formData = new FormData()
                formData.append("character_image", file)
                // Use account_id from video if available to keep it consistent, though not strictly required
                if (videoData && videoData.account_id) {
                    formData.append("account_id", videoData.account_id.toString())
                }

                const response = await fetch(`${NEXT_PUBLIC_API}/api/motion/upload-image`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${getToken()}` },
                    body: formData
                })

                if (!response.ok) throw new Error("Upload failed")

                const data = await response.json()
                setCharacterImageUrl(data.image_url)
                toast.success("Ảnh đã được tải lên!")

            } catch (error) {
                console.error("Image upload failed", error)
                toast.error("Không thể tải lên ảnh.")
            } finally {
                setAnalyzingImage(false)
            }
        }
    }

    // Placeholder generation logic connected to Backend
    const handleGenerate = async () => {
        if (!isAuthenticated) {
            login()
            return
        }
        if (!videoData || !characterImageUrl) {
            toast.error("Vui lòng đợi Video và Ảnh được tải lên hoàn tất.")
            return
        }
        
        // 1. Capture State
        const currentQuality = quality;
        const currentVideoData = videoData;
        const currentCharacterImageUrl = characterImageUrl;

        // 2. Optimistic Update
        const tempId = addOptimisticJob({
            model: "Motion Force",
            prompt: "Motion Transfer",
            type: "motion",
            status: "pending"
        });

        // 3. Instant UI Reset
        setLoading(false)
        setResult(null)
        
        // Reset Inputs
        setMotionVideo(null);
        setCharacterImage(null);
        setVideoData(null);
        setCharacterImageUrl(null);

        // 4. Background Task
        (async () => {
            try {
                const formData = new FormData()
                // Send URLs
                formData.append("motion_video_url", currentVideoData.video_url)
                formData.append("video_cover_url", currentVideoData.video_cover_url)
                formData.append("character_image_url", currentCharacterImageUrl)
                
                if (currentVideoData.account_id) {
                    formData.append("account_id", currentVideoData.account_id.toString())
                }
                
                // Quality mapping: 720p -> std, 1080p -> pro
                formData.append("mode", currentQuality === '1080p' ? 'pro' : 'std')

                // 1. Trigger Generation
                const response = await fetch(`${NEXT_PUBLIC_API}/api/motion/generate`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getToken()}` 
                    },
                    body: formData
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.detail || "Generation failed")
                }

                const data = await response.json()
                const jobId = data.job_id
                toast.success("Task submitted!")
                
                updateOptimisticJob(tempId, jobId);

            } catch (error: any) {
                console.error("Motion generation error", error)
                toast.error(error.message)
            }
        })();
    }

    const handleReset = () => {
        setMotionVideo(null)
        setCharacterImage(null)
        setVideoData(null)
        setCharacterImageUrl(null)
        setQuality("1080p")
        setResult(null)
    }

    const handleDownload = async (url: string | undefined) => {
        if (!url) return;
        try {
            toast.info("Đang tải xuống...");
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `motion-video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Tải xuống thành công!");
            setTimeout(() => {
                toast.link("Bạn không thấy file được tải xuống?", url, 8000);
            }, 1500);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi tải xuống. Đang mở file trong tab mới...");
            window.open(url, '_blank');
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] md:overflow-hidden bg-[#0A0E13] text-white font-sans">
            {/* Left Sidebar - Settings Panel */}
            <aside className="w-full md:w-[420px] lg:w-[460px] flex flex-col gap-4 p-4 md:p-6 md:overflow-y-auto border-r border-white/10 bg-[#1A1F2E] z-10 custom-scrollbar shrink-0">
                
                {/* Main Configuration Card */}
                <div className="bg-[#1F2833] rounded-2xl border border-white/10 shadow-xl p-5 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white text-lg font-bold flex items-center gap-2">
                            <Settings2 className="text-[#00BCD4] w-5 h-5" />
                            Motion Control
                        </h2>
                        <button 
                            onClick={handleReset}
                            className="text-xs text-[#B0B8C4] hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <HistoryIcon className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    </div>

                    {/* Guide / Reference - Collapsible or Link */}
                     <Dialog>
                        <DialogTrigger asChild>
                            <button className="w-full py-3 px-4 bg-[#252D3D] hover:bg-[#2D3648] border border-white/5 rounded-xl flex items-center justify-between group transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#00BCD4]/10 text-[#00BCD4] flex items-center justify-center group-hover:bg-[#00BCD4] group-hover:text-white transition-colors">
                                        <CircleHelp className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-sm font-bold text-white">Lưu ý quan trọng!</h3>
                                        <p className="text-[10px] text-[#B0B8C4]">Xem ví dụ & mẹo tối ưu</p>
                                    </div>
                                </div>
                                <div className="text-[#6B7280] group-hover:text-white transition-colors">👉</div>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-[#1A1F2E] border-white/10 text-white p-0 overflow-hidden">
                             <DialogHeader className="p-6 pb-2 border-b border-white/5 bg-[#1F2833]">
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <Clapperboard className="w-5 h-5 text-[#00BCD4]" />
                                    Hướng dẫn tạo Motion Control
                                </DialogTitle>
                             </DialogHeader>
                             <div className="p-0 overflow-y-auto max-h-[80vh] custom-scrollbar bg-[#0A0E13]">
                                <img 
                                    src="/motion-guide.png" 
                                    alt="Motion Control Guide" 
                                    className="w-full h-auto object-contain"
                                />
                             </div>
                        </DialogContent>
                    </Dialog>

                    {/* Inputs - Side by Side Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <FileUpload
                                selectedFile={motionVideo}
                                onFileSelected={handleVideoSelect}
                                accept="video/*"
                                label="Tải lên video gốc cần copy"
                                subtext="Thời lượng video: 3-30 giây"
                                icon={VideoIcon}
                                maxSizeMB={100}
                                className="aspect-[3/4] p-4 border-dashed border-2 border-white/20 hover:border-white/40 bg-transparent rounded-2xl"
                            />
                        </div>

                        <div className="space-y-2">
                             <FileUpload
                                selectedFile={characterImage}
                                onFileSelected={handleImageSelect}
                                accept="image/*"
                                label="Tải lên ảnh nhân vật của bạn"
                                subtext="Ảnh có khuôn mặt và cơ thể rõ ràng"
                                icon={Plus}
                                className="aspect-[3/4] p-4 border-dashed border-2 border-white/20 hover:border-white/40 bg-transparent rounded-2xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                            <label className="text-sm font-medium text-[#B0B8C4]">Chất lượng</label>
                            <QualitySelector value={quality} onChange={setQuality} options={['720p', '1080p']} />
                    </div>



                    {/* Generate Button */}
                    <button 
                        onClick={handleGenerate}
                        disabled={
                            loading || 
                            !isAuthenticated || 
                            analyzing || 
                            analyzingImage ||
                            !videoData || 
                            !characterImageUrl || 
                            (!!user && !!videoData && user.credits < (quality === '1080p' ? videoData.costs["1080p"] : videoData.costs["720p"]))
                        }
                        className={cn(
                            "w-full h-12 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]",
                            (loading || analyzing || analyzingImage || !videoData || !characterImageUrl || (!!user && !!videoData && user.credits < (quality === '1080p' ? videoData.costs["1080p"] : videoData.costs["720p"]))) 
                                ? "bg-[#00BCD4]/50 cursor-not-allowed" 
                                : "bg-[#00BCD4] hover:bg-[#22D3EE] shadow-[0_0_15px_rgba(0,188,212,0.3)]"
                        )}
                    >
                        {loading || analyzing || analyzingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clapperboard className="w-5 h-5" />}
                        {loading ? "Đang xử lý..." : analyzing ? "Đang phân tích video..." : analyzingImage ? "Đang tải ảnh..." : "Tạo video"}
                        
                        {!loading && videoData && (
                            <span className="ml-2 px-2.5 py-1 rounded-full bg-black/20 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors group-hover:bg-black/30">
                                {quality === '1080p' ? videoData.costs["1080p"] : videoData.costs["720p"]} <Coins className="w-3.5 h-3.5" />
                            </span>
                        )}
                    </button>
                </div>



                {/* Queue Status */}
                <QueueStatus />

                {/* Recent Jobs Card Unified */}
                <div className="bg-[#252D3D] rounded-2xl border border-white/10 shadow-lg p-5 flex flex-col gap-4">
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <HistoryIcon className="text-[#B0B8C4] w-4 h-4" />
                        Thư viện gần đây
                    </h3>
                    <RecentGenerations 
                        onSelectJob={(job) => {
                             if (job.status === 'completed' && job.output_url) {
                                 setResult(job.output_url)
                                 setSelectedJob(job)
                             }
                        }}
                    />
                </div>


            </aside>

            {/* Right Panel - Preview */}
            <section className="flex-1 bg-[#0A0E13] relative flex flex-col min-h-[500px] md:min-h-0">
                <div className="relative md:absolute inset-0 p-4 md:p-10 flex items-center justify-center flex-1">
                    <div className="w-full h-full max-h-[800px] rounded-2xl border border-white/10 bg-[#1F2833] flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#6B7280 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                        
                        {result ? (
                             <>
                            {(() => {
                                const isVideo = !selectedJob || selectedJob.type.includes('v') || selectedJob.type === 'motion' || result.match(/\.(mp4|mov|webm)$/i);
                                
                                return isVideo ? (
                                    <video src={result} controls autoPlay loop className="w-full h-full object-contain shadow-2xl z-10" />
                                ) : (
                                     <img src={result} className="w-full h-full object-contain shadow-2xl z-10" alt="Generated" />
                                );
                            })()}
                                <div className="absolute bottom-10 right-10 flex gap-2 z-20">
                                    <Button onClick={() => handleDownload(result)} className="h-10 px-6 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm">
                                        <DownloadIcon className="h-4 w-4 mr-2" />
                                        Tải xuống
                                    </Button>
                                    <Button onClick={handleReset} className="h-10 px-6 rounded-full bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-lg shadow-[#00BCD4]/20">
                                        <RefreshIcon className="h-4 w-4 mr-2" />
                                        Tạo lại
                                    </Button>
                                </div>
                             </>
                        ) : loading ? (
                            <div className="flex flex-col items-center gap-4 text-[#6B7280] animate-pulse text-center z-10">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-[#252D3D] border-t-[#00BCD4] animate-spin" />
                                </div>
                                <p className="text-sm font-medium">
                                    Đang xử lý...
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6 z-10 p-6 text-center max-w-md">
                                <div className="size-24 rounded-full bg-[#252D3D] border border-white/10 flex items-center justify-center shadow-2xl shadow-black/50">
                                    <Clapperboard className="text-[#6B7280] w-12 h-12 group-hover:text-[#00BCD4] transition-colors duration-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Chưa có video nào được tạo</h3>
                                    <p className="text-[#B0B8C4] text-sm leading-relaxed">
                                        Nhập mô tả ở bảng bên trái và nhấn "Tạo video" để bắt đầu quá trình sáng tạo của bạn.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}
