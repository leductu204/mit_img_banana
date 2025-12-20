"use client"

import { useRef } from 'react';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';
import 'plyr-react/plyr.css';
import { useToast } from '@/hooks/useToast';

interface VideoPreviewProps {
    videoUrl: string;
}

export default function VideoPreview({ videoUrl }: VideoPreviewProps) {
    const plyrRef = useRef<any>(null);
    const toast = useToast();

    const handleDownload = async () => {
        try {
            toast.info('Đang tải video xuống...', 3000);
            
            // Try fetch first (works for same-origin or CORS-enabled URLs)
            try {
                const response = await fetch(videoUrl, { mode: 'cors' });
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `video-${Date.now()}.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success('Tải video thành công!');
                    return;
                }
            } catch (corsError) {
                // CORS blocked, fall through to direct open
            }
            
            // Fallback: Open video in new tab for manual download
            // This works for external CDN URLs that block CORS
            window.open(videoUrl, '_blank');
            toast.info('Video đang mở trong tab mới. Nhấp chuột phải để lưu.', 5000);
            
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Lỗi khi tải video');
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
        <div className="w-full h-full flex items-center justify-center p-0">
            {/* Fixed Video Box */}
            <div className="w-full max-w-3xl aspect-[3/4] max-h-[calc(100vh-14rem)] rounded-xl overflow-hidden flex items-center justify-center relative shadow-sm">
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
        </div>
    );
}
