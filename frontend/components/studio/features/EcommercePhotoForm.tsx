"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import BackgroundPresetGrid from "../shared/BackgroundPresetGrid";
import { ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/useToast";

const ECOM_PRESETS = [
    { id: 'podium', label: 'Bục trưng bày', image: 'https://images.unsplash.com/photo-1616401784845-180882ba9cb8?auto=format&fit=crop&w=150&q=80', prompt: 'product on a minimalist podium, studio lighting' },
    { id: 'bathroom', label: 'Phòng tắm', image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=150&q=80', prompt: 'product in a modern bathroom setting, near sink, bright' },
    { id: 'kitchen', label: 'Phòng bếp', image: 'https://images.unsplash.com/photo-1556910638-6cd530ae6110?auto=format&fit=crop&w=150&q=80', prompt: 'product on wooden kitchen counter, blurred background' },
    { id: 'nature', label: 'Thiên nhiên', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=150&q=80', prompt: 'product on a rock in nature, sunlight, moss' },
    { id: 'pastel', label: 'Màu Pastel', image: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=150&q=80', prompt: 'minimalist pastel color background, soft shadows' },
    { id: 'silk', label: 'Lụa mềm', image: 'https://images.unsplash.com/photo-1528696892704-5e11528bca0b?auto=format&fit=crop&w=150&q=80', prompt: 'product on elegant silk fabric, luxury feel' },
];

export default function EcommercePhotoForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (referenceImages.length === 0 || !selectedPresetId) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("https://placehold.co/1024x1024/png?text=Ecommerce+Photo");
        setLoading(false);
        toast.success('✅ Tạo ảnh TMĐT thành công!');
    }, 2500);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="E-commerce Photo" 
          description="Ảnh sản phẩm tối ưu cho sàn TMĐT (Shopee, TikTok)"
          icon={ShoppingBag}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh sản phẩm"
            />
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium">Bối cảnh đề xuất</label>
             <BackgroundPresetGrid 
                presets={ECOM_PRESETS} 
                selectedId={selectedPresetId} 
                onSelect={setSelectedPresetId} 
             />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || referenceImages.length === 0 || !selectedPresetId}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Tạo Ảnh TMĐT"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result} 
            placeholderTitle="Kết quả TMĐT"
            placeholderDesc="Ảnh sản phẩm thương mại sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
