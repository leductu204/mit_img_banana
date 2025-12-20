"use client"

import { useState, useEffect } from 'react';
import { X, ExternalLink, Image as ImageIcon, Film, FileText, Calendar, Activity, Sliders, AlertTriangle, Download } from 'lucide-react';
import { Job } from '@/hooks/useJobs';
import { cleanPrompt } from '@/lib/prompt-utils';

interface JobDetailsModalProps {
    job: Job;
    open: boolean;
    onClose: () => void;
}

export default function JobDetailsModal({ job, open, onClose }: JobDetailsModalProps) {
    const [inputImages, setInputImages] = useState<any[]>([]);
    const [inputParams, setInputParams] = useState<any>({});

    useEffect(() => {
        if (open && job) {
            // Parse Input Images
            try {
                if (job.input_images) {
                    const parsed = JSON.parse(job.input_images);
                    setInputImages(Array.isArray(parsed) ? parsed : [parsed]);
                } else {
                    setInputImages([]);
                }
            } catch (e) {
                console.error("Failed to parse input images", e);
                setInputImages([]);
            }

            // Parse Input Params
            try {
                if (job.input_params) {
                    setInputParams(JSON.parse(job.input_params));
                } else {
                    setInputParams({});
                }
            } catch (e) {
                console.error("Failed to parse input params", e);
                setInputParams({});
            }
        }
    }, [open, job]);

    if (!open) return null;

    // Helper to format key names
    const formatKey = (key: string) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-primary/10 text-primary`}>
                            {['t2v', 'i2v'].includes(job.type) ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Chi tiết</h3>
                            <p className="text-xs text-muted-foreground font-mono">{job.job_id}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    
                    {/* Status Section */}
                    <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Trạng thái
                            </span>
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold capitalize
                                ${job.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                                  job.status === 'failed' ? 'bg-red-500/10 text-red-500' : 
                                  'bg-blue-500/10 text-blue-500'}`}>
                                {job.status}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                                <Sliders className="w-3 h-3" /> Model
                            </span>
                            <span className="text-sm font-medium">{job.model}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Ngày tạo
                            </span>
                            <span className="text-sm font-medium">
                                {new Date(job.created_at).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Prompt */}
                    {(() => {
                        const cleaned = cleanPrompt(job.prompt);
                        const isSystemPrompt = ["Restore Old Photo", "Upscale Image"].includes(cleaned) || 
                                              (job.prompt && job.prompt.toLowerCase().includes("critical task:"));
                        
                        if (isSystemPrompt && job.type !== 't2i') return null;

                        return (
                            <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                    <FileText className="w-4 h-4 text-primary" /> Prompt
                                </h4>
                                <div className="bg-muted p-3 rounded-lg text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                    {cleaned}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Failed Message */}
                    {job.status === 'failed' && job.error_message && (
                        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-500">
                                <AlertTriangle className="w-4 h-4" /> Error Description
                            </h4>
                            <p className="text-sm text-red-500/80 font-mono text-xs">
                                {job.error_message}
                            </p>
                        </div>
                    )}

                    {/* Input Images */}
                    {inputImages.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                <ImageIcon className="w-4 h-4 text-primary" /> Input Images
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {inputImages.map((img, idx) => (
                                    <a 
                                        key={idx} 
                                        href={img.url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="block relative aspect-[2/3] md:aspect-square bg-muted rounded-lg overflow-hidden border border-border group"
                                    >
                                        <img 
                                            src={img.url} 
                                            alt={`Input ${idx}`} 
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Config Parameters */}
                    {Object.keys(inputParams).filter(k => {
                        if (k === 'prompt') {
                            const cleaned = cleanPrompt(inputParams[k]);
                            return !(["Restore Old Photo", "Upscale Image"].includes(cleaned) || 
                                     (inputParams[k] && inputParams[k].toLowerCase().includes("critical task:")));
                        }
                        return true;
                    }).length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                <Sliders className="w-4 h-4 text-primary" /> Configuration
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                {Object.entries(inputParams)
                                    .filter(([k, v]) => {
                                        if (k === 'prompt') {
                                            const cleaned = cleanPrompt(String(v));
                                            return !(["Restore Old Photo", "Upscale Image"].includes(cleaned) || 
                                                     (String(v).toLowerCase().includes("critical task:")));
                                        }
                                        return true;
                                    })
                                    .map(([k, v]) => (
                                    <div key={k} className="flex justify-between py-1 border-b border-border/50">
                                        <span className="text-muted-foreground">{formatKey(k)}</span>
                                        <span className="font-mono text-foreground">{String(v)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {job.output_url && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                <CheckCircle className="w-4 h-4 text-green-500" /> Kết quả
                            </h4>
                            <div className="rounded-lg overflow-hidden border border-border bg-black/5">
                                {['t2v', 'i2v'].includes(job.type) ? (
                                    <video 
                                        src={job.output_url} 
                                        controls 
                                        className="w-full max-h-[300px] object-contain"
                                        poster={job.output_url.replace('.mp4', '.jpg')} // naive poster guess if applicable
                                    />
                                ) : (
                                    <img 
                                        src={job.output_url} 
                                        alt="Result" 
                                        className="w-full max-h-[300px] object-contain"
                                    />
                                )}
                                <div className="p-3 bg-muted/50 border-t border-border flex justify-end">
                                    <a 
                                        href={job.output_url} 
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Tải xuống
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Icon helper
function CheckCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    );
}
