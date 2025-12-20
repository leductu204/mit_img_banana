"use client"

import React, { useState, useMemo } from "react";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/useToast";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ResultPreview from "../shared/ResultPreview";
import ImageUpload from "@/components/generators/ImageUpload";
import BackgroundPresetGrid, { BackgroundPreset } from "../shared/BackgroundPresetGrid";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";
import { Layers, AlertCircle, Sparkles } from "lucide-react";

const BG_PRESETS: BackgroundPreset[] = [
    { id: 'office', label: 'Văn phòng', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=150&q=80', prompt: 'in a modern professional office workspace, bright lighting, bokeh background' },
    { id: 'studio', label: 'Studio', image: 'https://images.unsplash.com/photo-1542393545-facac70508ee?auto=format&fit=crop&w=150&q=80', prompt: 'in a professional photography studio, solid grey background, studio lighting' },
    { id: 'nature', label: 'Thiên nhiên', image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=150&q=80', prompt: 'in a beautiful nature scene, sunlight, green trees, blurred background' },
    { id: 'beach', label: 'Bãi biển', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=150&q=80', prompt: 'on a sunny beach with blue ocean and white sand, summer vibe' },
    { id: 'city', label: 'Thành phố', image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=150&q=80', prompt: 'in a modern city street at daytime, urban lifestyle, depth of field' },
    { id: 'luxury', label: 'Sang trọng', image: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=150&q=80', prompt: 'in a luxury interior room with gold accents and marble textures, elegant atmosphere' },
];

export default function ChangeBackgroundForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");

  const { result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits } = useCredits();
  const toast = useToast();

  const activePrompt = useMemo(() => {
    if (customPrompt) return customPrompt;
    if (selectedPresetId) {
        return BG_PRESETS.find(p => p.id === selectedPresetId)?.prompt || "";
    }
    return "";
  }, [customPrompt, selectedPresetId]);

  const estimatedCost = useMemo(() => {
    return estimateImageCost("nano-banana", "1:1", "2k", "slow");
  }, [estimateImageCost]);

  const handleGenerate = async () => {
    if (referenceImages.length === 0 || !activePrompt) return;

    if (!hasEnoughCredits(estimatedCost)) {
      setShowCreditsModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentJobStatus("uploading");

    try {
        // Placeholder UI Logic for Phase 2
        setTimeout(() => {
             setCurrentJobStatus("processing");
             setTimeout(() => {
                 setResult({ 
                     image_url: "https://placehold.co/1024x1024/png?text=New+Background+Applied", 
                     job_id: "mock-id-bg", 
                     status: 'completed' 
                 });
                 setLoading(false);
                 toast.success('✅ Đổi nền thành công!');
             }, 2500);
        }, 1500);

    } catch (e: any) {
        const errorMsg = e.message || "Lỗi khi đổi nền";
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Change Background" 
          description="Thay đổi bối cảnh với AI"
          icon={Layers}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh gốc"
            />
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium">Chọn bối cảnh mẫu</label>
             <BackgroundPresetGrid 
                presets={BG_PRESETS} 
                selectedId={selectedPresetId} 
                onSelect={(id) => {
                    setSelectedPresetId(id);
                    setCustomPrompt(""); // Clear custom if preset selected
                }} 
             />
          </div>

          <div className="relative">
             <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">HOẶC</span>
             </div>
             <div className="border-t border-border" />
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Mô tả bối cảnh riêng
             </label>
             <textarea 
                value={customPrompt}
                onChange={(e) => {
                    setCustomPrompt(e.target.value);
                    setSelectedPresetId(null); // Clear preset if typing custom
                }}
                placeholder="Ví dụ: trên đỉnh núi tuyết phủ, ánh nắng hoàng hôn..."
                className="w-full min-h-[80px] rounded-md border border-input bg-background p-3 text-sm focus:ring-primary focus:border-primary"
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
                disabled={loading || referenceImages.length === 0 || !activePrompt || balance < estimatedCost}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Đổi Background"}
            </Button>
        </div>

        <InsufficientCreditsModal
            isOpen={showCreditsModal}
            onClose={() => setShowCreditsModal(false)}
            required={estimatedCost}
            available={balance}
        />
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden">
         <ResultPreview 
            loading={loading} 
            resultUrl={result?.image_url} 
            status={currentJobStatus}
            onRegenerate={handleGenerate}
            placeholderTitle="Kết quả bối cảnh mới"
            placeholderDesc="Ảnh sau khi thay đổi background sẽ hiển thị tại đây."
         />
      </div>
    </div>
  );
}
