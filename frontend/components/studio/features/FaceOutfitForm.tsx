"use client"

import { Shirt, AlertCircle } from "lucide-react";
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

export default function FaceOutfitForm() {
  const [modelImages, setModelImages] = useState<File[]>([]);
  const [garmentImages, setGarmentImages] = useState<File[]>([]);
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
        // 1. Upload face and garment
        const uploadFace = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' });
        await fetch(uploadFace.upload_url, { method: 'PUT', body: modelImages[0], headers: { 'Content-Type': 'image/jpeg' } });
        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadFace.id }) });
        const faceDim = await getImageDimensionsFromUrl(uploadFace.url);

        const uploadGarment = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' });
        await fetch(uploadGarment.upload_url, { method: 'PUT', body: garmentImages[0], headers: { 'Content-Type': 'image/jpeg' } });
        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadGarment.id }) });
        const garmentDim = await getImageDimensionsFromUrl(uploadGarment.url);

        // 2. Start Job
        const payload = {
            prompt: "Face + Outfit studio: generate 3 poses of a model using this face and wearing this outfit. Professional studio photography, high-end editorial style.",
            input_images: [
                { type: "media_input", id: uploadFace.id, url: uploadFace.url, width: faceDim.width, height: faceDim.height, label: "face" },
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
        toast.info(`Đang tạo bộ ảnh mẫu... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
        if (genRes.credits_remaining !== undefined) {
             updateCredits(genRes.credits_remaining);
        }

        // 3. Status Polling
        const checkStatus = async () => {
            try {
                const statusRes = await apiRequest<{ status: string, result?: string, error_message?: string }>(`/api/jobs/${genRes.job_id}`);
                setCurrentJobStatus(statusRes.status);
                
                if (statusRes.status === 'completed' && statusRes.result) {
                    setResult({ image_url: statusRes.result, job_id: genRes.job_id, status: 'completed' }); // In reality this might be multiple images
                    setLoading(false);
                    toast.success('✅ Tạo bộ ảnh thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Tạo ảnh thất bại.";
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
          title="Face + Outfit (3 poses)" 
          description="Tạo bộ ảnh người mẫu với 3 dáng khác nhau"
          icon={Shirt}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setModelImages} 
                maxImages={1}
                label="Ảnh khuôn mặt người mẫu"
            />
          </div>

          <div className="space-y-2">
             <ImageUpload 
                onImagesSelected={setGarmentImages} 
                maxImages={1}
                label="Ảnh trang phục"
            />
          </div>
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
                {loading ? "Đang xử lý..." : "Tạo 3 Dáng"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <ResultPreview 
            loading={loading} 
            resultUrl={result?.image_url} 
            status={currentJobStatus}
            onRegenerate={handleGenerate}
            placeholderTitle="Bộ sưu tập mẫu"
            placeholderDesc="3 hình ảnh với các dáng chụp khác nhau sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
