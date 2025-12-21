"use client"

import React, { useState, useMemo, useEffect } from "react";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/api";
import { getModelConfig } from "@/lib/models-config";
import Button from "@/components/common/Button";
import AspectRatioSelector from "@/components/generators/AspectRatioSelector";
import ModelSelector from "@/components/generators/ModelSelector";
import FeatureHeader from "../shared/FeatureHeader";
import ResultPreview from "../shared/ResultPreview";
import ImageUpload from "@/components/generators/ImageUpload";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";
import { Sparkles, AlertCircle, Zap, Settings, ChevronUp, ChevronDown, Coins } from "lucide-react";
import { getFeatureById } from "@/lib/studio-config";
import { useStudio } from "../StudioContext";

export default function ImageEditorForm() {
  const feature = getFeatureById('image-editor');
  const settings = feature?.settings || {};

  const [showSettings, setShowSettings] = useState(false);
  const [model, setModel] = useState("nano-banana-pro");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState(settings.aspectRatio?.default || "9:16");
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [speed, setSpeed] = useState<any>("slow");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");

  const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits, costsLoaded, getAvailableAspectRatios, modelCosts } = useCredits();
  const toast = useToast();

  // Dynamic Options
  const dynamicAspectRatios = useMemo(() => {
     if (!costsLoaded) return [];
     return getAvailableAspectRatios(model);
  }, [model, costsLoaded, getAvailableAspectRatios]);

  // Reset aspect ratio logic
  useEffect(() => {
      const modelConfig = getModelConfig(model, 'image');
      const availableRatios = dynamicAspectRatios.length > 0
          ? dynamicAspectRatios
          : (modelConfig?.aspectRatios || []);

      if (availableRatios.length > 0 && !availableRatios.includes(aspectRatio)) {
          setAspectRatio(availableRatios[0]);
      }
  }, [model, dynamicAspectRatios, aspectRatio]);

  // History Selection Integration
  const { selectedHistoryJob } = useStudio();
  useEffect(() => {
    if (selectedHistoryJob && selectedHistoryJob.output_url) {
        setResult({
            image_url: selectedHistoryJob.output_url,
            job_id: selectedHistoryJob.job_id,
            status: 'completed'
        });
        
        const rawPrompt = selectedHistoryJob.prompt || "";
        let cleanPromptText = rawPrompt;
        let isSystem = false;

        if (rawPrompt.includes("CRITICAL TASK: Restore")) {
            cleanPromptText = "Restore Old Photo";
            isSystem = true;
        } else if (rawPrompt.includes("Upscale this image")) {
            cleanPromptText = "Upscale Image";
            isSystem = true;
        } else if (rawPrompt.includes("Expand the image with request:")) {
             const match = rawPrompt.match(/request: (.*?)\. Expand/);
             cleanPromptText = match ? match[1] : rawPrompt;
             isSystem = false;
        }

        if (!isSystem) {
             setPrompt(cleanPromptText);
        }

        if (selectedHistoryJob.model_id) setModel(selectedHistoryJob.model_id);
        if (selectedHistoryJob.aspect_ratio) setAspectRatio(selectedHistoryJob.aspect_ratio);
        
        setLastUsedParams({
            prompt: cleanPromptText,
            model: selectedHistoryJob.model_id || model,
            aspectRatio: selectedHistoryJob.aspect_ratio || aspectRatio
        });
    }
  }, [selectedHistoryJob, setResult, model, aspectRatio]);

  // State for metadata display
  const [lastUsedParams, setLastUsedParams] = useState<{prompt: string; model: string; aspectRatio: string} | null>(null);

  const estimatedCost = useMemo(() => {
    return estimateImageCost(model, aspectRatio, "2k", speed);
  }, [model, aspectRatio, speed, estimateImageCost]);

  const handleGenerate = async () => {
    if (!prompt.trim() || referenceImages.length === 0) return;

    if (!hasEnoughCredits(estimatedCost)) {
      setShowCreditsModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentJobStatus("uploading");
    
    setLastUsedParams({
        prompt,
        model,
        aspectRatio
    });

    try {
        // 1. Upload Image
        const file = referenceImages[0];
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

        // Get dimensions
        const img = new Image();
        img.src = uploadInfo.url;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const inputImages = [{
            type: "media_input",
            id: uploadInfo.id,
            url: uploadInfo.url,
            width: img.width,
            height: img.height
        }];

        setCurrentJobStatus("starting");

        // 2. Generate
        const endpoint = `/api/generate/image/${model}/generate`;
        const payload = {
            prompt,
            input_images: inputImages,
            aspect_ratio: aspectRatio,
            speed: speed
        };

        const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (genRes.credits_remaining !== undefined) {
            updateCredits(genRes.credits_remaining);
        }

        // 3. Poll
        const checkStatus = async () => {
            try {
                const statusRes = await apiRequest<{ status: string, result?: string, error_message?: string }>(`/api/jobs/${genRes.job_id}`);
                setCurrentJobStatus(statusRes.status);
                
                if (statusRes.status === 'completed' && statusRes.result) {
                    setResult({ image_url: statusRes.result, job_id: genRes.job_id, status: 'completed' });
                    setLoading(false);
                    toast.success('✅ Chỉnh sửa thành công!');
                } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
                    const errorMsg = statusRes.error_message || "Chỉnh sửa thất bại.";
                    setError(errorMsg);
                    setLoading(false);
                    toast.error(errorMsg);
                } else {
                    setTimeout(checkStatus, 3000);
                }
            } catch (e: any) {
                setError(`Check status failed: ${e.message}`);
                setLoading(false);
            }
        };
        setTimeout(checkStatus, 2000);

    } catch (e: any) {
        console.error(e);
        const errorMsg = e.message || "Lỗi khi xử lý ảnh";
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Image Editor" 
          description="Chỉnh sửa chi tiết với mô tả văn bản"
          icon={Sparkles}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          {/* Image Upload */}
          {settings.imageInput?.enabled !== false && (
            <div className="space-y-2">
                <ImageUpload 
                    onImagesSelected={setReferenceImages} 
                    maxImages={settings.imageInput?.maxImages || 1}
                    label={settings.imageInput?.label || "Ảnh gốc cần sửa"}
                />
            </div>
          )}

          {/* Prompt */}
          {settings.prompt?.enabled !== false && (
            <div className="space-y-2">
                <label className="text-sm font-medium">{settings.prompt?.label || "Bạn muốn sửa gì?"}</label>
                <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={settings.prompt?.placeholder || "Thêm một chiếc mũ màu đỏ, đổi màu tóc thành vàng..."}
                className="min-h-[100px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
            </div>
          )}

          {/* Collapsible Advanced Settings */}
          <div className="rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-pink-500/20 group">
              <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`w-full flex items-center justify-between p-4 transition-all duration-200 ${showSettings ? 'bg-muted/30' : 'bg-transparent hover:bg-muted/20'}`}
              >
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-pink-500/10 text-pink-500' : 'bg-muted text-muted-foreground group-hover:bg-pink-500/5 group-hover:text-pink-500'}`}>
                          <Settings className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                          <span className="block text-sm font-semibold text-foreground">Cấu hình nâng cao</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">Tỷ lệ khung hình, chất lượng & tốc độ</span>
                      </div>
                  </div>
                  {showSettings ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
              </button>
              
              {showSettings && (
                  <div className="p-4 space-y-6 border-t border-border/50 animate-in slide-in-from-top-2 duration-300 ease-out bg-muted/10">
                      {/* Model Selector */}
                      <ModelSelector value={model} onChange={setModel} mode="image" />

                      {/* Aspect Ratio */}
                      {settings.aspectRatio?.enabled !== false && (() => {
                          const modelConfig = getModelConfig(model, 'image');
                          const ratiosToShow = costsLoaded && dynamicAspectRatios.length > 0
                              ? dynamicAspectRatios
                              : (modelConfig?.aspectRatios || ['1:1', '3:4', '4:3', '9:16', '16:9']);
                          
                          return (
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tỷ lệ khung hình</label>
                                <AspectRatioSelector 
                                    value={aspectRatio} 
                                    onChange={setAspectRatio} 
                                    options={ratiosToShow}
                                />
                              </div>
                          );
                      })()}
                     
                      {/* Speed Selector */}
                      {settings.speed?.enabled !== false && (
                          <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tốc độ xử lý</label>
                              <div className="flex bg-muted p-1 rounded-xl">
                                  <button
                                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                                          speed === 'fast'
                                              ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                      }`}
                                      onClick={() => setSpeed('fast')}
                                  >
                                      <Zap className="w-3.5 h-3.5" /> Nhanh
                                  </button>
                                  {/* Only show Slow mode if enabled for model */}
                                  {(costsLoaded && (!modelCosts[model] || modelCosts[model].is_slow_mode_enabled !== 0)) && (
                                      <button
                                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                                              speed === 'slow'
                                                  ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                          }`}
                                          onClick={() => setSpeed('slow')}
                                      >
                                          <Coins className="w-3.5 h-3.5" /> Tiết kiệm
                                      </button>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              )}
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
                disabled={loading || !prompt.trim() || referenceImages.length === 0 || balance < estimatedCost}
                className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                    balance < estimatedCost 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                        : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
                }`}
            >
                {loading ? (
                    <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" /> 
                        Đang xử lý...
                    </>
                ) : (
                    <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Chỉnh Sửa Ảnh
                    </>
                )}
            </Button>
        </div>

        <InsufficientCreditsModal
            isOpen={showCreditsModal}
            onClose={() => setShowCreditsModal(false)}
            required={estimatedCost}
            available={balance}
        />
      </div>

         <div className="flex-1 bg-muted/10 p-4 lg:p-8 overflow-hidden flex items-center justify-center">
            <div className="w-full max-w-3xl relative">
              <ResultPreview 
                 loading={loading} 
                 resultUrl={result?.image_url} 
                 status={currentJobStatus}
                 onRegenerate={handleGenerate}
                 placeholderTitle="Kết quả chỉnh sửa"
                 placeholderDesc="Ảnh sau khi chỉnh sửa sẽ hiển thị tại đây."
                 details={lastUsedParams || undefined}
              />
            </div>
       </div>
    </div>
  );
}
