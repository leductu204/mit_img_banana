"use client"

import { useState, useEffect, useMemo } from "react"
import Button from "../common/Button"
import { Sparkles, Video, Loader2, Volume2, Coins, AlertCircle, Settings, ChevronDown, ChevronUp, Copy, Info, Download } from "lucide-react"
import { useGenerateVideo } from "@/hooks/useGenerateVideo"
import { useCredits } from "@/hooks/useCredits"
import { apiRequest } from "@/lib/api"
import { getAuthHeader } from "@/lib/auth"
import { NEXT_PUBLIC_API } from "@/lib/config"
import { useToast } from "@/hooks/useToast"
import ImageUpload from "./ImageUpload"
import dynamic from 'next/dynamic'
import { VIDEO_MODELS } from "@/lib/models-config"

const VideoPreview = dynamic(() => import('./VideoPreview'), { ssr: false })
import ModelSelector from "./ModelSelector"
import DurationSelector from "./DurationSelector"
import QualitySelector from "./QualitySelector"
import AspectRatioSelector from "./AspectRatioSelector"
import InsufficientCreditsModal from "../common/InsufficientCreditsModal"
import { getModelConfig } from "@/lib/models-config"
import { useAuth } from "@/hooks/useAuth"
import HistorySidebar from "./HistorySidebar"
import { Job } from "@/hooks/useJobs"

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
    const [selectedJob, setSelectedJob] = useState<any>(null)
    const [showMetadata, setShowMetadata] = useState(false)

    // Fetch model configs (for active/slow mode)
    useEffect(() => {
        fetch(`${NEXT_PUBLIC_API}/api/costs`)
            .then(res => res.json())
            .then(data => setModelConfigs(data))
            .catch(err => console.error("Failed to fetch model configs:", err))
    }, [])
    
    // Filter active models
    const activeVideoModels = useMemo(() => {
        // If configs not loaded yet, show all
        if (Object.keys(modelConfigs).length === 0) return VIDEO_MODELS;
        
        return VIDEO_MODELS.filter(m => {
            const config = modelConfigs[m.value];
            // If explicit "is_enabled" is 0, filter it out. Default to true (undefined/1).
            return !config || config.is_enabled !== 0; 
        });
    }, [modelConfigs]);

    // Enforce valid model selection
    useEffect(() => {
        // If current model is not in active list, switch to first active
        if (activeVideoModels.length > 0) {
            const isCurrentActive = activeVideoModels.find(m => m.value === model);
            if (!isCurrentActive) {
                setModel(activeVideoModels[0].value);
            }
        }
    }, [activeVideoModels, model]);

    // Update state when model changes
    useEffect(() => {
        const config = getModelConfig(model, 'video');
        if (config) {
            if (config.durations && config.durations.length > 0) {
                setDuration(config.durations[0]);
            } else {
                 setDuration("5s"); 
            }
            if (config.qualities && config.qualities.length > 0) {
                setQuality(config.qualities[0]);
            }
            if (config.aspectRatios && config.aspectRatios.length > 0) {
                setAspectRatio(config.aspectRatios[0]);
            }
            // Reset audio if not supported
            if (!config.audio) {
                setAudio(false);
            }
        }
        
        // Reset speed to fast if slow mode is disabled for this model
        if (modelConfigs[model] && modelConfigs[model].is_slow_mode_enabled === 0) {
            setSpeed('fast');
        }
    }, [model, modelConfigs]);
    
    // Watch speed when configs load/change to ensure consistency
    useEffect(() => {
        if (speed === 'slow' && modelConfigs[model] && modelConfigs[model].is_slow_mode_enabled === 0) {
            setSpeed('fast');
        }
    }, [speed, model, modelConfigs]);
    
    
    const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateVideo()
    const { balance, estimateVideoCost, hasEnoughCredits, updateCredits } = useCredits()
    const toast = useToast()
    const { isAuthenticated, login } = useAuth()

    // Calculate estimated cost based on current selections
    const estimatedCost = useMemo(() => {
        return estimateVideoCost(model, duration, quality, aspectRatio, audio, speed)
    }, [model, duration, quality, aspectRatio, audio, speed, estimateVideoCost])

    // Mode is inferred from referenceImage presence
    const isImageToVideo = referenceImages.length > 0

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
        
        // Check if model only supports I2V
        const i2vOnlyModels = ['kling-2.5-turbo', 'kling-o1-video']
        if (i2vOnlyModels.includes(model) && !isImageToVideo) {
            alert('Model này chỉ hỗ trợ Image to Video. Vui lòng tải lên hình ảnh tham chiếu.')
            return
        }
        
        setLoading(true)
        setError(null)
        
        try {
            const durationInt = parseInt(duration.replace('s', ''))
            let imgId = ''
            let imgUrl = ''
            let imgWidth = 0
            let imgHeight = 0
            
            // Step 1: Upload image if I2V mode (same flow as ImageGenerator)
            if (isImageToVideo && referenceImages.length > 0) {
                const file = referenceImages[0]
                
                // Get upload URL from backend
                const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', {
                    method: 'POST'
                })
                
                // Upload directly to Higgsfield S3
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
                
                // Confirm upload
                await apiRequest('/api/generate/image/upload/check', {
                    method: 'POST',
                    body: JSON.stringify({ img_id: uploadInfo.id })
                })
                
                // Get dimensions from public URL
                const { width, height } = await getImageDimensionsFromUrl(uploadInfo.url)
                
                imgId = uploadInfo.id
                imgUrl = uploadInfo.url
                imgWidth = width
                imgHeight = height
            }
            
            // Step 2: Call generation endpoint
            const formData = new FormData()
            formData.append('prompt', prompt)
            formData.append('duration', durationInt.toString())
            let endpoint = ''
            
            // Veo 3.1 models use dedicated form-data endpoints
            if (model.startsWith('veo3.1-')) {
                const formData = new FormData()
                formData.append('prompt', prompt)
                formData.append('aspect_ratio', aspectRatio)
                
                // Determine T2V or I2V mode based on image upload
                const mode = isImageToVideo ? 'i2v' : 't2v'
                
                // Add image data for I2V (only img_url needed - Veo re-uploads to get media_id)
                if (mode === 'i2v' && isImageToVideo) {
                    formData.append('img_url', imgUrl)
                }
                
                // Convert veo3.1-* to veo3_1-* for URL path (period causes 404)
                const modelPath = model.replace('.', '_')
                
                const response = await fetch(`${NEXT_PUBLIC_API}/api/generate/video/${modelPath}/${mode}`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        ...getAuthHeader()
                    }
                })
                
                if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(`Failed to generate video: ${response.status} - ${errorText}`)
                }
                
                const genRes = await response.json()
                
                toast.info(`Đang tạo video... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000)
                
                if (genRes.credits_remaining !== undefined) {
                    updateCredits(genRes.credits_remaining)
                }
                
                // Poll for completion
                const checkStatus = async () => {
                    try {
                        const statusRes = await apiRequest<{ status: string, result?: string, error_message?: string }>(`/api/jobs/${encodeURIComponent(genRes.job_id)}`)
                        setCurrentJobStatus(statusRes.status)
                        if (statusRes.status === 'completed' && statusRes.result) {
                            setResult({ video_url: statusRes.result, job_id: genRes.job_id, status: 'completed' })
                            setLoading(false)
                            toast.success('✅ Tạo video thành công!')
                        } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                            const errorMsg = statusRes.error_message || "Tạo video thất bại. Credits đã được hoàn lại"
                            setError(errorMsg)
                            setLoading(false)
                            toast.error(errorMsg)
                        } else {
                            setTimeout(checkStatus, 15000)
                        }
                    } catch (e: any) {
                        const errorMsg = e.message || "Failed to check status"
                        setError(errorMsg)
                        setLoading(false)
                        toast.error(errorMsg)
                    }
                }
                
                checkStatus()
                return  // Exit early for Veo3
            }
            
            // Kling models use form-data endpoints
            if (model === 'kling-2.5-turbo') {
                endpoint = '/api/generate/video/kling-2.5-turbo/i2v'
                formData.append('resolution', quality)
                formData.append('img_id', imgId)
                formData.append('img_url', imgUrl)
                formData.append('width', imgWidth.toString())
                formData.append('height', imgHeight.toString())
                formData.append('speed', speed)

                // Handle End Frame for 1080p (Pro Mode)
                if (quality === '1080p' && endFrameImages.length > 0) {
                    const endFile = endFrameImages[0]
                    
                    // Upload End Frame
                    const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', {
                        method: 'POST'
                    })
                    
                    const uploadResponse = await fetch(uploadInfo.upload_url, {
                        method: 'PUT',
                        body: endFile,
                        headers: { 'Content-Type': 'image/jpeg' }
                    })
                    
                    if (!uploadResponse.ok) throw new Error(`End frame upload failed: ${uploadResponse.statusText}`)
                    
                    await apiRequest('/api/generate/image/upload/check', {
                        method: 'POST',
                        body: JSON.stringify({ img_id: uploadInfo.id })
                    })
                    
                    // Get dimensions
                    const { width: endWidth, height: endHeight } = await getImageDimensionsFromUrl(uploadInfo.url)
                    
                    formData.append('end_img_id', uploadInfo.id)
                    formData.append('end_img_url', uploadInfo.url)
                    formData.append('end_width', endWidth.toString())
                    formData.append('end_height', endHeight.toString())
                }
            } else if (model === 'kling-o1-video') {
                endpoint = '/api/generate/video/kling-o1/i2v'
                formData.append('aspect_ratio', aspectRatio)
                formData.append('img_id', imgId)
                formData.append('img_url', imgUrl)
                formData.append('width', imgWidth.toString())
                formData.append('height', imgHeight.toString())
                formData.append('speed', speed)

                // Handle Optional End Frame for Kling O1
                if (endFrameImages.length > 0) {
                    const endFile = endFrameImages[0]
                    
                    // Upload End Frame
                    const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', {
                        method: 'POST'
                    })
                    
                    const uploadResponse = await fetch(uploadInfo.upload_url, {
                        method: 'PUT',
                        body: endFile,
                        headers: { 'Content-Type': 'image/jpeg' }
                    })
                    
                    if (!uploadResponse.ok) throw new Error(`End frame upload failed: ${uploadResponse.statusText}`)
                    
                    await apiRequest('/api/generate/image/upload/check', {
                        method: 'POST',
                        body: JSON.stringify({ img_id: uploadInfo.id })
                    })
                    
                    // Get dimensions
                    const { width: endWidth, height: endHeight } = await getImageDimensionsFromUrl(uploadInfo.url)
                    
                    formData.append('end_img_id', uploadInfo.id)
                    formData.append('end_img_url', uploadInfo.url)
                    formData.append('end_width', endWidth.toString())
                    formData.append('end_height', endHeight.toString())
                }
            } else if (model === 'kling-2.6') {
                formData.append('sound', audio.toString())
                formData.append('speed', speed)
                formData.append('resolution', quality)
                if (isImageToVideo) {
                    endpoint = '/api/generate/video/kling-2.6/i2v'
                    formData.append('img_id', imgId)
                    formData.append('img_url', imgUrl)
                    formData.append('width', imgWidth.toString())
                    formData.append('height', imgHeight.toString())
                } else {
                    endpoint = '/api/generate/video/kling-2.6/t2v'
                    formData.append('aspect_ratio', aspectRatio)
                }
            } else {
                throw new Error(`Unknown model: ${model}`)
            }
            
            const response = await fetch(`${NEXT_PUBLIC_API}${endpoint}`, {
                method: 'POST',
                body: formData,
                headers: {
                    ...getAuthHeader()
                }
            })
            
            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Failed to generate video: ${response.status} - ${errorText}`)
            }
            
            const genRes = await response.json()

            // Show success toast with job ID
            toast.info(`Đang tạo video... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000)

            if (genRes.credits_remaining !== undefined) {
                updateCredits(genRes.credits_remaining)
            }
            
            // Poll for completion
            const checkStatus = async () => {
                try {
                    const statusRes = await apiRequest<{ status: string, result?: string, error_message?: string }>(`/api/jobs/${genRes.job_id}`)
                    
                    setCurrentJobStatus(statusRes.status)
                    
                        if (statusRes.status === 'completed' && statusRes.result) {
                            setResult({ video_url: statusRes.result, job_id: genRes.job_id, status: 'completed' })
                            setSelectedJob(createTempJob(genRes.job_id, statusRes.result))
                            setLoading(false)
                            toast.success('✅ Tạo video thành công!')
                    } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                        const errorMsg = statusRes.error_message || "Tạo video thất bại. Credits đã được hoàn lại"
                        setError(errorMsg)
                        setLoading(false)
                        toast.error(errorMsg)
                    } else {
                        setTimeout(checkStatus, 35000) // Poll every 35s
                    }
                } catch (e: any) {
                    const errorMsg = e.message || "Failed to check status"
                    setError(errorMsg)
                    setLoading(false)
                    toast.error(errorMsg)
                }
            }
            
            // Start checking status after initial delay (not immediately)
            setTimeout(checkStatus, 35000) // Wait 35s before first check
            
        } catch (e: any) {
            console.error(e)
            const errorMsg = e.message || "Đã xảy ra lỗi"
            setError(errorMsg)
            setLoading(false)
            toast.error(errorMsg)
        }
    }


    const copyPrompt = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success("Đã sao chép prompt")
    }

    // Helper to construct job from current state for immediate display
    const createTempJob = (jobId: string, outputUrl: string): Job => ({
        job_id: jobId,
        user_id: "",
        type: isImageToVideo ? 'i2v' : 't2v',
        model: model,
        prompt: prompt,
        status: 'completed',
        output_url: outputUrl,
        credits_cost: estimatedCost,
        credits_refunded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Store technical specific params in input_params if needed, or rely on base fields
        input_params: JSON.stringify({
            duration: duration,
            aspect_ratio: aspectRatio,
            quality: quality
        })
    })

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
            {/* Left Panel - Controls (20%) */}
            <div className="w-full lg:w-[20%] min-w-[320px] border-b lg:border-b-0 lg:border-r border-border bg-card p-6 flex flex-col overflow-y-auto shrink-0 custom-scrollbar">
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Video className="h-5 w-5 text-primary" />
                        <h1 className="text-xl font-semibold text-foreground">Tạo Video Tự Động</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {isImageToVideo ? "Chế độ Hình ảnh thành Video" : "Chế độ Văn bản thành Video"}
                    </p>
                </div>

                <div className="flex-1 space-y-6">
                    {/* Prompt Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Mô tả video</label>
                        <textarea
                            placeholder="Nhập nội dung video bạn muốn tạo..."
                            className="min-h-[120px] w-full resize-none rounded-md border border-input bg-input p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    {/* Reference Image Section */}
                    {(model === 'kling-2.5-turbo' && quality === '1080p') || model === 'kling-o1-video' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Khung hình bắt đầu <span className="text-red-500">*</span>
                                </label>
                                <ImageUpload 
                                    onImagesSelected={setReferenceImages} 
                                    maxImages={1} 
                                    label={null}
                                    description="Tải lên ảnh bắt đầu"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    Khung kết thúc <span className="text-xs text-muted-foreground font-normal">(Tùy chọn)</span>
                                </label>
                                <ImageUpload 
                                    onImagesSelected={setEndFrameImages} 
                                    maxImages={1} 
                                    label={null}
                                    description="Tải lên ảnh kết thúc"
                                />
                            </div>
                        </div>
                    ) : (
                        <ImageUpload onImagesSelected={setReferenceImages} maxImages={1} />
                    )}

                    {/* Dynamic Selectors based on Model Config */}
                    {(() => {
                        const modelConfig = getModelConfig(model, 'video');

                        return (
                            <>
                                {/* Aspect Ratio Selector - Always Visible */}
                                {modelConfig?.aspectRatios && modelConfig.aspectRatios.length > 0 && (
                                    <>
                                        <AspectRatioSelector 
                                            value={aspectRatio} 
                                            onChange={setAspectRatio} 
                                            options={modelConfig.aspectRatios}
                                        />
                                        {/* Model Note - Removed */}
                                    </>
                                )}

                                {/* Collapsible Settings */}
                                <div className="rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-pink-500/20 group">
                                    <button 
                                        onClick={() => setShowSettings(!showSettings)}
                                        className={`w-full flex items-center justify-between p-4 transition-all duration-200 ${showSettings ? 'bg-muted/30' : 'bg-transparent hover:bg-muted/20'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-pink-500/10 text-pink-500' : 'bg-muted text-muted-foreground group-hover:bg-pink-500/5 group-hover:text-pink-500'}`}>
                                                <Settings className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <span className="block text-sm font-semibold text-foreground">Cấu hình nâng cao</span>
                                                <span className="block text-xs text-muted-foreground mt-0.5">Model, thời lượng & âm thanh</span>
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
                                            <ModelSelector value={model} onChange={setModel} mode="video" options={activeVideoModels} />

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
                                                    {(!modelConfigs[model] || modelConfigs[model].is_slow_mode_enabled !== 0) && (
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

                                            {/* Duration Selector */}
                                            {modelConfig?.durations && modelConfig.durations.length > 0 && (
                                                <DurationSelector 
                                                    value={duration} 
                                                    onChange={setDuration} 
                                                    options={modelConfig.durations}
                                                />
                                            )}

                                            {/* Quality Selector */}
                                            {modelConfig?.qualities && modelConfig.qualities.length > 0 && (
                                                <QualitySelector 
                                                    value={quality} 
                                                    onChange={setQuality} 
                                                    options={modelConfig.qualities}
                                                />
                                            )}

                                            {/* Audio Selector */}
                                            {modelConfig?.audio && (
                                                 <div className="flex items-center justify-between p-3 border border-border/50 rounded-xl bg-background/50 hover:bg-background/80 transition-colors animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                            <Volume2 className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label htmlFor="audio-toggle" className="text-sm font-medium text-foreground cursor-pointer select-none">
                                                                Âm thanh
                                                            </label>
                                                            <span className="text-xs text-muted-foreground">Tạo video kèm âm thanh</span>
                                                        </div>
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        id="audio-toggle" 
                                                        checked={audio}
                                                        onChange={(e) => setAudio(e.target.checked)}
                                                        className="h-5 w-5 rounded border-input text-primary ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer transition-all"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        );
                    })()}

                    {/* Error Message */}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>

                {/* Generate Button */}
                <div className="mt-8 pt-6 border-t border-border sticky bottom-0 bg-card z-10">
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
                                {isAuthenticated ? 'Đang tạo video...' : 'Đang xử lý...'}
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
                                Tạo video
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-4">Hỗ trợ, báo lỗi - 0352143210 </p>
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
            <div className="flex-1 flex overflow-hidden">
                {/* Center Panel - Main Preview (Flexible) */}
                <div className="flex-1 bg-background/50 p-6 lg:p-10 flex items-center justify-center overflow-auto relative custom-scrollbar">
                    <div className="w-full max-w-4xl flex flex-col gap-4">
                         {/* Result Card Container */}
                         <div className={`
                            w-full rounded-2xl bg-card border border-border/50 overflow-hidden transition-all duration-300
                            ${result?.video_url && !loading 
                                ? 'shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5' 
                                : 'shadow-sm'}
                        `}>
                            {/* Video Preview Area */}
                            <div className={`
                                w-full min-h-[400px] flex items-center justify-center relative bg-muted/5
                                ${!result?.video_url && 'p-8'}
                            `}>
                                {loading ? (
                                    <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full border-4 border-muted border-t-[#0F766E] animate-spin" />
                                        </div>
                                        <p className="text-sm font-medium">
                                            {currentJobStatus === 'pending'
                                                ? 'Đang chờ xử lý (Hàng đợi)... Vui lòng đợi'
                                                : 'Đang tạo video... Vui lòng đợi trong khi hệ thống đang xử lý'}
                                        </p>
                                    </div>
                                ) : result?.video_url ? (
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
                                                    {/* Prompt with Copy */}
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
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1.5">Model</span>
                                                            <span className="text-sm font-semibold text-white block truncate tracking-wide" title={selectedJob.model}>
                                                                {activeVideoModels.find(m => m.value === selectedJob.model)?.label || selectedJob.model}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1.5">Thời lượng</span>
                                                            <span className="text-sm font-semibold text-white block tracking-wide">
                                                                {(() => {
                                                                    if (selectedJob.input_params) {
                                                                        try {
                                                                            const params = typeof selectedJob.input_params === 'string' ? JSON.parse(selectedJob.input_params) : selectedJob.input_params
                                                                            return params.duration || 'N/A'
                                                                        } catch (e) { return 'N/A' }
                                                                    }
                                                                    return duration
                                                                })()}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1.5">Tỷ lệ & Chất lượng</span>
                                                             <span className="text-sm font-semibold text-white block truncate tracking-wide">
                                                               {(() => {
                                                                    let ar = aspectRatio;
                                                                    let q = quality;
                                                                    if (selectedJob.input_params) {
                                                                        try {
                                                                            const params = typeof selectedJob.input_params === 'string' ? JSON.parse(selectedJob.input_params) : selectedJob.input_params
                                                                            if (params.aspect_ratio) ar = params.aspect_ratio;
                                                                            if (params.quality) q = params.quality;
                                                                        } catch (e) {}
                                                                    }
                                                                    return `${ar} • ${q}`
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <VideoPreview videoUrl={result.video_url} />
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center max-w-md">
                                        <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-2">
                                            <Video className="h-10 w-10 opacity-50" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground text-lg mb-2">Chưa có video</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Nhập mô tả video và click tạo video
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Bar - Inside Card */}
                            {result?.video_url && !loading && (
                                <div className="p-4 border-t border-border/50 bg-background/30 backdrop-blur-sm flex items-center justify-center gap-4">
                                    <Button
                                        onClick={handleGenerate}
                                        className="h-10 px-6 rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:scale-[1.02]"
                                    >
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Tạo lại
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            if (!result?.video_url) return
                                            try {
                                                const a = document.createElement('a')
                                                a.href = result.video_url
                                                a.download = `generated-video-${Date.now()}.mp4`
                                                document.body.appendChild(a)
                                                a.click()
                                                document.body.removeChild(a)
                                                toast.success('Tải video thành công!')
                                            } catch (error) {
                                                console.error('Download failed:', error)
                                                toast.error('Lỗi khi tải video')
                                            }
                                        }}
                                        className="h-10 px-8 rounded-full bg-gradient-to-r from-[#0F766E] to-[#0D655E] hover:from-[#0D655E] hover:to-[#0B544E] text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Tải xuống
                                    </Button>
                                </div>
                            )}

                            {/* Metadata Section Removed - using Overlay */}
                        </div>
                    </div>
                </div>

                {/* Right Panel - History Sidebar (20%) */}
                <div className="w-[20%] min-w-[300px] shrink-0 h-full hidden lg:block">
                    <HistorySidebar 
                        type="video" 
                        onSelect={(job) => {
                            if (job.status === 'completed' && job.output_url) {
                                setResult({ 
                                    video_url: job.output_url, 
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
