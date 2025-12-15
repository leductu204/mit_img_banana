import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';

interface ImageUploadProps {
    onImagesSelected: (files: File[]) => void;
    maxImages?: number;
    label?: React.ReactNode;
    description?: string;
}

export default function ImageUpload({ 
    onImagesSelected, 
    maxImages = 5,
    label = "Hình ảnh tham chiếu",
    description 
}: ImageUploadProps) {
    const [previews, setPreviews] = useState<{ id: string; url: string; file: File }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const defaultDescription = `Tải lên tối đa ${maxImages} hình ảnh tham chiếu.`;
    const finalDescription = description !== undefined ? description : defaultDescription;

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
        // Reset input so same file can be selected again if needed
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
            {label && <label className="text-sm font-medium text-foreground">{label}</label>}
            
            <div className="flex flex-wrap gap-3">
                {/* Image Thumbnails */}
                {previews.map((preview) => (
                    <div key={preview.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
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

                {/* Add Button */}
                {previews.length < maxImages && (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50 flex flex-col items-center justify-center cursor-pointer transition-all"
                    >
                        <Plus className="h-6 w-6 text-muted-foreground" />
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
            {previews.length === 0 && finalDescription && (
                <p className="text-xs text-muted-foreground">{finalDescription}</p>
            )}
        </div>
    );
}
