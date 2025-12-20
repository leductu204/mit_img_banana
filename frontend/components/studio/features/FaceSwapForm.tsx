"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import { User, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function FaceSwapForm() {
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  const [targetImages, setTargetImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (sourceImages.length === 0 || targetImages.length === 0) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("https://placehold.co/1024x1024/png?text=Face+Swapped");
        setLoading(false);
        toast.success('✅ Hoán đổi khuôn mặt thành công!');
    }, 3000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Face Swap" 
          description="Ghép khuôn mặt vào hình ảnh khác"
          icon={User}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setSourceImages} 
                maxImages={1}
                label="Ảnh chứa khuôn mặt (Source)"
            />
          </div>

          <div className="flex justify-center text-muted-foreground">
             <ArrowRight className="w-6 h-6 rotate-90 lg:rotate-0" />
          </div>

          <div className="space-y-2">
             <ImageUpload 
                onImagesSelected={setTargetImages} 
                maxImages={1}
                label="Ảnh đích (Target)"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || sourceImages.length === 0 || targetImages.length === 0}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Hoán Đổi"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result} 
            placeholderTitle="Kết quả Face Swap"
            placeholderDesc="Ảnh sau khi ghép mặt sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
