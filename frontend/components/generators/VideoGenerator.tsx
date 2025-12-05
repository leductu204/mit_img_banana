"use client"

import { useState, useEffect } from "react"
import Button from "../common/Button"
import { Sparkles, Video, Loader2, Volume2 } from "lucide-react"
import { useGenerateVideo } from "@/hooks/useGenerateVideo"
import { apiRequest } from "@/lib/api"
import ImageUpload from "./ImageUpload"
import dynamic from 'next/dynamic'

const VideoPreview = dynamic(() => import('./VideoPreview'), { ssr: false })
import ModelSelector from "./ModelSelector"
import DurationSelector from "./DurationSelector"
import QualitySelector from "./QualitySelector"
import AspectRatioSelector from "./AspectRatioSelector"
import { getModelConfig } from "@/lib/models-config"

export function VideoGenerator() {
    const [prompt, setPrompt] = useState("")
    const [referenceImages, setReferenceImages] = useState<File[]>([])
    const [model, setModel] = useState("kling-2.5-turbo")
    const [duration, setDuration] = useState("5s")
    const [quality, setQuality] = useState("720p")
    const [aspectRatio, setAspectRatio] = useState("16:9")
    const [audio, setAudio] = useState(false)

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
                
                // Get upload URL from Higgsfield
                const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/nano-banana/media', {
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
                await apiRequest('/api/nano-banana/upload/check', {
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
            
            if (model === 'kling-2.5-turbo') {
                endpoint = '/api/generate/kling-2.5-turbo/i2v'
                formData.append('resolution', quality)
                formData.append('img_id', imgId)
                formData.append('img_url', imgUrl)
                formData.append('width', imgWidth.toString())
                formData.append('height', imgHeight.toString())
            } else if (model === 'kling-o1-video') {
                endpoint = '/api/generate/kling-o1/i2v'
                formData.append('aspect_ratio', aspectRatio)
                formData.append('img_id', imgId)
                formData.append('img_url', imgUrl)
                formData.append('width', imgWidth.toString())
                formData.append('height', imgHeight.toString())
            } else if (model === 'kling-2.6') {
                formData.append('sound', audio.toString())
                if (isImageToVideo) {
                    endpoint = '/api/generate/kling-2.6/i2v'
                    formData.append('img_id', imgId)
                    formData.append('img_url', imgUrl)
                    formData.append('width', imgWidth.toString())
                    formData.append('height', imgHeight.toString())
                } else {
                    endpoint = '/api/generate/kling-2.6/t2v'
                    formData.append('aspect_ratio', aspectRatio)
                }
            } else {
                throw new Error(`Unknown model: ${model}`)
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            })
            
            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Failed to generate video: ${response.status} - ${errorText}`)
            }
            
            const genRes = await response.json()
            
            // Poll for completion
            const checkStatus = async () => {
                try {
                    const statusRes = await apiRequest<{ status: string, result?: string }>(`/api/jobs/${genRes.job_id}`)
                    if (statusRes.status === 'completed' && statusRes.result) {
                        setResult({ video_url: statusRes.result, job_id: genRes.job_id, status: 'completed' })
                        setLoading(false)
                    } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                        setError("Video generation failed")
                        setLoading(false)
                    } else {
                        setTimeout(checkStatus, 3000)
                    }
                } catch (e) {
                    setError("Failed to check status")
                    setLoading(false)
                }
            }
            
            checkStatus()
            
        } catch (e: any) {
            console.error(e)
            setError(e.message || "An error occurred")
            setLoading(false)
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
                                        {modelConfig.description && (
                                            <div className="flex items-start gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border/50">
                                                <div className="text-xs text-muted-foreground leading-relaxed">
                                                    <span className="font-medium text-foreground">Lưu ý:</span> {modelConfig.description}
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
                    <Button
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim()}
                        className="w-full bg-[#0F766E] hover:bg-[#0D655E] text-white font-medium h-11 rounded-md shadow-sm transition-all duration-200"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Tạo video
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-4">Powered by DucTu - NanoTool</p>
                </div>
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
                                <p className="text-sm font-medium">Đang tạo video...</p>
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

