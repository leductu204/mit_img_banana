"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useGenerateImage } from "@/hooks/useGenerateImage"
import { useCredits } from "@/hooks/useCredits"
import { useToast } from "@/hooks/useToast"
import { apiRequest } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { Job } from "@/hooks/useJobs"
import { getModelConfig, IMAGE_MODELS } from "@/lib/models-config"

// UI Components
import Button from "../common/Button"
import RecentGenerations from "../studio/RecentGenerations"
import QueueStatus from "../studio/QueueStatus"
import { useGlobalJobs } from "@/contexts/JobsContext"
import { 
    Settings2, 
    History as HistoryIcon, 
    ImagePlus, 
    Sliders, 
    Image as LucideImage, 
    Images, 
    Check as CheckIcon, 
    Zap, 
    Download as DownloadIcon, 
    RefreshCw as RefreshIcon,
    Loader2,
    Info as InfoIcon,
    X,
    Plus,
    Coins,
    Trash2,
    Video as VideoIcon
} from "lucide-react"

import { cn } from "@/lib/utils"
import ImageUpload from "./ImageUpload"
import AspectRatioSelector from "./AspectRatioSelector"
import ModelSelector from "./ModelSelector"
import QualitySelector from "./QualitySelector"
import InsufficientCreditsModal from "../common/InsufficientCreditsModal"

export function ImageGenerator() {
    const [prompt, setPrompt] = useState("")
    const [aspectRatio, setAspectRatio] = useState("9:16")
    const [referenceImages, setReferenceImages] = useState<File[]>([])
    const [model, setModel] = useState("nano-banana")
    const [quality, setQuality] = useState("2k")
    const [speed, setSpeed] = useState("slow")
    const [keepStyle, setKeepStyle] = useState(true)
    const [showCreditsModal, setShowCreditsModal] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [showMetadata, setShowMetadata] = useState(false)
    
    // Inject Global Jobs Context
    const { addOptimisticJob, updateOptimisticJob } = useGlobalJobs();

    const { isAuthenticated, login } = useAuth()
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateImage()
    const { 
        balance, 
        estimateImageCost, 
        hasEnoughCredits, 
        updateCredits,
        getAvailableAspectRatios,
        getAvailableResolutions,
        costsLoaded,
        modelCosts 
    } = useCredits()
    const toast = useToast()
    const router = useRouter()

    const handleDeleteJob = async (e: React.MouseEvent, jobId: string) => {
        // Handled globally in RecentGenerations now, but kept safe if needed
    };

    // Filter active models
    const activeImageModels = useMemo(() => {
        if (!costsLoaded || Object.keys(modelCosts).length === 0) return IMAGE_MODELS;
        return IMAGE_MODELS.filter(m => {
            const config = modelCosts[m.value];
            return !config || config.is_enabled !== 0; 
        });
    }, [modelCosts, costsLoaded]);

    // Enforce valid model/speed
    useEffect(() => {
        if (activeImageModels.length > 0) {
            const isCurrentActive = activeImageModels.find(m => m.value === model);
            if (!isCurrentActive) setModel(activeImageModels[0].value);
        }
        if (costsLoaded && modelCosts[model]) {
             let isSlowModeEnabled = true;
             if (model === 'nano-banana-pro') {
                 const qualityKey = quality.toLowerCase();
                 // @ts-ignore
                 const configKey = `is_slow_mode_enabled_${qualityKey}`;
                 const config = modelCosts[model];
                 // @ts-ignore
                 if (config && config[configKey] === 0) isSlowModeEnabled = false;
             } else {
                 if (modelCosts[model].is_slow_mode_enabled === 0) isSlowModeEnabled = false;
             }
             if (!isSlowModeEnabled && speed === 'slow') setSpeed('fast');
        }
    }, [activeImageModels, model, modelCosts, costsLoaded, speed, quality]);

    const dynamicAspectRatios = useMemo(() => {
        if (!costsLoaded) return [];
        return getAvailableAspectRatios(model, model === "nano-banana-pro" ? quality : undefined);
    }, [model, quality, costsLoaded, getAvailableAspectRatios]);

    const dynamicResolutions = useMemo(() => {
        if (!costsLoaded) return [];
        return getAvailableResolutions(model);
    }, [model, costsLoaded, getAvailableResolutions]);

    const estimatedCost = useMemo(() => {
        return estimateImageCost(model, aspectRatio, quality, speed);
    }, [model, aspectRatio, quality, speed, estimateImageCost])

    useEffect(() => {
        const modelConfig = getModelConfig(model, 'image');
        const availableRatios = dynamicAspectRatios.length > 0 ? dynamicAspectRatios : (modelConfig?.aspectRatios || []);
        if (availableRatios.length > 0 && !availableRatios.includes(aspectRatio)) {
            setAspectRatio(availableRatios[0]);
        }
    }, [model, dynamicAspectRatios]);

    const isImageToImage = referenceImages.length > 0


    const getImageDimensionsFromUrl = (url: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve({ width: img.width, height: img.height })
            img.onerror = reject
            img.crossOrigin = 'anonymous'
            img.src = url
        })
    }

    const handleDownload = async (url: string | undefined, type: 'image' | 'video' = 'image') => {
        if (!url) return;
        try {
            toast.info("Đang tải xuống...");
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `generated-${type}-${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Tải xuống thành công!");
            // Show fallback link notification
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
        if (!prompt.trim()) return
        if (!isAuthenticated) { login(); return }
        if (!hasEnoughCredits(estimatedCost)) { setShowCreditsModal(true); return }

        // 1. Capture current state for the background task
        const currentPrompt = prompt;
        const currentModel = model;
        const currentReferenceImages = [...referenceImages]; // copy array
        const currentAspectRatio = aspectRatio;
        const currentQuality = quality;
        const currentSpeed = speed;

        // 2. Optimistic Update - Show in UI immediately
        const tempId = addOptimisticJob({
            model: currentModel,
            prompt: currentPrompt,
            type: isImageToImage ? 'i2i' : 't2i',
            status: 'pending'
        });

        // 3. Reset Form & UI state Immediately (Fire & Forget UI)
        setPrompt("");
        setReferenceImages([]);
        // Do NOT set loading to true effectively for the user, or set it false immediately
        // We actually don't want the big spinner to block the generic view if we want "queue" style.
        // But the user might want to see *some* indication it was received.
        // Toast handles "Task started".
        // Let's set loading(false) strictly to ensure inputs are unlocked.
        setLoading(false); 
        setResult(null);
        setError(null);

        // 4. Background Process
        (async () => {
            try {
                const inputImages = []
                if (currentReferenceImages.length > 0) {
                    // Determine if this is a Google model (needs different upload endpoint)
                    const isGoogleModel = ['nano-banana-cheap', 'nano-banana-pro-cheap', 'image-4.0'].includes(currentModel);
                    
                    for (let i = 0; i < currentReferenceImages.length; i++) {
                            const file = currentReferenceImages[i]
                            
                            if (isGoogleModel) {
                                // Google models use a different upload endpoint
                                const formData = new FormData();
                                formData.append('image', file);
                                const uploadInfo = await apiRequest<{ id: string, url: string }>('/api/generate/image/google/upload', {
                                    method: 'POST',
                                    body: formData,
                                    headers: {} 
                                });
                                inputImages.push({ type: "media_input", id: uploadInfo.id, url: uploadInfo.url || '', width: 0, height: 0 });
                            } else {
                                // Higgsfield models use presigned URL upload
                                const endpoint = i === 0 ? '/api/generate/image/upload' : '/api/generate/image/upload/batch'
                                const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>(endpoint, { method: 'POST' })
                                await fetch(uploadInfo.upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': 'image/jpeg' } })
                                await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadInfo.id }) })
                                const { width, height } = await getImageDimensionsFromUrl(uploadInfo.url)
                                inputImages.push({ type: "media_input", id: uploadInfo.id, url: uploadInfo.url, width, height })
                            }
                    }
                }

                // Determine endpoint based on model
                let endpoint = '';
                if (currentModel === 'nano-banana-cheap') endpoint = '/api/generate/image/nano-banana-cheap/generate';
                else if (currentModel === 'nano-banana-pro-cheap') endpoint = '/api/generate/image/nano-banana-pro-cheap/generate';
                else if (currentModel === 'image-4.0') endpoint = '/api/generate/image/image-4.0/generate';
                else if (currentModel === 'nano-banana-pro') endpoint = '/api/generate/image/nano-banana-pro/generate';
                else endpoint = '/api/generate/image/nano-banana/generate';

                const modelConfig = getModelConfig(currentModel, 'image');
                const isPro = modelConfig?.resolutions && modelConfig.resolutions.length > 0;
                
                const payload: any = { prompt: currentPrompt, input_images: inputImages, aspect_ratio: currentAspectRatio };
                
                // Only include speed for Higgsfield models
                if (!['nano-banana-cheap', 'nano-banana-pro-cheap', 'image-4.0'].includes(currentModel)) {
                    payload.speed = currentSpeed;
                }

                if (isPro) payload.resolution = currentQuality;

                const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>(endpoint, { method: 'POST', body: JSON.stringify(payload) })
                
                toast.info(`Task submitted successfully!`, 2000)
                if (genRes.credits_remaining !== undefined) updateCredits(genRes.credits_remaining)

                // Update Optimistic Job with Real ID
                updateOptimisticJob(tempId, genRes.job_id);
                // No local polling needed, global context handles it.

            } catch (e: any) {
                console.error("Background generation error:", e)
                // We should update the optimistic job to failed if possible, 
                // but we only have tempId. 
                // Ideally updateOptimisticJob supports marking as error without job_id?
                // For now, we unfortunately can't update the specific card status without a real Job ID if the initial request failed entirely.
                // We can at least toast.
                toast.error(`Generation failed: ${e.message}`)
                // In a perfect world, we'd have a 'failOptimisticJob(tempId)' function.
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
                            onClick={() => { setPrompt(""); setReferenceImages([]); setAspectRatio("9:16"); }}
                            className="text-xs text-[#B0B8C4] hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <HistoryIcon className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    </div>

                    {/* Prompt Input */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#B0B8C4]">Mô tả ảnh</label>
                        <textarea 
                            className="w-full h-32 bg-[#252D3D] border border-[#6B7280] rounded-xl p-3 text-white text-sm placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] resize-none transition-all" 
                            placeholder="Mô tả ý tưởng hình ảnh của bạn chi tiết ở đây (ví dụ: Một khu rừng nguyên sinh huyền bí với những cây nấm phát sáng...)"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        ></textarea>
                    </div>

                    {/* Reference Images */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#B0B8C4] flex justify-between">
                            Hình ảnh tham chiếu
                            <span className="text-xs text-[#6B7280] font-normal">Tùy chọn</span>
                        </label>
                        <ImageUpload onImagesSelected={setReferenceImages} maxImages={5} />
                    </div>

                    {/* Aspect Ratio */}
                    <div className="flex flex-col gap-2">
                         <label className="text-sm font-medium text-[#B0B8C4]">Tỷ lệ khung hình</label>
                         {(() => {
                            const modelConfig = getModelConfig(model, 'image');
                            const ratiosToShow = costsLoaded && dynamicAspectRatios.length > 0
                                ? dynamicAspectRatios
                                : (modelConfig?.aspectRatios || ['16:9', '9:16', '1:1']);
                            
                            return (
                                <AspectRatioSelector 
                                    value={aspectRatio} 
                                    onChange={setAspectRatio} 
                                    options={ratiosToShow}
                                />
                            );
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
                            <ModelSelector value={model} onChange={setModel} mode="image" />
                             
                             {(() => {
                                 // Hide Speed Selector for Google Models (Single Default Cost)
                                 if (['nano-banana-cheap', 'nano-banana-pro-cheap', 'image-4.0'].includes(model)) return null;

                                 const isSlowModeAllowed = (() => {
                                     if (!costsLoaded || !modelCosts[model]) return true;
                                     if (model === 'nano-banana-pro') {
                                         const qualityKey = quality.toLowerCase();
                                         const configKey = `is_slow_mode_enabled_${qualityKey}`;
                                         return modelCosts[model][configKey] !== 0;
                                     }
                                     return modelCosts[model].is_slow_mode_enabled !== 0;
                                 })();
                                 
                                 return (
                                     <div className="space-y-2">
                                        <label className="text-xs font-medium text-[#6B7280] uppercase">Tốc độ xử lý</label>
                                        <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-xl">
                                            <button
                                                onClick={() => setSpeed('fast')}
                                                className={cn("flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all", speed === 'fast' ? "bg-[#00BCD4]/20 text-[#00BCD4] border border-[#00BCD4]/30" : "text-[#B0B8C4] hover:text-white")}
                                            >
                                                <Zap className="w-3.5 h-3.5" /> Nhanh
                                            </button>
                                            
                                            {isSlowModeAllowed && (
                                                <button
                                                    onClick={() => setSpeed('slow')}
                                                    className={cn("flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all", speed === 'slow' ? "bg-green-500/20 text-green-400 border border-green-500/30" : "text-[#B0B8C4] hover:text-white")}
                                                >
                                                    <Coins className="w-3.5 h-3.5" /> Tiết kiệm
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                 );
                             })()}

                            {dynamicResolutions.length > 0 || (getModelConfig(model, 'image')?.resolutions?.length ?? 0) > 0 ? (
                                <QualitySelector 
                                    value={quality} 
                                    onChange={setQuality} 
                                    options={dynamicResolutions.length > 0 ? dynamicResolutions : getModelConfig(model, 'image')?.resolutions} 
                                />
                            ) : null}
                        </div>
                    )}

                    {/* Generate Button - Primary CTA */}
                    <button 
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || (isAuthenticated && balance < estimatedCost)}
                        className={cn(
                            "w-full h-12 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]",
                            loading 
                                ? "bg-[#00BCD4]/50 cursor-not-allowed" 
                                : "bg-[#00BCD4] hover:bg-[#22D3EE] shadow-[0_0_15px_rgba(0,188,212,0.3)]"
                        )}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <LucideImage className="w-5 h-5" />
                        )}
                        {loading ? "Đang tạo..." : "Tạo Ảnh"}
                        {isAuthenticated && !loading && (
                            <span className="ml-2 px-2.5 py-1 rounded-full bg-black/20 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors group-hover:bg-black/30">
                                {estimatedCost} <Coins className="w-3.5 h-3.5" />
                            </span>
                        )}
                    </button>
                </div>



                {/* Queue Status */}
                <QueueStatus />

                {/* Recent Jobs Card - Unified */}
                <div className="bg-[#252D3D] rounded-2xl border border-white/10 shadow-lg p-5 flex flex-col gap-4">
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <Images className="text-[#B0B8C4] w-4 h-4" />
                        Thư viện gần đây
                    </h3>
                    <RecentGenerations 
                        onSelectJob={(job) => {
                             if (job.status === 'completed' && job.output_url) {
                                 setResult({ image_url: job.output_url, job_id: job.job_id, status: 'completed' })
                                 setSelectedJob(job)
                                 // Optionally switch view to this job
                             }
                        }}
                    />
                </div>
            </aside>

            {/* Right Panel - Preview Area */}
            <section className="flex-1 bg-[#0A0E13] relative flex flex-col min-h-[500px] md:min-h-0">
                <div className="relative md:absolute inset-0 p-4 md:p-10 flex items-center justify-center flex-1">
                    <div className="w-full h-full max-h-[800px] rounded-2xl border border-white/10 bg-[#1F2833] flex flex-col items-center justify-center relative overflow-hidden group">
                        {/* Dot Pattern Background */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#6B7280 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                        
                        {result?.image_url ? (
                            <>
                                {/* Info Toggle */}
                                <button 
                                    onClick={() => setShowMetadata(!showMetadata)}
                                    className={cn(
                                        "absolute top-4 right-4 z-20 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-sm",
                                        showMetadata ? "bg-white text-black" : "bg-black/40 hover:bg-black/60 text-white"
                                    )}
                                    title={showMetadata ? "Ẩn chi tiết" : "Hiện chi tiết"}
                                >
                                    <InfoIcon className="w-5 h-5" />
                                </button>

                                {/* Metadata Overlay */}
                                {showMetadata && selectedJob && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/75 backdrop-blur-md pt-8 pb-6 px-6 text-white animate-in slide-in-from-bottom-4 duration-300 z-10">
                                        <div className="flex flex-col gap-5">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-[11px] font-bold text-white/50 uppercase tracking-widest">
                                                    Prompt
                                                </div>
                                                <p className="text-[15px] font-medium text-white/90 italic leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-default">
                                                    "{selectedJob.prompt}"
                                                </p>
                                            </div>
                                            <div className="h-px w-full bg-white/10" />
                                            <div className="grid grid-cols-2 gap-8">
                                                <div>
                                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1.5">Model</span>
                                                    <span className="text-sm font-semibold text-white block truncate tracking-wide">
                                                        {selectedJob.model}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1.5">Tỷ lệ</span>
                                                    <span className="text-sm font-semibold text-white block tracking-wide">
                                                       {aspectRatio}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {(() => {
                                    const isVideo = selectedJob?.type?.includes('v') || selectedJob?.type === 'motion' || result?.image_url?.match(/\.(mp4|mov|webm)$/i);
                                    
                                    return isVideo ? (
                                        <video 
                                            src={result.image_url} 
                                            controls 
                                            autoPlay 
                                            loop 
                                            className="w-full h-full object-contain shadow-2xl z-10" 
                                        />
                                    ) : (
                                        <img 
                                            src={result.image_url} 
                                            className="w-full h-full object-contain shadow-2xl z-10" 
                                            alt="Generated" 
                                        />
                                    );
                                })()}
                                
                                {/* Action Buttons */}
                                <div className="absolute bottom-10 right-10 flex gap-2 z-20">
                                    {!selectedJob?.type?.includes('v') && selectedJob?.type !== 'motion' && (
                                        <Button
                                            onClick={async () => {
                                                if (!result?.image_url) return;
                                                try {
                                                    toast.info("Đang chuẩn bị ảnh cho video...");
                                                    // Fetch the image as blob
                                                    const response = await fetch(result.image_url);
                                                    const blob = await response.blob();
                                                    // Convert to base64
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        const base64 = reader.result as string;
                                                        // Store in sessionStorage
                                                        sessionStorage.setItem('image_for_video', base64);
                                                        sessionStorage.setItem('image_for_video_name', `generated-image-${Date.now()}.png`);
                                                        // Navigate with flag
                                                        router.push('/video?from_image=true');
                                                    };
                                                    reader.readAsDataURL(blob);
                                                } catch (error) {
                                                    console.error("Error preparing image:", error);
                                                    toast.error("Không thể tải ảnh. Hãy tải xuống và upload lại.");
                                                }
                                            }}
                                            className="h-10 px-6 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                                        >
                                            <VideoIcon className="h-4 w-4 mr-2" />
                                            Tạo video
                                        </Button>
                                    )}
                                         <Button
                                             onClick={() => handleDownload(result?.image_url, (selectedJob?.type?.includes('v') || selectedJob?.type === 'motion') ? 'video' : 'image')}
                                             className="h-10 px-6 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                                         >
                                             <DownloadIcon className="h-4 w-4 mr-2" />
                                             Tải xuống
                                         </Button>
                                    <Button
                                        onClick={handleGenerate}
                                        className="h-10 px-6 rounded-full bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-lg shadow-[#00BCD4]/20"
                                    >
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
                                    <LucideImage className="text-[#6B7280] w-12 h-12 group-hover:text-[#00BCD4] transition-colors duration-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Chưa có ảnh nào được tạo</h3>
                                    <p className="text-[#B0B8C4] text-sm leading-relaxed">
                                        Nhập mô tả ở bảng bên trái và nhấn "Tạo Ảnh" để bắt đầu quá trình sáng tạo của bạn. Kết quả sẽ hiển thị tại đây.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            
            <InsufficientCreditsModal 
                isOpen={showCreditsModal} 
                onClose={() => setShowCreditsModal(false)} 
                required={estimatedCost} 
                available={balance} 
            />
        </div>
    )
}
