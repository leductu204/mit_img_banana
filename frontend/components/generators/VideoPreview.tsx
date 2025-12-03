"use client"

import { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface VideoPreviewProps {
    videoUrl: string;
}

export default function VideoPreview({ videoUrl }: VideoPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<Plyr | null>(null);

    useEffect(() => {
        if (videoRef.current && !playerRef.current) {
            playerRef.current = new Plyr(videoRef.current, {
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
                settings: ['quality', 'speed'],
                quality: {
                    default: 1080,
                    options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240]
                },
                speed: {
                    selected: 1,
                    options: [0.5, 0.75, 1, 1.25, 1.5, 2]
                }
            });
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (playerRef.current && videoRef.current) {
            videoRef.current.src = videoUrl;
        }
    }, [videoUrl]);

    return (
        <div className="w-full h-full flex items-center justify-center">
            <video
                ref={videoRef}
                className="w-full h-full"
                playsInline
                controls
            >
                <source src={videoUrl} type="video/mp4" />
            </video>
        </div>
    );
}
