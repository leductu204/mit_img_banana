"use client"

import React, { useState } from "react";
import Button from "@/components/common/Button";
import FeatureHeader from "../shared/FeatureHeader";
import { Mic, Volume2, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";

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
  const [result, setResult] = useState<boolean>(false);
  
  const toast = useToast();

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(false);
    
    setTimeout(() => {
        setResult(true);
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
                className="w-full py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
                {loading ? "Đang xử lý..." : "Đọc Ngay"}
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 p-6 lg:p-10 overflow-hidden flex items-center justify-center">
         {result ? (
             <div className="bg-card w-full max-w-md p-6 rounded-xl border border-border shadow-lg flex flex-col items-center gap-4 animate-in zoom-in-50 duration-300">
                 <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <PlayCircle className="w-8 h-8" />
                 </div>
                 <h3 className="text-lg font-semibold">Audio đã sẵn sàng</h3>
                 <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-1/3" />
                 </div>
                 <div className="flex gap-2 w-full mt-2">
                    <Button className="flex-1 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground">Nghe thử</Button>
                    <Button className="flex-1">Tải về</Button>
                 </div>
             </div>
         ) : (
            <div className="text-center text-muted-foreground p-8">
                <Mic className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nhập văn bản và chọn giọng đọc để bắt đầu</p>
            </div>
         )}
      </div>
    </div>
  );
}
