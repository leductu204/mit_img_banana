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
  const [model, setModel] = useState("nano-banana");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState(settings.aspectRatio?.default || "9:16");
  const [quality, setQuality] = useState(settings.quality?.default || "2k");
  const [speed, setSpeed] = useState<any>(settings.speed?.default || "slow");
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
             // Expand prompts ARE text prompts, so we might want to keep them in textarea?
             // But the wrapper "Expand..." is system.
             isSystem = false; // Treat as editable?
             // Actually, if I put "starry night" in T2I, it works.
             // So for Expand, I should setPrompt(cleanPromptText).
        }

        // Only update form input if it's NOT a pure system operation like Restore/Upscale
        if (!isSystem) {
             setPrompt(cleanPromptText);
        }

        if (selectedHistoryJob.model_id) setModel(selectedHistoryJob.model_id);
        if (selectedHistoryJob.aspect_ratio) setAspectRatio(selectedHistoryJob.aspect_ratio);
        
        // Update metadata display with CLEAN text
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

    setLoading(true);
    setError(null);
    setCurrentJobStatus("starting");

    // Capture params at start of generation
    const modelConfig = getModelConfig(model, 'image');
    const isPro = modelConfig?.resolutions && modelConfig.resolutions.length > 0;

    setLastUsedParams({
        prompt,
        model,
        aspectRatio,
        resolution: isPro ? quality : undefined
    });

    try {
      // API Logic (Dynamic based on ImageGenerator.tsx)
      
      // Dynamic endpoint based on model
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

      // Poll Status
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
            setTimeout(checkStatus, 5000); // Poll every 3s
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
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left Panel: Form */}
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
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
              <label className="text-sm font-medium">{settings.prompt?.label || "Mô tả ảnh (Prompt)"}</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={settings.prompt?.placeholder || "Một chú mèo phi hành gia trên sao Hỏa, digital art..."}
                className="min-h-[140px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                          <span className="block text-xs text-muted-foreground mt-0.5">Model, chất lượng & tốc độ</span>
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
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-8 pt-4 border-t border-border">
             <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>Chi phí: {estimatedCost} credits</span>
                <span>Số dư: {balance}</span>
             </div>
             
             <Button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || balance < estimatedCost}
                className={`w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 ${
                    balance < estimatedCost 
                        ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                        : 'bg-[#0F766E] hover:bg-[#0D655E] text-white'
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
      <div className="flex-1 bg-muted/10 p-4 lg:p-8 overflow-hidden flex items-center justify-center">
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
