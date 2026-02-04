"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useGenerateVideo } from "@/hooks/useGenerateVideo"
import { useCredits } from "@/hooks/useCredits"
import { apiRequest } from "@/lib/api"
import { getAuthHeader } from "@/lib/auth"
import { useSearchParams } from "next/navigation"
import { NEXT_PUBLIC_API } from "@/lib/config"
import { useToast } from "@/hooks/useToast"
import { VIDEO_MODELS, getModelConfig } from "@/lib/models-config"
import { useAuth } from "@/hooks/useAuth"
import { Job } from "@/hooks/useJobs"
import { cn } from "@/lib/utils"

// UI Components
import RecentGenerations from "../studio/RecentGenerations"
import QueueStatus from "../studio/QueueStatus"
import { useGlobalJobs } from "@/contexts/JobsContext"
import Button from "../common/Button"
import { 
    Settings2, 
    History as HistoryIcon, 
    Image as LucideImage,
    Video as VideoIcon, 
    Sliders, 
    Clapperboard, 
    Check as CheckIcon, 
    Zap, 
    Download as DownloadIcon, 
    RefreshCw as RefreshIcon,
    Loader2,
    Info as InfoIcon,
    Play,
    Volume2,
    Coins,
    Trash2
} from "lucide-react"

import ImageUpload from "./ImageUpload"
import FileUpload from "./FileUpload"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AspectRatioSelector from "./AspectRatioSelector"
import ModelSelector from "./ModelSelector"
import DurationSelector from "./DurationSelector"
import QualitySelector from "./QualitySelector"
import InsufficientCreditsModal from "../common/InsufficientCreditsModal"

export function VideoGenerator() {
    const [prompt, setPrompt] = useState("")
    const [referenceImages, setReferenceImages] = useState<File[]>([])
    const [endFrameImages, setEndFrameImages] = useState<File[]>([]) 
    const [model, setModel] = useState("kling-2.6")
    const [duration, setDuration] = useState("5s")
    const [quality, setQuality] = useState("720p")
    const [aspectRatio, setAspectRatio] = useState("16:9")
    const [audio, setAudio] = useState(false)
    const [speed, setSpeed] = useState("slow")
    const [showCreditsModal, setShowCreditsModal] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [currentJobStatus, setCurrentJobStatus] = useState<string>("") 
    const [modelConfigs, setModelConfigs] = useState<any>({})
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [showMetadata, setShowMetadata] = useState(false)
    
    // Inject Global Jobs Context
    const { addOptimisticJob, updateOptimisticJob } = useGlobalJobs();
    // const [recentJobs, setRecentJobs] = useState<Job[]>([]) // Removed in favor of global context

    const searchParams = useSearchParams()
    
    // Check for image_url from ImageGenerator
    useEffect(() => {
        const fromImage = searchParams.get('from_image');
        const imageUrl = searchParams.get('image_url');
        
        if (fromImage === 'true') {
            // Retrieve from sessionStorage (new approach for CORS-restricted URLs)
            const base64 = sessionStorage.getItem('image_for_video');
            const fileName = sessionStorage.getItem('image_for_video_name') || 'generated-image.png';
            
            if (base64) {
                try {
                    // Convert base64 back to File
                    const arr = base64.split(',');
                    const mimeMatch = arr[0].match(/:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    const file = new File([u8arr], fileName, { type: mime });
                    setReferenceImages([file]);
                    toast.success("Đã tải ảnh từ kết quả tạo ảnh!");
                    
                    // Clean up sessionStorage
                    sessionStorage.removeItem('image_for_video');
                    sessionStorage.removeItem('image_for_video_name');
                } catch (error) {
                    console.error("Error loading image from storage:", error);
                    toast.error("Không thể tải ảnh. Hãy tải xuống và upload thủ công.");
                }
            }
        } else if (imageUrl) {
            // Legacy approach - direct URL fetch (may fail on CORS-restricted URLs)
            const fetchImage = async () => {
                try {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], "generated-image.png", { type: blob.type });
                    setReferenceImages([file]);
                    toast.success("Đã tải ảnh từ kết quả tạo ảnh!");
                } catch (error) {
                    console.error("Error fetching image from URL:", error);
                    toast.error("Không thể tải ảnh từ liên kết.");
                }
            };
            fetchImage();
        }
    }, [searchParams]);

    const { isAuthenticated, login } = useAuth()
    const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateVideo()
    const { balance, estimateVideoCost, hasEnoughCredits, updateCredits } = useCredits()
    const toast = useToast()
    
    // Fetch model configs
    useEffect(() => {
        fetch(`${NEXT_PUBLIC_API}/api/costs`)
            .then(res => res.json())
            .then(data => setModelConfigs(data))
            .catch(err => console.error("Failed to fetch model configs:", err))
    }, [])

    // Deleted fetchRecentJobs and its useEffect


    
    // Filter active models
    const activeVideoModels = useMemo(() => {
        if (Object.keys(modelConfigs).length === 0) return VIDEO_MODELS;
        return VIDEO_MODELS.filter(m => {
            const config = modelConfigs[m.value];
            return !config || config.is_enabled !== 0; 
        });
    }, [modelConfigs]);

    // Enforce valid model/speed
    useEffect(() => {
        if (activeVideoModels.length > 0) {
            const isCurrentActive = activeVideoModels.find(m => m.value === model);
            if (!isCurrentActive) setModel(activeVideoModels[0].value);
        }
        if (modelConfigs[model] && modelConfigs[model].is_slow_mode_enabled === 0) {
            if (speed === 'slow') setSpeed('fast');
        }
    }, [activeVideoModels, model, modelConfigs, speed]);

    // Update state when model changes
    useEffect(() => {
        const config = getModelConfig(model, 'video');
        if (config) {
            if (config.durations && config.durations.length > 0 && !config.durations.includes(duration)) setDuration(config.durations[0]);
            if (config.qualities && config.qualities.length > 0 && !config.qualities.includes(quality)) setQuality(config.qualities[0]);
            if (config.aspectRatios && config.aspectRatios.length > 0 && !config.aspectRatios.includes(aspectRatio)) setAspectRatio(config.aspectRatios[0]);
            if (!config.audio) setAudio(false);
        }
    }, [model]);

    const estimatedCost = useMemo(() => {
        return estimateVideoCost(model, duration, quality, aspectRatio, audio, speed)
    }, [model, duration, quality, aspectRatio, audio, speed, estimateVideoCost])

    const isImageToVideo = referenceImages.length > 0

    const getImageDimensionsFromUrl = (url: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve({ width: img.width, height: img.height })
            img.onerror = reject
            img.crossOrigin = 'anonymous'
            img.src = url
        })
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
            a.download = `generated-video-${Date.now()}.mp4`;
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

    const handleGenerate = async () => {
        if (!prompt.trim() && !isImageToVideo) return
        if (!isAuthenticated) { login(); return }
        if (!hasEnoughCredits(estimatedCost)) { setShowCreditsModal(true); return }
        
        const i2vOnlyModels = ['kling-2.5-turbo', 'kling-o1-video']
        if (i2vOnlyModels.includes(model) && !isImageToVideo) {
            alert('Model này chỉ hỗ trợ Image to Video. Vui lòng tải lên hình ảnh tham chiếu.')
            return
        }

        // 1. Capture State
        const currentPrompt = prompt || (isImageToVideo ? "Image to Video" : "Video Generation");
        const currentModel = model;
        const currentDuration = duration;
        const currentQuality = quality;
        const currentSpeed = speed;
        const currentAspectRatio = aspectRatio;
        const currentAudio = audio;
        const currentReferenceImages = [...referenceImages];
        const currentEndFrameImages = [...endFrameImages];

        // 2. Optimistic Update
        const tempId = addOptimisticJob({
            model: currentModel,
            prompt: currentPrompt,
            type: isImageToVideo ? 'i2v' : 't2v',
            status: 'pending',
        });

        // 3. Instant UI Reset
        setPrompt("");
        // setReferenceImages([]); 
        // setEndFrameImages([]);
        // Decide whether to clear files. User said "clear input". Let's clear files too for queue experience.
        setReferenceImages([]);
        setEndFrameImages([]);

        setResult(null)
        setLoading(false) // Fire and forget!
        setError(null);
        
        // 4. Background Task
        (async () => {
            try {
                const durationInt = parseInt(currentDuration.replace('s', ''))
                let imgId = '', imgUrl = '', imgWidth = 0, imgHeight = 0, googleMediaId = ''
                
                // Determine if this is a Google/Veo model
                const isVeoModel = currentModel.startsWith('veo3.1-')
                
                if (isImageToVideo && currentReferenceImages.length > 0) {
                    const file = currentReferenceImages[0]
                    
                    if (isVeoModel) {
                        const formData = new FormData();
                        formData.append('image', file);
                        const uploadInfo = await apiRequest<{ id: string, url: string }>('/api/generate/image/google/upload', {
                            method: 'POST',
                            body: formData,
                            headers: {} 
                        });
                        googleMediaId = uploadInfo.id; 
                    } else {
                        const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' })
                        await fetch(uploadInfo.upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': 'image/jpeg' } })
                        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadInfo.id }) })
                        const { width, height } = await getImageDimensionsFromUrl(uploadInfo.url)
                        imgId = uploadInfo.id; imgUrl = uploadInfo.url; imgWidth = width; imgHeight = height;
                    }
                }

                const formData = new FormData()
                formData.append('prompt', currentPrompt)
                formData.append('duration', durationInt.toString())
                let endpoint = ''

                if (currentModel.startsWith('veo3.1-')) {
                    formData.append('aspect_ratio', currentAspectRatio)
                    const mode = isImageToVideo ? 'i2v' : 't2v'
                    if (mode === 'i2v') formData.append('media_id', googleMediaId) 
                    const modelPath = currentModel.replace('.', '_')
                    const response = await fetch(`${NEXT_PUBLIC_API}/api/generate/video/${modelPath}/${mode}`, { method: 'POST', body: formData, headers: { ...getAuthHeader() } })
                    if (!response.ok) throw new Error(`Failed: ${response.status}`)
                    const genRes = await response.json()
                    
                    toast.info(`Task submitted! (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000)
                    if (genRes.credits_remaining !== undefined) updateCredits(genRes.credits_remaining)
                    
                    updateOptimisticJob(tempId, genRes.job_id);
                    // Global context polling handles the rest
                    return
                }

                if (currentModel === 'kling-2.5-turbo') {
                    endpoint = '/api/generate/video/kling-2.5-turbo/i2v'
                    formData.append('resolution', currentQuality)
                    formData.append('img_id', imgId)
                    formData.append('img_url', imgUrl)
                    formData.append('width', imgWidth.toString())
                    formData.append('height', imgHeight.toString())
                    formData.append('speed', currentSpeed)
                    if (currentQuality === '1080p' && currentEndFrameImages.length > 0) {
                        const endFile = currentEndFrameImages[0]
                        const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' })
                        await fetch(uploadInfo.upload_url, { method: 'PUT', body: endFile, headers: { 'Content-Type': 'image/jpeg' } })
                        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadInfo.id }) })
                        const { width: endWidth, height: endHeight } = await getImageDimensionsFromUrl(uploadInfo.url)
                        formData.append('end_img_id', uploadInfo.id)
                        formData.append('end_img_url', uploadInfo.url)
                        formData.append('end_width', endWidth.toString())
                        formData.append('end_height', endHeight.toString())
                    }
                } else if (currentModel === 'kling-o1-video') {
                    endpoint = '/api/generate/video/kling-o1/i2v'
                    formData.append('aspect_ratio', currentAspectRatio)
                    formData.append('img_id', imgId)
                    formData.append('img_url', imgUrl)
                    formData.append('width', imgWidth.toString())
                    formData.append('height', imgHeight.toString())
                    formData.append('speed', currentSpeed)
                    if (currentEndFrameImages.length > 0) {
                        const endFile = currentEndFrameImages[0]
                        const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' })
                        await fetch(uploadInfo.upload_url, { method: 'PUT', body: endFile, headers: { 'Content-Type': 'image/jpeg' } })
                        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadInfo.id }) })
                        const { width: endWidth, height: endHeight } = await getImageDimensionsFromUrl(uploadInfo.url)
                        formData.append('end_img_id', uploadInfo.id)
                        formData.append('end_img_url', uploadInfo.url)
                        formData.append('end_width', endWidth.toString())
                        formData.append('end_height', endHeight.toString())
                    }
                } else if (currentModel === 'kling-2.6') {
                    formData.append('sound', currentAudio.toString())
                    formData.append('speed', currentSpeed)
                    formData.append('resolution', currentQuality)
                    if (isImageToVideo) {
                        endpoint = '/api/generate/video/kling-2.6/i2v'
                        formData.append('img_id', imgId)
                        formData.append('img_url', imgUrl)
                        formData.append('width', imgWidth.toString())
                        formData.append('height', imgHeight.toString())
                    } else {
                        endpoint = '/api/generate/video/kling-2.6/t2v'
                        formData.append('aspect_ratio', currentAspectRatio)
                    }
                } else if (currentModel === 'sora-2.0') {
                     formData.append('aspect_ratio', currentAspectRatio)
                     formData.append('speed', currentSpeed)
                     if (isImageToVideo) {
                         endpoint = '/api/generate/video/sora-2_0/i2v'
                         formData.append('img_url', imgUrl)
                     } else {
                         endpoint = '/api/generate/video/sora-2_0/t2v'
                     }
                } else { throw new Error(`Unknown model: ${currentModel}`) }

                const response = await fetch(`${NEXT_PUBLIC_API}${endpoint}`, { method: 'POST', body: formData, headers: { ...getAuthHeader() } })
                if (!response.ok) throw new Error(`Failed: ${response.status}`)
                const genRes = await response.json()
                
                toast.info(`Task submitted! (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000)
                if (genRes.credits_remaining !== undefined) updateCredits(genRes.credits_remaining)
                
                updateOptimisticJob(tempId, genRes.job_id);

            } catch (e: any) {
                console.error("Background generation error:", e)
                toast.error(`Generation failed: ${e.message}`)
            }
        })();
    }

    return (
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] md:overflow-hidden bg-[#0A0E13] text-white font-sans">
            {/* Left Sidebar - Settings Panel */}
            <aside className="w-full md:w-[420px] lg:w-[460px] flex flex-col gap-4 p-4 md:p-6 md:overflow-y-auto border-r border-white/10 bg-[#1A1F2E] z-10 custom-scrollbar shrink-0">
                
                {/* Main Configuration Card */}
                <div className="bg-[#1F2833] rounded-2xl border border-white/10 shadow-xl p-5 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white text-lg font-bold flex items-center gap-2">
                            <Settings2 className="text-[#00BCD4] w-5 h-5" />
                            Cấu hình
                        </h2>
                        <button 
                            onClick={() => { setPrompt(""); setReferenceImages([]); setEndFrameImages([]); setAspectRatio("16:9"); }}
                            className="text-xs text-[#B0B8C4] hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <HistoryIcon className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    </div>

                    {/* Prompt */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#B0B8C4]">Mô tả video</label>
                        <textarea 
                            className="w-full h-32 bg-[#252D3D] border border-[#6B7280] rounded-xl p-3 text-white text-sm placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] resize-none transition-all" 
                            placeholder="Mô tả ý tưởng video của bạn chi tiết ở đây (ví dụ: Một phi hành gia đang đi bộ trên sao hỏa lúc hoàng hôn...)"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        ></textarea>
                    </div>

                    {/* Reference Images */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-[#B0B8C4] flex justify-between">
                                Hình ảnh tham chiếu
                                <span className="text-xs text-[#6B7280] font-normal">Tùy chọn</span>
                            </label>
                            <ImageUpload onImagesSelected={setReferenceImages} maxImages={1} description="Bắt đầu video từ ảnh này" />
                        </div>
                        
                        {((model === 'kling-2.5-turbo' && quality === '1080p') || model === 'kling-o1-video') && (
                            <div className="flex flex-col gap-2 animate-in slide-in-from-top-2">
                                <label className="text-sm font-medium text-[#B0B8C4] flex justify-between">
                                    Khung hình kết thúc
                                    <span className="text-xs text-[#6B7280] font-normal">Tùy chọn</span>
                                </label>
                                <ImageUpload onImagesSelected={setEndFrameImages} maxImages={1} description="Kết thúc video tại ảnh này" />
                            </div>
                        )}
                    </div>

                    {/* Aspect Ratio */}
                    <div className="flex flex-col gap-2">
                        {(() => {
                            const modelConfig = getModelConfig(model, 'video');
                            if (modelConfig?.aspectRatios && modelConfig.aspectRatios.length > 0) {
                                return (
                                    <>
                                        <label className="text-sm font-medium text-[#B0B8C4]">Tỷ lệ khung hình</label>
                                        <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} options={modelConfig.aspectRatios} />
                                    </>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    {/* Advanced Settings Toggle */}
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-[#00BCD4] border border-[#00BCD4] bg-transparent rounded-xl hover:bg-[#00BCD4]/10 transition-all"
                    >
                        <Sliders className="w-4 h-4" />
                        Cấu hình nâng cao
                    </button>
                    
                    {showSettings && (
                        <div className="p-4 space-y-6 border border-white/10 rounded-xl bg-[#252D3D] animate-in slide-in-from-top-2">
                            <ModelSelector value={model} onChange={setModel} mode="video" options={activeVideoModels} />
                             
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[#6B7280] uppercase">Tốc độ</label>
                                <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-xl">
                                    <button
                                        onClick={() => setSpeed('fast')}
                                        className={cn("flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all", speed === 'fast' ? "bg-[#00BCD4]/20 text-[#00BCD4] border border-[#00BCD4]/30" : "text-[#B0B8C4] hover:text-white")}
                                    >
                                        <Zap className="w-3.5 h-3.5" /> Nhanh
                                    </button>
                                    {(!modelConfigs[model] || modelConfigs[model].is_slow_mode_enabled !== 0) && (
                                        <button
                                            onClick={() => setSpeed('slow')}
                                            className={cn("flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all", speed === 'slow' ? "bg-green-500/20 text-green-400 border border-green-500/30" : "text-[#B0B8C4] hover:text-white")}
                                        >
                                            <Coins className="w-3.5 h-3.5" /> Tiết kiệm
                                        </button>
                                    )}
                                </div>
                            </div>

                            {(() => {
                                const config = getModelConfig(model, 'video');
                                return (
                                    <>
                                        {config?.durations && <DurationSelector value={duration} onChange={setDuration} options={config.durations} />}
                                        {config?.qualities && <QualitySelector value={quality} onChange={setQuality} options={config.qualities} />}
                                        {config?.audio && (
                                            <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-black/20">
                                                <div className="flex items-center gap-2">
                                                    <Volume2 className="w-4 h-4 text-[#00BCD4]" />
                                                    <span className="text-sm text-[#B0B8C4]">Âm thanh</span>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={audio}
                                                    onChange={(e) => setAudio(e.target.checked)}
                                                    className="rounded border-[#6B7280] bg-black/40 text-[#00BCD4] focus:ring-[#00BCD4]"
                                                />
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim() || (isAuthenticated && balance < estimatedCost)}
                        className={cn(
                            "w-full h-12 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]",
                            loading ? "bg-[#00BCD4]/50 cursor-not-allowed" : "bg-[#00BCD4] hover:bg-[#22D3EE] shadow-[0_0_15px_rgba(0,188,212,0.3)]"
                        )}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clapperboard className="w-5 h-5" />}
                        {loading ? "Đang tạo..." : "Tạo Video"}
                        {isAuthenticated && !loading && (
                            <span className="ml-2 px-2.5 py-1 rounded-full bg-black/20 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors group-hover:bg-black/30">
                                {estimatedCost} <Coins className="w-3.5 h-3.5" />
                            </span>
                        )}
                    </button>
                </div>



                {/* Queue Status */}
                <QueueStatus />

                {/* Recent Jobs Card Unified */}
                <div className="bg-[#252D3D] rounded-2xl border border-white/10 shadow-lg p-5 flex flex-col gap-4">
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <VideoIcon className="text-[#B0B8C4] w-4 h-4" />
                        Thư viện gần đây
                    </h3>
                    <RecentGenerations 
                        onSelectJob={(job) => {
                             if (job.status === 'completed' && job.output_url) {
                                 setResult({ video_url: job.output_url, job_id: job.job_id, status: 'completed' })
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
                        
                        {result?.video_url ? (
                            <>
                                <button 
                                    onClick={() => setShowMetadata(!showMetadata)}
                                    className={cn(
                                        "absolute top-4 right-4 z-20 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-sm",
                                        showMetadata ? "bg-white text-black" : "bg-black/40 hover:bg-black/60 text-white"
                                    )}
                                >
                                    <InfoIcon className="w-5 h-5" />
                                </button>

                                {showMetadata && selectedJob && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/75 backdrop-blur-md pt-8 pb-6 px-6 text-white animate-in slide-in-from-bottom-4 duration-300 z-10">
                                        <div className="flex flex-col gap-5">
                                            <div className="space-y-2">
                                                <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Prompt</div>
                                                <p className="text-[15px] font-medium text-white/90 italic leading-relaxed">"{selectedJob.prompt}"</p>
                                            </div>
                                            <div className="h-px w-full bg-white/10" />
                                            <div className="grid grid-cols-2 gap-8">
                                                <div>
                                                    <span className="text-[10px] font-bold text-white/50 uppercase block mb-1.5">Model</span>
                                                    <span className="text-sm font-semibold text-white">{selectedJob.model}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-white/50 uppercase block mb-1.5">Trạng thái</span>
                                                    <span className="text-sm font-semibold text-white">{selectedJob.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {(() => {
                                    const isVideo = !selectedJob || selectedJob.type.includes('v') || selectedJob.type === 'motion' || result.video_url.match(/\.(mp4|mov|webm)$/i);
                                    
                                    return isVideo ? (
                                        <video src={result.video_url} controls autoPlay loop className="w-full h-full object-contain shadow-2xl z-10" />
                                    ) : (
                                         <img src={result.video_url} className="w-full h-full object-contain shadow-2xl z-10" alt="Generated" />
                                    );
                                })()}
                                
                                <div className="absolute bottom-10 right-10 flex gap-2 z-20">
                                    <Button onClick={() => handleDownload(result.video_url)} className="h-10 px-6 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm">
                                        <DownloadIcon className="h-4 w-4 mr-2" />
                                        Tải xuống
                                    </Button>
                                    <Button onClick={handleGenerate} className="h-10 px-6 rounded-full bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-lg shadow-[#00BCD4]/20">
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
                                    {currentJobStatus === 'pending' ? 'Đang hàng đợi... Vui lòng đợi' : 'Đang xử lý...'}
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
                                        Nhập mô tả ở bảng bên trái và nhấn "Tạo Video" để bắt đầu quá trình sáng tạo của bạn.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            
            <InsufficientCreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} required={estimatedCost} available={balance} />
        </div>
    )
}
