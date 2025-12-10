// app/auth/callback/page.tsx
/**
 * OAuth callback handler - receives code from Google and exchanges for JWT
 */

"use client"

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { Loader2, AlertCircle } from 'lucide-react';
import Button from '@/components/common/Button';
import { useToast } from '@/hooks/useToast';

function CallbackContent() {
    const router = useRouter();
    const { success } = useToast();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const handleCallback = async () => {
            // Check for token in URL (backend redirect mode)
            const token = searchParams.get('token');
            if (token) {
                setToken(token);
                success('🎉 Đăng nhập thành công!');
                
                // Use window.location for hard reload to ensure auth state is fresh
                setTimeout(() => {
                    window.location.href = '/create-image';
                }, 200);
                return;
            }

            // Check for code (API mode - need to exchange)
            const code = searchParams.get('code');
            if (code) {
                try {
                    const response = await fetch(
                        `${NEXT_PUBLIC_API}/auth/google/callback?code=${encodeURIComponent(code)}&mode=api`,
                        { method: 'GET' }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        if (data.access_token) {
                            setToken(data.access_token);
                            success('🎉 Đăng nhập thành công!');
                            
                            // Use window.location for hard reload
                            setTimeout(() => {
                                window.location.href = '/create-image';
                            }, 200);
                            return;
                        }
                    }

                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || 'Đăng nhập thất bại');
                } catch (err) {
                    console.error('Auth callback error:', err);
                    setError('Đã xảy ra lỗi khi xử lý đăng nhập');
                }
            } else {
                // Check for error from OAuth
                const oauthError = searchParams.get('error');
                if (oauthError) {
                    setError(`OAuth error: ${oauthError}`);
                } else {
                    setError('Không có mã xác thực');
                }
            }

            setIsProcessing(false);
        };

        handleCallback();
    }, [searchParams, router, success]);

    if (isProcessing && !error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-[#0F766E]" />
                    <p className="text-lg text-foreground">Đang xử lý đăng nhập...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="bg-card border border-border rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        Đăng nhập thất bại
                    </h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button
                        onClick={() => router.push('/login')}
                        className="bg-[#0F766E] hover:bg-[#0D655E] text-white"
                    >
                        Thử lại
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-[#0F766E]" />
                    <p className="text-lg text-foreground">Đang tải...</p>
                </div>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
