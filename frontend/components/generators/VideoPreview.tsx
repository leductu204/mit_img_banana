"use client"

import { useRef } from 'react';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';
import { Download } from 'lucide-react';

interface VideoPreviewProps {
    videoUrl: string;
}

export default function VideoPreview({ videoUrl }: VideoPreviewProps) {
    const plyrRef = useRef<any>(null);

    const handleDownload = async () => {
        try {
            const response = await fetch(videoUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const plyrSource = {
        type: 'video' as const,
        sources: [
            {
                src: videoUrl,
                type: 'video/mp4',
            },
        ],
    };

    const plyrOptions = {
        controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'mute',
            'volume',
            'settings',
            'fullscreen'
        ],
        ratio: '16:9' as const,
    };

    return (
        <div className="w-full flex flex-col items-center gap-6 p-6 lg:p-10">
            {/* Fixed Video Box - Matches Image Box Size */}
            <div className="w-full max-w-3xl aspect-[3/4] max-h-[calc(100vh-14rem)] rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden flex items-center justify-center relative shadow-sm">
                <style jsx global>{`
                    .video-box .plyr {
                        width: 100%;
                        height: 100%;
                    }
                    .video-box .plyr video {
                        object-fit: contain;
                        width: 100%;
                        height: 100%;
                    }
                    .video-box .plyr__video-wrapper {
                        width: 100%;
                        height: 100%;
                    }
                `}</style>
                <div className="video-box w-full h-full">
                    <Plyr
                        ref={plyrRef}
                        source={plyrSource}
                        options={plyrOptions}
                    />
                </div>
            </div>

            {/* Download Button */}
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
                <Download className="w-5 h-5" />
                <span className="font-medium">Tải xuống video</span>
            </button>
        </div>
    );
}
