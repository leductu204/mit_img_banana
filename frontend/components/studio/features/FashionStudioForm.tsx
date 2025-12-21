"use client"

import { Shirt, ArrowRight, AlertCircle } from "lucide-react";
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

export default function FashionStudioForm() {
  const [modelImages, setModelImages] = useState<File[]>([]);
  const [garmentImages, setGarmentImages] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  
  const toast = useToast();
  const { result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits } = useCredits();

  const estimatedCost = useMemo(() => {
    return estimateImageCost("nano-banana-pro", "auto", "2k", "slow");
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
    if (modelImages.length === 0 || garmentImages.length === 0) return;

    if (!hasEnoughCredits(estimatedCost)) {
      setShowCreditsModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentJobStatus("uploading");

    try {
        // 1. Upload both images
        const uploadModel = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' });
        await fetch(uploadModel.upload_url, { method: 'PUT', body: modelImages[0], headers: { 'Content-Type': 'image/jpeg' } });
        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadModel.id }) });
        const modelDim = await getImageDimensionsFromUrl(uploadModel.url);

        const uploadGarment = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' });
        await fetch(uploadGarment.upload_url, { method: 'PUT', body: garmentImages[0], headers: { 'Content-Type': 'image/jpeg' } });
        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadGarment.id }) });
        const garmentDim = await getImageDimensionsFromUrl(uploadGarment.url);

        // 2. Start Job
        const fullPrompt = `Fashion try-on: dressing the model with the garment. Instruction: ${prompt || "make it look natural and realistic"}. High-end fashion editorial style, professional lighting.`;

        const payload = {
            prompt: fullPrompt,
            input_images: [
                { type: "media_input", id: uploadModel.id, url: uploadModel.url, width: modelDim.width, height: modelDim.height, label: "model" },
                { type: "media_input", id: uploadGarment.id, url: uploadGarment.url, width: garmentDim.width, height: garmentDim.height, label: "garment" }
            ],
            aspect_ratio: "auto",
            resolution: "2k",
            speed: "slow"
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>('/api/generate/image/nano-banana-pro/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        setCurrentJobStatus("pending");
        toast.info(`Đang xử lý mặc thử... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
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
                    toast.success('✅ Mặc thử thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Xử lý thất bại.";
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
          title="Fashion Studio" 
          description="Mặc thử trang phục lên người mẫu AI"
          icon={Shirt}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setModelImages} 
                maxImages={1}
                label="Ảnh người mẫu"
            />
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-dashed border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">+ Thêm trang phục</span>
            </div>
          </div>

          <div className="space-y-2">
             <ImageUpload 
                onImagesSelected={setGarmentImages} 
                maxImages={1}
                label="Ảnh quần áo/váy"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mô tả cách mặc (Tùy chọn)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Sơ vin áo vào quần, để tay trong túi..."
              className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:ring-primary"
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
                disabled={loading || modelImages.length === 0 || garmentImages.length === 0 || balance < estimatedCost}
                className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                    balance < estimatedCost 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                        : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
                }`}
            >
                {loading ? "Đang xử lý..." : "Mặc Thử Ngay"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <ResultPreview 
            loading={loading} 
            resultUrl={result?.image_url} 
            status={currentJobStatus}
            onRegenerate={handleGenerate}
            placeholderTitle="Kết quả mặc thử"
            placeholderDesc="Người mẫu với trang phục mới sẽ hiển thị tại đây."
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
