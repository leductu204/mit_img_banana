import React from 'react';

interface VideoPreviewProps {
    videoUrl: string;
    className?: string;
}

export default function VideoPreview({ videoUrl, className = '' }: VideoPreviewProps) {
    return (
        <div className={`mt-4 ${className}`}>
            <video controls className="max-w-full rounded shadow">
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    );
}
