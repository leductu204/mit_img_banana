"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import AspectRatioSelector from "@/components/generators/AspectRatioSelector";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function ProductPhotoshootForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (referenceImages.length === 0 || !prompt.trim()) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("https://placehold.co/1024x1024/png?text=Product+Photo");
        setLoading(false);
        toast.success('✅ Chụp ảnh sản phẩm thành công!');
    }, 3000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Product Photoshoot" 
          description="Chụp ảnh sản phẩm chuyên nghiệp với AI"
          icon={Camera}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh sản phẩm (Nên dùng ảnh tách nền)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mô tả bối cảnh chụp</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Trên bàn đá marble trắng, ánh sáng tự nhiên, decor lá cây..."
              className="min-h-[100px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
             <AspectRatioSelector 
                value={aspectRatio}
                onChange={setAspectRatio}
                options={['1:1', '4:3', '3:4', '16:9']}
             />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || referenceImages.length === 0 || !prompt.trim()}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Tạo Ảnh Sản Phẩm"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result} 
            placeholderTitle="Studio Ảo"
            placeholderDesc="Ảnh sản phẩm chuyên nghiệp sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
