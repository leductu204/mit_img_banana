"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import { Layers, Plus } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function CombineProductForm() {
  const [productImages, setProductImages] = useState<File[]>([]);
  const [modelImages, setModelImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (productImages.length === 0 || modelImages.length === 0) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("https://placehold.co/1024x1024/png?text=Product+Combined");
        setLoading(false);
        toast.success('✅ Ghép sản phẩm thành công!');
    }, 3000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Combine Product" 
          description="Ghép sản phẩm vào người mẫu hoặc bối cảnh"
          icon={Layers}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setProductImages} 
                maxImages={1}
                label="Ảnh sản phẩm"
            />
          </div>

          <div className="flex justify-center text-muted-foreground">
             <Plus className="w-6 h-6" />
          </div>

          <div className="space-y-2">
             <ImageUpload 
                onImagesSelected={setModelImages} 
                maxImages={1}
                label="Ảnh nền / Người mẫu"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || productImages.length === 0 || modelImages.length === 0}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Ghép Sản Phẩm"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result} 
            placeholderTitle="Kết quả ghép"
            placeholderDesc="Ảnh sau khi ghép sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
