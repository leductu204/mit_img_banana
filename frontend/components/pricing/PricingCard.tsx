import { Check, Star, AlarmClock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/common/Button';

export interface PricingFeature {
    text: string;
    highlightText?: string;
}

export interface PackageProps {
    id: string;
    name: string;
    price: string;
    originalPrice?: string; // New: Original price to show strikethrough
    currency: string;
    credits: string;
    highlightCredits?: string; // New: Highlighted credits (e.g. X2)
    duration: string;
    features: PricingFeature[];
    onSelect: (pkgId: string) => void;
    isHighlighted?: boolean;
    badge?: string;
    color?: string; // e.g., "bg-blue-500"
    borderColor?: string; // e.g., "border-blue-500"
    ringColor?: string; // e.g., "ring-blue-500"
    highlightBg?: string; // e.g., "bg-blue-50"
    hexColor?: string; // e.g., "#3B82F6" for inline styles
    hexBg?: string; // e.g., "#DBEAFE" for inline styles
    link?: string; // New: Link for button redirection
    cornerBadgeText?: string; // New: Top right badge (e.g. -50%)
}

export default function PricingCard({
    pk,
    isHighlighted
}: {
    pk: PackageProps;
    isHighlighted?: boolean;
}) {
    const { 
        name, price, originalPrice, currency, credits, highlightCredits, duration, features, onSelect, badge, color = "bg-blue-500", borderColor = "border-blue-500", ringColor = "ring-blue-500", highlightBg,
        hexColor, hexBg, link, cornerBadgeText
    } = pk;

    const handleButtonClick = (e: React.MouseEvent) => {
        // If already highlighted and has a link, button acts as a link (or we can navigate manually)
        if (isHighlighted && link) {
            e.stopPropagation(); // Stop card selection logic if any
            window.location.href = link; // Or use router.push if internal, but window.location is safer for external payment links usually
            return;
        }
        // Otherwise, Select the plan
        onSelect(pk.id);
    };

    return (
        <div 
            onClick={() => onSelect(pk.id)}
            className={cn(
                "relative h-full transition-all duration-300 flex flex-col cursor-pointer group",
                isHighlighted ? "z-10 scale-105" : "hover:-translate-y-1"
            )}
        >
            {/* Badge (Center Top) */}
            {isHighlighted && badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className={cn(
                        "text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap",
                        "bg-gradient-to-r from-orange-400 to-pink-500",
                        "animate-in fade-in zoom-in duration-250"
                    )}>
                        <Flame className="w-3 h-3 fill-yellow-200 text-yellow-200" />
                        {badge}
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div 
                className={cn(
                    "flex flex-col rounded-2xl overflow-hidden h-full transition-all duration-250",
                    isHighlighted 
                        ? `shadow-2xl z-10 scale-105`
                        : "bg-white border border-gray-100 shadow-lg group-hover:border-gray-200"
                )}
                style={isHighlighted ? {
                    border: '4px solid',
                    borderColor: hexColor || '#6D4AFF', 
                    backgroundColor: hexBg || '#FAF5FF', 
                } : {}}
            >
                {/* Background Layer */}
                <div className={cn(
                    "absolute inset-0 -z-10",
                    isHighlighted ? highlightBg : "bg-white"
                )} />

                {/* Corner Badge (Top Right) */}
                 {cornerBadgeText && (
                    <div className="absolute top-0 right-0 z-20 overflow-hidden w-28 h-28 pointer-events-none">
                        <div className="absolute top-6 -right-8 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-extrabold py-1.5 w-32 text-center rotate-45 shadow-md transform transition-transform group-hover:scale-110 uppercase">
                            {cornerBadgeText}
                        </div>
                    </div>
                 )}

                {/* Debug Info */}
                <div className="text-[10px] text-gray-400 text-center pt-1 hidden">
                    {pk.id} {isHighlighted ? '(ACTIVE)' : ''}
                </div>
                {/* Colored Header */}
                <div className={cn("py-8 px-6 text-center text-white relative", color)}>
                     {/* Add relative to ensure specific z-index context if needed, but text needs to be readable */}
                    <h3 className="font-bold uppercase tracking-wider text-sm mb-1 opacity-90">{name}</h3>
                </div>

                {/* Body */}
                <div className="flex-1 p-8 flex flex-col items-center">
                    
                    {/* Price Block */}
                    <div className="text-center w-full border-b border-gray-100 pb-6 mb-6">
                         <div className="flex items-center justify-center gap-3 mb-2">
                             {originalPrice && (
                                 <div className="text-gray-400 text-xl font-medium line-through decoration-gray-400/80 decoration-2">
                                     {originalPrice}
                                 </div>
                             )}
                             <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                    {price}
                                </span>
                                <span className="text-gray-500 text-base font-bold">
                                    {currency}
                                </span>
                            </div>
                        </div>
                        
                        {highlightCredits ? (
                             <div className="flex items-end justify-center gap-3 mb-2">
                                 <div className="text-gray-400 text-xl font-medium line-through decoration-gray-400/80 decoration-2 mb-1">
                                    {credits}
                                </div>
                                <div className="font-bold text-4xl text-green-600 animate-pulse flex items-baseline gap-1">
                                    {highlightCredits}
                                    <span className="text-lg font-medium text-green-600">Credits</span>
                                </div>
                            </div>
                        ) : (
                            <div className={cn("font-bold text-lg mb-2", "text-green-500")}>
                                {credits} <span className="text-gray-400 text-sm font-normal">Credits</span>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs font-medium mt-4">
                            <AlarmClock className="w-3.5 h-3.5" />
                            <span>{duration}</span>
                        </div>
                    </div>

                    {/* Features List */}
                    <div className="w-full space-y-3 mb-8 flex-1">
                        {features.map((feature, idx) => {
                            // Split text if highlighting is needed
                            const renderText = () => {
                                if (!feature.highlightText) return feature.text;
                                
                                const parts = feature.text.split(new RegExp(`(${feature.highlightText})`, 'gi'));
                                return (
                                    <>
                                        {parts.map((part, i) => (
                                            part.toLowerCase() === feature.highlightText!.toLowerCase() 
                                                ? <span key={i} className="text-gray-900 font-extrabold">{part}</span> 
                                                : part
                                        ))}
                                    </>
                                );
                            };

                            return (
                                <div key={idx} className="flex items-start gap-2.5">
                                    <div className={cn("rounded-full p-0.5 mt-0.5 bg-green-100")}>
                                        <Check className="w-3 h-3 text-green-600 stroke-[3]" />
                                    </div>
                                    <span className="text-gray-600 text-sm font-medium leading-tight">
                                        {renderText()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Button */}
                    <div className="w-full mt-auto">
                        <Button
                            onClick={handleButtonClick}
                            className={cn(
                                "w-full h-11 rounded-full font-bold text-sm text-white shadow-md hover:shadow-lg transition-all hover:brightness-110",
                                color
                            )}
                        >
                            {isHighlighted ? (
                                <span className="flex items-center gap-2">
                                    <Check className="w-5 h-5" />
                                    ĐĂNG KÝ NGAY
                                </span>
                            ) : (
                                'Đăng ký ngay'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
