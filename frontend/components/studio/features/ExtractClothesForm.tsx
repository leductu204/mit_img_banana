"use client"

import { Scissors, AlertCircle, Settings, ChevronUp, ChevronDown, Zap, Coins, Loader2 } from "lucide-react";
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
import AspectRatioSelector from "@/components/generators/AspectRatioSelector";

export default function ExtractClothesForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [optionalPrompt, setOptionalPrompt] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [speed, setSpeed] = useState<"fast" | "slow">("fast");
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  
  const toast = useToast();
  const { result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits } = useCredits();

  const estimatedCost = useMemo(() => {
    return estimateImageCost("nano-banana-pro", aspectRatio, "2k", speed);
  }, [aspectRatio, speed, estimateImageCost]);

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
        const basePrompt = "From the provided image of a person, perform the following tasks:\n1. Precisely identify and segment the following fashion item(s): ${itemList}.\n2. Isolate only the clothing item(s), removing the model and any other background elements completely.\n3. Return a single image containing ONLY the extracted fashion product(s) on a transparent or plain white background.\n4. Preserve all details: colors, textures, patterns, logos, and the exact shape of the garment(s).\n5. The result should look like a professional product catalog photo.";
        const prompt = optionalPrompt 
            ? `${basePrompt} Focus specifically on: ${optionalPrompt.trim()}.`
            : basePrompt;

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
            aspect_ratio: aspectRatio,
            resolution: "2k",
            speed: speed
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>('/api/generate/image/nano-banana-pro/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        setCurrentJobStatus("pending");
        toast.info(`Đang tách quần áo... (Job ID: ${genRes.job_id.substring(0, 8)})`, 3000);
        
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
                    toast.success('✅ Tách quần áo thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Tách quần áo thất bại.";
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
          title="Extract Clothes" 
          description="Tách quần áo khỏi người mẫu/ảnh chụp"
          icon={Scissors}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh người mẫu mặc đồ"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">
                Chỉ định sản phẩm (tùy chọn)
            </label>
            <input
                type="text"
                value={optionalPrompt}
                onChange={(e) => setOptionalPrompt(e.target.value)}
                placeholder="Ví dụ: áo thun, quần jean, váy, giày..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#6B7280] bg-[#252D3D] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
            />
            <p className="text-xs text-[#6B7280]">
                Để trống để AI tự động nhận diện quần áo chính
            </p>
          </div>

          <div className="p-4 bg-[#1F2833] border border-white/10 rounded-xl text-sm text-[#94A3B8]">
            <p>AI sẽ tự động nhận diện và tách quần áo chính trong ảnh ra nền trong suốt.</p>
          </div>

          {/* Collapsible Advanced Settings */}
          <div className="rounded-xl bg-[#1F2833] border border-white/10 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[#00BCD4]/30 group">
              <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`w-full flex items-center justify-between p-4 transition-all duration-200 ${showSettings ? 'bg-[#252D3D]/50' : 'bg-transparent hover:bg-[#252D3D]/30'}`}
              >
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-[#00BCD4]/10 text-[#00BCD4]' : 'bg-[#252D3D] text-[#6B7280] group-hover:bg-[#00BCD4]/5 group-hover:text-[#00BCD4]'}`}>
                          <Settings className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                          <span className="block text-sm font-semibold text-white">Cấu hình nâng cao</span>
                          <span className="block text-xs text-[#6B7280] mt-0.5">Tỷ lệ & tốc độ</span>
                      </div>
                  </div>
                  {showSettings ? (
                      <ChevronUp className="w-4 h-4 text-[#6B7280]" />
                  ) : (
                      <ChevronDown className="w-4 h-4 text-[#6B7280]" />
                  )}
              </button>
              
              {showSettings && (
                  <div className="p-4 space-y-6 border-t border-white/10 animate-in slide-in-from-top-2 duration-300 ease-out bg-[#252D3D]/30">
                      {/* Aspect Ratio Selector */}
                      <AspectRatioSelector 
                          value={aspectRatio} 
                          onChange={setAspectRatio} 
                          options={['auto', '1:1', '16:9', '9:16', '4:3', '3:4']}
                      />
                      
                      {/* Speed Toggle */}
                      <div className="space-y-2">
                          <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Tốc độ xử lý</label>
                          <div className="flex bg-black/20 p-1 rounded-xl">
                              <button
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                                      speed === 'fast'
                                          ? 'bg-[#00BCD4]/20 text-[#00BCD4] shadow-sm'
                                          : 'text-[#B0B8C4] hover:text-white hover:bg-white/5'
                                  }`}
                                  onClick={() => setSpeed('fast')}
                              >
                                  <Zap className="w-3.5 h-3.5" /> Nhanh
                              </button>
                              <button
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                                      speed === 'slow'
                                          ? 'bg-green-500/20 text-green-400 shadow-sm'
                                          : 'text-[#B0B8C4] hover:text-white hover:bg-white/5'
                                  }`}
                                  onClick={() => setSpeed('slow')}
                              >
                                  <Coins className="w-3.5 h-3.5" /> Tiết kiệm
                              </button>
                          </div>
                      </div>
                  </div>
              )}
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
                ) : "Tách Quần Áo"}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0A0E13] p-6 lg:p-10 overflow-hidden flex flex-col">
         <div className="flex-1 relative h-full">
            <ResultPreview 
                loading={loading} 
                resultUrl={result?.image_url} 
                status={currentJobStatus}
                onRegenerate={handleGenerate}
                placeholderTitle="Kết quả tách"
                placeholderDesc="Quần áo được tách sẽ hiển thị trên nền trong suốt."
            />
         </div>
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
