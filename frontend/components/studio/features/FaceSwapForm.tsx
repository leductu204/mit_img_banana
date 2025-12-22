"use client"

import { User, ArrowRight, AlertCircle } from "lucide-react";
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

export default function FaceSwapForm() {
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  const [targetImages, setTargetImages] = useState<File[]>([]);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  
  const toast = useToast();
  const { result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits } = useCredits();

  const estimatedCost = useMemo(() => {
    return estimateImageCost("nano-banana-pro", "auto", "2k", "fast");
  }, [estimateImageCost]);

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
    if (sourceImages.length === 0 || targetImages.length === 0) return;

    if (!hasEnoughCredits(estimatedCost)) {
      setShowCreditsModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentJobStatus("uploading");

    try {
        // 1. Upload source and target
        const uploadSource = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' });
        await fetch(uploadSource.upload_url, { method: 'PUT', body: sourceImages[0], headers: { 'Content-Type': 'image/jpeg' } });
        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadSource.id }) });
        const sourceDim = await getImageDimensionsFromUrl(uploadSource.url);

        const uploadTarget = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' });
        await fetch(uploadTarget.upload_url, { method: 'PUT', body: targetImages[0], headers: { 'Content-Type': 'image/jpeg' } });
        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadTarget.id }) });
        const targetDim = await getImageDimensionsFromUrl(uploadTarget.url);

        // 2. Start Job
        const payload = {
            prompt: "You are an expert high-end photo retoucher.\n\n**INPUTS:**\n1. Reference Image: A model wearing an outfit.\n2. Face Image: A close-up of a face.\n\n**TASK:** \nReplace the face of the model in the Reference Image with the face from the Face Image.\n\n**STRICT CONSTRAINTS (IMMUTABLE):**\n1. FACE REPLACEMENT: Use the face from Face Image EXACTLY\n   - Facial features, structure, skin tone must match Face Image\n   - Expression and angle should adapt to Reference Image's pose\n2. PRESERVE BODY: Keep the model's body, pose, outfit from Reference Image\n3. PRESERVE BACKGROUND: Keep the background and scene from Reference Image unchanged\n4. NATURAL INTEGRATION:\n   - Seamless blending at face-neck boundary\n   - Match lighting direction and color temperature\n   - Adjust skin tone transition naturally\n   - Maintain proper shadows and highlights\n\n**OUTPUT:**\n- Aspect Ratio: ${aspectRatio}\n- Quality: Professional retouching quality\n- Natural Result: Should look like the person from Face Image naturally posed in that scene\n\n**CRITICAL:** The result must be photorealistic and indistinguishable from a real photograph.",
            input_images: [
                { type: "media_input", id: uploadSource.id, url: uploadSource.url, width: sourceDim.width, height: sourceDim.height, label: "source" },
                { type: "media_input", id: uploadTarget.id, url: uploadTarget.url, width: targetDim.width, height: targetDim.height, label: "target" }
            ],
            aspect_ratio: "auto",
            resolution: "2k",
            speed: "fast"
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>('/api/generate/image/nano-banana-pro/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        setCurrentJobStatus("pending");
        toast.info(`Đang hoán đổi khuôn mặt... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
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
                    toast.success('✅ Hoán đổi khuôn mặt thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Hoán đổi thất bại.";
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
          title="Face Swap" 
          description="Ghép khuôn mặt vào hình ảnh khác"
          icon={User}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setSourceImages} 
                maxImages={1}
                label="Ảnh chứa khuôn mặt (Source)"
            />
          </div>

          <div className="flex justify-center text-muted-foreground">
             <ArrowRight className="w-6 h-6 rotate-90 lg:rotate-0" />
          </div>

          <div className="space-y-2">
             <ImageUpload 
                onImagesSelected={setTargetImages} 
                maxImages={1}
                label="Ảnh đích (Target)"
            />
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
                disabled={loading || sourceImages.length === 0 || targetImages.length === 0 || balance < estimatedCost}
                className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                    balance < estimatedCost 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                        : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
                }`}
            >
                {loading ? "Đang xử lý..." : "Hoán Đổi"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <ResultPreview 
            loading={loading} 
            resultUrl={result?.image_url} 
            status={currentJobStatus}
            onRegenerate={handleGenerate}
            placeholderTitle="Kết quả Face Swap"
            placeholderDesc="Ảnh sau khi ghép mặt sẽ hiển thị tại đây."
         />
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
