"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import { Lightbulb, FileText, Target } from "lucide-react";
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
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Video Idea Generator" 
          description="Lên ý tưởng kịch bản video viral"
          icon={Lightbulb}
          badge="Free"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chủ đề / Sản phẩm</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="VD: Kem dưỡng da, Review công nghệ..."
              className="w-full p-3 rounded-md border border-input bg-background p-3 text-sm focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Đối tượng người xem (Tùy chọn)</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="VD: Gen Z, Nhân viên văn phòng..."
              className="w-full p-3 rounded-md border border-input bg-background p-3 text-sm focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 bg-[#0F766E] hover:bg-[#0D655E] text-white"
            >
                {loading ? "Đang sáng tạo..." : "Tạo Ý Tưởng"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex flex-col">
         <div className="flex-1 bg-card rounded-xl border border-border shadow-sm p-6 overflow-auto">
             {result ? (
                 <div className="prose dark:prose-invert max-w-none">
                     <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Kịch Bản Video
                     </h3>
                     <pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-lg leading-relaxed">
                         {result}
                     </pre>
                 </div>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                    <Target className="w-16 h-16 mb-4" />
                    <p>Nhập chủ đề để AI gợi ý kịch bản</p>
                </div>
             )}
         </div>
      </div>
    </div>
  );
}
