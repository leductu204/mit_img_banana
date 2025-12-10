"use client"

import { useState, useEffect, useMemo } from "react"
import Button from "../common/Button"
import { Sparkles, Video, Loader2, Volume2, Coins, AlertCircle } from "lucide-react"
import { useGenerateVideo } from "@/hooks/useGenerateVideo"
import { useCredits } from "@/hooks/useCredits"
import { apiRequest } from "@/lib/api"
import { getAuthHeader } from "@/lib/auth"
import { NEXT_PUBLIC_API } from "@/lib/config"
import { useToast } from "@/hooks/useToast"
import ImageUpload from "./ImageUpload"
import dynamic from 'next/dynamic'

const VideoPreview = dynamic(() => import('./VideoPreview'), { ssr: false })
import ModelSelector from "./ModelSelector"
import DurationSelector from "./DurationSelector"
import QualitySelector from "./QualitySelector"
import AspectRatioSelector from "./AspectRatioSelector"
import InsufficientCreditsModal from "../common/InsufficientCreditsModal"
import { getModelConfig } from "@/lib/models-config"

export function VideoGenerator() {
    const [prompt, setPrompt] = useState("")
    const [referenceImages, setReferenceImages] = useState<File[]>([])
    const [model, setModel] = useState("kling-2.5-turbo")
    const [duration, setDuration] = useState("5s")
    const [quality, setQuality] = useState("720p")
    const [aspectRatio, setAspectRatio] = useState("16:9")
    const [audio, setAudio] = useState(false)
    const [showCreditsModal, setShowCreditsModal] = useState(false)

    // Update state when model changes
    useEffect(() => {
        const config = getModelConfig(model, 'video');
        if (config) {
            if (config.durations && config.durations.length > 0) {
                setDuration(config.durations[0]);
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
    }, [model]);
    
    
    const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateVideo()
    const { balance, estimateVideoCost, hasEnoughCredits, updateCredits } = useCredits()
    const toast = useToast()

    // Calculate estimated cost based on current selections
    const estimatedCost = useMemo(() => {
        return estimateVideoCost(model, duration, quality)
    }, [model, duration, quality, estimateVideoCost])

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
        
        // Check credits before proceeding
        if (!hasEnoughCredits(estimatedCost)) {
            setShowCreditsModal(true)
            return
        }
        
        // Check if model only supports I2V
        const i2vOnlyModels = ['kling-2.5-turbo', 'kling-o1-video']
        if (i2vOnlyModels.includes(model) && !isImageToVideo) {
            alert('Model này chỉ hỗ trợ Image to Video. Vui lòng tải lên hình ảnh tham khảo.')
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
                        const statusRes = await apiRequest<{ status: string, result?: string }>(`/api/jobs/${encodeURIComponent(genRes.job_id)}`)
                        if (statusRes.status === 'completed' && statusRes.result) {
                            setResult({ video_url: statusRes.result, job_id: genRes.job_id, status: 'completed' })
                            setLoading(false)
                            toast.success('✅ Tạo video thành công!')
                        } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                            setError("Tạo video thất bại. Credits đã được hoàn lại")
                            setLoading(false)
                            toast.error('Tạo video thất bại. Credits đã được hoàn lại')
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
            } else if (model === 'kling-o1-video') {
                endpoint = '/api/generate/video/kling-o1/i2v'
                formData.append('aspect_ratio', aspectRatio)
                formData.append('img_id', imgId)
                formData.append('img_url', imgUrl)
                formData.append('width', imgWidth.toString())
                formData.append('height', imgHeight.toString())
            } else if (model === 'kling-2.6') {
                formData.append('sound', audio.toString())
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
                    const statusRes = await apiRequest<{ status: string, result?: string }>(`/api/jobs/${genRes.job_id}`)
                    if (statusRes.status === 'completed' && statusRes.result) {
                        setResult({ video_url: statusRes.result, job_id: genRes.job_id, status: 'completed' })
                        setLoading(false)
                        toast.success('✅ Tạo video thành công!')
                    } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                        setError("Tạo video thất bại. Credits đã được hoàn lại")
                        setLoading(false)
                        toast.error('Tạo video thất bại. Credits đã được hoàn lại')
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
            
        } catch (e: any) {
            console.error(e)
            const errorMsg = e.message || "Đã xảy ra lỗi"
            setError(errorMsg)
            setLoading(false)
            toast.error(errorMsg)
        }
    }

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-64px)]">
            {/* Left Panel - Controls */}
            <div className="w-full lg:w-[400px] xl:w-[450px] border-b lg:border-b-0 lg:border-r border-border bg-card p-6 flex flex-col overflow-y-auto">
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
                    <ImageUpload onImagesSelected={setReferenceImages} maxImages={1} />

                    {/* Model Selector */}
                    <ModelSelector value={model} onChange={setModel} mode="video" />

                    {/* Dynamic Selectors based on Model Config */}
                    {(() => {
                        const modelConfig = getModelConfig(model, 'video');

                        return (
                            <>
                                {/* Duration Selector */}
                                {modelConfig?.durations && modelConfig.durations.length > 0 && (
                                    <DurationSelector 
                                        value={duration} 
                                        onChange={setDuration} 
                                        options={modelConfig.durations}
                                    />
                                )}

                                {/* Aspect Ratio Selector */}
                                {modelConfig?.aspectRatios && modelConfig.aspectRatios.length > 0 && (
                                    <>
                                        <AspectRatioSelector 
                                            value={aspectRatio} 
                                            onChange={setAspectRatio} 
                                            options={modelConfig.aspectRatios}
                                        />
                                        {/* Model Note */}
                                        {modelConfig.note && (
                                            <div className="flex items-start gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border/50">
                                                <div className="text-xs text-muted-foreground leading-relaxed">
                                                    <span className="font-medium text-foreground">Lưu ý:</span> {modelConfig.note}
                                                </div>
                                            </div>
                                        )}
                                    </>
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
                                     <div className="flex items-center justify-between p-3 border border-input rounded-md bg-background/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2">
                                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                                            <label htmlFor="audio-toggle" className="text-sm font-medium text-foreground cursor-pointer select-none">
                                                Tạo kèm âm thanh
                                            </label>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            id="audio-toggle" 
                                            checked={audio}
                                            onChange={(e) => setAudio(e.target.checked)}
                                            className="h-4 w-4 rounded border-primary text-primary ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </>
                        );
                    })()}



                    {/* Error Message */}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>

                {/* Generate Button */}
                <div className="mt-8 pt-6 border-t border-border sticky bottom-0 bg-card z-10">
                    {/* Cost Estimate */}
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

                    <Button
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim() || balance < estimatedCost}
                        className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                            balance < estimatedCost 
                                ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                                : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
                        }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang tạo...
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

            {/* Right Panel - Preview */}
            <div className="flex-1 bg-background/50 p-6 lg:p-10 flex items-center justify-center overflow-hidden">
                <div className="w-full max-w-4xl h-full flex flex-col">
                    <div className="flex-1 rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden flex items-center justify-center relative shadow-sm">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-muted border-t-[#0F766E] animate-spin" />
                                </div>
                                <p className="text-sm font-medium">Đang tạo video... Vui lòng đợi trong khi hệ thống đang xử lý</p>
                            </div>
                        ) : result?.video_url ? (
                            <VideoPreview videoUrl={result.video_url} />
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
                </div>
            </div>
        </div>
    )
}

