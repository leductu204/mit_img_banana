"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import { Scissors } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function ExtractClothesForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (referenceImages.length === 0) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("https://placehold.co/1024x1024/png?text=Clothes+Extracted");
        setLoading(false);
        toast.success('✅ Tách quần áo thành công!');
    }, 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Extract Clothes" 
          description="Tách quần áo khỏi người mẫu/ảnh chụp"
          icon={Scissors}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh người mẫu mặc đồ"
            />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>AI sẽ tự động nhận diện và tách quần áo chính trong ảnh ra nền trong suốt.</p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || referenceImages.length === 0}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Tách Quần Áo"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <div className="flex-1 relative h-full">
            <ResultPreview 
                loading={loading} 
                resultUrl={result} 
                placeholderTitle="Kết quả tách"
                placeholderDesc="Quần áo được tách sẽ hiển thị trên nền trong suốt."
            />
         </div>
      </div>
    </div>
  );
}
