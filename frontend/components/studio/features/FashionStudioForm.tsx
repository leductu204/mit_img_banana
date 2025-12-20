"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import { Shirt, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function FashionStudioForm() {
  const [modelImages, setModelImages] = useState<File[]>([]);
  const [garmentImages, setGarmentImages] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (modelImages.length === 0 || garmentImages.length === 0) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("https://placehold.co/1024x1024/png?text=Fashion+Try+On");
        setLoading(false);
        toast.success('✅ Mặc thử trang phục thành công!');
    }, 4000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Fashion Studio" 
          description="Mặc thử trang phục lên người mẫu AI"
          icon={Shirt}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setModelImages} 
                maxImages={1}
                label="Ảnh người mẫu"
            />
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-dashed border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">+ Thêm trang phục</span>
            </div>
          </div>

          <div className="space-y-2">
             <ImageUpload 
                onImagesSelected={setGarmentImages} 
                maxImages={1}
                label="Ảnh quần áo/váy"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mô tả cách mặc (Tùy chọn)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Sơ vin áo vào quần, để tay trong túi..."
              className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || modelImages.length === 0 || garmentImages.length === 0}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Mặc Thử Ngay"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result} 
            placeholderTitle="Kết quả mặc thử"
            placeholderDesc="Người mẫu với trang phục mới sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
