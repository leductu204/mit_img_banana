import { Check, Star, AlarmClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/common/Button';

export interface PricingFeature {
    text: string;
}

export interface PackageProps {
    id: string;
    name: string;
    price: string;
    currency: string;
    credits: string;
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
}

export default function PricingCard({
    pk,
    isHighlighted
}: {
    pk: PackageProps;
    isHighlighted?: boolean;
}) {
    const { 
        name, price, currency, credits, duration, features, onSelect, badge, color = "bg-blue-500", borderColor = "border-blue-500", ringColor = "ring-blue-500", highlightBg,
        hexColor, hexBg
    } = pk;

    return (
        <div 
            onClick={() => onSelect(pk.id)}
            className={cn(
                "relative h-full transition-all duration-300 flex flex-col cursor-pointer group",
                isHighlighted ? "z-10 scale-105" : "hover:-translate-y-1"
            )}
        >
            {/* Badge */}
            {isHighlighted && badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className={cn(
                        "text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap",
                        "bg-gradient-to-r from-orange-400 to-pink-500"
                    )}>
                        {badge}
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div 
                className={cn(
                    "flex flex-col rounded-2xl overflow-hidden h-full transition-all duration-300",
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
                {/* Debug Override using Tailwind for reliably present classes if needed, 
                    but relying on inline style for the border thickness/color to be 100% sure */ }
                <div className={cn(
                    "absolute inset-0 -z-10",
                    isHighlighted ? highlightBg : "bg-white"
                )} />

                {/* Debug Info */}
                <div className="text-[10px] text-gray-400 text-center pt-1 hidden">
                    {pk.id} {isHighlighted ? '(ACTIVE)' : ''}
                </div>
                {/* Colored Header */}
                <div className={cn("py-6 px-4 text-center text-white", color)}>
                    <h3 className="font-bold uppercase tracking-wider text-sm mb-1 opacity-90">{name}</h3>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 flex flex-col items-center">
                    
                    {/* Price Block */}
                    <div className="text-center w-full border-b border-gray-100 pb-6 mb-6">
                         <div className="flex items-baseline justify-center gap-1 mb-1">
                            <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                {price}
                            </span>
                            <span className="text-gray-500 text-sm font-bold">
                                {currency}
                            </span>
                        </div>
                        <div className={cn("font-bold text-lg mb-2", "text-green-500")}>
                            {credits} <span className="text-gray-400 text-sm font-normal">Credit</span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs font-medium">
                            <AlarmClock className="w-3.5 h-3.5" />
                            <span>{duration}</span>
                        </div>
                    </div>

                    {/* Features List */}
                    <div className="w-full space-y-3 mb-8 flex-1">
                        {features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2.5">
                                <div className={cn("rounded-full p-0.5 mt-0.5 bg-green-100")}>
                                    <Check className="w-3 h-3 text-green-600 stroke-[3]" />
                                </div>
                                <span className="text-gray-600 text-sm font-medium leading-tight">{feature.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Button */}
                    <div className="w-full mt-auto">
                        <Button
                            onClick={() => onSelect(pk.id)}
                            className={cn(
                                "w-full h-11 rounded-full font-bold text-sm text-white shadow-md hover:shadow-lg transition-all hover:brightness-110",
                                color
                            )}
                        >
                            {isHighlighted ? (
                                <span className="flex items-center gap-2">
                                    <Check className="w-5 h-5" />
                                    Đang chọn
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
