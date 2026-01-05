"use client"

import { Shirt, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
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
        const fullPrompt = `Task: Realistically dress the provided model with the provided clothing item.\n\n1. **Clothing Application**: Take the isolated clothing item and fit it perfectly onto the model's body, respecting their pose, shape, and contours.\n2. **Realism Integration**: Adjust the lighting, shadows, and fabric physics to make it look naturally worn by the model.\n3. **Detail Preservation**: Maintain all original details of the clothing (colors, patterns, textures) while adapting to the model's body.\n4. **Professional Result**: The final image should look like a real photograph of the model wearing the outfit.\nInstruction: ${prompt || "make it look natural and realistic"}. High-end fashion editorial style, professional lighting.`;

        const payload = {
            prompt: fullPrompt,
            input_images: [
                { type: "media_input", id: uploadModel.id, url: uploadModel.url, width: modelDim.width, height: modelDim.height, label: "model" },
                { type: "media_input", id: uploadGarment.id, url: uploadGarment.url, width: garmentDim.width, height: garmentDim.height, label: "garment" }
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
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto bg-[#1A1F2E]">
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
                <span className="w-full border-t border-dashed border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1A1F2E] px-2 text-[#6B7280]">+ Thêm trang phục</span>
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
            <label className="text-sm font-medium text-[#B0B8C4]">Mô tả cách mặc (Tùy chọn)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Sơ vin áo vào quần, để tay trong túi..."
              className="min-h-[80px] w-full resize-none rounded-xl border border-[#6B7280] bg-[#252D3D] p-3 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
            />
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
                disabled={loading || modelImages.length === 0 || garmentImages.length === 0 || balance < estimatedCost}
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
                ) : "Mặc Thử Ngay"}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0A0E13] p-6 lg:p-10 overflow-hidden flex flex-col">
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
