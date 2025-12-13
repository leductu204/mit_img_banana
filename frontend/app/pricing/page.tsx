'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PricingCard, { PackageProps } from '@/components/pricing/PricingCard';
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { PartyPopper } from 'lucide-react';

function PricingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Default to 'professional' (GÓI TIẾT KIỆM) if no param
    const activePlan = searchParams.get('plan') || 'professional'; 

    const handleSelect = (pkgId: string) => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('plan', pkgId);
        router.push(`?${newParams.toString()}`, { scroll: false });
    };

    const packages: PackageProps[] = [
        {
            id: 'starter',
            name: 'GÓI TRẢI NGHIỆM',
            price: '49.000',
            currency: 'VNĐ',
            credits: '600',
            highlightCredits: '1200',
            duration: 'Thời hạn: 1 tháng',
            color: 'bg-blue-500',
            borderColor: 'border-blue-500',
            ringColor: 'ring-blue-500',
            highlightBg: 'bg-blue-100',
            hexColor: '#3B82F6', // blue-500
            hexBg: '#DBEAFE', // blue-100
            link: 'https://zalo.me/0352143210',
            cornerBadgeText: 'X2 CREDITS',
            features: [
                { text: '1200 credits hàng tháng', highlightText: '1200 credits' },
                { text: 'Tạo ~240 ảnh Nano Banana', highlightText: '~240 ảnh' },
                { text: 'Tạo ~120 video Veo3', highlightText: '~120 video' },
                { text: 'Tạo ~40 video Kling', highlightText: '~40 video' },
                { text: 'Quyền truy cập Fast Mode' },
            ],
            onSelect: handleSelect
        },
        {
            id: 'professional',
            name: 'GÓI TIẾT KIỆM',
            price: '149.000',
            currency: 'VNĐ',
            credits: '2000',
            highlightCredits: '4000',
            duration: 'Thời hạn: 1 tháng',
            badge: 'PHỔ BIẾN',
            color: 'bg-purple-600',
            borderColor: 'border-purple-600',
            ringColor: 'ring-purple-600',
            highlightBg: 'bg-purple-100',
            hexColor: '#9333EA', // purple-600
            hexBg: '#F3E8FF', // purple-100
            link: 'https://zalo.me/0352143210',
            cornerBadgeText: 'X2 CREDITS',
            features: [
                { text: '4000 credits hàng tháng', highlightText: '4000 credits' },
                { text: 'Tạo ~800 ảnh mỗi tháng', highlightText: '~800 ảnh' },
                { text: 'Tạo ~400 video Veo3', highlightText: '~400 video' },
                { text: 'Tạo ~130 video Kling', highlightText: '~130 video' },
                { text: 'Quyền truy cập Fast Mode' },
                { text: 'Luồng xử lý song song'},
                { text: 'Ưu tiên trải nghiệm trước model mới' },
            ],
            onSelect: handleSelect
        },
        {
            id: 'business',
            name: 'GÓI SÁNG TẠO',
            price: '499.000',
            currency: 'VNĐ',
            credits: '7500',
            highlightCredits: '15000',
            duration: 'Thời hạn: 1 tháng',
            badge: 'HOT',
            color: 'bg-green-600',
            borderColor: 'border-green-600',
            ringColor: 'ring-green-600',
            highlightBg: 'bg-green-100',
            hexColor: '#16A34A', // green-600
            hexBg: '#DCFCE7', // green-100
            link: 'https://zalo.me/0352143210',
            cornerBadgeText: 'X2 CREDITS',
            features: [
                { text: '15000 credits hàng tháng', highlightText: '15000 credits' },
                { text: 'Tạo ~3000 ảnh mỗi tháng', highlightText: '~3000 ảnh' },
                { text: 'Tạo ~1500 video Veo3', highlightText: '~1500 video' },
                { text: 'Tạo ~500 video Kling', highlightText: '~500 video' },
                { text: 'Quyền truy cập Fast Mode' },
                { text: 'Luồng xử lý song song' },
                { text: 'Ưu tiên trải nghiệm trước model mới' },
            ],
            onSelect: handleSelect
        },
        {
            id: 'unlimited',
            name: 'UNLIMITED (coming soon)',
            price: 'INCOMING',
            currency: 'VNĐ',
            credits: 'Toàn bộ',
            duration: 'Thời hạn: 1 Năm',
            color: 'bg-[#FF4D00]',
            borderColor: 'border-[#FF4D00]',
            ringColor: 'ring-[#FF4D00]',
            highlightBg: 'bg-orange-100',
            hexColor: '#FF4D00',
            hexBg: '#FFEDD5', // orange-100
            link: '#', // Placeholder or empty
            features: [
                { text: 'Toàn bộ Credit' },
                { text: 'Tất cả tính năng cao cấp' },
                { text: 'Ưu tiên hỗ trợ VIP 24/7' },
                { text: 'Hàng đợi xử lý nhanh hơn' },
                { text: 'Bonus credit miễn phí mỗi ngày' },
            ],
            onSelect: handleSelect
        }
    ];

    return (
        <div className="relative max-w-[1600px] mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Banner */}
            <div className="mb-8 rounded-xl bg-orange-50 border border-orange-100 p-4 flex flex-col md:flex-row items-center justify-center gap-4 shadow-sm text-center">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <PartyPopper className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                    <h3 className="text-gray-900 font-bold text-base">
                        OPEN WEEK - Khuyến mãi X2 Credit!
                    </h3>
                    <p className="text-gray-600 text-sm">
                        Nạp credit ngay hôm nay để nhận khuyến mãi <span className="text-orange-500 font-bold">X2 Credits</span>.
                        Ưu đãi có hiệu lực đến <span className="text-orange-500 font-bold">21/12/2025</span>.
                    </p>
                </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 max-w-full mx-auto items-start">
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
        <ProtectedRoute>
            <div className="flex min-h-screen bg-gray-50 text-gray-900">
                <MobileNav />
                <Sidebar />
                <main className="flex-1 pt-[57px] md:pt-0 overflow-y-auto h-screen bg-gray-50">
                    <Suspense fallback={<div className="text-gray-900 p-8">Loading...</div>}>
                        <PricingContent />
                    </Suspense>
                </main>
            </div>
        </ProtectedRoute>
    );
}
