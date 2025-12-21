"use client"

import React, { useState, useEffect } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import { Video, Search, MessageSquare, Target } from "lucide-react";
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
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Video Analysis" 
          description="Phân tích nội dung video với AI"
          icon={Video}
          badge="Pro"
        />

        <div className="space-y-6 flex-1">
           {/* Mode Selector */}
           <div className="space-y-2">
                <label className="text-sm font-medium">Chế độ phân tích</label>
                <select 
                    className="w-full p-2 rounded-md border border-input bg-background"
                    value={currentFeature?.id || ''}
                    onChange={(e) => setFeature(e.target.value)}
                >
                    {ANALYSIS_MODES.map(mode => (
                        <option key={mode.id} value={mode.id}>{mode.label}</option>
                    ))}
                </select>
           </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">URL Video (TikTok, YouTube, Facebook)</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://tiktok.com/@user/video/..."
              className="w-full p-3 rounded-md border border-input bg-background text-sm focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>Hệ thống sẽ phân tích video từ link bạn cung cấp để tạo ra kết quả tương ứng với chế độ đã chọn.</p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleAnalyze}
                disabled={loading || !videoUrl.trim()}
                className="w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 bg-[#0F766E] hover:bg-[#0D655E] text-white"
            >
                {loading ? "Đang phân tích..." : "Phân Tích Ngay"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <div className="flex-1 bg-card rounded-xl border border-border shadow-sm p-6 overflow-auto">
             {result ? (
                 <div className="prose dark:prose-invert max-w-none">
                     <h3 className="text-xl font-bold mb-4">Kết Quả Phân Tích</h3>
                     <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg">
                         {result}
                     </pre>
                 </div>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                    <Search className="w-16 h-16 mb-4" />
                    <p>Kết quả phân tích sẽ hiển thị ở đây</p>
                </div>
             )}
         </div>
      </div>
    </div>
  );
}
