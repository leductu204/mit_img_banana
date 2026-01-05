"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import { Mic, Volume2, PlayCircle, Loader2 } from "lucide-react";
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
    <div className="flex flex-col lg:flex-row h-full bg-[#0A0E13]">
      <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col overflow-y-auto bg-[#1A1F2E]">
        <FeatureHeader 
          title="Text to Speech" 
          description="Chuyển văn bản thành giọng nói tự nhiên"
          icon={Mic}
          badge="Free"
        />

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">Văn bản cần đọc</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập nội dung vào đây..."
              className="min-h-[140px] w-full resize-none rounded-xl border border-[#6B7280] bg-[#252D3D] p-3 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#B0B8C4]">Chọn giọng đọc</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/20 rounded-xl">
                {VOICES.map((v) => (
                    <button
                        key={v.id}
                        onClick={() => setVoice(v.id)}
                        className={`p-3 rounded-lg text-sm font-medium transition-all text-left flex items-center gap-2 ${
                            voice === v.id 
                                ? 'bg-[#00BCD4]/20 text-[#00BCD4] shadow-sm' 
                                : 'text-[#B0B8C4] hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Volume2 className="w-3.5 h-3.5" /> {v.name}
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10">
             <button
                onClick={handleGenerate}
                disabled={loading || !text.trim()}
                className={`w-full h-12 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                    loading || !text.trim()
                        ? 'bg-[#6B7280]/50 cursor-not-allowed text-[#B0B8C4]' 
                        : 'bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-[0_0_15px_rgba(0,188,212,0.3)]'
                }`}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 
                        Đang xử lý...
                    </>
                ) : "Đọc Ngay"}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0A0E13] p-6 lg:p-10 overflow-hidden flex items-center justify-center">
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
