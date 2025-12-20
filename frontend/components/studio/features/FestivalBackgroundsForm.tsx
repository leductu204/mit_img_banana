"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import BackgroundPresetGrid from "../shared/BackgroundPresetGrid";
import ResultPreview from "../shared/ResultPreview";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/useToast";

const FESTIVAL_PRESETS = [
    { id: 'tet', label: 'Tết Nguyên Đán', image: 'https://images.unsplash.com/photo-1548625361-9876e65b53e7?auto=format&fit=crop&w=150&q=80', prompt: 'traditional vietnamese lunar new year background' },
    { id: 'trungthu', label: 'Trung Thu', image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=150&q=80', prompt: 'mid autumn festival lanterns background' },
    { id: 'xmas', label: 'Giáng Sinh', image: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=150&q=80', prompt: 'christmas decoration background with lights' },
    { id: 'halloween', label: 'Halloween', image: 'https://images.unsplash.com/photo-1508361001413-7a9dca21d08a?auto=format&fit=crop&w=150&q=80', prompt: 'spooky halloween background' },
    { id: 'wedding', label: 'Mùa Cưới', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=150&q=80', prompt: 'romantic wedding floral background' },
    { id: 'birthday', label: 'Sinh Nhật', image: 'https://images.unsplash.com/photo-1530103862676-de3c9a59af57?auto=format&fit=crop&w=150&q=80', prompt: 'happy birthday party background' },
];

export default function FestivalBackgroundsForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (referenceImages.length === 0 || !selectedPresetId) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("https://placehold.co/1024x1024/png?text=Festival+Background");
        setLoading(false);
        toast.success('✅ Ghép nền lễ hội thành công!');
    }, 2500);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Festival Backgrounds" 
          description="Khung hình lễ hội cho ảnh của bạn"
          icon={Sparkles}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh cần ghép"
            />
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium">Chọn chủ đề lễ hội</label>
             <BackgroundPresetGrid 
                presets={FESTIVAL_PRESETS} 
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
                {loading ? "Đang xử lý..." : "Tạo Ảnh Lễ Hội"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result} 
            placeholderTitle="Kết quả lễ hội"
            placeholderDesc="Ảnh với nền lễ hội sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
