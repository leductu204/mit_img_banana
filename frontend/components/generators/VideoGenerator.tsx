"use client"

import { useState } from "react"
import Button from "../common/Button"
import { Sparkles, Video, Loader2 } from "lucide-react"
import { useGenerateVideo } from "@/hooks/useGenerateVideo"
import VideoPreview from "./VideoPreview"
import ImageUpload from "./ImageUpload"
import ModelSelector from "./ModelSelector"
import DurationSelector from "./DurationSelector"
import QualitySelector from "./QualitySelector"
import { getModelConfig } from "@/lib/models-config"

export function VideoGenerator() {
    const [prompt, setPrompt] = useState("")
    const [referenceImages, setReferenceImages] = useState<File[]>([])
    const [model, setModel] = useState("nano-banana")
    const [duration, setDuration] = useState("5s")
    const [quality, setQuality] = useState("2K")
    const [keepStyle, setKeepStyle] = useState(true)
    
    const { generate, result, loading, error } = useGenerateVideo()

    // Mode is inferred from referenceImage presence
    const isImageToVideo = referenceImages.length > 0

    const handleGenerate = async () => {
        if (!prompt.trim()) return
        await generate({ 
            prompt, 
            model_key: model,
            duration: duration,
            quality: quality,
            image_url: referenceImages.length > 0 ? URL.createObjectURL(referenceImages[0]) : undefined,
            keep_style: isImageToVideo ? keepStyle : undefined
        })
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
                        {isImageToVideo ? "Chế độ Ảnh sang Video" : "Chế độ Text sang Video"}
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
                        const showDuration = !modelConfig?.durations || modelConfig.durations.length > 0;
                        const showQuality = !modelConfig?.qualities || modelConfig.qualities.length > 0;

                        return (
                            <>
                                {/* Duration Selector */}
                                {showDuration && (
                                    <DurationSelector value={duration} onChange={setDuration} />
                                )}

                                {/* Quality Selector */}
                                {showQuality && (
                                    <QualitySelector value={quality} onChange={setQuality} />
                                )}
                            </>
                        );
                    })()}

                    {/* Image to Video Specific Settings */}
                    {isImageToVideo && (
                        <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    id="keep-style-video" 
                                    checked={keepStyle}
                                    onChange={(e) => setKeepStyle(e.target.checked)}
                                    className="h-4 w-4 rounded border-primary text-primary ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                />
                            </div>
                        </div>
                    )}

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
