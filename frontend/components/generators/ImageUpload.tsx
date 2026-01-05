import React, { useRef, useState, useEffect } from 'react';
import { X, ImagePlus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    onImagesSelected: (files: File[]) => void;
    maxImages?: number;
    label?: React.ReactNode;
    description?: string;
    compact?: boolean;
}

export default function ImageUpload({ 
    onImagesSelected, 
    maxImages = 5,
    label,
    description,
    compact = false
}: ImageUploadProps) {
    const [previews, setPreviews] = useState<{ id: string; url: string; file: File }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            previews.forEach(p => URL.revokeObjectURL(p.url));
        };
    }, [previews]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const addFiles = (files: File[]) => {
        const newFiles = files.filter(file => file.type.startsWith('image/'));
        if (newFiles.length === 0) return;

        const availableSlots = maxImages - previews.length;
        const filesToAdd = newFiles.slice(0, availableSlots);

        const newPreviews = filesToAdd.map(file => ({
            id: Math.random().toString(36).substring(7),
            url: URL.createObjectURL(file),
            file
        }));

        const updatedPreviews = [...previews, ...newPreviews];
        setPreviews(updatedPreviews);
        onImagesSelected(updatedPreviews.map(p => p.file));
    };

    const removeImage = (id: string) => {
        const updatedPreviews = previews.filter(p => p.id !== id);
        setPreviews(updatedPreviews);
        onImagesSelected(updatedPreviews.map(p => p.file));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium text-[#B0B8C4] block">
                    {label}
                </label>
            )}
            
            <div className="flex flex-wrap gap-3">
                {/* Image Thumbnails */}
                {previews.map((preview) => (
                    <div key={preview.id} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-[#252D3D]">
                        <img 
                            src={preview.url} 
                            alt="Reference" 
                            className="w-full h-full object-cover" 
                        />
                        <button
                            onClick={() => removeImage(preview.id)}
                            className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}

                {/* Add Button - Dashed Dropzone */}
                {previews.length < maxImages && (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className={cn(
                            "border border-dashed border-[#6B7280] bg-[#252D3D]/50 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#00BCD4] hover:bg-[#252D3D] transition-all cursor-pointer group",
                            (previews.length === 0 && !compact) ? "w-full p-6 h-[140px]" : "w-20 h-20 p-0"
                        )}
                    >
                        {(previews.length === 0 && !compact) ? (
                            <>
                                <div className="p-3 bg-[#1F2833] rounded-full group-hover:scale-110 transition-transform">
                                    <ImagePlus className="text-[#6B7280] group-hover:text-[#00BCD4] w-6 h-6" />
                                </div>
                                <p className="text-xs text-[#6B7280] text-center">Kéo thả hoặc nhấn để tải ảnh lên</p>
                            </>
                        ) : (
                             <Plus className="h-6 w-6 text-[#6B7280] group-hover:text-[#00BCD4] transition-colors" />
                        )}
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/png, image/jpeg, image/webp"
                            multiple
                            onChange={handleFileChange}
                        />
                    </div>
                )}
            </div>
            {description && (
                <p className="text-xs text-[#6B7280]">{description}</p>
            )}
        </div>
    );
}
