"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import BackgroundPresetGrid from "../shared/BackgroundPresetGrid";
import ResultPreview from "../shared/ResultPreview";
import { Plane } from "lucide-react";
import { useToast } from "@/hooks/useToast";

const TRAVEL_PRESETS = [
    { id: 'paris', label: 'Paris', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=150&q=80', prompt: 'in front of Eiffel Tower in Paris, sunny day' },
    { id: 'tokyo', label: 'Tokyo', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=150&q=80', prompt: 'in busy Shibuya Crossing Tokyo, neon lights, night' },
    { id: 'bali', label: 'Bali', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=150&q=80', prompt: 'in a tropical resort in Bali, palm trees, pool' },
    { id: 'nyc', label: 'New York', image: 'https://images.unsplash.com/photo-1496442226666-8d4a0e62e6e9?auto=format&fit=crop&w=150&q=80', prompt: 'in Times Square New York, yellow cabs, urban activity' },
    { id: 'santorini', label: 'Santorini', image: 'https://images.unsplash.com/photo-1613395877344-13d4c79e4284?auto=format&fit=crop&w=150&q=80', prompt: 'in Santorini Greece, white buildings, blue dome, sea view' },
    { id: 'swiss', label: 'Thụy Sĩ', image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=150&q=80', prompt: 'in Swiss Alps, mountains, lake, green grass' },
];

export default function TravelPhotoForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (referenceImages.length === 0 || !selectedPresetId) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("https://placehold.co/1024x1024/png?text=Travel+Photo");
        setLoading(false);
        toast.success('✅ Tạo ảnh du lịch thành công!');
    }, 3000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Travel Photo" 
          description="Check-in khắp thế giới ngay tại nhà"
          icon={Plane}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh của bạn"
            />
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium">Chọn điểm đến</label>
             <BackgroundPresetGrid 
                presets={TRAVEL_PRESETS} 
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
                {loading ? "Đang xử lý..." : "Đi Du Lịch Ngay"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result} 
            placeholderTitle="Kết quả du lịch"
            placeholderDesc="Ảnh check-in sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
