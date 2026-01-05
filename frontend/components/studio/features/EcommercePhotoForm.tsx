"use client"

import React, { useState, useMemo } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ImageUpload from "@/components/generators/ImageUpload";
import ResultPreview from "../shared/ResultPreview";
import BackgroundPresetGrid from "../shared/BackgroundPresetGrid";
import { ShoppingBag, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { apiRequest } from "@/lib/api";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";

const BASE_ECOM_PROMPT = "CRITICAL TASK: Generate a professional, fully isolated product image suitable for high-end e-commerce catalogs.\n\n**INPUT:**\n- Reference Image: An image containing a model wearing the product.\n\n**PRIMARY OBJECTIVE:**\nExtract and reconstruct the clothing product so that it appears as a standalone studio product photograph, with no visual connection to the original model image.\n\n**CORE TASKS (STRICT & IMMUTABLE):**\n1. PRODUCT EXTRACTION:\n   - Precisely isolate ONLY the clothing product from the model\n   - Remove the model entirely (body, face, hands, limbs, hair)\n\n2. COMPLETE REMOVAL:\n   - Fully eliminate all background elements\n   - No remnants, shadows, silhouettes, or artifacts from the model or original scene\n\n3. PRODUCT RECONSTRUCTION:\n   - If any parts of the product are occluded or hidden, reconstruct them accurately using:\n     • Visible sections of the garment\n     • Symmetry and typical garment construction\n     • Logical continuation of patterns, textures, and seams\n   - Reconstruction must be indistinguishable from a real photograph of the full product\n\n4. ABSOLUTE DETAIL PRESERVATION:\n   - Preserve exact original colors (no hue shift, no saturation change; exact RGB fidelity)\n   - Maintain authentic fabric texture and material appearance\n   - Preserve all printed graphics, logos, text, embroidery, and branding\n   - Retain stitching, seams, edges, and construction details\n   - Keep correct proportions, scale, and garment shape\n\n**OUTPUT REQUIREMENTS:**\n- Background: Fully transparent (PNG)\n- Framing: Product centered, front-facing, symmetrical where applicable\n- Crop: Tight crop with zero excess margins around the product\n- Lighting: Even, neutral, professional studio lighting\n- Quality: Sharp, high-resolution, catalog-grade detail\n- Cleanliness: No shadows, no artifacts, no model traces, no AI defects\n\n**STYLE:**\nProfessional e-commerce catalog product photography\n\n**CRITICAL REQUIREMENT:**\nThe final image must look as if the product was photographed alone on a white seamless backdrop in a professional photography studio. It must NOT appear extracted, edited, or derived from a model-worn image in any way. The background should be: ";
const BASE_ECOM_SUFFIX = ". Professional studio lighting, sharp focus, high quality.";

const ECOM_PRESETS = [
    { 
        id: 'white-studio', 
        label: 'Studio Trắng', 
        image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=150&q=80', 
        prompt: 'clean white studio background, professional product photography lighting, seamless white backdrop, sharp focus, studio flash lighting, commercial product shot', 
        basePrompt: BASE_ECOM_PROMPT 
    },
    { 
        id: 'minimal-podium', 
        label: 'Bục Tối Giản', 
        image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=150&q=80', 
        prompt: 'product displayed on modern minimalist geometric podium, neutral beige or gray background, soft studio lighting, clean shadows, contemporary e-commerce style', 
        basePrompt: BASE_ECOM_PROMPT 
    },
    { 
        id: 'marble-luxury', 
        label: 'Đá Cẩm Thạch', 
        image: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?auto=format&fit=crop&w=150&q=80', 
        prompt: 'product on white marble surface, luxury feel, high-end product photography, soft natural light, elegant minimalist composition', 
        basePrompt: BASE_ECOM_PROMPT 
    },
    { 
        id: 'lifestyle-flat', 
        label: 'Phẳng Lifestyle', 
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=150&q=80', 
        prompt: 'flat lay composition on clean white surface, lifestyle product photography, organized layout, top-down view, even lighting', 
        basePrompt: BASE_ECOM_PROMPT 
    },
    { 
        id: 'pastel-gradient', 
        label: 'Pastel Nhẹ', 
        image: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=150&q=80', 
        prompt: 'soft pastel gradient background (pink, blue, or peach), gentle color transitions, studio lighting, modern e-commerce aesthetic, clean and fresh look', 
        basePrompt: BASE_ECOM_PROMPT 
    },
    { 
        id: 'shadow-depth', 
        label: 'Bóng Đổ Sâu', 
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80', 
        prompt: 'product with dramatic natural shadow on white background, depth and dimension, hard sunlight effect, modern commercial photography style', 
        basePrompt: BASE_ECOM_PROMPT 
    },
];

export default function EcommercePhotoForm() {
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
        
        // Determine prompt based on priority: custom background text > preset > background image
        let prompt = "";
        if (customBackground.trim()) {
            prompt = `${BASE_ECOM_PROMPT}${customBackground.trim()}${BASE_ECOM_SUFFIX}`;
        } else if (preset) {
            prompt = `${preset.basePrompt}${preset.prompt}${BASE_ECOM_SUFFIX}`;
        } else if (backgroundImages.length > 0) {
            prompt = `${BASE_ECOM_PROMPT}use the provided background image as the scene${BASE_ECOM_SUFFIX}`;
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
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto bg-[#1A1F2E]">
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
                maxImages={5}
                label="Ảnh sản phẩm"
                compact={true}
                description="Tải lên tối đa 5 hình ảnh tham chiếu."
            />
          </div>

          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setBackgroundImages} 
                maxImages={1}
                label="Ảnh nền (tùy chọn)"
                compact={true}
                description="Tải lên tối đa 1 hình ảnh tham chiếu."
            />
            <p className="text-xs text-[#6B7280]">
                Tải lên ảnh nền tùy chỉnh hoặc chọn bối cảnh đề xuất bên dưới
            </p>
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium text-[#B0B8C4]">Bối cảnh đề xuất</label>
             <BackgroundPresetGrid 
                presets={ECOM_PRESETS} 
                selectedId={selectedPresetId} 
                onSelect={setSelectedPresetId} 
             />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">
                Hoặc mô tả bối cảnh tùy chỉnh (tùy chọn)
            </label>
            <textarea
                value={customBackground}
                onChange={(e) => setCustomBackground(e.target.value)}
                placeholder="Ví dụ: nền gỗ tự nhiên với ánh sáng mặt trời, bàn đá granite sang trọng..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#6B7280] bg-[#252D3D] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] resize-none"
                rows={3}
            />
            <p className="text-xs text-[#6B7280]">
                Để trống và chọn bối cảnh đề xuất bên trên, hoặc nhập mô tả tùy chỉnh
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
                disabled={loading || referenceImages.length === 0 || (!selectedPresetId && !customBackground.trim() && backgroundImages.length === 0) || balance < estimatedCost}
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
                ) : "Tạo Ảnh TMĐT"}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0A0E13] p-6 lg:p-10 overflow-hidden flex flex-col">
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
