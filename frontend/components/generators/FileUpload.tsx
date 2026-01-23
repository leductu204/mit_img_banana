import React, { useRef, useState, useEffect } from 'react';
import { X, Upload, Plus, FileVideo, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
    onFileSelected: (file: File | null) => void;
    accept: string;
    label?: React.ReactNode;
    subtext?: string;
    icon?: React.ElementType;
    maxSizeMB?: number;
    className?: string;
}

export default function FileUpload({ 
    onFileSelected, 
    accept,
    label,
    subtext,
    icon: Icon = Upload,
    maxSizeMB = 50, // Default 50MB
    className
}: FileUploadProps) {
    const [preview, setPreview] = useState<{ url: string; file: File; type: 'image' | 'video' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup object URLs
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview.url);
        };
    }, [preview]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate size
        if (file.size > maxSizeMB * 1024 * 1024) {
            alert(`File quá lớn. Vui lòng chọn file nhỏ hơn ${maxSizeMB}MB.`);
            return;
        }

        const type = file.type.startsWith('image/') ? 'image' : 'video';
        const url = URL.createObjectURL(file);
        setPreview({ url, file, type });
        onFileSelected(file);
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        onFileSelected(null);
    };

    return (
        <div 
            onClick={() => !preview && fileInputRef.current?.click()}
            className={cn(
                "relative group rounded-xl border border-dashed border-[#6B7280] bg-[#252D3D]/50 hover:bg-[#252D3D] hover:border-[#00BCD4] transition-all cursor-pointer overflow-hidden",
                !preview ? "p-4 flex flex-col items-center justify-center text-center gap-2" : "p-0",
                className
            )}
        >
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept={accept}
                onChange={handleFileChange}
            />

            {!preview ? (
                <>
                    <div className="p-3 bg-[#1F2833] rounded-full group-hover:scale-110 transition-transform">
                        <Icon className="text-[#6B7280] group-hover:text-[#00BCD4] w-6 h-6" />
                    </div>
                    {label && <p className="text-sm font-medium text-[#E3E5E8]">{label}</p>}
                    {subtext && <p className="text-xs text-[#6B7280]">{subtext}</p>}
                </>
            ) : (
                <div className="relative w-full h-full">
                    {preview.type === 'image' ? (
                        <img 
                            src={preview.url} 
                            alt="Preview" 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <video 
                            src={preview.url} 
                            className="w-full h-full object-cover" 
                            controls={false}
                            muted
                            loop
                            autoPlay // Optional: autoplay preview
                            onMouseOver={e => e.currentTarget.play()}
                            onMouseOut={e => e.currentTarget.pause()}
                        />
                    )}
                    
                    {/* Remove Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button
                            onClick={removeFile}
                            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    
                    {/* File Info Badge */}
                     <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white max-w-[90%] truncate">
                        {preview.file.name}
                    </div>
                </div>
            )}
        </div>
    );
}
