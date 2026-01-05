'use client';

import { Check, Video, Image, Zap, Clock, Flame, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PricingFeature {
    text: string;
    highlightText?: string;
    icon?: 'video' | 'image' | 'zap' | 'clock' | 'check';
    subtitle?: string;
}

function getFeatureIcon(feature: PricingFeature) {
    if (feature.icon) return feature.icon;
    
    const text = feature.text.toLowerCase();
    if (text.includes('video')) return 'video';
    if (text.includes('ảnh') || text.includes('image')) return 'image';
    if (text.includes('fast mode') || text.includes('luồng') || text.includes('nhanh hơn')) return 'zap';
    
    return 'check';
}

export interface PackageProps {
    id: string;
    name: string;
    price: string;
    currency: string;
    credits: string;
    highlightCredits?: string;
    duration: string;
    features: PricingFeature[];
    onSelect: (pkgId: string) => void;
    onBuy?: (pkgId: string) => void;
    isHighlighted?: boolean;
    badge?: string;
    color?: string;
    borderColor?: string;
    ringColor?: string;
    highlightBg?: string;
    hexColor?: string;
    hexBg?: string;
    link?: string;
    cornerBadgeText?: string;
    variant?: 'blue' | 'purple' | 'green' | 'orange';
    isComingSoon?: boolean;
}

// Dark theme color variants
const colorVariants = {
    blue: {
        headerBg: 'bg-gradient-to-br from-blue-500/10 to-transparent',
        headerText: 'text-blue-300',
        headerLine: 'via-blue-400/30',
        badgeBg: 'bg-gradient-to-r from-blue-500/80 to-blue-400/80',
        buttonBg: 'border-blue-400/30 text-blue-400 hover:bg-blue-500 hover:text-white',
        iconBg: 'bg-blue-500/20 text-blue-300',
        hoverBorder: 'hover:border-blue-400/30',
        shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(96,165,250,0.2)]'
    },
    purple: {
        headerBg: 'bg-gradient-to-b from-fuchsia-500/10 to-transparent',
        headerText: 'text-fuchsia-300',
        headerLine: 'via-fuchsia-400/30',
        badgeBg: 'bg-gradient-to-r from-fuchsia-500 to-purple-500',
        buttonBg: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-fuchsia-900/40',
        iconBg: 'bg-fuchsia-500/20 text-fuchsia-300',
        hoverBorder: 'border-fuchsia-500/30',
        shadow: 'shadow-[0_20px_40px_-15px_rgba(232,121,249,0.2)]'
    },
    green: {
        headerBg: 'bg-gradient-to-br from-green-500/10 to-transparent',
        headerText: 'text-green-300',
        headerLine: 'via-green-400/30',
        badgeBg: 'bg-gradient-to-r from-orange-500/80 to-amber-500/80',
        buttonBg: 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white shadow-lg shadow-emerald-900/30',
        iconBg: 'bg-green-500/20 text-green-300',
        hoverBorder: 'hover:border-green-400/30',
        shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(74,222,128,0.2)]'
    },
    orange: {
        headerBg: 'bg-gradient-to-br from-orange-500/10 to-transparent',
        headerText: 'text-orange-300',
        headerLine: 'via-orange-400/30',
        badgeBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
        buttonBg: 'border-dashed border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-white hover:border-solid cursor-not-allowed',
        iconBg: 'bg-orange-500/20 text-orange-300',
        hoverBorder: 'hover:border-orange-400/30',
        shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(251,146,60,0.2)]'
    }
};

export default function PricingCard({
    pk,
    isHighlighted
}: {
    pk: PackageProps;
    isHighlighted?: boolean;
}) {
    const { 
        name, price, currency, credits, highlightCredits, duration, features, onSelect, onBuy, badge, 
        link, cornerBadgeText, variant = 'blue', isComingSoon
    } = pk;

    const colors = colorVariants[variant];

    const handleButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card select
        if (isComingSoon) {
            e.preventDefault();
            return;
        }
        if (link) {
            window.location.href = link;
            return;
        }
        if (onBuy) {
            onBuy(pk.id);
        } else {
             onSelect(pk.id);
        }
    };

    const iconConfig = {
        video: { Icon: Video, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-300' },
        image: { Icon: Image, bgColor: 'bg-fuchsia-500/20', iconColor: 'text-fuchsia-300' },
        zap: { Icon: Zap, bgColor: 'bg-amber-500/20', iconColor: 'text-amber-300' },
        clock: { Icon: Clock, bgColor: 'bg-slate-500/20', iconColor: 'text-slate-300' },
        check: { Icon: Check, bgColor: 'bg-emerald-500/20', iconColor: 'text-emerald-400' }
    };

    return (
        <div 
            onClick={() => onSelect(pk.id)}
            className={cn(
                "relative bg-[#131820] rounded-3xl border p-10 flex flex-col h-full transition-all duration-500 group cursor-pointer",
                isHighlighted 
                    ? `border-2 ${colors.hoverBorder.replace('hover:', '')} ${colors.shadow.replace('hover:', '')} scale-[1.03] z-10`
                    : `border-white/5 ${colors.hoverBorder} ${colors.shadow}`,
                isComingSoon && "bg-[#131820]/60 hover:bg-[#131820]"
            )}
        >
            {/* Top Badge (PHỔ BIẾN) */}
            {isHighlighted && badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <div className={cn(
                    "text-white px-5 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5 ring-4 ring-[#0A0E13]",
                        colors.badgeBg
                    )}>
                        <Flame className="w-3.5 h-3.5" />
                        {badge}
                    </div>
                </div>
            )}

            {/* Corner Badge (BONUS/EXTRA) */}
            {cornerBadgeText && (
                <div className="absolute top-0 right-0 overflow-hidden rounded-tr-3xl">
                    <div className={cn(
                        "backdrop-blur-md text-white text-sm font-bold px-4 py-1.5 rounded-bl-2xl shadow-sm",
                        variant === 'green' ? "bg-gradient-to-r from-orange-500/80 to-amber-500/80" : "bg-gradient-to-r from-blue-500/80 to-blue-400/80"
                    )}>
                        {cornerBadgeText}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={cn(
                "border-b border-white/5 py-4 -mx-6 -mt-6 rounded-t-3xl mb-6 flex flex-col items-center justify-center relative overflow-hidden",
                colors.headerBg
            )}>
                <div className={cn("absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent to-transparent", colors.headerLine)}></div>
                <span className={cn("font-bold tracking-widest uppercase text-lg", colors.headerText)}>{name}</span>
            </div>

            {/* Price Block */}
            <div className={cn("text-center mb-10", isComingSoon && "opacity-80")}>
                <div className="flex items-center justify-center gap-1.5">
                    <span className={cn("font-bold text-white", isHighlighted ? "text-6xl tracking-tight" : "text-5xl")}>
                        {price}
                    </span>
                    {currency !== 'VNĐ' || price !== 'INCOMING' && (
                        <span className="text-lg text-slate-500 font-medium self-end mb-1">{currency}</span>
                    )}
                </div>
                
                {highlightCredits ? (
                    <div className={cn(
                        "mt-3 flex items-center justify-center gap-2 rounded-full py-1 px-3 w-max mx-auto border",
                        isHighlighted ? "bg-fuchsia-500/10 border-fuchsia-500/20" : "bg-white/5 border-white/5"
                    )}>
                        <span className="text-lg text-slate-500 line-through">{credits}</span>
                        <span className={cn("font-bold text-emerald-400", isHighlighted ? "text-2xl" : "text-xl")}>{highlightCredits} Credits</span>
                    </div>
                ) : (
                    <div className="mt-3 flex items-center justify-center gap-2 py-1 px-3 w-max mx-auto">
                        <span className="text-2xl font-bold text-emerald-400">{credits} <span className="text-slate-400 text-lg font-normal">Credits</span></span>
                    </div>
                )}
                
                <div className="mt-4 text-lg text-slate-500 flex items-center justify-center gap-1.5">
                    <Clock className="w-5 h-5" />
                    <span>{duration}</span>
                </div>
            </div>

            {/* Features List */}
            <div className={cn("space-y-5 mb-10 flex-grow", isComingSoon && "opacity-70 hover:opacity-100 transition-opacity")}>
                {features.map((feature, idx) => {
                    const iconType = getFeatureIcon(feature);
                    const { Icon, bgColor, iconColor } = iconConfig[iconType];
                    
                    const renderText = () => {
                        if (!feature.highlightText) return feature.text;
                        const parts = feature.text.split(new RegExp(`(${feature.highlightText})`, 'gi'));
                        return (
                            <>
                                {parts.map((part, i) => (
                                    part.toLowerCase() === feature.highlightText!.toLowerCase() 
                                        ? <span key={i} className="font-semibold text-slate-100">{part}</span>
                                        : part
                                ))}
                            </>
                        );
                    };

                    return (
                        <div 
                            key={idx} 
                            className={cn(
                                "flex items-start gap-4 p-2.5 rounded-xl border transition-all duration-300",
                                isHighlighted 
                                    ? "bg-gradient-to-r from-white/5 to-transparent border-white/10"
                                    : "bg-transparent border-transparent hover:bg-white/5"
                            )}
                        >
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", bgColor)}>
                                <Icon className={cn("w-5 h-5", iconColor)} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg text-slate-300">{renderText()}</span>
                                {feature.subtitle && (
                                    <span className="text-base text-slate-500 mt-0.5">{feature.subtitle}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Button */}
            <button
                onClick={handleButtonClick}
                className={cn(
                    "w-full py-5 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2",
                    isHighlighted 
                        ? colors.buttonBg
                        : isComingSoon 
                            ? colors.buttonBg
                            : `border ${colors.buttonBg}`
                )}
            >
                {isHighlighted && !isComingSoon && <Check className="w-5 h-5" />}
                {isComingSoon ? 'Nhận thông báo' : (isHighlighted ? 'ĐĂNG KÝ NGAY' : 'Đăng ký ngay')}
            </button>
        </div>
    );
}
