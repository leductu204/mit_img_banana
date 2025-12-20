import React, { useState } from "react";
import { Loader2, Download, RefreshCw, Sparkles, Image as ImageIcon, Info } from "lucide-react";
import Button from "@/components/common/Button";
import { useToast } from "@/hooks/useToast";

interface ResultPreviewProps {
  loading: boolean;
  resultUrl?: string;
  status?: string;
  onDownload?: () => void;
  onRegenerate?: () => void;
  placeholderTitle?: string;
  placeholderDesc?: string;
  canRegenerate?: boolean;
  details?: {
    prompt: string;
    model?: string;
    width?: number;
    height?: number;
    aspectRatio?: string;
    resolution?: string;
  };
}

export default function ResultPreview({
  loading,
  resultUrl,
  status,
  onDownload,
  onRegenerate,
  placeholderTitle = "Chưa có kết quả",
  placeholderDesc = "Kết quả xử lý sẽ hiển thị ở đây",
  canRegenerate = true,
  details
}: ResultPreviewProps) {
  const toast = useToast();
  const [showMetadata, setShowMetadata] = useState(false);

  const handleDownload = async () => {
    if (!resultUrl) return;
    if (onDownload) {
        onDownload();
        return;
    }
    
    try {
        toast.info('Đang tải ảnh xuống...', 2000);
        // Direct download using fetch to avoid CORS/browser opening tab issues if possible
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `studio-result-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Tải ảnh thành công!');
    } catch (error) {
        console.error('Download failed:', error);
        toast.error('Lỗi khi tải ảnh');
    }
  };

  const hasResult = !!resultUrl && !loading;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className={`
        w-full rounded-2xl bg-card border border-border/50 overflow-hidden transition-all duration-300
        ${hasResult 
            ? 'shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5' 
            : 'shadow-sm'}
      `}>
        {/* Main Image Area */}
        <div className={`
            w-full aspect-[3/4] max-h-[calc(100vh-16rem)] flex items-center justify-center relative bg-muted/5
            ${!resultUrl && 'p-8'}
        `}>
            {loading ? (
                <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse text-center">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-muted border-t-[#0F766E] animate-spin" />
                    </div>
                    <p className="text-sm font-medium">
                        {status === 'pending'
                            ? 'Đang hàng đợi... Vui lòng đợi'
                            : 'Đang xử lý...'}
                    </p>
                </div>
            ) : resultUrl ? (
                <>
                    <img
                        src={resultUrl}
                        alt="Generated result"
                        className="w-full h-full object-contain"
                    />

                    {/* Metadata Toggle */}
                    {details && (
                        <button 
                            onClick={() => setShowMetadata(!showMetadata)}
                            className={`absolute top-4 right-4 z-10 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-sm ${
                                showMetadata 
                                    ? 'bg-white text-black' 
                                    : 'bg-black/40 hover:bg-black/60 text-white'
                            }`}
                            title={showMetadata ? "Ẩn chi tiết" : "Hiện chi tiết"}
                        >
                            <Info className="w-5 h-5" />
                        </button>
                    )}

                    {/* Metadata Overlay */}
                    {showMetadata && details && (
                         <div className="absolute bottom-0 left-0 right-0 bg-black/75 backdrop-blur-md pt-6 pb-6 px-6 text-white animate-in slide-in-from-bottom-4 duration-300 z-10 text-left">
                              <div className="flex flex-col gap-4">
                                  <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                          <Sparkles className="w-3 h-3" /> Prompt
                                      </div>
                                      <p className="text-sm font-medium text-white/90 italic line-clamp-2 hover:line-clamp-none transition-all">"{details.prompt}"</p>
                                  </div>
                                  <div className="h-px bg-white/10 w-full" />
                                  <div className="flex gap-8">
                                      {details.model && (
                                          <div>
                                              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Model</span>
                                              <span className="text-xs font-semibold">{details.model}</span>
                                          </div>
                                      )}
                                      {details.aspectRatio && (
                                          <div>
                                              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Ratio</span>
                                              <span className="text-xs font-semibold">{details.aspectRatio}</span>
                                          </div>
                                      )}
                                      {details.resolution && (
                                          <div>
                                              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Quality</span>
                                              <span className="text-xs font-semibold">{details.resolution}</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                         </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                        <ImageIcon className="h-8 w-8 opacity-40" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground text-lg mb-1">{placeholderTitle}</h3>
                        <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                            {placeholderDesc}
                        </p>
                    </div>
                </div>
            )}
        </div>

        {/* Action Bar (Inside Card) */}
        {resultUrl && !loading && (
            <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm flex items-center justify-center gap-4 relative z-20">
                {canRegenerate && onRegenerate && (
                    <Button
                        onClick={onRegenerate}
                        className="h-10 px-6 rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:scale-[1.02]"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tạo lại
                    </Button>
                )}
                <Button
                    onClick={handleDownload}
                    className="h-10 px-8 rounded-full bg-gradient-to-r from-[#0F766E] to-[#0D655E] hover:from-[#0D655E] hover:to-[#0B544E] text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Tải xuống
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}
