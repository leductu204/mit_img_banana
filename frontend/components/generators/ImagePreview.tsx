import React from 'react';

interface ImagePreviewProps {
    imageUrl: string;
    className?: string;
}

export default function ImagePreview({ imageUrl, className = '' }: ImagePreviewProps) {
    return (
        <div className={`mt-4 ${className}`}>
            <img src={imageUrl} alt="Generated" className="max-w-full rounded shadow" />
        </div>
    );
}
