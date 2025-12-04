"use client"

import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { ControlPanel } from "@/components/generation/ControlPanel"
import { CanvasArea } from "@/components/generation/CanvasArea"
import { RecentStrip } from "@/components/gallery/RecentStrip"
import { useGenerateImage } from "@/hooks/useGenerateImage"
import { apiRequest } from "@/lib/api"

export default function CreatePage() {
    const [prompt, setPrompt] = useState("")
    const [aspectRatio, setAspectRatio] = useState("9:16")
    const [referenceImages, setReferenceImages] = useState<File[]>([])
    const [model, setModel] = useState("nano-banana")
    const [quality, setQuality] = useState("2k")
    const [recentImages, setRecentImages] = useState<any[]>([])

    const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateImage()

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

        setLoading(true)
        setError(null)
        setResult(null)

        try {
            // 1. Upload Images
            const inputImages = []
            if (referenceImages.length > 0) {
                for (let i = 0; i < referenceImages.length; i++) {
                    const file = referenceImages[i]

                    // Get Upload URL (reference for first, batch for rest)
                    const endpoint = i === 0 ? '/api/nano-banana/upload/reference' : '/api/nano-banana/upload/batch'
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
                    await apiRequest('/api/nano-banana/upload/check', {
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

            // 2. Generate
            const payload: any = {
                prompt,
                aspect_ratio: aspectRatio,
                input_images: inputImages,
                model: model
            }

            // Only add resolution for Pro models
            if (model !== 'nano-banana') {
                payload.resolution = quality
            }

            const genRes = await apiRequest<{ job_id: string }>('/api/nano-banana/generate', {
                method: 'POST',
                body: JSON.stringify(payload)
            })

            // 3. Poll Status
            const checkStatus = async () => {
                try {
                    const statusRes = await apiRequest<{ status: string, result?: string }>(`/api/nano-banana/jobs/${genRes.job_id}`)
                    if (statusRes.status === 'completed' && statusRes.result) {
                        const newResult = { image_url: statusRes.result, job_id: genRes.job_id, status: 'completed' }
                        setResult(newResult)
                        setLoading(false)
                        // Add to recent images
                        setRecentImages(prev => [newResult, ...prev])
                    } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                        setError("Generation failed")
                        setLoading(false)
                    } else {
                        setTimeout(checkStatus, 2000)
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
        <div className="min-h-screen bg-bg-primary flex flex-col">
            <Header />
            
            <main className="flex-1 flex flex-col lg:flex-row pt-18">
                {/* Left Panel - Controls */}
                <div className="border-r border-border-secondary bg-bg-secondary/30">
                    <ControlPanel 
                        prompt={prompt}
                        setPrompt={setPrompt}
                        images={referenceImages}
                        setImages={setReferenceImages}
                        model={model}
                        setModel={setModel}
                        aspectRatio={aspectRatio}
                        setAspectRatio={setAspectRatio}
                        quality={quality}
                        setQuality={setQuality}
                        loading={loading}
                        onGenerate={handleGenerate}
                    />
                </div>

                {/* Right Panel - Canvas */}
                <div className="flex-1 bg-bg-primary flex flex-col">
                    <CanvasArea 
                        loading={loading} 
                        result={result} 
                        setPrompt={setPrompt}
                        onRefresh={handleGenerate}
                    />
                    
                    {/* Recent Strip */}
                    <div className="shrink-0">
                        <RecentStrip 
                            images={recentImages} 
                            onImageClick={(img) => setResult({
                                image_url: img.url,
                                job_id: 'restored',
                                status: 'completed'
                            })}
                        />
                    </div>
                </div>
            </main>
        </div>
    )
}
