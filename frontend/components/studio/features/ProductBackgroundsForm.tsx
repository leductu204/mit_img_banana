"use client"

import React, { useState, useMemo } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import BackgroundPresetGrid from "../shared/BackgroundPresetGrid";
import { Layers, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { apiRequest } from "@/lib/api";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";

// Simplified prompt that won't clutter UI when displayed
const BASE_BG_PROMPT = "Change background to: ";
const BASE_BG_SUFFIX = ". Product unchanged, professional integration.";

const BG_PRESETS = [
    { 
        id: 'cozy-indoor', 
        label: 'Ánh Sáng Ấm Áp', 
        image: 'https://images.unsplash.com/photo-1615876234886-fd9a39fda97f?auto=format&fit=crop&w=150&q=80', 
        prompt: 'cozy minimalist indoor background with dark wooden floor and warm sunlight streaming softly through white sheer curtains, casting gentle shadows on the ground. Add subtle decorative elements such as a small green plant leaf, a minimal potted plant, a closed book or magazine, or a small vintage camera placed near the edges of the frame. Keep the scene clean, elegant, and uncluttered. Soft cinematic daylight, warm tone, Korean aesthetic, premium TikTok shop product photography style', 
        basePrompt: BASE_BG_PROMPT 
    },
    { 
        id: 'fur-rug', 
        label: 'Thảm Lông Mềm', 
        image: 'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?auto=format&fit=crop&w=150&q=80', 
        prompt: 'cozy minimalist indoor background featuring a soft fluffy light-grey fur rug placed on a warm wooden floor. Soft natural sunlight comes through white sheer curtains, creating gentle warm shadows across the scene. Add subtle decor elements such as a small green plant leaf, a vintage film camera, or a minimal book positioned near the edges of the frame, without touching the product area. Warm daylight, clean composition, Korean aesthetic, TikTok fashion product style', 
        basePrompt: BASE_BG_PROMPT 
    },
    { 
        id: 'top-down-45', 
        label: 'Góc 45° Trên Xuống', 
        image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=150&q=80', 
        prompt: 'close-up minimalist product photography background with product lying flat neatly on a cool light grey floor, placed near soft white curtains with natural daylight coming from the side. Add subtle decorative elements such as a small green plant leaf, a vintage camera, or an open book positioned tastefully around the frame, without touching the product. Soft cinematic lighting with gentle shadows to highlight texture. Shot from a 45-degree top-down angle, balanced modern composition, clean aesthetic, shallow depth of field, high-resolution TikTok shop style', 
        basePrompt: BASE_BG_PROMPT 
    },
    { 
        id: '4k-minimal', 
        label: '4K Tối Giản', 
        image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=150&q=80', 
        prompt: '4K quality minimalist product photography background with product lying flat neatly on a cool light grey surface, near a white curtain with soft daylight coming from the side. The lighting creates gentle shadows to highlight texture. Shot from a 45-degree top-down angle, balanced composition, cinematic soft light, shallow depth of field, clean aesthetic, high-resolution TikTok shop style', 
        basePrompt: BASE_BG_PROMPT 
    },
    { 
        id: '4k-closeup', 
        label: '4K Cận Cảnh', 
        image: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=150&q=80', 
        prompt: '4K quality close-up minimalist product photography background with product lying flat neatly on a cool light grey surface, near a white curtain with soft daylight coming from the side. The lighting creates gentle shadows to highlight texture. Shot from a 45-degree top-down angle, balanced composition, cinematic soft light, shallow depth of field, clean aesthetic, high-resolution TikTok shop style', 
        basePrompt: BASE_BG_PROMPT 
    },
    { 
        id: 'walnut-floor', 
        label: 'Sàn Gỗ Óc Chó', 
        image: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?auto=format&fit=crop&w=150&q=80', 
        prompt: '4K minimalist flat lay background on a dark walnut wooden floor, sunlight softly filtering through sheer curtains, creating dramatic yet elegant light streaks. Warm shadows highlight texture. Balanced framing, cinematic studio feel, luxury TikTok aesthetic', 
        basePrompt: BASE_BG_PROMPT 
    },
    { 
        id: 'striped-shadows', 
        label: 'Bóng Sọc Venetian', 
        image: 'https://images.unsplash.com/photo-1604342888169-ff159f6d2a0e?auto=format&fit=crop&w=150&q=80', 
        prompt: '4K cinematic flat lay background on a cool neutral floor, with striped sunlight shadows from blinds falling across the scene. The dynamic shadow pattern adds visual interest while preserving minimalist balance and premium texture detail', 
        basePrompt: BASE_BG_PROMPT 
    },
    { 
        id: 'cream-soft', 
        label: 'Nền Kem Mềm Mại', 
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80', 
        prompt: '4K flat lay background on a smooth cream surface with soft diffused daylight. Gentle tonal contrast emphasizes texture depth. Balanced centered framing, shallow depth of field, minimalist premium editorial mood', 
        basePrompt: BASE_BG_PROMPT 
    },
];

export default function ProductBackgroundsForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [backgroundImages, setBackgroundImages] = useState<File[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [customBackground, setCustomBackground] = useState<string>("");
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
    if (referenceImages.length === 0) return;
    if (!selectedPresetId && !customBackground.trim() && backgroundImages.length === 0) return;

    if (!hasEnoughCredits(estimatedCost)) {
      setShowCreditsModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentJobStatus("uploading");

    try {
        const file = referenceImages[0];
        const preset = BG_PRESETS.find(p => p.id === selectedPresetId);
        
        // Determine prompt: custom text > preset > background image
        let prompt = "";
        if (customBackground.trim()) {
            prompt = `${BASE_BG_PROMPT}${customBackground.trim()}${BASE_BG_SUFFIX}`;
        } else if (preset) {
            prompt = `${preset.basePrompt}${preset.prompt}${BASE_BG_SUFFIX}`;
        } else if (backgroundImages.length > 0) {
            prompt = `${BASE_BG_PROMPT}match the style and environment of the provided reference background image${BASE_BG_SUFFIX}`;
        } else {
            return;
        }

        // 1. Upload Product Image
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

        // 2. Upload Background Image (if provided)
        const inputImages: any[] = [{ type: "media_input", id: uploadInfo.id, url: uploadInfo.url, width, height }];
        
        if (backgroundImages.length > 0) {
            const bgFile = backgroundImages[0];
            const bgUploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', {
                method: 'POST'
            });

            const bgUploadResponse = await fetch(bgUploadInfo.upload_url, {
                method: 'PUT',
                body: bgFile,
                headers: { 'Content-Type': 'image/jpeg' }
            });

            if (!bgUploadResponse.ok) throw new Error(`Background upload failed: ${bgUploadResponse.statusText}`);

            await apiRequest('/api/generate/image/upload/check', {
                method: 'POST',
                body: JSON.stringify({ img_id: bgUploadInfo.id })
            });

            const bgDimensions = await getImageDimensionsFromUrl(bgUploadInfo.url);
            inputImages.push({ 
                type: "media_input", 
                id: bgUploadInfo.id, 
                url: bgUploadInfo.url, 
                width: bgDimensions.width, 
                height: bgDimensions.height,
                label: "background"
            });
        }

        // 3. Start Job
        const payload = {
            prompt,
            input_images: inputImages,
            aspect_ratio: "auto",
            resolution: "2k",
            speed: "fast"
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>('/api/generate/image/nano-banana-pro/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        setCurrentJobStatus("pending");
        toast.info(`Đang thay background... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
        if (genRes.credits_remaining !== undefined) {
             updateCredits(genRes.credits_remaining);
        }

        // 4. Status Polling
        const checkStatus = async () => {
            try {
                const statusRes = await apiRequest<{ status: string, result?: string, error_message?: string }>(`/api/jobs/${genRes.job_id}`);
                setCurrentJobStatus(statusRes.status);
                
                if (statusRes.status === 'completed' && statusRes.result) {
                    setResult({ image_url: statusRes.result, job_id: genRes.job_id, status: 'completed' });
                    setLoading(false);
                    toast.success('✅ Thay nền thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Thay nền thất bại. Credits đã được hoàn lại";
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
          title="Product Backgrounds" 
          description="Đổi nền sản phẩm chuyên nghiệp"
          icon={Layers}
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

          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setBackgroundImages} 
                maxImages={1}
                label="Ảnh nền mẫu (tùy chọn)"
            />
            <p className="text-xs text-muted-foreground">
                Tải lên ảnh nền mẫu hoặc chọn bối cảnh đề xuất bên dưới
            </p>
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium">Bối cảnh đề xuất</label>
             <BackgroundPresetGrid 
                presets={BG_PRESETS} 
                selectedId={selectedPresetId} 
                onSelect={setSelectedPresetId} 
             />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
                Hoặc mô tả nền tùy chỉnh (tùy chọn)
            </label>
            <textarea
                value={customBackground}
                onChange={(e) => setCustomBackground(e.target.value)}
                placeholder="Ví dụ: bầu trời hoàng hôn, phòng khách sang trọng, công viên xanh mát..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
            />
            <p className="text-xs text-muted-foreground">
                Mô tả nền bạn muốn thay thế
            </p>
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
                disabled={loading || referenceImages.length === 0 || (!selectedPresetId && !customBackground.trim() && backgroundImages.length === 0) || balance < estimatedCost}
                className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                    balance < estimatedCost 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                        : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
                }`}
            >
                {loading ? "Đang xử lý..." : "Thay Đổi Nền"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <ResultPreview 
            loading={loading} 
            resultUrl={result?.image_url} 
            status={currentJobStatus}
            onRegenerate={handleGenerate}
            placeholderTitle="Kết quả thay background"
            placeholderDesc="Sản phẩm với nền mới sẽ hiển thị tại đây."
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
