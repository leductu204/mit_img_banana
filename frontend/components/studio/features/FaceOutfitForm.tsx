"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import { Shirt } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function FaceOutfitForm() {
  const [modelImages, setModelImages] = useState<File[]>([]);
  const [garmentImages, setGarmentImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (modelImages.length === 0 || garmentImages.length === 0) return;
    setLoading(true);
    
    setTimeout(() => {
        // In real app, this would be an array of 3 images
        setResult("https://placehold.co/1024x1024/png?text=3+Poses+Generated");
        setLoading(false);
        toast.success('✅ Tạo bộ ảnh mẫu thành công!');
    }, 4500);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Face + Outfit (3 poses)" 
          description="Tạo bộ ảnh người mẫu với 3 dáng khác nhau"
          icon={Shirt}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setModelImages} 
                maxImages={1}
                label="Ảnh khuôn mặt người mẫu"
            />
          </div>

          <div className="space-y-2">
             <ImageUpload 
                onImagesSelected={setGarmentImages} 
                maxImages={1}
                label="Ảnh trang phục"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || modelImages.length === 0 || garmentImages.length === 0}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Tạo 3 Dáng"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result} 
            placeholderTitle="Bộ sưu tập mẫu"
            placeholderDesc="3 hình ảnh với các dáng chụp khác nhau sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
