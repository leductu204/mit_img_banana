// components/common/SkeletonLoader.tsx
/**
 * Enhanced skeleton loader components with shimmer animations
 */

import { cn } from "@/lib/utils";

// Base skeleton with shimmer animation
function SkeletonBase({ className }: { className?: string }) {
    return (
        <div 
            className={cn(
                "bg-gradient-to-r from-[#252D3D] via-[#2A3548] to-[#252D3D] bg-[length:200%_100%] animate-shimmer rounded",
                className
            )} 
        />
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {/* Table Header Skeleton */}
            <div className="flex gap-4 px-4 py-3 border-b border-white/10">
                <SkeletonBase className="h-4 w-24" />
                <SkeletonBase className="h-4 w-32 hidden sm:block" />
                <SkeletonBase className="h-4 flex-1 max-w-[200px]" />
                <SkeletonBase className="h-4 w-20 ml-auto" />
            </div>
            {/* Table Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div 
                    key={i} 
                    className="flex items-center gap-4 px-4 py-3"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    <SkeletonBase className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                        <SkeletonBase className="h-4 w-3/4" />
                        <SkeletonBase className="h-3 w-1/2" />
                    </div>
                    <SkeletonBase className="h-6 w-16 rounded-full" />
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton({ variant = "default" }: { variant?: "default" | "profile" | "stats" }) {
    if (variant === "profile") {
        return (
            <div className="bg-[#1F2833] border border-white/10 rounded-2xl p-6 animate-pulse">
                <div className="flex items-center gap-4">
                    <SkeletonBase className="h-16 w-16 rounded-full shrink-0" />
                    <div className="flex-1 space-y-3">
                        <SkeletonBase className="h-5 w-32" />
                        <SkeletonBase className="h-4 w-48" />
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                    <SkeletonBase className="h-4 w-full" />
                    <SkeletonBase className="h-4 w-3/4" />
                </div>
            </div>
        );
    }

    if (variant === "stats") {
        return (
            <div className="bg-[#1F2833] border border-white/10 rounded-2xl p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <SkeletonBase className="h-5 w-24" />
                    <SkeletonBase className="h-8 w-8 rounded-lg" />
                </div>
                <SkeletonBase className="h-10 w-20 mb-2" />
                <SkeletonBase className="h-3 w-32" />
            </div>
        );
    }

    return (
        <div className="bg-[#1F2833] border border-white/10 rounded-2xl p-6 animate-pulse">
            <div className="space-y-4">
                <SkeletonBase className="h-6 w-1/3" />
                <SkeletonBase className="h-4 w-2/3" />
                <SkeletonBase className="h-4 w-1/2" />
            </div>
        </div>
    );
}

export function ImageSkeleton({ aspectRatio = "3/4" }: { aspectRatio?: string }) {
    return (
        <div 
            className="w-full bg-[#1F2833] rounded-xl overflow-hidden relative"
            style={{ aspectRatio }}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-[#252D3D] via-[#2A3548] to-[#252D3D] bg-[length:200%_100%] animate-shimmer" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-[#6B7280]">
                    <div className="w-10 h-10 border-2 border-[#6B7280]/30 border-t-[#00BCD4] rounded-full animate-spin" />
                    <span className="text-sm font-medium">Đang tải...</span>
                </div>
            </div>
        </div>
    );
}

// New: Grid skeleton for history/gallery views
export function GridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
    return (
        <div 
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
            {Array.from({ length: count }).map((_, i) => (
                <div 
                    key={i} 
                    className="aspect-square rounded-xl overflow-hidden"
                    style={{ animationDelay: `${i * 50}ms` }}
                >
                    <SkeletonBase className="w-full h-full" />
                </div>
            ))}
        </div>
    );
}

// New: Form skeleton for loading form states
export function FormSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Label + Input */}
            <div className="space-y-2">
                <SkeletonBase className="h-4 w-24" />
                <SkeletonBase className="h-10 w-full rounded-xl" />
            </div>
            {/* Label + Textarea */}
            <div className="space-y-2">
                <SkeletonBase className="h-4 w-32" />
                <SkeletonBase className="h-28 w-full rounded-xl" />
            </div>
            {/* Button group */}
            <div className="flex gap-3">
                <SkeletonBase className="h-10 w-20 rounded-xl" />
                <SkeletonBase className="h-10 w-20 rounded-xl" />
                <SkeletonBase className="h-10 w-20 rounded-xl" />
            </div>
            {/* Submit button */}
            <SkeletonBase className="h-12 w-full rounded-xl" />
        </div>
    );
}

// New: Inline loading indicator for buttons/actions
export function InlineLoader({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
    const sizeClasses = {
        sm: "w-4 h-4 border-2",
        md: "w-5 h-5 border-2",
        lg: "w-6 h-6 border-[3px]"
    };
    
    return (
        <div className={cn(
            "border-[#6B7280]/30 border-t-[#00BCD4] rounded-full animate-spin",
            sizeClasses[size]
        )} />
    );
}

// Export base for custom use
export { SkeletonBase };
