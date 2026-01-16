"use client";

import React, { useState } from "react";
import { Download, Link as LinkIcon, AlertCircle, Lightbulb, Copy, Bell, Coins, Loader2, PlayCircle, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import Image from "next/image";
import { useCredits } from "@/hooks/useCredits";
import { getToken } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function SoraPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { balance } = useCredits();

  // Generation state
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("15");
  const [ratio, setRatio] = useState("landscape");
  const [image, setImage] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<{id: string, status: string} | null>(null);

  const handleDownloadLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setDownloadLink(null);

    try {
      const token = getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/sora/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to get download link");
      }

      setDownloadLink(data.download_url);
      toast.success("Link tải xuống đã sẵn sàng!");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async () => {
    if (!downloadLink) return;
    
    try {
      const token = getToken();
      toast.info("Đang bắt đầu tải xuống...");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/sora/proxy-download?url=${encodeURIComponent(downloadLink)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Không thể tải video từ server");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sora-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Tải xuống thành công!");
    } catch (e: any) {
      console.error("Download failed:", e);
      toast.error("Lỗi khi tải xuống: " + e.message);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setGenLoading(true);
    setGenResult(null);
    setError(null);

    try {
        const token = getToken();
        // Remove data:image... prefix if exists before sending? 
        // No, backend expects to handle it or we can clean it here.
        // Backend router splits by comma, so raw data url is fine.
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/sora/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                prompt,
                duration: parseInt(duration),
                ratio,
                image: image || undefined
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Generation failed");

        setGenResult(data);
        toast.success("Đã gửi yêu cầu tạo video!");
    } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
    } finally {
        setGenLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0A0E13] font-sans selection:bg-[#00BCD4] selection:text-white">
        {/* Header */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-10 py-3 bg-[#0A0E13]/95 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center gap-4 text-white">
                <div className="relative size-8">
                    <Image src="/icon.png" alt="Logo" fill className="object-contain" />
                </div>
                <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">Trạm Sáng Tạo</h2>
            </div>
            
            <nav className="flex flex-1 justify-center gap-9">
                <Link className="text-[#B0B8C4] hover:text-white transition-colors text-sm font-medium leading-normal" href="/">Trang chủ</Link>
                <Link className="text-[#B0B8C4] hover:text-white transition-colors text-sm font-medium leading-normal" href="/image">Ảnh</Link>
                <Link className="text-[#B0B8C4] hover:text-white transition-colors text-sm font-medium leading-normal" href="/video">Video</Link>
                <Link className="text-[#B0B8C4] hover:text-white transition-colors text-sm font-medium leading-normal" href="/studio">Studio</Link>
                <Link className="text-white text-sm font-medium leading-normal relative py-1" href="/sora">
                    Tiện ích
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00BCD4] rounded-full"></span>
                </Link>
            </nav>

            <div className="flex items-center justify-end gap-3 w-auto min-w-[200px]">
                {/* Credits */}
                <button className="flex items-center justify-center rounded-xl h-10 px-3 bg-[#1F2833] hover:bg-[#2d3748] border border-white/5 transition-colors text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em]">
                    <Coins className="w-5 h-5 text-[#fbbf24]" />
                    <span>{balance !== undefined ? balance : '...'}</span>
                </button>
                
                {/* Notifications */}
                <button className="flex size-10 items-center justify-center rounded-xl bg-[#1F2833] hover:bg-[#2d3748] border border-white/5 transition-colors text-white relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-[#1F2833]"></span>
                </button>
                
                <div className="bg-center bg-no-repeat bg-cover rounded-xl size-10 border border-white/10 cursor-pointer bg-slate-700 font-bold flex items-center justify-center">
                    U
                </div>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex flex-col items-center w-full px-6 py-12">
          
          <div className="w-full max-w-[900px] flex flex-col items-center text-center">
            
            <Tabs defaultValue="download" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#1F2833]/50 mb-12 border border-white/10 p-1 rounded-xl h-14">
                    <TabsTrigger value="download" className="rounded-lg h-12 text-base data-[state=active]:bg-[#00BCD4] data-[state=active]:text-white">Download Video</TabsTrigger>
                    <TabsTrigger value="create" className="rounded-lg h-12 text-base data-[state=active]:bg-[#00BCD4] data-[state=active]:text-white">Generate Video</TabsTrigger>
                </TabsList>

                {/* DOWNLOAD TAB */}
                <TabsContent value="download" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-white tracking-tight text-4xl md:text-5xl font-black mb-4 bg-gradient-to-br from-white to-[#9CA3AF] bg-clip-text text-transparent">
                    Sora Downloader
                    </h1>
                    <p className="text-[#9CA3AF] text-lg max-w-xl mx-auto mb-10">
                    Paste your Sora video link below to download high-quality generations instantly.
                    </p>

                    <div className="w-full bg-[#1F2833] p-2 rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm">
                        <form onSubmit={handleDownloadLink} className="flex flex-col sm:flex-row items-stretch gap-2">
                            <div className="relative flex-grow group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <LinkIcon className="w-5 h-5 text-[#9CA3AF] group-focus-within:text-[#00BCD4] transition-colors" />
                                </div>
                                <input 
                                    className="block w-full pl-11 pr-4 py-4 bg-[#0A0E13] border border-transparent rounded-xl text-white placeholder-[#6B7280] focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] sm:text-base outline-none transition-all"
                                    placeholder="https://sora.com/..." 
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={loading || !url}
                                className="bg-[#00BCD4] hover:bg-[#22D3EE] text-white font-bold py-3 sm:py-0 px-8 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,188,212,0.3)] active:scale-95 flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Download className="w-5 h-5" />
                                        <span>Lưu lại</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {error && (
                        <div className="mt-6 w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p>{error}</p>
                        </div>
                    )}

                    {downloadLink && (
                        <div className="w-full mt-6 bg-[#1F2833] border border-white/10 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="aspect-video relative rounded-lg overflow-hidden border border-white/10 bg-black/50 mb-4 group">
                                <video 
                                    controls 
                                    autoPlay 
                                    className="w-full h-full object-contain"
                                    src={downloadLink} 
                                />
                            </div>
                            <button
                                onClick={handleDownloadFile}
                                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition-all shadow-lg hover:shadow-green-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Download className="w-4 h-4" />
                                Download Now
                            </button>
                        </div>
                    )}

                    {!downloadLink && (
                        <div className="w-full mt-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            <div className="flex items-center gap-2 text-white/80 px-2">
                                <Lightbulb className="w-5 h-5 text-[#00BCD4]" />
                                <span className="font-medium">Hướng dẫn lấy link:</span>
                            </div>
                            <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/50">
                                <Image 
                                    src="/sora_guide.jpg" 
                                    alt="Hướng dẫn lấy link Sora" 
                                    fill 
                                    className="object-contain"
                                    sizes="(max-width: 800px) 100vw, 800px"
                                />
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* CREATE TAB */}
                <TabsContent value="create" className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                     <div className="mb-8 text-center">
                        <h1 className="text-white tracking-tight text-4xl font-black mb-2">
                            Sora Video Generator
                        </h1>
                        <p className="text-[#9CA3AF]">
                           Generate standard or pro videos using shared Sora accounts.
                        </p>
                    </div>

                    <div className="bg-[#1F2833]/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        
                        <div className="space-y-6">
                            {/* Prompt Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Prompt</label>
                                <Textarea 
                                    placeholder="Describe your video idea in detail..." 
                                    className="bg-[#0A0E13] border-white/10 min-h-[120px] text-base resize-none focus:border-[#00BCD4] focus:ring-[#00BCD4]"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                            </div>

                            {/* Image Upload Input */}
                             <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Image (Optional - for I2V)</label>
                                <div className="bg-[#0A0E13] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center border-dashed hover:border-[#00BCD4]/50 transition-colors cursor-pointer group relative">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                    const result = e.target?.result as string;
                                                    // Store in state (need to add state)
                                                    setImage(result); // Assuming setImage is added
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    {image ? (
                                        <div className="relative w-full h-40">
                                            <Image src={image} alt="Upload preview" fill className="object-contain" />
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault(); 
                                                    setImage(null);
                                                }}
                                                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500/80 transition-colors z-20"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-[#00BCD4] transition-colors">
                                            <Upload className="w-8 h-8" />
                                            <span className="text-sm font-medium">Click or drag image here</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Duration Select */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300 ml-1">Duration</label>
                                    <Select value={duration} onValueChange={setDuration}>
                                        <SelectTrigger className="bg-[#0A0E13] border-white/10 h-11">
                                            <SelectValue placeholder="Select duration" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1F2833] border-white/10">
                                            <SelectItem value="10">10 Seconds (Sora 2.0)</SelectItem>
                                            <SelectItem value="15">15 Seconds (Standard)</SelectItem>
                                            <SelectItem value="25">25 Seconds (Pro)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Ratio Select */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300 ml-1">Aspect Ratio</label>
                                    <Select value={ratio} onValueChange={setRatio}>
                                        <SelectTrigger className="bg-[#0A0E13] border-white/10 h-11">
                                            <SelectValue placeholder="Select ratio" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1F2833] border-white/10">
                                            <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                                            <SelectItem value="portrait">Portrait (9:16)</SelectItem>
                                            <SelectItem value="square">Square (1:1)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={genLoading || !prompt}
                                className="w-full bg-gradient-to-r from-[#00BCD4] to-teal-500 hover:from-[#22D3EE] hover:to-teal-400 text-white font-bold py-4 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,188,212,0.3)] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {genLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing Request...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate Video {image ? '(I2V)' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {genResult && (
                        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 animate-in fade-in">
                            <PlayCircle className="w-6 h-6 shrink-0" />
                            <div>
                                <p className="font-bold">Task Created Successfully!</p>
                                <p className="text-sm opacity-80">Task ID: {genResult.id}</p>
                                <p className="text-xs mt-1 text-green-300/60">Check 'Pending Tasks' in Admin or wait for implementations of user history.</p>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-white/10 py-6 mt-auto">
            <div className="text-center text-[#6B7280] text-xs">
                © {new Date().getFullYear()} Trạm Sáng Tạo. All rights reserved.
            </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}
