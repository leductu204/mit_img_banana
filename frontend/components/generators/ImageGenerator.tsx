"use client"

import { useState, useMemo, useEffect } from "react"
import Button from "../common/Button"
import { Sparkles, Loader2, Download, RefreshCw, AlertCircle, Coins } from "lucide-react"
import { useGenerateImage } from "@/hooks/useGenerateImage"
import { useCredits } from "@/hooks/useCredits"
import { useToast } from "@/hooks/useToast"
import { apiRequest } from "@/lib/api"
import AspectRatioSelector from "./AspectRatioSelector"
import ImageUpload from "./ImageUpload"
import ModelSelector from "./ModelSelector"
import QualitySelector from "./QualitySelector"
import InsufficientCreditsModal from "../common/InsufficientCreditsModal"
import { getModelConfig } from "@/lib/models-config"

export function ImageGenerator() {
    const [prompt, setPrompt] = useState("")
    const [aspectRatio, setAspectRatio] = useState("9:16")
    const [referenceImages, setReferenceImages] = useState<File[]>([])
    const [model, setModel] = useState("nano-banana-pro")
    const [quality, setQuality] = useState("2k")
    const [speed, setSpeed] = useState("fast")
    const [keepStyle, setKeepStyle] = useState(true)
    const [showCreditsModal, setShowCreditsModal] = useState(false)

    const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateImage()
    const { 
        balance, 
        estimateImageCost, 
        hasEnoughCredits, 
        updateCredits,
        getAvailableAspectRatios,
        getAvailableResolutions,
        costsLoaded 
    } = useCredits()
    const toast = useToast()

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
                        const statusRes = await apiRequest<{ status: string, result?: string }>(`/api/jobs/${genRes.job_id}`)
                        
                        if (statusRes.status === 'completed' && statusRes.result) {
                            setResult({ image_url: statusRes.result, job_id: genRes.job_id, status: 'completed' })
                            setLoading(false)
                            toast.success('✅ Tạo ảnh thành công!')
                        } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                            setError("Tạo ảnh thất bại. Credits đã được hoàn lại")
                            setLoading(false)
                            toast.error('Tạo ảnh thất bại. Credits đã được hoàn lại')
                        } else {
                            setTimeout(checkStatus, 6000)
                        }
                    } catch (e: any) {
                        setError(`Failed to check status: ${e.message}`)
                        setLoading(false)
                    }
                }

                checkStatus()
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

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-64px)]">
            {/* Left Panel - Controls */}
            <div className="w-full lg:w-[400px] xl:w-[450px] border-b lg:border-b-0 lg:border-r border-border bg-card p-6 flex flex-col overflow-y-auto">
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h1 className="text-xl font-semibold text-foreground">Trải nghiệm "Chuối" PRO</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {isImageToImage ? "Image to Image Mode" : "Text to Image Mode"}
                    </p>
                </div>

                <div className="flex-1 space-y-6">
                    {/* Prompt Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Prompt</label>
                        <textarea
                            placeholder="Nhập prompt ảnh bạn muốn tạo..."
                            className="min-h-[120px] w-full resize-none rounded-md border border-input bg-input p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    {/* Reference Image Section */}
                    <ImageUpload onImagesSelected={setReferenceImages} maxImages={5} />

                    {/* Model Selector */}
                    <ModelSelector value={model} onChange={setModel} mode="image" />

                    {/* Speed Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Tốc độ</label>
                        <div className="flex bg-muted p-1 rounded-lg">
                            <button
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    speed === 'fast'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setSpeed('fast')}
                            >
                                Nhanh
                            </button>
                            <button
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    speed === 'slow'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setSpeed('slow')}
                            >
                                Chậm
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Selectors based on Model Config */}
                    {(() => {
                        const modelConfig = getModelConfig(model, 'image');
                        
                        // Use dynamic ratios from costs if available, otherwise use model config
                        const ratiosToShow = costsLoaded && dynamicAspectRatios.length > 0
                            ? dynamicAspectRatios
                            : (modelConfig?.aspectRatios || ['16:9', '9:16', '1:1']);
                            
                        // For resolutions, dynamic list is usually safe (1k, 720p), but fallback is safe too
                        const resolutionsToShow = dynamicResolutions.length > 0 
                            ? dynamicResolutions 
                            : (modelConfig?.resolutions || []);

                        const showAspectRatio = ratiosToShow.length > 0;
                        const showResolution = resolutionsToShow.length > 0;

                        return (
                            <>
                                {/* Aspect Ratio Selector */}
                                {showAspectRatio && (
                                    <AspectRatioSelector 
                                        value={aspectRatio} 
                                        onChange={setAspectRatio} 
                                        options={ratiosToShow}
                                    />
                                )}

                                {/* Resolution Selector (for PRO models) */}
                                {showResolution && (
                                    <QualitySelector 
                                        value={quality} 
                                        onChange={setQuality} 
                                        options={resolutionsToShow}
                                    />
                                )}
                            </>
                        );
                    })()}

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
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
                                Đang tạo ảnh...
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

                {/* Insufficient Credits Modal */}
                <InsufficientCreditsModal
                    isOpen={showCreditsModal}
                    onClose={() => setShowCreditsModal(false)}
                    required={estimatedCost}
                    available={balance}
                />
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 bg-background/50 p-6 lg:p-10 flex items-center justify-center overflow-auto">
                <div className="w-full max-w-3xl flex flex-col gap-4">
                    {/* Preview Container - Responsive */}
                    <div className="w-full aspect-[3/4] max-h-[calc(100vh-14rem)] rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden flex items-center justify-center relative shadow-sm">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-muted border-t-[#0F766E] animate-spin" />
                                </div>
                                <p className="text-sm font-medium">Đang tạo ảnh...</p>
                            </div>
                        ) : result?.image_url ? (
                            <img
                                src={result.image_url}
                                alt="Generated result"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center">
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

                    {/* Action Bar - Below Preview */}
                    {result?.image_url && !loading && (
                        <div className="flex justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Button
                                onClick={handleGenerate}
                                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
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
                                className="bg-[#0F766E] hover:bg-[#0D655E] text-white"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Tải xuống
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

