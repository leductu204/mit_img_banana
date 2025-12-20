"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import { User, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/useToast";

const STYLES = [
    { id: 'professional', label: 'Professional (LinkedIn)' },
    { id: 'anime', label: 'Anime Style' },
    { id: 'cyberpunk', label: 'Cyberpunk' },
    { id: 'sketch', label: 'Pencil Sketch' },
    { id: 'watercolor', label: 'Watercolor' },
    { id: '3d', label: '3D Character' },
];

export default function ProfileImageGeneratorForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (referenceImages.length === 0) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("https://placehold.co/1024x1024/png?text=Profile+Image");
        setLoading(false);
        toast.success('✅ Tạo ảnh chân dung thành công!');
    }, 3000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Profile Image Generator" 
          description="Tạo ảnh đại diện chuyên nghiệp theo phong cách"
          icon={User}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh chân dung gốc"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Chọn phong cách</label>
            <div className="grid grid-cols-2 gap-2">
                {STYLES.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                            selectedStyle === style.id 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-background hover:bg-muted border-input'
                        }`}
                    >
                        {style.label}
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || referenceImages.length === 0}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Tạo Avatar"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result} 
            placeholderTitle="Kết quả avatar"
            placeholderDesc="Ảnh chân dung phong cách mới sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
