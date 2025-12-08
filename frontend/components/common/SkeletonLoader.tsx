// components/common/SkeletonLoader.tsx
/**
 * Skeleton loader components for loading states
 */

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                    <div className="h-12 bg-muted rounded flex-1" />
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
            <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
            </div>
        </div>
    );
}

export function ImageSkeleton() {
    return (
        <div className="w-full aspect-[3/4] bg-muted rounded-xl animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">Đang tải...</div>
        </div>
    );
}
