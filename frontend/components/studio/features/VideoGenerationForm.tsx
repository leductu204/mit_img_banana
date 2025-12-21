"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import { Video, Type, Image as LucideImage } from "lucide-react";
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
    
    setLoading(true);
    
    setTimeout(() => {
        // Placeholder video URL
        setResult("https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
        setLoading(false);
        toast.success('✅ Tạo video thành công!');
    }, 5000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Video Generation" 
          description="Tạo video sáng tạo từ văn bản hoặc hình ảnh"
          icon={Video}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
           {/* Mode Tabs */}
           <div className="flex bg-muted p-1 rounded-lg">
                <button
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                        mode === 'text'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setFeature('text-to-video')}
                >
                    <Type className="w-4 h-4" /> Text to Video
                </button>
                <button
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                        mode === 'image'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setFeature('image-to-video')}
                >
                    <LucideImage className="w-4 h-4" /> Image to Video
                </button>
           </div>

           {mode === 'text' ? (
               <div className="space-y-2">
                    <label className="text-sm font-medium">Mô tả video muốn tạo</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Một chú gấu trúc đang trượt ván..."
                        className="min-h-[140px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:ring-primary"
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
                        <label className="text-sm font-medium">Mô tả chuyển động (Tùy chọn)</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Camera zoom in, lá cây chuyển động..."
                            className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:ring-primary"
                        />
                    </div>
               </div>
           )}
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || (mode === 'text' && !prompt) || (mode === 'image' && referenceImages.length === 0)}
                className="w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 bg-[#0F766E] hover:bg-[#0D655E] text-white"
            >
                {loading ? "Đang xử lý..." : "Tạo Video"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex items-center justify-center">
         {result ? (
             <div className="w-full max-w-2xl bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                 <div className="aspect-video bg-black relative">
                     <video 
                        src={result} 
                        controls 
                        className="w-full h-full"
                        autoPlay 
                        loop
                     />
                 </div>
                 <div className="p-4 flex justify-between items-center">
                    <span className="text-sm font-medium">Video Result</span>
                    <Button className="h-9 px-3 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground">Tải xuống</Button>
                 </div>
             </div>
         ) : (
            <div className="text-center text-muted-foreground p-8">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nhập mô tả hoặc tải ảnh lên để tạo video</p>
            </div>
         )}
      </div>
    </div>
  );
}
