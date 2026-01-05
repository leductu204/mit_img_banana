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
  type?: 'image' | 'video' | 'audio' | 'custom';
  children?: React.ReactNode;
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
  type = 'image',
  children,
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
        toast.info('Đang tải xuống...', 2000);
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'png';
        a.download = `studio-result-${Date.now()}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Tải xuống thành công!');
    } catch (error) {
        console.error('Download failed:', error);
        toast.error('Lỗi khi tải xuống');
    }
  };

  const hasResult = (!!resultUrl || !!children) && !loading;

  const renderContent = () => {
      if (children) return children;

      if (type === 'video' && resultUrl) {
          return (
              <video 
                  src={resultUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-contain bg-black"
              />
          );
      }

      if (type === 'audio' && resultUrl) {
          return (
              <div className="w-full h-full flex items-center justify-center bg-[#0A0E13]/50 p-8">
                  <div className="bg-[#1F2833] w-full max-w-md p-6 rounded-xl border border-white/10 shadow-lg flex flex-col items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-[#00BCD4]/10 flex items-center justify-center text-[#00BCD4] animate-pulse">
                          <Download className="w-10 h-10" />
                      </div>
                      <div className="w-full">
                          <audio src={resultUrl} controls className="w-full" />
                      </div>
                  </div>
              </div>
          );
      }

      // Default Image
      if (resultUrl) {
          return (
              <img
                  src={resultUrl}
                  alt="Generated result"
                  className="w-full h-full object-contain"
              />
          );
      }
      return null;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className={`
        w-full rounded-2xl bg-[#1F2833] border border-white/10 overflow-hidden transition-all duration-300 flex flex-col
        ${hasResult 
            ? 'shadow-[0_8px_32px_rgba(0,0,0,0.3)]' 
            : 'shadow-sm'}
      `}>
        {/* Main Content Area */}
        <div className={`
            w-full relative bg-[#0A0E13]/50 flex-1 flex items-center justify-center overflow-hidden
            ${!hasResult ? 'min-h-[400px] p-8' : ''}
            ${type === 'image' || type === 'custom' ? 'aspect-[3/4] max-h-[calc(100vh-16rem)]' : ''}
            ${type === 'video' ? 'aspect-video' : ''}
            ${type === 'audio' ? 'aspect-video' : ''}
        `}>
            {loading ? (
                <div className="flex flex-col items-center gap-4 text-[#6B7280] animate-pulse text-center">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-[#252D3D] border-t-[#00BCD4] animate-spin" />
                    </div>
                    <p className="text-sm font-medium">
                        {status === 'pending'
                            ? 'Đang hàng đợi... Vui lòng đợi'
                            : 'Đang xử lý...'}
                    </p>
                </div>
            ) : hasResult ? (
                <>
                    {renderContent()}

                    {/* Metadata Toggle (Only for visual types) */}
                    {details && type !== 'audio' && !children && (
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
                    {showMetadata && details && type !== 'audio' && !children && (
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
                <div className="flex flex-col items-center gap-4 text-[#6B7280] p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-[#252D3D] flex items-center justify-center mb-2">
                        <ImageIcon className="h-8 w-8 opacity-40" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-lg mb-1">{placeholderTitle}</h3>
                        <p className="text-sm text-[#00BCD4] max-w-[250px] mx-auto">
                            {placeholderDesc}
                        </p>
                    </div>
                </div>
            )}
        </div>

        {/* Action Bar (Below Content) */}
        {hasResult && !loading && (
            <div className="p-4 border-t border-white/10 bg-[#1A1F2E]/50 backdrop-blur-sm flex items-center justify-center gap-4 relative z-20">
                {canRegenerate && onRegenerate && (
                    <Button
                        onClick={onRegenerate}
                        className="h-10 px-6 rounded-full bg-[#252D3D] hover:bg-[#1F2833] text-[#B0B8C4] hover:text-white shadow-sm transition-all duration-200 hover:scale-[1.02]"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tạo lại
                    </Button>
                )}
                {(resultUrl || onDownload) && (
                    <Button
                        onClick={handleDownload}
                        className="h-10 px-8 rounded-full bg-[#00BCD4] hover:bg-[#22D3EE] text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Tải xuống
                    </Button>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
