"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import { Sparkles, Copy, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function PromptEnhancementForm() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("A highly detailed, photorealistic image of " + prompt + ", cinematic lighting, 8k resolution, masterpiece, trending on artstation, sharp focus.");
        setLoading(false);
        toast.success('✅ Tối ưu prompt thành công!');
    }, 1500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    toast.success("Đã sao chép vào clipboard");
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Prompt Enhancement" 
          description="Biến prompt đơn giản thành chuyên nghiệp"
          icon={Sparkles}
          badge="Free"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt ban đầu</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="VD: cô gái cầm ô dưới mưa..."
              className="min-h-[140px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Tối Ưu Hóa"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex items-center justify-center">
         {result ? (
             <div className="bg-card w-full max-w-2xl p-6 rounded-xl border border-border shadow-lg space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Kết quả đã tối ưu
                 </h3>
                 <div className="bg-muted p-4 rounded-lg text-sm leading-relaxed border border-border/50">
                    {result}
                 </div>
                 <div className="flex justify-end">
                    <Button onClick={copyToClipboard} className="gap-2 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground">
                        <Copy className="w-4 h-4" /> Sao chép
                    </Button>
                 </div>
             </div>
         ) : (
            <div className="text-center text-muted-foreground p-8 max-w-md">
                <ArrowRight className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nhập ý tưởng ngắn gọn của bạn, AI sẽ viết thành prompt chi tiết để tạo ảnh đẹp nhất.</p>
            </div>
         )}
      </div>
    </div>
  );
}
