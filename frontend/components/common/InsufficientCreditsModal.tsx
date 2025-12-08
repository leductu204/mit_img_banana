"use client"

// components/common/InsufficientCreditsModal.tsx
/**
 * Modal shown when user doesn't have enough credits
 */

import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';
import { useRouter } from 'next/navigation';

interface InsufficientCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    required: number;
    available: number;
}

export default function InsufficientCreditsModal({
    isOpen,
    onClose,
    required,
    available,
}: InsufficientCreditsModalProps) {
    const router = useRouter();
    const missing = required - available;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md animate-in fade-in zoom-in-95 duration-200 p-4">
                <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="relative bg-amber-500 p-6 text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-8 w-8" />
                            <h2 className="text-xl font-bold">Không đủ credits</h2>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center py-2 border-b border-border">
                                <span className="text-muted-foreground">Bạn cần:</span>
                                <span className="font-semibold text-foreground">{required} credits</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border">
                                <span className="text-muted-foreground">Hiện có:</span>
                                <span className="font-semibold text-foreground">{available} credits</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-muted-foreground">Thiếu:</span>
                                <span className="font-semibold text-red-500">{missing} credits</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                onClick={onClose}
                                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                            >
                                Đóng
                            </Button>
                            <Button
                                onClick={() => {
                                    onClose();
                                    router.push('/account');
                                }}
                                className="flex-1 bg-[#0F766E] hover:bg-[#0D655E] text-white"
                            >
                                Xem tài khoản
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
