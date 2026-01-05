import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    gradient?: boolean;
}

export default function Card({ children, className, gradient }: CardProps) {
    return (
        <div 
            className={cn(
                "rounded-2xl border border-border bg-surface shadow-lg overflow-hidden relative",
                gradient && "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:pointer-events-none",
                className
            )}
        >
            {children}
        </div>
    );
}

