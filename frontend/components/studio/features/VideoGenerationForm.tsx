"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import { Video, Type, Image as LucideImage, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";

import { useStudio } from "../StudioContext";

export default function VideoGenerationForm() {
  const { currentFeature, setFeature } = useStudio();
  const mode = currentFeature?.id === 'image-to-video' ? 'image' : 'text';
  
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (mode === 'text' && !prompt.trim()) return;
    if (mode === 'image' && referenceImages.length === 0) return;
    
    setResult(undefined);
    setLoading(true);
    
    setTimeout(() => {
        // Placeholder video URL
        setResult("https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
        setLoading(false);
        toast.success('✅ Tạo video thành công!');
    }, 5000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto bg-[#1A1F2E]">
        <FeatureHeader 
          title="Video Generation" 
          description="Tạo video sáng tạo từ văn bản hoặc hình ảnh"
          icon={Video}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
           {/* Mode Tabs */}
            <div className="flex bg-black/20 p-1 rounded-xl">
                 <button
                     className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                         mode === 'text'
                             ? 'bg-[#00BCD4]/20 text-[#00BCD4] shadow-sm'
                             : 'text-[#B0B8C4] hover:text-white hover:bg-white/5'
                     }`}
                     onClick={() => setFeature('text-to-video')}
                 >
                     <Type className="w-4 h-4" /> Text
                 </button>
                 <button
                     className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                         mode === 'image'
                             ? 'bg-[#00BCD4]/20 text-[#00BCD4] shadow-sm'
                             : 'text-[#B0B8C4] hover:text-white hover:bg-white/5'
                     }`}
                     onClick={() => setFeature('image-to-video')}
                 >
                     <LucideImage className="w-4 h-4" /> Image
                 </button>
            </div>
           {mode === 'text' ? (
                <div className="space-y-2">
                     <label className="text-sm font-medium text-[#B0B8C4]">Mô tả video muốn tạo</label>
                     <textarea
                         value={prompt}
                         onChange={(e) => setPrompt(e.target.value)}
                         placeholder="Một chú gấu trúc đang trượt ván..."
                         className="min-h-[140px] w-full resize-none rounded-xl border border-[#6B7280] bg-[#252D3D] p-4 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
                     />
                </div>
           ) : (
                <div className="space-y-4">
                     <ImageUpload 
                         onImagesSelected={setReferenceImages} 
                         maxImages={1}
                         label="Ảnh tham chiếu"
                     />
                     <div className="space-y-2">
                         <label className="text-sm font-medium text-[#B0B8C4]">Mô tả chuyển động (Tùy chọn)</label>
                         <textarea
                             value={prompt}
                             onChange={(e) => setPrompt(e.target.value)}
                             placeholder="Camera zoom in, lá cây chuyển động..."
                             className="min-h-[100px] w-full resize-none rounded-xl border border-[#6B7280] bg-[#252D3D] p-4 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
                         />
                     </div>
                </div>
           )}
        </div>

        <div className="mt-8 pt-4 border-t border-white/10">
             <button
                onClick={handleGenerate}
                disabled={loading || (mode === 'text' && !prompt) || (mode === 'image' && referenceImages.length === 0)}
                className={`w-full h-12 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                    loading || (mode === 'text' && !prompt) || (mode === 'image' && referenceImages.length === 0)
                        ? 'bg-[#6B7280]/50 cursor-not-allowed text-[#B0B8C4]' 
                        : 'bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-[0_0_15px_rgba(0,188,212,0.3)]'
                }`}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 
                        Đang xử lý...
                    </>
                ) : "Tạo Video"}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex items-center justify-center">
         <ResultPreview
            loading={loading}
            resultUrl={result}
            status="completed"
            type="video"
            placeholderTitle="Tạo Video"
            placeholderDesc="Nhập mô tả hoặc tải ảnh lên để bắt đầu tạo video."
            onRegenerate={handleGenerate}
         />
      </div>
    </div>
  );
}
