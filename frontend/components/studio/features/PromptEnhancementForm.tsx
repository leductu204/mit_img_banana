"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import { Sparkles, Copy, ArrowRight, Loader2 } from "lucide-react";
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
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto bg-[#1A1F2E]">
        <FeatureHeader 
          title="Prompt Enhancement" 
          description="Biến prompt đơn giản thành chuyên nghiệp"
          icon={Sparkles}
          badge="Free"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">Prompt ban đầu</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="VD: cô gái cầm ô dưới mưa..."
              className="min-h-[140px] w-full resize-none rounded-xl border border-[#6B7280] bg-[#252D3D] p-3 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10">
             <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className={`w-full h-12 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                    !prompt.trim()
                        ? 'bg-[#6B7280]/50 cursor-not-allowed text-[#B0B8C4]' 
                        : 'bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-[0_0_15px_rgba(0,188,212,0.3)]'
                }`}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 
                        Đang xử lý...
                    </>
                ) : "Tối Ưu Hóa"}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0A0E13] p-6 lg:p-10 overflow-hidden flex items-center justify-center">
         {result ? (
             <div className="bg-[#1A1F2E] w-full max-w-2xl p-6 rounded-xl border border-white/10 shadow-lg space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-[#00BCD4]" />
                    Kết quả đã tối ưu
                 </h3>
                 <div className="bg-[#252D3D] p-4 rounded-xl text-sm leading-relaxed border border-white/10 text-gray-300">
                    {result}
                 </div>
                 <div className="flex justify-end">
                    <button onClick={copyToClipboard} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-transparent hover:bg-white/5 text-[#B0B8C4] hover:text-white transition-colors">
                        <Copy className="w-4 h-4" /> Sao chép
                    </button>
                 </div>
             </div>
         ) : (
            <div className="text-center text-[#6B7280] p-8 max-w-md">
                <ArrowRight className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nhập ý tưởng ngắn gọn của bạn, AI sẽ viết thành prompt chi tiết để tạo ảnh đẹp nhất.</p>
            </div>
         )}
      </div>
    </div>
  );
}
