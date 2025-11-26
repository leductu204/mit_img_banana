"use client"

import { useState } from "react"
import Button from "../common/Button"
import { Sparkles, Video, Loader2, Download } from "lucide-react"
import { useGenerateVideo } from "@/hooks/useGenerateVideo"

export function VideoGenerator() {
    const [prompt, setPrompt] = useState("")
    const { generate, result, loading, error } = useGenerateVideo()

    const handleGenerate = async () => {
        if (!prompt.trim()) return
        await generate({ prompt, model_key: 'kling' }) // Defaulting to kling
    }

    return (
        <div className="flex h-full">
            {/* Left Panel - Input */}
            <div className="w-1/2 border-r border-border bg-card p-6 flex flex-col">
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-2">
                        <Video className="h-5 w-5 text-primary" />
                        <h1 className="text-xl font-semibold text-foreground">AI Video Generator</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">Describe the video you want to create</p>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Prompt</label>
                        <textarea
                            placeholder="A cinematic drone shot of a futuristic city..."
                            className="min-h-[180px] w-full resize-none rounded-md border border-input bg-input p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim()}
                        className="w-full bg-[#0F766E] hover:bg-[#0D655E] text-white font-medium h-11 rounded-md shadow-sm transition-all duration-200"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Video
                            </>
                        )}
                    </Button>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>

                <div className="mt-auto pt-6 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">Powered by AI • Create stunning videos from text</p>
                </div>
            </div>

            {/* Right Panel - Video Display */}
            <div className="w-1/2 bg-background p-6 lg:p-10 flex items-center justify-center">
                <div className="w-full max-w-2xl aspect-video rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-muted border-t-primary animate-spin" />
                            </div>
                            <p className="text-sm">Creating your masterpiece...</p>
                        </div>
                    ) : result?.video_url ? (
                        <div className="relative w-full h-full group">
                            <video
                                src={result.video_url}
                                controls
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button className="gap-2" onClick={() => window.open(result.video_url, '_blank')}>
                                    <Download className="h-4 w-4" />
                                    Download
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                                <Video className="h-10 w-10" />
                            </div>
                            <div>
                                <p className="font-medium text-foreground mb-1">No video yet</p>
                                <p className="text-sm">Enter a prompt and click generate to create a video</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
