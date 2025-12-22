"use client"

import { Layers, Plus, AlertCircle } from "lucide-react";
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

export default function CombineProductForm() {
  const [productImages, setProductImages] = useState<File[]>([]);
  const [modelImages, setModelImages] = useState<File[]>([]);
  const [negativePrompt, setNegativePrompt] = useState<string>("");
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
    if (productImages.length === 0 || modelImages.length === 0) return;

    if (!hasEnoughCredits(estimatedCost)) {
      setShowCreditsModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentJobStatus("uploading");

    try {
        // 1. Upload product and background
        const uploadProd = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' });
        await fetch(uploadProd.upload_url, { method: 'PUT', body: productImages[0], headers: { 'Content-Type': 'image/jpeg' } });
        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadProd.id }) });
        const prodDim = await getImageDimensionsFromUrl(uploadProd.url);

        const uploadBase = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', { method: 'POST' });
        await fetch(uploadBase.upload_url, { method: 'PUT', body: modelImages[0], headers: { 'Content-Type': 'image/jpeg' } });
        await apiRequest('/api/generate/image/upload/check', { method: 'POST', body: JSON.stringify({ img_id: uploadBase.id }) });
        const baseDim = await getImageDimensionsFromUrl(uploadBase.url);

        // 2. Start Job
        const payload: any = {
            prompt: "You are an expert professional photo editor and compositor specializing in high-end commercial fashion imagery.\n\n**INPUTS:**\n1. Input 1: An image of a model or scene.\n2. Input 2: An image of a specific product.\n\n**TASK:**\nSeamlessly place and integrate the product from Input 2 onto the model or within the scene from Input 1, making it appear as if the model is naturally wearing or interacting with the product.\n\n**CORE REQUIREMENTS (STRICT):**\n1. PRODUCT PLACEMENT:\n   - Correctly position the product on or with the model\n   - Align with the model’s pose, anatomy, and perspective\n\n2. NATURAL FIT & PHYSICS:\n   - Adapt the product to the body’s contours and proportions\n   - Realistic draping, folds, tension, and fabric behavior\n   - No distortion or unnatural stretching\n\n3. LIGHTING & COLOR INTEGRATION:\n   - Match lighting direction, intensity, and softness from Input 1\n   - Ensure consistent color temperature and exposure\n   - Add realistic shadows, highlights, and ambient occlusion\n\n4. SEAMLESS BLENDING & DEPTH:\n   - No visible cut lines, seams, or edges\n   - Correct depth layering (product naturally in front of or behind body parts when appropriate)\n   - Preserve realistic interaction between product and body\n\n5. DETAIL PRESERVATION:\n   - Preserve original product details: colors, textures, patterns, logos, materials\n   - Maintain sharpness and material realism\n\n**OUTPUT REQUIREMENTS:**\n- Quality: Professional commercial fashion photography\n- Realism: Indistinguishable from a real photograph\n- Clean result: No artifacts, no AI-generated visual defects\n- Usability: Final image must be suitable for advertising, e-commerce, and marketing\n\n**STYLE:**\nHigh-end, professional, studio-quality fashion photography\n\n**CRITICAL:**\nThe final image must be fully photorealistic and commercially usable, with no visible signs of digital manipulation or AI generation.",
            input_images: [
                { type: "media_input", id: uploadProd.id, url: uploadProd.url, width: prodDim.width, height: prodDim.height, label: "product" },
                { type: "media_input", id: uploadBase.id, url: uploadBase.url, width: baseDim.width, height: baseDim.height, label: "background" }
            ],
            aspect_ratio: "auto",
            resolution: "2k",
            speed: "fast"
        };
        
        if (negativePrompt.trim()) {
            payload.negative_prompt = negativePrompt.trim();
        }

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>('/api/generate/image/nano-banana-pro/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        setCurrentJobStatus("pending");
        toast.info(`Đang ghép sản phẩm... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
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
                    toast.success('✅ Ghép sản phẩm thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Ghép sản phẩm thất bại.";
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
          title="Combine Product" 
          description="Ghép sản phẩm vào người mẫu hoặc bối cảnh"
          icon={Layers}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setProductImages} 
                maxImages={5}
                label="Ảnh sản phẩm"
            />
          </div>

          <div className="flex justify-center text-muted-foreground">
             <Plus className="w-6 h-6" />
          </div>

          <div className="space-y-2">
             <ImageUpload 
                onImagesSelected={setModelImages} 
                maxImages={1}
                label="Ảnh nền / Người mẫu"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
                Optional Prompt (tùy chọn)
            </label>
            <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Ví dụ: phong cách chuyên nghiệp, background studio,..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
            />
            <p className="text-xs text-muted-foreground">
                Mô tả những gì bạn muốn điều chỉnh thêm trong ảnh
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
                disabled={loading || productImages.length === 0 || modelImages.length === 0 || balance < estimatedCost}
                className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                    balance < estimatedCost 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                        : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
                }`}
            >
                {loading ? "Đang xử lý..." : "Ghép Sản Phẩm"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <ResultPreview 
            loading={loading} 
            resultUrl={result?.image_url} 
            status={currentJobStatus}
            onRegenerate={handleGenerate}
            placeholderTitle="Kết quả ghép"
            placeholderDesc="Ảnh sau khi ghép sẽ hiển thị tại đây."
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
