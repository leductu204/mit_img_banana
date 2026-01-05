"use client"

import { User, Sparkles, AlertCircle, Loader2 } from "lucide-react";
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

const STYLES = [
    { 
        id: 'professional', 
        label: 'Chuyên nghiệp',
        thumbnail: '👔',
        description: 'Clean corporate headshot with professional lighting, business attire, neutral background, sharp focus, suitable for LinkedIn and business profiles'
    },
    { 
        id: 'anime', 
        label: 'Anime',
        thumbnail: '🎨',
        description: 'Japanese anime art style with vibrant colors, expressive eyes, clean linework, cel-shaded rendering, studio quality'
    },
    { 
        id: 'cyberpunk', 
        label: 'Đường phố',
        thumbnail: '🌃',
        description: 'Futuristic cyberpunk aesthetic with neon accents, tech elements, urban night setting, cinematic lighting, high contrast'
    },
    { 
        id: 'sketch', 
        label: 'Màu chì',
        thumbnail: '✏️',
        description: 'Hand-drawn pencil sketch with crosshatching, realistic shading, fine detail, artistic charcoal effect, monochrome'
    },
    { 
        id: 'watercolor', 
        label: 'Màu nước',
        thumbnail: '🎨',
        description: 'Soft watercolor painting with flowing colors, gentle brushstrokes, artistic interpretation, pastel tones, dreamy atmosphere'
    },
    { 
        id: '3d', 
        label: '3D',
        thumbnail: '🎭',
        description: 'Modern 3D rendered character with realistic materials, soft lighting, high-poly model, Pixar-style quality'
    },
];

export default function ProfileImageGeneratorForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('professional');
  const [additionalPrompt, setAdditionalPrompt] = useState<string>('');
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
        const style = STYLES.find(s => s.id === selectedStyle);
        const styleName = style?.label || selectedStyle;
        const styleDescription = style?.description || '';
        const prompt = `Transform this portrait photo into ${styleName} style. ${styleDescription}${additionalPrompt ? `. Also incorporate the following details: ${additionalPrompt.trim()}.` : ''}`;

        // 1. Upload Image
        const uploadInfo = await apiRequest<{ id: string, url: string, upload_url: string }>('/api/generate/image/upload', {
            method: 'POST'
        });

        await fetch(uploadInfo.upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': 'image/jpeg' }
        });

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
        toast.info(`Đang tạo avatar... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
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
                    toast.success('✅ Tạo avatar thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Tạo avatar thất bại.";
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
          title="Profile Image Generator" 
          description="Tạo ảnh đại diện chuyên nghiệp theo phong cách"
          icon={User}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh chân dung gốc"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">Chọn phong cách</label>
            <div className="grid grid-cols-2 gap-2">
                {STYLES.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 ${
                            selectedStyle === style.id 
                                ? 'bg-[#00BCD4]/20 text-[#00BCD4] shadow-sm ring-1 ring-[#00BCD4]' 
                                : 'bg-black/20 text-[#B0B8C4] hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <span className="text-3xl">{style.thumbnail}</span>
                        <span>{style.label}</span>
                    </button>
                ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">
                Tùy chỉnh thêm (tùy chọn)
            </label>
            <textarea
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="Ví dụ: đeo kính, làm đẹp, làm tấm ảnh nhiều màu sắc..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#6B7280] bg-[#252D3D] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] resize-none"
                rows={3}
            />
            <p className="text-xs text-[#6B7280]">
                Thêm chi tiết tùy chỉnh để điều chỉnh kết quả theo ý bạn
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
                ) : "Tạo Avatar"}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0A0E13] p-6 lg:p-10 overflow-hidden flex flex-col">
         <ResultPreview 
            loading={loading} 
            resultUrl={result?.image_url} 
            status={currentJobStatus}
            onRegenerate={handleGenerate}
            placeholderTitle="Kết quả avatar"
            placeholderDesc="Ảnh chân dung phong cách mới sẽ hiển thị tại đây."
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
