import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export default function Button({ 
    children, 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading, 
    leftIcon,
    rightIcon,
    disabled,
    ...rest 
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
    
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-hover shadow-[0_0_15px_rgba(0,188,212,0.3)] border border-transparent",
        secondary: "bg-surface text-slate-200 border border-border hover:bg-surface-light hover:text-white",
        outline: "bg-transparent border border-primary text-primary hover:bg-primary/10",
        ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-white/5",
        danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    };

    const sizes = {
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-10 px-4 text-sm rounded-xl",
        lg: "h-12 px-6 text-base rounded-xl",
        icon: "h-10 w-10 p-2 rounded-xl",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={isLoading || disabled}
            {...rest}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </button>
    );
}

