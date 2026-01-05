"use client"

import React, { useState, useMemo } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import BeforeAfterCompare from "../shared/BeforeAfterCompare";
import ResultPreview from "../shared/ResultPreview";
import { History, Wand2, Sparkles, Zap, Coins, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { apiRequest } from "@/lib/api";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";

import { useStudio } from "../StudioContext";

export default function RestorePhotoForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [speed, setSpeed] = useState<any>("slow");
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
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto shrink-0 bg-[#1A1F2E]">
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

          <div className="p-4 bg-[#1F2833] border border-white/10 rounded-xl text-sm text-[#94A3B8] flex gap-2">
            <Wand2 className="w-4 h-4 shrink-0 mt-0.5 text-[#00BCD4]" />
            <p>AI sẽ tự động khử nhiễu, làm nét khuôn mặt và cân bằng màu sắc.</p>
          </div>

          {/* Quality Selector */}
          <div className="space-y-4">
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Độ phân giải</label>
            <div className="grid grid-cols-3 gap-2 bg-black/20 p-1 rounded-xl">
                {['1k', '2k', '4k'].map((q) => (
                    <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                            quality === q 
                                ? 'bg-[#00BCD4]/20 text-[#00BCD4] shadow-sm' 
                                : 'text-[#B0B8C4] hover:text-white hover:bg-white/5'
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
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Tốc độ xử lý</label>
              <div className="flex bg-black/20 p-1 rounded-xl">
                  <button
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                          speed === 'fast'
                              ? 'bg-[#00BCD4]/20 text-[#00BCD4] shadow-sm'
                              : 'text-[#B0B8C4] hover:text-white hover:bg-white/5'
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
                                  ? 'bg-green-500/20 text-green-400 shadow-sm'
                                  : 'text-[#B0B8C4] hover:text-white hover:bg-white/5'
                          }`}
                          onClick={() => setSpeed('slow')}
                      >
                          <Coins className="w-3.5 h-3.5" /> Tiết kiệm
                      </button>
                  )}
              </div>
          </div>
          
           {error && (
            <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-xl flex items-start gap-2 border border-red-500/20">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-white/10">
             <div className="flex items-center justify-between text-xs text-[#6B7280] mb-3">
                <span>Chi phí: {estimatedCost} credits</span>
                <span>Số dư: {balance}</span>
             </div>
             
             <button
                onClick={handleGenerate}
                disabled={loading || referenceImages.length === 0 || balance < estimatedCost}
                className={`w-full h-12 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                    balance < estimatedCost 
                        ? 'bg-[#6B7280]/50 cursor-not-allowed text-[#B0B8C4]' 
                        : 'bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-[0_0_15px_rgba(0,188,212,0.3)]'
                }`}
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        Restoring...
                    </>
                ) : (
                    <>
                        <History className="mr-2 h-4 w-4" />
                        Phục Hồi Ngay
                    </>
                )}
            </button>
        </div>

        <InsufficientCreditsModal
            isOpen={showCreditsModal}
            onClose={() => setShowCreditsModal(false)}
            required={estimatedCost}
            available={balance}
        />
      </div>

      <div className="flex-1 bg-[#0A0E13] p-4 lg:p-8 overflow-hidden flex flex-col items-center justify-center">
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
