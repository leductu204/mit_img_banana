"use client"

import { Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { apiRequest } from "@/lib/api";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";
import React, { useState, useMemo } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import BackgroundPresetGrid from "../shared/BackgroundPresetGrid";
import ResultPreview from "../shared/ResultPreview";

const BASE_FESTIVAL_PROMPT = "Place the person or object in this image into a Vietnamese festive atmosphere. The subject should remain perfectly preserved with clean edges. The background should be: ";
const BASE_FESTIVAL_SUFFIX = ". Professional high quality, photorealistic, 8k resolution.";

const FESTIVAL_PRESETS = [
    { 
        id: 'tet', 
        label: 'Tết Nguyên Đán', 
        image: 'https://images.unsplash.com/photo-1548690321-df68f230da3f?auto=format&fit=crop&w=150&q=80', 
        prompt: 'background vietnamese lunar new year tet festival, yellow mai flowers, red lanterns, traditional decorations, bright and festive',
        basePrompt: BASE_FESTIVAL_PROMPT 
    },
    { 
        id: '8-3', 
        label: '8/3 Quốc Tế Phụ Nữ', 
        image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=150&q=80', 
        prompt: 'background international womens day theme, elegant flowers, roses, soft pink and pastel background, celebratory and respectful atmosphere',
        basePrompt: BASE_FESTIVAL_PROMPT 
    },
    { 
        id: 'trungthu', 
        label: 'Rằm Trung Thu', 
        image: 'https://images.unsplash.com/photo-1513628253939-010e64ac66cd?auto=format&fit=crop&w=150&q=80', 
        prompt: 'background mid-autumn festival vietnam, colorful paper lanterns at night, glowing light, magical atmosphere, full moon',
        basePrompt: BASE_FESTIVAL_PROMPT 
    },
    { 
        id: 'xmas', 
        label: 'Giáng Sinh', 
        image: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=150&q=80', 
        prompt: 'background christmas atmosphere, pine tree with ornaments, snow, warm fireplace lights, cozy winter holiday vibe',
        basePrompt: BASE_FESTIVAL_PROMPT 
    }
];

export default function FestivalBackgroundsForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  
  const toast = useToast();
  const { result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits } = useCredits();

  const estimatedCost = useMemo(() => {
    return estimateImageCost("nano-banana-pro", "auto", "2k", "fast");
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
        const preset = FESTIVAL_PRESETS.find(p => p.id === selectedPresetId);
        if (!preset) return;

        const prompt = `${preset.basePrompt}${preset.prompt}${BASE_FESTIVAL_SUFFIX}`;

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
            speed: "fast"
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>('/api/generate/image/nano-banana-pro/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        setCurrentJobStatus("pending");
        toast.info(`Đang tạo ảnh lễ hội... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
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
                    toast.success('✅ Tạo ảnh lễ hội thành công!');
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
          title="Festival Backgrounds" 
          description="Khung hình lễ hội cho ảnh của bạn"
          icon={Sparkles}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh cần ghép"
            />
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium">Chọn chủ đề lễ hội</label>
              <BackgroundPresetGrid 
                presets={FESTIVAL_PRESETS} 
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
                {loading ? "Đang xử lý..." : "Tạo Ảnh Lễ Hội"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <ResultPreview 
            loading={loading} 
            resultUrl={result?.image_url} 
            status={currentJobStatus}
            onRegenerate={handleGenerate}
            placeholderTitle="Kết quả lễ hội"
            placeholderDesc="Ảnh với nền lễ hội sẽ hiển thị tại đây."
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
