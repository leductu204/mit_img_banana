"use client"

import React, { useState, useMemo, useEffect } from "react";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/api";
import { getModelConfig } from "@/lib/models-config";
import Button from "@/components/common/Button";
import AspectRatioSelector from "@/components/generators/AspectRatioSelector";
import QualitySelector from "@/components/generators/QualitySelector";
import ModelSelector from "@/components/generators/ModelSelector";
import FeatureHeader from "../shared/FeatureHeader";
import ResultPreview from "../shared/ResultPreview";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";
import { Wand2, AlertCircle, Sparkles, Zap, Settings, ChevronUp, ChevronDown, Coins } from "lucide-react";
import { getFeatureById } from "@/lib/studio-config";
import { useStudio } from "../StudioContext";

export default function TextToImageForm() {
  const feature = getFeatureById('text-to-image');
  const settings = feature?.settings || {};

  // State with config defaults
  const [showSettings, setShowSettings] = useState(false);
  const [model, setModel] = useState("nano-banana-pro");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState(settings.aspectRatio?.default || "9:16");
  const [quality, setQuality] = useState(settings.quality?.default || "2k");
  const [speed, setSpeed] = useState<any>("slow");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");

  // Hooks
  const { generate, result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits, updateCredits, costsLoaded, getAvailableAspectRatios, getAvailableResolutions, modelCosts } = useCredits();
  const toast = useToast();

  // Dynamic Options
  const dynamicAspectRatios = useMemo(() => {
     if (!costsLoaded) return [];
     return getAvailableAspectRatios(model, model === "nano-banana-pro" ? quality : undefined);
  }, [model, quality, costsLoaded, getAvailableAspectRatios]);

  const dynamicResolutions = useMemo(() => {
      if (!costsLoaded) return [];
      return getAvailableResolutions(model);
  }, [model, costsLoaded, getAvailableResolutions]);

  // Estimates
  const estimatedCost = useMemo(() => {
    return estimateImageCost(model, aspectRatio, quality, speed);
  }, [model, aspectRatio, quality, speed, estimateImageCost]);

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
  const [lastUsedParams, setLastUsedParams] = useState<{prompt: string; model: string; aspectRatio: string; resolution?: string} | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    if (!hasEnoughCredits(estimatedCost)) {
      setShowCreditsModal(true);
      return;
    }

    setResult(null);
    setLoading(true);
    setError(null);
    setCurrentJobStatus("starting");

    const modelConfig = getModelConfig(model, 'image');
    const isPro = modelConfig?.resolutions && modelConfig.resolutions.length > 0;

    setLastUsedParams({
        prompt,
        model,
        aspectRatio,
        resolution: isPro ? quality : undefined
    });

    try {
      const endpoint = `/api/generate/image/${model}/generate`;
      
      const payload: any = {
        prompt,
        aspect_ratio: aspectRatio,
        speed: speed,
        input_images: [] 
      };

      if (isPro) {
          payload.resolution = quality;
      }

      const genRes = await apiRequest<{ job_id: string, credits_remaining?: number }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (genRes.credits_remaining !== undefined) {
        updateCredits(genRes.credits_remaining);
      }

      const checkStatus = async () => {
        try {
          const statusRes = await apiRequest<{ status: string, result?: string, error_message?: string }>(`/api/jobs/${genRes.job_id}`);
          setCurrentJobStatus(statusRes.status);
          
          if (statusRes.status === 'completed' && statusRes.result) {
            setResult({ image_url: statusRes.result, job_id: genRes.job_id, status: 'completed' });
            setLoading(false);
            toast.success('✅ Tạo ảnh thành công!');
          } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
            const errorMsg = statusRes.error_message || "Tạo ảnh thất bại.";
            setError(errorMsg);
            setLoading(false);
            toast.error(errorMsg);
          } else {
            setTimeout(checkStatus, 5000);
          }
        } catch (e: any) {
          setError(`Check status failed: ${e.message}`);
          setLoading(false);
        }
      };

      setTimeout(checkStatus, 5000);

    } catch (e: any) {
      const errorMsg = e.message || "Lỗi khi tạo ảnh";
      setError(errorMsg);
      setLoading(false);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      {/* Left Panel: Form */}
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto bg-[#1A1F2E]">
        <FeatureHeader 
          title="Text to Image" 
          description="Biến ý tưởng thành hình ảnh"
          icon={Wand2}
          badge="Free"
        />

        <div className="space-y-6 flex-1">
          {/* Prompt */}
          {settings.prompt?.enabled !== false && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#B0B8C4]">{settings.prompt?.label || "Mô tả ảnh (Prompt)"}</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={settings.prompt?.placeholder || "Một chú mèo phi hành gia trên sao Hỏa, digital art..."}
                className="min-h-[140px] w-full resize-none rounded-xl border border-[#6B7280] bg-[#252D3D] p-3 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#00BCD4] focus:border-[#00BCD4]"
              />
            </div>
          )}

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
                          <span className="block text-xs text-[#6B7280] mt-0.5">Model, chất lượng & tốc độ</span>
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
                      {/* Model Selector */}
                      <ModelSelector value={model} onChange={setModel} mode="image" />

                      {/* Aspect Ratio */}
                      {settings.aspectRatio?.enabled !== false && (() => {
                          const modelConfig = getModelConfig(model, 'image');
                          const ratiosToShow = costsLoaded && dynamicAspectRatios.length > 0
                              ? dynamicAspectRatios
                              : (modelConfig?.aspectRatios || ['16:9', '9:16', '1:1']);
                          
                          return (
                              <div className="space-y-2">
                                <AspectRatioSelector 
                                    value={aspectRatio} 
                                    onChange={setAspectRatio} 
                                    options={ratiosToShow}
                                />
                              </div>
                          );
                      })()}

                      {/* Quality/Resolution Selector (for PRO models) */}
                      {(() => {
                           const modelConfig = getModelConfig(model, 'image');
                           const resolutionsToShow = dynamicResolutions.length > 0 
                               ? dynamicResolutions 
                               : (modelConfig?.resolutions || []);
                           
                           return resolutionsToShow.length > 0 && (
                               <QualitySelector 
                                   value={quality} 
                                   onChange={setQuality} 
                                   options={resolutionsToShow}
                               />
                           );
                      })()}

                      {/* Speed Selector */}
                      {settings.speed?.enabled !== false && (
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
                                  {(costsLoaded && (!modelCosts[model] || modelCosts[model].is_slow_mode_enabled !== 0)) && (
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
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm flex items-start gap-2 border border-red-500/20">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-8 pt-4 border-t border-white/10">
             <div className="flex items-center justify-between text-xs text-[#6B7280] mb-3">
                <span>Chi phí: {estimatedCost} credits</span>
                <span>Số dư: {balance}</span>
             </div>
             
             <Button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || balance < estimatedCost}
                className={`w-full font-medium h-11 rounded-xl shadow-sm transition-all duration-200 ${
                    balance < estimatedCost 
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400' 
                        : 'bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-[0_0_15px_rgba(0,188,212,0.3)]'
                }`}
            >
                {loading ? (
                    <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" /> 
                        Đang tạo...
                    </>
                ) : (
                    <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Tạo Ảnh
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

      {/* Right Panel: Result */}
      <div className="flex-1 bg-[#0A0E13] p-4 lg:p-8 overflow-hidden flex items-center justify-center">
         <div className="w-full max-w-3xl relative">
            <ResultPreview 
                loading={loading} 
                resultUrl={result?.image_url} 
                status={currentJobStatus}
                onRegenerate={handleGenerate}
                placeholderTitle="Khung hình sáng tạo"
                placeholderDesc="Kết quả hình ảnh sẽ hiển thị tại đây với chất lượng tốt nhất."
                details={lastUsedParams || undefined}
            />
         </div>
      </div>
    </div>
  );
}
