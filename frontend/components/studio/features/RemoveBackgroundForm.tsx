"use client"

import React, { useState, useMemo } from "react";
import { useGenerateImage } from "@/hooks/useGenerateImage";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/useToast";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import ResultPreview from "../shared/ResultPreview";
import ImageUpload from "@/components/generators/ImageUpload";
import InsufficientCreditsModal from "@/components/common/InsufficientCreditsModal";
import { Scissors, AlertCircle } from "lucide-react";

export default function RemoveBackgroundForm() {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [currentJobStatus, setCurrentJobStatus] = useState<string>("");

  const { result, loading, error, setResult, setLoading, setError } = useGenerateImage();
  const { balance, estimateImageCost, hasEnoughCredits } = useCredits();
  const toast = useToast();

  const estimatedCost = useMemo(() => {
    return estimateImageCost("nano-banana", "1:1", "2k", "fast");
  }, [estimateImageCost]);

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
        // Placeholder Logic for Phase 2 UI Check
        // In real implementation, this would call the specific Remove BG endpoint or pipeline
        
        setTimeout(() => {
             setCurrentJobStatus("processing");
             setTimeout(() => {
                 setResult({ 
                     image_url: "https://placehold.co/1024x1024/transparent/png?text=Background+Removed", 
                     job_id: "mock-id", 
                     status: 'completed' 
                 });
                 setLoading(false);
                 toast.success('✅ Tách nền thành công!');
             }, 2000);
        }, 1500);

    } catch (e: any) {
        const errorMsg = e.message || "Lỗi khi tách nền";
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Remove Background" 
          description="Tách nền tự động trong vài giây"
          icon={Scissors}
          badge="Free"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <ImageUpload 
                onImagesSelected={setReferenceImages} 
                maxImages={1}
                label="Ảnh cần tách nền"
            />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>💡 Mẹo: Chọn ảnh có chủ thể rõ ràng để có kết quả tốt nhất.</p>
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
                disabled={loading || referenceImages.length === 0 || balance < estimatedCost}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Tách Nền Ngay"}
            </Button>
        </div>

        <InsufficientCreditsModal
            isOpen={showCreditsModal}
            onClose={() => setShowCreditsModal(false)}
            required={estimatedCost}
            available={balance}
        />
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         {/* Transparency Grid Background for Result */}
         <div className="flex-1 relative">
            <ResultPreview 
                loading={loading} 
                resultUrl={result?.image_url} 
                status={currentJobStatus}
                onRegenerate={handleGenerate}
                placeholderTitle="Kết quả tách nền"
                placeholderDesc="Ảnh sau khi tách nền sẽ hiển thị tại đây."
            />
         </div>
      </div>
    </div>
  );
}
