"use client"

import React, { useState, useMemo } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import BeforeAfterCompare from "../shared/BeforeAfterCompare";
import ResultPreview from "../shared/ResultPreview";
import { Maximize, AlertCircle, Sparkles, Zap, Coins } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { apiRequest } from "@/lib/api";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";
import { useStudio } from "../StudioContext";

export default function UpscaleImageForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [scale, setScale] = useState("2"); // 2 stands for 2k, 4 for 4k
  const [speed, setSpeed] = useState<any>("slow");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");
  
  const toast = useToast();
  const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits, costsLoaded, modelCosts } = useCredits();
  const { selectedHistoryJob } = useStudio();

  // History Selection Integration
  React.useEffect(() => {
    if (selectedHistoryJob && selectedHistoryJob.output_url) {
        setResult({
            image_url: selectedHistoryJob.output_url,
            job_id: selectedHistoryJob.job_id,
            status: 'completed'
        });
        
        // Populate scale if possible? Job might have resolution.
        // But for now mainly showing the result is key.
    }
  }, [selectedHistoryJob, setResult]);

  // Configuration
  const model = "nano-banana-pro";
  const aspectRatio = "auto";

  const estimatedCost = useMemo(() => {
    // Basic estimate, might vary by resolution mapping
    return estimateImageCost(model, aspectRatio, scale === '4' ? '4k' : '2k', speed);
  }, [model, aspectRatio, scale, speed, estimateImageCost]);

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
        // 1. Upload Image
        const file = referenceImages[0];
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

        // Get dimensions
        const img = new Image();
        img.src = uploadInfo.url;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const inputImages = [{
            type: "media_input",
            id: uploadInfo.id,
            url: uploadInfo.url,
            width: img.width,
            height: img.height
        }];

        setCurrentJobStatus("starting");

        // 2. Generate
        const endpoint = `/api/generate/image/${model}/generate`;
        // ... rest of logic
        // (Just replacing the top part to inject hooks use)
        const payload = {
            prompt: "Upscale this image to a higher resolution. Enhance the details, sharpen the focus, and improve the overall quality without adding artifacts. Make it look like a high-resolution photograph", // Implicit prompt for upscaler
            input_images: inputImages,
            aspect_ratio: aspectRatio,
            resolution: scale === '4' ? '4k' : '2k',
            speed: speed
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (genRes.credits_remaining !== undefined) {
            updateCredits(genRes.credits_remaining);
        }

        // 3. Poll
        const checkStatus = async () => {
            try {
                const statusRes = await apiRequest<{ status: string, result?: string, error_message?: string }>(`/api/jobs/${genRes.job_id}`);
                setCurrentJobStatus(statusRes.status);
                
                if (statusRes.status === 'completed' && statusRes.result) {
                    setResult({ image_url: statusRes.result, job_id: genRes.job_id, status: 'completed' });
                    setLoading(false);
                    toast.success('✅ Nâng cấp ảnh thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Nâng cấp thất bại.";
                    setError(errorMsg);
                    setLoading(false);
                    toast.error(errorMsg);
                } else {
                    setTimeout(checkStatus, 3000);
                }
            } catch (e: any) {
                setError(`Check status failed: ${e.message}`);
                setLoading(false);
            }
        };
        setTimeout(checkStatus, 2000);

    } catch (e: any) {
        console.error(e);
        const errorMsg = e.message || "Lỗi khi nâng cấp ảnh";
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Upscale Image" 
          description="Nâng cấp độ phân giải ảnh sắc nét hơn"
          icon={Maximize}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh gốc"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Độ phân giải mục tiêu</label>
            <div className="grid grid-cols-2 gap-2">
                {['2', '4'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setScale(s)}
                        className={`py-2 px-4 rounded-md border text-sm font-medium transition-all ${
                            scale === s 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-background hover:bg-muted border-input'
                        }`}
                    >
                        {s}K
                    </button>
                ))}
            </div>
            {scale === '4' && (
                <p className="text-xs text-muted-foreground mt-1 text-pink-500">
                    * 4K tiêu tốn nhiều credits hơn
                </p>
            )}
          </div>

          <div className="space-y-2">
              <label className="text-sm font-medium">Tốc độ xử lý</label>
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
                  {/* Only show Slow mode if enabled for model */}
                  {(costsLoaded && (!modelCosts[model] || modelCosts[model].is_slow_mode_enabled !== 0)) && (
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
                  )}
              </div>
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
                {loading ? (
                    <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" /> 
                        Đang xử lý...
                    </>
                ) : (
                    <>
                        <Maximize className="mr-2 h-4 w-4" />
                        Nâng Cấp Ảnh
                    </>
                )}
            </Button>
        </div>

        <InsufficientCreditsModal
            isOpen={showCreditsModal}
            onClose={() => setShowCreditsModal(false)}
            required={estimatedCost}
            available={balance}
        />
      </div>

      <div className="flex-1 bg-muted/10 p-4 lg:p-8 overflow-hidden flex flex-col items-center justify-center">
         <div className="w-full h-full max-w-5xl max-h-[800px] relative">
             <ResultPreview
                loading={loading}
                resultUrl={result?.image_url}
                status={currentJobStatus}
                type={result?.image_url && referenceImages.length > 0 ? "custom" : "image"}
                placeholderTitle="Kết quả nâng cấp"
                placeholderDesc="Tải ảnh lên và chọn độ phân giải để xem kết quả"
                onRegenerate={handleGenerate}
                details={{
                    prompt: `Nâng cấp ảnh lên chất lượng ${scale === '4' ? '4K' : '2K'}`,
                    model,
                    aspectRatio,
                    resolution: scale === '4' ? '4k' : '2k'
                }}
             >
                 {result?.image_url && referenceImages.length > 0 && !loading && (
                     <BeforeAfterCompare 
                        beforeImage={URL.createObjectURL(referenceImages[0])}
                        afterImage={result.image_url}
                     />
                 )}
             </ResultPreview>
         </div>
      </div>
    </div>
  );
}
