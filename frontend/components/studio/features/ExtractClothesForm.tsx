"use client"

import { Scissors, AlertCircle, Settings, ChevronUp, ChevronDown, Zap, Coins } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { apiRequest } from "@/lib/api";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";
import React, { useState, useMemo } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import AspectRatioSelector from "@/components/generators/AspectRatioSelector";

export default function ExtractClothesForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [optionalPrompt, setOptionalPrompt] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [speed, setSpeed] = useState<"fast" | "slow">("fast");
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  
  const toast = useToast();
  const { result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits } = useCredits();

  const estimatedCost = useMemo(() => {
    return estimateImageCost("nano-banana-pro", aspectRatio, "2k", speed);
  }, [aspectRatio, speed, estimateImageCost]);

  const getImageDimensionsFromUrl = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = reject
        img.crossOrigin = 'anonymous'
        img.src = url
    })
  }

  const handleGenerate = async () => {
    if (referenceImages.length === 0) return;

    if (!hasEnoughCredits(estimatedCost)) {
      setShowCreditsModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentJobStatus("uploading");

    try {
        const file = referenceImages[0];
        const basePrompt = "From the provided image of a person, perform the following tasks:\n1. Precisely identify and segment the following fashion item(s): ${itemList}.\n2. Isolate only the clothing item(s), removing the model and any other background elements completely.\n3. Return a single image containing ONLY the extracted fashion product(s) on a transparent or plain white background.\n4. Preserve all details: colors, textures, patterns, logos, and the exact shape of the garment(s).\n5. The result should look like a professional product catalog photo.";
        const prompt = optionalPrompt 
            ? `${basePrompt} Focus specifically on: ${optionalPrompt.trim()}.`
            : basePrompt;

        // 1. Upload Image
        const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', {
            method: 'POST'
        });

        await fetch(uploadInfo.upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': 'image/jpeg' }
        });

        await apiRequest('/api/generate/image/upload/check', {
            method: 'POST',
            body: JSON.stringify({ img_id: uploadInfo.id })
        });

        const { width, height } = await getImageDimensionsFromUrl(uploadInfo.url);

        // 2. Start Job
        const payload = {
            prompt,
            input_images: [{ type: "media_input", id: uploadInfo.id, url: uploadInfo.url, width, height }],
            aspect_ratio: aspectRatio,
            resolution: "2k",
            speed: speed
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>('/api/generate/image/nano-banana-pro/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        setCurrentJobStatus("pending");
        toast.info(`Đang tách quần áo... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
        if (genRes.credits_remaining !== undefined) {
             updateCredits(genRes.credits_remaining);
        }

        // 3. Status Polling
        const checkStatus = async () => {
            try {
                const statusRes = await apiRequest<{ status: string, result?: string, error_message?: string }>(`/api/jobs/${genRes.job_id}`);
                setCurrentJobStatus(statusRes.status);
                
                if (statusRes.status === 'completed' && statusRes.result) {
                    setResult({ image_url: statusRes.result, job_id: genRes.job_id, status: 'completed' });
                    setLoading(false);
                    toast.success('✅ Tách quần áo thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Tách quần áo thất bại.";
                    setError(errorMsg);
                    setLoading(false);
                    toast.error(errorMsg);
                } else {
                    setTimeout(checkStatus, 15000);
                }
            } catch (e: any) {
                setError(e.message);
                setLoading(false);
            }
        };

        setTimeout(checkStatus, 5000);
    } catch (e: any) {
        setError(e.message || "Lỗi khi xử lý");
        setLoading(false);
    }
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

          <div className="space-y-2">
            <label className="text-sm font-medium">
                Chỉ định sản phẩm (tùy chọn)
            </label>
            <input
                type="text"
                value={optionalPrompt}
                onChange={(e) => setOptionalPrompt(e.target.value)}
                placeholder="Ví dụ: áo thun, quần jean, váy, giày..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
                Để trống để AI tự động nhận diện quần áo chính
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>AI sẽ tự động nhận diện và tách quần áo chính trong ảnh ra nền trong suốt.</p>
          </div>

          {/* Collapsible Advanced Settings */}
          <div className="rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-pink-500/20 group">
              <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`w-full flex items-center justify-between p-4 transition-all duration-200 ${showSettings ? 'bg-muted/30' : 'bg-transparent hover:bg-muted/20'}`}
              >
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-pink-500/10 text-pink-500' : 'bg-muted text-muted-foreground group-hover:bg-pink-500/5 group-hover:text-pink-500'}`}>
                          <Settings className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                          <span className="block text-sm font-semibold text-foreground">Cấu hình nâng cao</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">Tỷ lệ & tốc độ</span>
                      </div>
                  </div>
                  {showSettings ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
              </button>
              
              {showSettings && (
                  <div className="p-4 space-y-6 border-t border-border/50 animate-in slide-in-from-top-2 duration-300 ease-out bg-muted/10">
                      {/* Aspect Ratio Selector */}
                      <AspectRatioSelector 
                          value={aspectRatio} 
                          onChange={setAspectRatio} 
                          options={['auto', '1:1', '16:9', '9:16', '4:3', '3:4']}
                      />
                      
                      {/* Speed Toggle */}
                      <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tốc độ xử lý</label>
                          <div className="flex bg-muted p-1 rounded-xl">
                              <button
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                                      speed === 'fast'
                                          ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                  }`}
                                  onClick={() => setSpeed('fast')}
                              >
                                  <Zap className="w-3.5 h-3.5" /> Nhanh
                              </button>
                              <button
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                                      speed === 'slow'
                                          ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                  }`}
                                  onClick={() => setSpeed('slow')}
                              >
                                  <Coins className="w-3.5 h-3.5" /> Tiết kiệm
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>Chi phí: {estimatedCost} credits</span>
                <span>Số dư: {balance}</span>
             </div>
             
             <Button
                onClick={handleGenerate}
                disabled={loading || referenceImages.length === 0 || balance < estimatedCost}
                className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                    balance < estimatedCost 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                        : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
                }`}
            >
                {loading ? "Đang xử lý..." : "Tách Quần Áo"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <div className="flex-1 relative h-full">
            <ResultPreview 
                loading={loading} 
                resultUrl={result?.image_url} 
                status={currentJobStatus}
                onRegenerate={handleGenerate}
                placeholderTitle="Kết quả tách"
                placeholderDesc="Quần áo được tách sẽ hiển thị trên nền trong suốt."
            />
         </div>
      </div>

      <InsufficientCreditsModal
            isOpen={showCreditsModal}
            onClose={() => setShowCreditsModal(false)}
            required={estimatedCost}
            available={balance}
        />
    </div>
  );
}
