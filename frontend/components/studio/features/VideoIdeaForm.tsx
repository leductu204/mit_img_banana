"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import { Lightbulb, FileText, Target, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function VideoIdeaForm() {
  const [topic, setTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult(`**Video Title: The Ultimate Solution for ${topic}**\n\n**Hook (0-3s):**\n"Stop struggling with ${topic}. Here's the hack you didn't know you needed."\n\n**Body (3-15s):**\nShow the common problem clearly. Then introduce the solution with dynamic cuts. Highlight 3 key benefits.\n\n**Call to Action (15s+):**\n"Click the link to learn more!"`);
        setLoading(false);
        toast.success('✅ Tạo ý tưởng thành công!');
    }, 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto bg-[#1A1F2E]">
        <FeatureHeader 
          title="Video Idea Generator" 
          description="Lên ý tưởng kịch bản video viral"
          icon={Lightbulb}
          badge="Free"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">Chủ đề / Sản phẩm</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="VD: Kem dưỡng da, Review công nghệ..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#6B7280] bg-[#252D3D] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">Đối tượng người xem (Tùy chọn)</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="VD: Gen Z, Nhân viên văn phòng..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#6B7280] bg-[#252D3D] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10">
             <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className={`w-full h-12 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                    !topic.trim()
                        ? 'bg-[#6B7280]/50 cursor-not-allowed text-[#B0B8C4]' 
                        : 'bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-[0_0_15px_rgba(0,188,212,0.3)]'
                }`}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 
                        Đang sáng tạo...
                    </>
                ) : "Tạo Ý Tưởng"}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0A0E13] p-6 lg:p-10 overflow-hidden flex flex-col">
         <div className="flex-1 bg-[#1A1F2E] rounded-xl border border-white/10 shadow-sm p-6 overflow-auto">
             {result ? (
                 <div className="prose prose-invert max-w-none">
                     <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                        <FileText className="w-5 h-5 text-[#00BCD4]" /> Kịch Bản Video
                     </h3>
                     <pre className="whitespace-pre-wrap font-sans text-sm bg-[#252D3D] p-4 rounded-xl leading-relaxed border border-white/10 text-gray-300">
                         {result}
                     </pre>
                 </div>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#6B7280] opacity-60">
                    <Target className="w-16 h-16 mb-4" />
                    <p>Nhập chủ đề để AI gợi ý kịch bản</p>
                </div>
             )}
         </div>
      </div>
    </div>
  );
}
