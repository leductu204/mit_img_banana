"use client"

import React, { useState, useMemo } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import BackgroundPresetGrid from "../shared/BackgroundPresetGrid";
import { ShoppingBag, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { apiRequest } from "@/lib/api";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";

const BASE_ECOM_PROMPT = "Place this product in a professional e-commerce setting. The subject should remain perfectly preserved with clean edges. The background should be: ";
const BASE_ECOM_SUFFIX = ". Professional studio lighting, sharp focus, high quality.";

const ECOM_PRESETS = [
    { id: 'podium', label: 'Bục trưng bày', image: 'https://images.unsplash.com/photo-1616401784845-180882ba9cb8?auto=format&fit=crop&w=150&q=80', prompt: 'product on a minimalist podium, studio lighting', basePrompt: BASE_ECOM_PROMPT },
    { id: 'bathroom', label: 'Phòng tắm', image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=150&q=80', prompt: 'product in a modern bathroom setting, near sink, bright', basePrompt: BASE_ECOM_PROMPT },
    { id: 'kitchen', label: 'Phòng bếp', image: 'https://images.unsplash.com/photo-1556910638-6cd530ae6110?auto=format&fit=crop&w=150&q=80', prompt: 'product on wooden kitchen counter, blurred background', basePrompt: BASE_ECOM_PROMPT },
    { id: 'nature', label: 'Thiên nhiên', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=150&q=80', prompt: 'product on a rock in nature, sunlight, moss', basePrompt: BASE_ECOM_PROMPT },
    { id: 'pastel', label: 'Màu Pastel', image: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=150&q=80', prompt: 'minimalist pastel color background, soft shadows', basePrompt: BASE_ECOM_PROMPT },
    { id: 'silk', label: 'Lụa mềm', image: 'https://images.unsplash.com/photo-1528696892704-5e11528bca0b?auto=format&fit=crop&w=150&q=80', prompt: 'product on elegant silk fabric, luxury feel', basePrompt: BASE_ECOM_PROMPT },
];

export default function EcommercePhotoForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  
  const toast = useToast();
  const { result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits } = useCredits();

  const estimatedCost = useMemo(() => {
    return estimateImageCost("nano-banana-pro", "auto", "2k", "slow");
  }, [estimateImageCost]);

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
    if (referenceImages.length === 0 || !selectedPresetId) return;

    if (!hasEnoughCredits(estimatedCost)) {
      setShowCreditsModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentJobStatus("uploading");

    try {
        const file = referenceImages[0];
        const preset = ECOM_PRESETS.find(p => p.id === selectedPresetId);
        if (!preset) return;

        const prompt = `${preset.basePrompt}${preset.prompt}${BASE_ECOM_SUFFIX}`;

        // 1. Upload Image
        const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', {
            method: 'POST'
        });

        const uploadResponse = await fetch(uploadInfo.upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': 'image/jpeg' }
        });

        if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.statusText}`);

        await apiRequest('/api/generate/image/upload/check', {
            method: 'POST',
            body: JSON.stringify({ img_id: uploadInfo.id })
        });

        const { width, height } = await getImageDimensionsFromUrl(uploadInfo.url);

        // 2. Start Job
        const payload = {
            prompt,
            input_images: [{ type: "media_input", id: uploadInfo.id, url: uploadInfo.url, width, height }],
            aspect_ratio: "auto",
            resolution: "2k",
            speed: "slow"
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>('/api/generate/image/nano-banana-pro/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        setCurrentJobStatus("pending");
        toast.info(`Đang tạo ảnh TMĐT... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
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
                    toast.success('✅ Tạo ảnh TMĐT thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Tạo ảnh thất bại. Credits đã được hoàn lại";
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
          title="E-commerce Photo" 
          description="Ảnh sản phẩm tối ưu cho sàn TMĐT (Shopee, TikTok)"
          icon={ShoppingBag}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh sản phẩm"
            />
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium">Bối cảnh đề xuất</label>
             <BackgroundPresetGrid 
                presets={ECOM_PRESETS} 
                selectedId={selectedPresetId} 
                onSelect={setSelectedPresetId} 
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
                disabled={loading || referenceImages.length === 0 || !selectedPresetId || balance < estimatedCost}
                className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                    balance < estimatedCost 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                        : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
                }`}
            >
                {loading ? "Đang xử lý..." : "Tạo Ảnh TMĐT"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <ResultPreview 
            loading={loading} 
            resultUrl={result?.image_url} 
            status={currentJobStatus}
            onRegenerate={handleGenerate}
            placeholderTitle="Kết quả TMĐT"
            placeholderDesc="Ảnh sản phẩm thương mại sẽ hiển thị tại đây."
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
