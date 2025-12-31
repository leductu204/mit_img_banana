"use client";

import React, { useState } from "react";
import { Download, Link as LinkIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

import { getToken } from "@/lib/auth";

// ... existing imports

export default function SoraPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background overflow-hidden relative">
        <MobileNav />
        <Sidebar />
        <main className="flex-1 pt-[57px] md:pt-0 overflow-auto flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Sora Downloader</h1>
              <p className="text-muted-foreground text-sm">Tải video không logo từ Sora (tramsangtao.com)</p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
              <form onSubmit={handleDownloadLink} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Sora Video URL</label>
                  <div className="relative flex items-center bg-muted/50 rounded-xl border border-input focus-within:border-primary transition-colors">
                    <LinkIcon className="w-4 h-4 text-muted-foreground ml-4 absolute" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://sora.chatgpt.com/p/..."
                      className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground/50 pl-11 pr-4 py-3"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !url}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Lấy Link Tải
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive text-sm animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {downloadLink && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-4 border-t border-border mt-4 space-y-4">
                   {/* Video Preview */}
                   <div className="rounded-xl overflow-hidden border border-border bg-black/5 aspect-video relative group">
                      <video 
                        controls 
                        autoPlay 
                        className="w-full h-full object-contain"
                        src={downloadLink} 
                      />
                   </div>

                   {/* Download Button */}
                  <button
                    onClick={handleDownloadFile}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 font-medium transition-colors text-sm group shadow-sm hover:shadow-md"
                  >
                    <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Tải Video Ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
