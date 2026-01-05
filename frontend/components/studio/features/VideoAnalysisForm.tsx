"use client"

import React, { useState, useEffect } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import { Video, Search, MessageSquare, Target, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useStudio } from "../StudioContext";
import { getFeatureById } from "@/lib/studio-config";

const ANALYSIS_MODES = [
    { id: 'video-ai-prompt', label: 'Create AI Prompt' },
    { id: 'video-extract-script', label: 'Extract Script' },
    { id: 'video-deep-analysis', label: 'Deep Analysis' },
    { id: 'video-audit-thumbnail', label: 'Audit Thumbnail' },
    { id: 'video-remake-post', label: 'Remake Post' },
    { id: 'video-remake-script', label: 'Remake Script' },
    { id: 'video-tiktok-script', label: 'TikTok Script' },
];

export default function VideoAnalysisForm() {
  const { currentFeature, setFeature } = useStudio();
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const toast = useToast();

  const handleAnalyze = async () => {
    if (!videoUrl.trim()) return;
    setLoading(true);
    
    setTimeout(() => {
        setResult("Analysis Result:\n\nThis is a placeholder for the video analysis result. The actual API would return extracted scripts, prompts, or marketing insights based on the selected mode.");
        setLoading(false);
        toast.success('✅ Phân tích video thành công!');
    }, 3000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto bg-[#1A1F2E]">
        <FeatureHeader 
          title="Video Analysis" 
          description="Phân tích nội dung video với AI"
          icon={Video}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
           {/* Mode Selector */}
           <div className="space-y-2">
                <label className="text-sm font-medium text-[#B0B8C4]">Chế độ phân tích</label>
                <select 
                    className="w-full p-2 rounded-xl border border-[#6B7280] bg-[#252D3D] text-white focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
                    value={currentFeature?.id || ''}
                    onChange={(e) => setFeature(e.target.value)}
                >
                    {ANALYSIS_MODES.map(mode => (
                        <option key={mode.id} value={mode.id} className="bg-[#252D3D]">{mode.label}</option>
                    ))}
                </select>
           </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">URL Video (TikTok, YouTube, Facebook)</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://tiktok.com/@user/video/..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-[#6B7280] bg-[#252D3D] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
            />
          </div>

          <div className="p-4 bg-[#1F2833] rounded-xl text-sm text-[#94A3B8] border border-white/10">
            <p>Hệ thống sẽ phân tích video từ link bạn cung cấp để tạo ra kết quả tương ứng với chế độ đã chọn.</p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10">
             <button
                onClick={handleAnalyze}
                disabled={loading || !videoUrl.trim()}
                className={`w-full h-12 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                    !videoUrl.trim()
                        ? 'bg-[#6B7280]/50 cursor-not-allowed text-[#B0B8C4]' 
                        : 'bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-[0_0_15px_rgba(0,188,212,0.3)]'
                }`}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 
                        Đang phân tích...
                    </>
                ) : "Phân Tích Ngay"}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0A0E13] p-6 lg:p-10 overflow-hidden flex flex-col">
         <div className="flex-1 bg-[#1A1F2E] rounded-xl border border-white/10 shadow-sm p-6 overflow-auto">
             {result ? (
                 <div className="prose prose-invert max-w-none">
                     <h3 className="text-xl font-bold mb-4 text-white">Kết Quả Phân Tích</h3>
                     <pre className="whitespace-pre-wrap font-mono text-sm bg-[#252D3D] p-4 rounded-xl border border-white/10 text-gray-300">
                         {result}
                     </pre>
                 </div>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#6B7280] opacity-60">
                    <Search className="w-16 h-16 mb-4" />
                    <p>Kết quả phân tích sẽ hiển thị ở đây</p>
                </div>
             )}
         </div>
      </div>
    </div>
  );
}
