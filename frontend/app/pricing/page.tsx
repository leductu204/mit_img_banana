'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PricingCard, { PackageProps } from '@/components/pricing/PricingCard';
import Header from "@/components/layout/Header";
import { Megaphone, Check } from 'lucide-react';
import { getToken } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { Button } from "@/components/ui/button";

function PricingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activePlan, setActivePlan] = useState('professional');
    const [pollingOrder, setPollingOrder] = useState<number | null>(null);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'cancelled' | null>(null);
    
    const handleSelect = (pkgId: string) => {
        setActivePlan(pkgId);
    };

    const handleBuy = async (pkgId: string) => {
        if (pkgId === 'unlimited') return; // Incoming

        // Check for token first
        const token = getToken();
        if (!token) {
            alert("Vui lòng đăng nhập để thực hiện thanh toán");
            return;
        }

        try {
            // Call backend to create payment link
            const data = await apiRequest<{ checkoutUrl: string, orderCode: number }>('/api/payment/create-link', {
                method: 'POST',
                body: JSON.stringify({ plan_id: pkgId })
            });

            // Open Payment Link in New Tab
            window.open(data.checkoutUrl, '_blank');
            
            setCheckoutUrl(data.checkoutUrl);
            // Start Polling
            setPollingOrder(data.orderCode);
            setPaymentStatus('pending');
            
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Có lỗi xảy ra khi kết nối tới server");
        }
    };
    
    // Polling Logic
    useEffect(() => {
        if (!pollingOrder) return;

        console.log("Starting polling for order:", pollingOrder);
        const interval = setInterval(async () => {
            try {
                const data = await apiRequest<{ status: string }>('/api/payment/orders/' + pollingOrder);
                console.log("Polling status:", data.status);
                
                if (data.status === 'PAID') {
                    setPaymentStatus('success');
                    setPollingOrder(null); // Stop polling
                    // Page reload or redirect to force refresh data
                    // setTimeout(() => window.location.reload(), 2000);
                } else if (data.status === 'CANCELLED') {
                    setPaymentStatus('cancelled');
                    setPollingOrder(null);
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(interval);
    }, [pollingOrder]);
    
    // Check URL Params for Return flow
    useEffect(() => {
        const orderCode = searchParams.get('order_code') || searchParams.get('orderCode');
        const status = searchParams.get('status');
        const code = searchParams.get('code'); // PayOS specific
        
        // If we have an order code and it's not already being polled
        if (orderCode && !pollingOrder && !paymentStatus) {
            console.log("Found order in URL:", orderCode);
            
            const checkOrder = async () => {
                try {
                    const data = await apiRequest<{ status: string }>('/api/payment/orders/' + orderCode);
                    console.log("URL Order status:", data.status);
                    
                    if (data.status === 'PAID') {
                        setPaymentStatus('success');
                        // Optional: Clean URL
                        // router.replace('/pricing'); 
                    } else if (data.status === 'CANCELLED') {
                        setPaymentStatus('cancelled');
                    } else if (data.status === 'PENDING') {
                        // If still pending, maybe start polling?
                        setPollingOrder(Number(orderCode));
                        setPaymentStatus('pending');
                    }
                } catch (error) {
                    console.error("Error checking URL order:", error);
                }
            };
            
            checkOrder();
        }
    }, [searchParams, pollingOrder, paymentStatus]);

    const packages: PackageProps[] = [
        {
            id: 'starter',
            name: 'Gói Trải Nghiệm',
            price: '99.000',
            currency: 'VNĐ',
            credits: '1500',
            highlightCredits: '2000',
            duration: '1 tháng',
            variant: 'blue',

            // link: 'https://zalo.me/0352143210', 
            cornerBadgeText: 'BONUS',
            features: [
                { text: '400 Ảnh/tháng', highlightText: '400 Ảnh' },
                { text: '100 Video/tháng', highlightText: '100 Video' },
                { text: '2 luồng xử lý song song', highlightText: '2 luồng', subtitle: '5 Hàng đợi' },
                { text: 'Fast Mode', highlightText: 'Fast Mode' },
            ],
            onSelect: handleSelect,
            onBuy: handleBuy
        },
        {
            id: 'professional',
            name: 'Gói Tiết Kiệm',
            price: '199.000',
            currency: 'VNĐ',
            credits: '3000',
            highlightCredits: '4500',
            duration: '1 tháng',
            badge: 'PHỔ BIẾN',
            variant: 'purple',
 
            // link: 'https://zalo.me/0352143210',
            cornerBadgeText: 'BONUS',
            features: [
                { text: '900 Ảnh/tháng', highlightText: '900 Ảnh' },
                { text: '250 Video/tháng', highlightText: '250 Video' },
                { text: '4 luồng xử lý song song', highlightText: '4 luồng', subtitle: '15 Hàng đợi'},
                { text: 'Fast Mode (Ưu tiên)', highlightText: 'Fast Mode' }
            ],
            onSelect: handleSelect,
            onBuy: handleBuy
        },
        {
            id: 'business',
            name: 'Gói Sáng Tạo',
            price: '499.000',
            currency: 'VNĐ',
            credits: '7500',
            highlightCredits: '13000',
            duration: '1 tháng',
            variant: 'green',

            // link: 'https://zalo.me/0352143210',
            cornerBadgeText: 'EXTRA',
            features: [
                { text: '2600 Ảnh/tháng', highlightText: '2600 Ảnh' },
                { text: '700 Video/tháng', highlightText: '700 Video' },
                { text: '6 luồng xử lý song song', highlightText: '6 luồng', subtitle: '30 Hàng đợi' },
                { text: 'Fast Mode', highlightText: 'Fast Mode' },
            ],
            onSelect: handleSelect,
            onBuy: handleBuy
        },
        {
            id: 'unlimited',
            name: 'Unlimited (Sắp ra mắt)',
            price: 'INCOMING',
            currency: '',
            credits: 'Toàn bộ',
            duration: '1 Năm',
            variant: 'orange',

            isComingSoon: true,
            features: [
                { text: 'Không giới hạn Credit' },
                { text: 'Full tính năng Pro' },
                { text: 'Hỗ trợ VIP 24/7' },
                { text: 'Tốc độ xử lý tối đa' }
            ],
            onSelect: handleSelect
        }
    ];

    return (
        <div className="relative max-w-[1600px] mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Status Notifications */}
            {paymentStatus === 'pending' && pollingOrder && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1A1F2E] p-8 rounded-2xl border border-white/10 max-w-md w-full text-center space-y-6 shadow-2xl relative">
                        <div className="animate-spin w-16 h-16 border-4 border-[#00BCD4] border-t-transparent rounded-full mx-auto"></div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Đang chờ thanh toán...</h3>
                            <p className="text-slate-400">
                                Cổng thanh toán đã được mở trong tab mới.<br/>
                                Vui lòng hoàn tất thanh toán để tiếp tục.
                            </p>
                            {checkoutUrl && (
                                <p className="text-sm text-slate-400 mt-2">
                                    Không thấy trang thanh toán?{' '}
                                    <a 
                                        href={checkoutUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[#00BCD4] hover:text-[#67E8F9] hover:underline transition-colors"
                                    >
                                        Nhấn vào đây để mở trang thanh toán
                                    </a>
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-slate-500">Mã đơn hàng: #{pollingOrder}</p>
                             <button 
                                className="text-slate-400 hover:text-white text-sm underline decoration-slate-600 hover:decoration-white transition-all"
                                onClick={() => setPollingOrder(null)}
                            >
                                Hủy theo dõi (Đóng)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {paymentStatus === 'success' && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                     <div className="bg-[#1A1F2E] p-8 rounded-2xl border border-green-500/30 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-green-500/30">
                            <Check className="w-10 h-10 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Thanh toán thành công!</h3>
                            <p className="text-slate-400">
                                Gói cước của bạn đã được nâng cấp.<br/>
                                Cảm ơn bạn đã sử dụng dịch vụ.
                            </p>
                        </div>
                        <Button 
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg shadow-lg shadow-green-900/20"
                            onClick={() => window.location.reload()}
                        >
                            Hoàn tất
                        </Button>
                    </div>
                </div>
            )}
            
            {/* Promo Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0F1623] to-slate-900 border border-white/5 p-6 mb-12 shadow-2xl shadow-black/20">
                {/* Decorative Blurs */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#00BCD4]/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                    <div className="flex items-center gap-6">
                        <div className="bg-gradient-to-br from-[#00BCD4]/20 to-[#00BCD4]/5 p-4 rounded-2xl ring-1 ring-white/10">
                            <Megaphone className="w-8 h-8 text-[#00BCD4]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-wide">
                                Đại Tiệc AI - <span className="bg-gradient-to-r from-[#00BCD4] to-[#67E8F9] bg-clip-text text-transparent">Khuyến mãi Credits!</span>
                            </h3>
                            <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-xl">
                                Nạp credit ngay hôm nay để nhận bonus tới <span className="text-[#00BCD4] font-semibold">75% Credits</span>. 
                                {/* Ưu đãi hấp dẫn này chỉ có hiệu lực đến hết ngày <span className="text-white font-medium">15/01/2026</span>. */}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-start">
                {packages.map((pkg) => (
                    <PricingCard 
                        key={pkg.id} 
                        pk={pkg} 
                        isHighlighted={pkg.id === activePlan}
                    />
                ))}
            </div>
        </div>
    );
}

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[#0A0E13] text-white">
            <Header />
            <main className="overflow-y-auto">
                <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                    <PricingContent />
                </Suspense>
            </main>
        </div>
    );
}
