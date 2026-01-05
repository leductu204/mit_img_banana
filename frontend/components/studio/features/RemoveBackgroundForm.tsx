"use client"

import React, { useState, useMemo } from "react";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/useToast";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ResultPreview from "../shared/ResultPreview";
import ImageUpload from "@/components/generators/ImageUpload";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";
import AspectRatioSelector from "@/components/generators/AspectRatioSelector";
import { Eraser, AlertCircle, Settings, ChevronUp, ChevronDown, Zap, Coins, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { NEXT_PUBLIC_API } from "@/lib/config";
import { getAuthHeader } from "@/lib/auth";

export default function RemoveBackgroundForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [speed, setSpeed] = useState<"fast" | "slow">("fast");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");

  const { result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits } = useCredits();
  const toast = useToast();

  const estimatedCost = useMemo(() => {
    return estimateImageCost("nano-banana-pro", aspectRatio, "2k", speed);
  }, [aspectRatio, speed, estimateImageCost]);

  // Helper to get image dimensions from URL
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
        const prompt = "Remove the background of this image completely. The final image should have a transparent background. Isolate the main subject perfectly with clean edges.";

        // 1. Upload Image
        const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', {
            method: 'POST'
        });

        const uploadResponse = await fetch(uploadInfo.upload_url, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': 'image/jpeg'
            }
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        await apiRequest('/api/generate/image/upload/check', {
            method: 'POST',
            body: JSON.stringify({ img_id: uploadInfo.id })
        });

        const { width, height } = await getImageDimensionsFromUrl(uploadInfo.url);

        // 2. Start Job
        const payload = {
            prompt,
            input_images: [{
                type: "media_input",
                id: uploadInfo.id,
                url: uploadInfo.url,
                width,
                height
            }],
            aspect_ratio: aspectRatio,
            resolution: "2k",
            speed: speed
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>('/api/generate/image/nano-banana-pro/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        setCurrentJobStatus("pending");
        toast.info(`Đang xử lý tách nền... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);

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
                    toast.success('✅ Tách nền thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Tách nền thất bại. Credits đã được hoàn lại";
                    setError(errorMsg);
                    setLoading(false);
                    toast.error(errorMsg);
                } else {
                    setTimeout(checkStatus, 15000); // Poll every 15s for Studio features
                }
            } catch (e: any) {
                const errorMsg = e.message || "Lỗi khi kiểm tra trạng thái";
                setError(errorMsg);
                setLoading(false);
                toast.error(errorMsg);
            }
        };

        // Start checking status
        setTimeout(checkStatus, 5000); // Initial delay 5s

    } catch (e: any) {
        const errorMsg = e.message || "Lỗi khi tách nền";
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto bg-[#1A1F2E]">
        <FeatureHeader 
          title="Remove Background" 
          description="Tách nền tự động trong vài giây"
          icon={Eraser}
          badge="Free"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh cần tách nền"
            />
          </div>

          <div className="p-4 bg-[#1F2833] border border-white/10 rounded-xl text-sm text-[#94A3B8]">
            <p className="flex items-center gap-2">
                <span className="text-[#00BCD4]">💡</span>
                Mẹo: Chọn ảnh có chủ thể rõ ràng để có kết quả tốt nhất.
            </p>
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
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 
                        Đang xử lý...
                    </>
                ) : "Tách Nền Ngay"}
            </button>
        </div>

        <InsufficientCreditsModal
            isOpen={showCreditsModal}
            onClose={() => setShowCreditsModal(false)}
            required={estimatedCost}
            available={balance}
        />
      </div>

      <div className="flex-1 bg-[#0A0E13] p-6 lg:p-10 overflow-hidden flex flex-col">
         {/* Transparency Grid Background for Result */}
         <div className="flex-1 relative">
            <ResultPreview 
                loading={loading} 
                resultUrl={result?.image_url} 
                status={currentJobStatus}
                onRegenerate={handleGenerate}
                placeholderTitle="Kết quả tách nền"
                placeholderDesc="Ảnh sau khi tách nền sẽ hiển thị tại đây."
            />
         </div>
      </div>
    </div>
  );
}
