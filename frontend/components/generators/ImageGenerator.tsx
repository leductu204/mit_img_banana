"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Button from "../common/Button"
import { Share2, Sparkles, RefreshCw, Download, Coins, AlertCircle, Loader2, Settings, ChevronDown, ChevronUp, Copy, Info } from "lucide-react"
import { useGenerateImage } from "@/hooks/useGenerateImage"
import { useCredits } from "@/hooks/useCredits"
import { useToast } from "@/hooks/useToast"
import { apiRequest } from "@/lib/api"
import AspectRatioSelector from "./AspectRatioSelector"
import ImageUpload from "./ImageUpload"
import ModelSelector from "./ModelSelector"
import QualitySelector from "./QualitySelector"
import InsufficientCreditsModal from "../common/InsufficientCreditsModal"
import { getModelConfig, IMAGE_MODELS } from "@/lib/models-config"
import { useAuth } from "@/hooks/useAuth"
import HistorySidebar from "./HistorySidebar"
import { Job } from "@/hooks/useJobs"

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
    const [currentJobStatus, setCurrentJobStatus] = useState<string>("")
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [showMetadata, setShowMetadata] = useState(false)
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

    // Filter active models
    const activeImageModels = useMemo(() => {
        // If configs not loaded yet, show all
        if (!costsLoaded || Object.keys(modelCosts).length === 0) return IMAGE_MODELS;
        
        return IMAGE_MODELS.filter(m => {
            const config = modelCosts[m.value];
            // If explicit "is_enabled" is 0, filter it out. Default to true.
            return !config || config.is_enabled !== 0; 
        });
    }, [modelCosts, costsLoaded]);

    // Enforce valid model selection AND speed consistency
    useEffect(() => {
        // Enforce Model
        if (activeImageModels.length > 0) {
            const isCurrentActive = activeImageModels.find(m => m.value === model);
            if (!isCurrentActive) {
                setModel(activeImageModels[0].value);
            }
        }
        
        // Enforce Speed (Reset to fast if slow mode disabled)
        if (costsLoaded && modelCosts[model]) {
             let isSlowModeEnabled = true;

             if (model === 'nano-banana-pro') {
                 // Check granular keys for Pro model
                 // quality is like '1k', '2k', '4k'
                 const qualityKey = quality.toLowerCase();
                 const configKey = `is_slow_mode_enabled_${qualityKey}`;
                 const config = modelCosts[model]; // modelCosts[model] is the map of configs if processed, OR we need to access via key
                 // Wait, useCredits.modelCosts is Flat map? No, it's typically Model -> ConfigKey -> Value or similar?
                 // Let's check how modelCosts structure is accessed.
                 // In ImageGenerator, modelCosts is accessed as modelCosts[model].is_enabled
                 // So modelCosts[model] is an object with keys.
                 
                 if (config && config[configKey] === 0) {
                     isSlowModeEnabled = false;
                 }
             } else {
                 // Standard check
                 if (modelCosts[model].is_slow_mode_enabled === 0) {
                     isSlowModeEnabled = false;
                 }
             }

             if (!isSlowModeEnabled && speed === 'slow') {
                 setSpeed('fast');
             }
        }
    }, [activeImageModels, model, modelCosts, costsLoaded, speed, quality]);

    // Calculate dynamic options based on model costs
    const dynamicAspectRatios = useMemo(() => {
        if (!costsLoaded) return [];
        return getAvailableAspectRatios(model, model === "nano-banana-pro" ? quality : undefined);
    }, [model, quality, costsLoaded, getAvailableAspectRatios]);

    const dynamicResolutions = useMemo(() => {
        if (!costsLoaded) return [];
        return getAvailableResolutions(model);
    }, [model, costsLoaded, getAvailableResolutions]);

    // Calculate estimated cost based on current selections
    const estimatedCost = useMemo(() => {
        return estimateImageCost(model, aspectRatio, quality, speed);
    }, [model, aspectRatio, quality, speed, estimateImageCost])

    // Reset aspect ratio to first available option when model changes
    useEffect(() => {
        const modelConfig = getModelConfig(model, 'image');
        const availableRatios = dynamicAspectRatios.length > 0 
            ? dynamicAspectRatios 
            : (modelConfig?.aspectRatios || []);
        
        // If current aspect ratio is not in available options, select the first available one
        if (availableRatios.length > 0 && !availableRatios.includes(aspectRatio)) {
            setAspectRatio(availableRatios[0]);
        }
    }, [model, dynamicAspectRatios]);

    // Mode is inferred from referenceImage presence
    const isImageToImage = referenceImages.length > 0

    // Helper to get image dimensions from File
    const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve({ width: img.width, height: img.height })
            img.onerror = reject
            img.src = URL.createObjectURL(file)
        })
    }

    // Helper to get image dimensions from URL
    const getImageDimensionsFromUrl = (url: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve({ width: img.width, height: img.height })
            img.onerror = reject
            img.crossOrigin = 'anonymous'
            img.src = url
        })
    }

    const handleGenerate = async () => {
        if (!prompt.trim()) return

        // 0. Guest Check
        if (!isAuthenticated) {
            login()
            return
        }

        // Check credits before proceeding
        if (!hasEnoughCredits(estimatedCost)) {
            setShowCreditsModal(true)
            return
        }

        // If using Higgsfield model (Nano Banana), use the direct API flow
        // Handle both "Nano Banana" and "nano-banana" formats
        if (model.toLowerCase().includes("nano banana") || model.toLowerCase().includes("nano-banana")) {
            setLoading(true)
            setError(null)
            try {
                // 1. Upload Images
                const inputImages = []
                if (referenceImages.length > 0) {
                    for (let i = 0; i < referenceImages.length; i++) {
                        const file = referenceImages[i]

                        // Get Upload URL (reference for first, batch for rest)
                        const endpoint = i === 0 ? '/api/generate/image/upload' : '/api/generate/image/upload/batch'
                        const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>(endpoint, {
                            method: 'POST'
                        })

                        // Upload File directly to Higgsfield
                        const uploadResponse = await fetch(uploadInfo.upload_url, {
                            method: 'PUT',
                            body: file,
                            headers: {
                                'Content-Type': 'image/jpeg'
                            }
                        })

                        if (!uploadResponse.ok) {
                            throw new Error(`Upload failed: ${uploadResponse.statusText}`)
                        }

                        // Confirm Upload
                        await apiRequest('/api/generate/image/upload/check', {
                            method: 'POST',
                            body: JSON.stringify({ img_id: uploadInfo.id })
                        })

                        // Get dimensions from PUBLIC URL after upload
                        const { width, height } = await getImageDimensionsFromUrl(uploadInfo.url)

                        inputImages.push({
                            type: "media_input",
                            id: uploadInfo.id,
                            url: uploadInfo.url,
                            width,
                            height
                        })
                    }
                }

                // 2. Generate - build model-specific payload
                const modelConfig = getModelConfig(model, 'image');
                const isPro = modelConfig?.resolutions && modelConfig.resolutions.length > 0;
                
                // Build endpoint based on model (under /api/generate/image/)
                const endpoint = isPro 
                    ? '/api/generate/image/nano-banana-pro/generate' 
                    : '/api/generate/image/nano-banana/generate';
                
                // Build payload - always include aspect_ratio
                const payload: any = {
                    prompt,
                    input_images: inputImages,
                    aspect_ratio: aspectRatio,
                    speed: speed
                };

                // Add resolution only for Pro models
                if (isPro) {
                    payload.resolution = quality;
                }

                const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                })

                // Show success toast with job ID
                toast.info(`Đang tạo ảnh... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000)

                // Update credits if returned
                if (genRes.credits_remaining !== undefined) {
                    updateCredits(genRes.credits_remaining)
                }

                // 3. Poll Status
                const checkStatus = async () => {
                    try {
                        const statusRes = await apiRequest<{ status: string, result?: string, error_message?: string }>(`/api/jobs/${genRes.job_id}`)
                        
                        setCurrentJobStatus(statusRes.status) // Update status
                        
                        if (statusRes.status === 'completed' && statusRes.result) {
                            setResult({ image_url: statusRes.result, job_id: genRes.job_id, status: 'completed' })
                            setSelectedJob(createTempJob(genRes.job_id, statusRes.result))
                            setLoading(false)
                            toast.success('✅ Tạo ảnh thành công!')
                        } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                            const errorMsg = statusRes.error_message || "Tạo ảnh thất bại. Credits đã được hoàn lại"
                            setError(errorMsg)
                            setLoading(false)
                            toast.error(errorMsg)
                        } else {
                            setTimeout(checkStatus, 35000) // Poll every 35s
                        }
                    } catch (e: any) {
                        setError(`Failed to check status: ${e.message}`)
                        setLoading(false)
                    }
                }

                // Start checking status after initial delay (not immediately)
                setTimeout(checkStatus, 35000) // Wait 35s before first check
                return
            } catch (e: any) {
                console.error(e)
                const errorMsg = e.message || "Đã xảy ra lỗi"
                setError(errorMsg)
                setLoading(false)
                toast.error(errorMsg)
                return
            }
        }

        await generate({
            prompt,
            model: model,
            aspect_ratio: aspectRatio,
            resolution: quality,
            // Use the first image for now as the backend/hook might only support one
            image_url: referenceImages.length > 0 ? URL.createObjectURL(referenceImages[0]) : undefined,
            keep_style: isImageToImage ? keepStyle : undefined
        })
    }


    const copyPrompt = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success("Đã sao chép prompt")
    }

    // Helper to construct job from current state for immediate display
    const createTempJob = (jobId: string, outputUrl: string): Job => ({
        job_id: jobId,
        user_id: "", // Not needed for display
        type: isImageToImage ? 'i2i' : 't2i',
        model: model,
        prompt: prompt,
        status: 'completed',
        output_url: outputUrl,
        credits_cost: estimatedCost,
        credits_refunded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    })

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] lg:overflow-hidden">
            {/* Left Panel - Controls (20%) */}
            <div ref={scrollContainerRef} className="w-full lg:w-[20%] min-w-full lg:min-w-[320px] border-b lg:border-b-0 lg:border-r border-border bg-card p-4 lg:p-6 flex flex-col shrink-0 custom-scrollbar lg:overflow-y-auto lg:h-full lg:max-h-none relative">
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h1 className="text-xl font-semibold text-foreground">Trải nghiệm "Chuối" PRO</h1>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isImageToImage ? "Chế độ Hình ảnh sang Hình ảnh" : "Chế độ Văn bản sang Hình ảnh"}
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Prompt Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Prompt</label>
                        <textarea
                            placeholder="Nhập prompt ảnh bạn muốn tạo..."
                            className="min-h-[100px] md:min-h-[120px] w-full resize-none rounded-md border border-input bg-input p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    {/* Reference Image Section */}
                    <ImageUpload onImagesSelected={setReferenceImages} maxImages={5} />

                    {/* Aspect Ratio Selector (Visible) */}
                    {(() => {
                        const modelConfig = getModelConfig(model, 'image');
                        const ratiosToShow = costsLoaded && dynamicAspectRatios.length > 0
                            ? dynamicAspectRatios
                            : (modelConfig?.aspectRatios || ['16:9', '9:16', '1:1']);
                        
                        return ratiosToShow.length > 0 && (
                            <AspectRatioSelector 
                                value={aspectRatio} 
                                onChange={setAspectRatio} 
                                options={ratiosToShow}
                            />
                        );
                    })()}

                    {/* Collapsible Settings */}
                    <div className="rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-pink-500/20 group">
                        <button 
                            onClick={() => {
                                setShowSettings(!showSettings);
                                if (!showSettings) {
                                    setTimeout(() => {
                                        scrollContainerRef.current?.scrollTo({ 
                                            top: scrollContainerRef.current.scrollHeight, 
                                            behavior: 'smooth' 
                                        });
                                    }, 100);
                                }
                            }}
                            className={`w-full flex items-center justify-between p-4 transition-all duration-200 ${showSettings ? 'bg-muted/30' : 'bg-transparent hover:bg-muted/20'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-pink-500/10 text-pink-500' : 'bg-muted text-muted-foreground group-hover:bg-pink-500/5 group-hover:text-pink-500'}`}>
                                    <Settings className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-sm font-semibold text-foreground">Cấu hình nâng cao</span>
                                    <span className="block text-xs text-muted-foreground mt-0.5">Model, chất lượng & tốc độ</span>
                                </div>
                            </div>
                            {showSettings ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                        </button>
                        
                        {showSettings && (
                            <div className="p-4 space-y-6 border-t border-border/50 animate-in slide-in-from-top-2 duration-300 ease-out bg-muted/10">
                                {/* Model Selector */}
                                <ModelSelector value={model} onChange={setModel} mode="image" />

                                {/* Speed Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tốc độ xử lý</label>
                                    <div className="flex bg-muted p-1 rounded-xl">
                                        <button
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                                speed === 'fast'
                                                    ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                            }`}
                                            onClick={() => setSpeed('fast')}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>Nhanh</span>
                                            </div>
                                        </button>
                                        {/* Only show Slow mode if enabled */}
                                        {(costsLoaded && (!modelCosts[model] || modelCosts[model].is_slow_mode_enabled !== 0)) && (
                                            <button
                                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                                    speed === 'slow'
                                                        ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                                }`}
                                                onClick={() => setSpeed('slow')}
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    <Coins className="w-3.5 h-3.5" />
                                                    <span>Tiết kiệm</span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Resolution Selector (for PRO models) */}
                                {(() => {
                                    const modelConfig = getModelConfig(model, 'image');
                                    const resolutionsToShow = dynamicResolutions.length > 0 
                                        ? dynamicResolutions 
                                        : (modelConfig?.resolutions || []);
                                    
                                    return resolutionsToShow.length > 0 && (
                                        <QualitySelector 
                                            value={quality} 
                                            onChange={setQuality} 
                                            options={resolutionsToShow}
                                        />
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                                    {/* Generate Button (Static Flow) */}
                <div className="mt-8 p-4 bg-card border-t border-border z-10">
                    {/* Cost Estimate - Only show for auth users */}
                    {isAuthenticated && (
                        <div className="mb-4 p-3 rounded-lg bg-muted/50 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                    <Coins className="h-4 w-4" />
                                    Chi phí:
                                </span>
                                <span className="font-medium text-foreground">{estimatedCost} credits</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Số dư:</span>
                                <span className={`font-medium ${balance >= estimatedCost ? 'text-green-500' : 'text-red-500'}`}>
                                    {balance} credits
                                </span>
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim() || (isAuthenticated && balance < estimatedCost)}
                        className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                            isAuthenticated && balance < estimatedCost 
                                ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                                : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
                        }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isAuthenticated ? 'Đang tạo ảnh...' : 'Đang xử lý...'}
                            </>
                        ) : !isAuthenticated ? (
                            <>
                                Đăng nhập để tạo
                            </>
                        ) : balance < estimatedCost ? (
                            <>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Không đủ credits
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Tạo ảnh
                            </>
                        )}
                    </Button>
                </div>
                </div>



                {/* Insufficient Credits Modal */}
                <InsufficientCreditsModal
                    isOpen={showCreditsModal}
                    onClose={() => setShowCreditsModal(false)}
                    required={estimatedCost}
                    available={balance}
                />
            </div>

            {/* Right Group: Preview (Full width) + History (Fixed) */}
            <div className="flex-1 flex flex-col md:flex-row lg:overflow-hidden">
                {/* Center Panel - Main Preview (Flexible) */}
                <div className="flex-1 bg-background/50 p-4 md:p-10 flex items-center justify-center overflow-auto relative custom-scrollbar">
                    <div className="w-full max-w-3xl flex flex-col gap-4">
                        {/* Result Card Container */}
                        <div className={`
                            w-full rounded-2xl bg-card border border-border/50 overflow-hidden transition-all duration-300
                            ${result?.image_url && !loading 
                                ? 'shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5' 
                                : 'shadow-sm'}
                        `}>
                            {/* Image Preview Area */}
                            <div className={`
                                w-full aspect-[3/4] max-h-[calc(100vh-20rem)] flex items-center justify-center relative bg-muted/5
                                ${!result?.image_url && 'p-8'}
                            `}>
                                {loading ? (
                                    <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full border-4 border-muted border-t-[#0F766E] animate-spin" />
                                        </div>
                                        <p className="text-sm font-medium">
                                            {currentJobStatus === 'pending'
                                                ? 'Đang chờ xử lý (...Hàng đợi)... Vui lòng đợi'
                                                : 'Đang tạo ảnh...'}
                                        </p>
                                    </div>
                                ) : result?.image_url ? (
                                    <>
                                    {/* Info Toggle Button - Overlay */}
                                    <button 
                                        onClick={() => setShowMetadata(!showMetadata)}
                                        className={`absolute top-4 right-4 z-10 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-sm ${
                                            showMetadata 
                                                ? 'bg-white text-black' 
                                                : 'bg-black/40 hover:bg-black/60 text-white'
                                        }`}
                                        title={showMetadata ? "Ẩn chi tiết" : "Hiện chi tiết"}
                                    >
                                        <Info className="w-5 h-5" />
                                    </button>

                                    {/* Metadata Overlay Panel */}
                                    {showMetadata && selectedJob && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/75 backdrop-blur-md pt-8 pb-6 px-6 text-white animate-in slide-in-from-bottom-4 duration-300 z-10">
                                            <div className="flex flex-col gap-5">
                                                {/* Prompt */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-white/50 uppercase tracking-widest">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        Prompt
                                                    </div>
                                                    <p className="text-[15px] font-medium text-white/90 italic leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-default">
                                                        "{selectedJob.prompt}"
                                                    </p>
                                                </div>
                                                
                                                {/* Divider */}
                                                <div className="h-px w-full bg-white/10" />

                                                {/* Params Grid */}
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
                                                           {(() => {
                                                                if (selectedJob.input_params) {
                                                                    try {
                                                                        const params = typeof selectedJob.input_params === 'string' ? JSON.parse(selectedJob.input_params) : selectedJob.input_params
                                                                        return params.aspect_ratio || 'N/A'
                                                                    } catch (e) { return 'N/A' }
                                                                }
                                                                return aspectRatio 
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <img
                                        src={result.image_url}
                                        alt={selectedJob?.prompt || "Generated result"}
                                        className="w-full h-full object-contain"
                                    />
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-muted-foreground text-center">
                                        <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-2">
                                            <Sparkles className="h-10 w-10 opacity-50" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground text-lg mb-2">Chưa có ảnh</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Nhập prompt của bạn và nhấn "Tạo ảnh".
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Bar - Inside Card */}
                            {result?.image_url && !loading && (
                                <div className="p-3 md:p-4 border-t border-border/50 bg-background/30 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                                    <Button
                                        onClick={handleGenerate}
                                        className="h-10 px-6 rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:scale-[1.02]"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Tạo lại
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            if (!result?.image_url) return
                                            try {
                                                toast.info('Đang tải ảnh xuống...', 2000)
                                                const response = await fetch(result.image_url)
                                                const blob = await response.blob()
                                                const url = window.URL.createObjectURL(blob)
                                                const a = document.createElement('a')
                                                a.href = url
                                                a.download = `generated-image-${Date.now()}.jpg`
                                                document.body.appendChild(a)
                                                a.click()
                                                document.body.removeChild(a)
                                                window.URL.revokeObjectURL(url)
                                                toast.success('Tải ảnh thành công!')
                                            } catch (error) {
                                                console.error('Download failed:', error)
                                                toast.error('Lỗi khi tải ảnh')
                                            }
                                        }}
                                        className="h-10 px-8 rounded-full bg-gradient-to-r from-[#0F766E] to-[#0D655E] hover:from-[#0D655E] hover:to-[#0B544E] text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Tải xuống
                                    </Button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Right Panel - History Sidebar (Collapsible) */}
                <div className="w-[60px] hover:w-[320px] transition-all duration-300 ease-in-out shrink-0 h-full hidden lg:block border-l border-border bg-card relative group z-20">
                    <HistorySidebar 
                        type="image" 
                        onSelect={(job) => {
                            if (job.status === 'completed' && job.output_url) {
                                setResult({ 
                                    image_url: job.output_url, 
                                    job_id: job.job_id, 
                                    status: 'completed' 
                                })
                                setSelectedJob(job)
                            }
                        }}
                        selectedJobId={result?.job_id}
                    />
                </div>
            </div>
        </div>
    )
}

