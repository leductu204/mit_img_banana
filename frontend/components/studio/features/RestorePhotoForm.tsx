"use client"

import React, { useState, useMemo } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import BeforeAfterCompare from "../shared/BeforeAfterCompare";
import ResultPreview from "../shared/ResultPreview";
import { History, Wand2, Sparkles, Zap, Coins, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { apiRequest } from "@/lib/api";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";

import { useStudio } from "../StudioContext";

export default function RestorePhotoForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [speed, setSpeed] = useState<any>("fast");
  const [quality, setQuality] = useState("2k");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");
  
  const toast = useToast();
  const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits, costsLoaded, modelCosts } = useCredits();
  const { selectedHistoryJob } = useStudio();

  // Sync with Global History Selection
  React.useEffect(() => {
     if (selectedHistoryJob && selectedHistoryJob.output_url) {
         setResult({
             image_url: selectedHistoryJob.output_url,
             job_id: selectedHistoryJob.job_id,
             status: 'completed'
         });
         // If history job has prompt, we could set it but this form uses fixed prompt.
         // We might want to clear reference images or set them if we could retrieve original input.
         // For now just showing result is good.
     }
  }, [selectedHistoryJob]);


  const model = "nano-banana-pro";
  const aspectRatio = "auto";
  
  // ... existing code ...

  const estimatedCost = useMemo(() => {
    return estimateImageCost(model, aspectRatio, quality, speed);
  }, [model, aspectRatio, quality, speed, estimateImageCost]);

  const handleGenerate = async () => {
    // ... existing handleGenerate code ...
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
        const payload = {
            prompt: "CRITICAL TASK: Restore and colorize this old photograph.\n1. **Colorization**: This is the most important step. **Colorize the photo with natural, realistic colors.** The final image MUST be in full color, not black and white or sepia.\n2. **Damage Repair**: Fix all visible damage including scratches, tears, folds, stains, and any physical deterioration.\n3. **Detail Enhancement**: Sharpen details and enhance facial features.\n4. **Quality Improvement**: Increase resolution and overall image quality.\n5. **Natural Look**: Ensure the result looks like a professionally restored and colorized photograph.",
            input_images: inputImages,
            aspect_ratio: aspectRatio,
            resolution: quality,
            speed: speed,
            keep_style: true
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
                    toast.success('✅ Phục hồi ảnh thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Phục hồi thất bại.";
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
        const errorMsg = e.message || "Lỗi khi xử lý ảnh";
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto shrink-0">
        <FeatureHeader 
          title="Restore Old Photo" 
          description="Phục hồi ảnh cũ, mờ, xước"
          icon={History}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh cũ cần phục hồi"
            />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground flex gap-2">
            <Wand2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <p>AI sẽ tự động khử nhiễu, làm nét khuôn mặt và cân bằng màu sắc.</p>
          </div>

          {/* Quality Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Độ phân giải</label>
            <div className="grid grid-cols-3 gap-2">
                {['1k', '2k', '4k'].map((q) => (
                    <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                            quality === q 
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                                : 'bg-background hover:bg-muted border-border text-muted-foreground'
                        }`}
                    >
                        {q.toUpperCase()}
                    </button>
                ))}
            </div>
            {quality === '4k' && (
                <p className="text-[10px] text-pink-500 font-medium">
                    * 4K tiêu tốn nhiều credits hơn
                </p>
            )}
          </div>

           {/* Speed Selector */}
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
                        Restoring...
                    </>
                ) : (
                    <>
                        <History className="mr-2 h-4 w-4" />
                        Phục Hồi Ngay
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
         {result?.image_url && referenceImages.length > 0 ? (
             <div className="w-full h-full max-w-5xl max-h-[800px] bg-background/50 rounded-xl border border-border/50 shadow-sm overflow-hidden relative backdrop-blur-sm">
                 <BeforeAfterCompare 
                    beforeImage={URL.createObjectURL(referenceImages[0])}
                    afterImage={result.image_url}
                    className="w-full h-full"
                 />
             </div>
         ) : result?.image_url ? (
            // For history items
            <div className="w-full h-full max-w-5xl max-h-[800px] relative">
                <ResultPreview
                    loading={false}
                    resultUrl={result.image_url}
                    status="completed"
                    placeholderTitle="Kết quả phục hồi"
                    placeholderDesc=""
                    details={{
                        prompt: "Restore & Colorize Photo",
                        model,
                        aspectRatio,
                        resolution: quality
                    }}
                />
            </div>
         ): (
            <div className="flex-1 w-full h-full flex items-center justify-center p-8 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-3 opacity-50">
                    <History className="w-12 h-12" />
                    <p>Tải ảnh lên để thấy phép màu</p>
                </div>
            </div>
         )}
      </div>
    </div>
  );
}
