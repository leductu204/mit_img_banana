"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import { Mic, Volume2, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import ResultPreview from "../shared/ResultPreview";

const VOICES = [
    { id: 'f1', name: 'Chị Google' },
    { id: 'm1', name: 'Mạnh Dũng (News)' },
    { id: 'f2', name: 'Thảo Chi (Story)' },
    { id: 'm2', name: 'Nam Trung (Review)' },
];

export default function TextToSpeechForm() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("f1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(undefined);
    
    setTimeout(() => {
        setResult("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
        setLoading(false);
        toast.success('✅ Chuyển văn bản thành giọng nói thành công!');
    }, 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-border p-6 flex flex-col overflow-y-auto">
        <FeatureHeader 
          title="Text to Speech" 
          description="Chuyển văn bản thành giọng nói tự nhiên"
          icon={Mic}
          badge="Free"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Văn bản cần đọc</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập nội dung vào đây..."
              className="min-h-[140px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Chọn giọng đọc</label>
            <div className="grid grid-cols-2 gap-2">
                {VOICES.map((v) => (
                    <button
                        key={v.id}
                        onClick={() => setVoice(v.id)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all text-left flex items-center gap-2 ${
                            voice === v.id 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-background hover:bg-muted border-input'
                        }`}
                    >
                        <Volume2 className="w-3.5 h-3.5" /> {v.name}
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
             <Button
                onClick={handleGenerate}
                disabled={loading || !text.trim()}
                className="w-full font-medium h-11 rounded-md shadow-sm transition-all duration-200 bg-[#0F766E] hover:bg-[#0D655E] text-white"
            >
                {loading ? "Đang xử lý..." : "Đọc Ngay"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex items-center justify-center">
         <ResultPreview
            loading={loading}
            resultUrl={result}
            status="completed"
            type="audio"
            placeholderTitle="Text to Speech"
            placeholderDesc="Nhập văn bản và chọn giọng đọc để bắt đầu."
            onRegenerate={handleGenerate}
         />
      </div>
    </div>
  );
}
