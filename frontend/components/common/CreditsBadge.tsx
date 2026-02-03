"use client"

// components/common/CreditsBadge.tsx
/**
 * Credits display badge component
 */

import { Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreditsBadgeProps {
    amount: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'balance' | 'cost' | 'transaction';
    onClick?: () => void;
    clickable?: boolean;
}

export default function CreditsBadge({
    amount,
    size = 'md',
    variant = 'balance',
    onClick,
    clickable = true,
}: CreditsBadgeProps) {
    const router = useRouter();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (clickable) {
            router.push('/account');
        }
    };

    const sizeClasses = {
        sm: 'text-xs px-2 py-1 gap-1',
        md: 'text-sm px-3 py-1.5 gap-1.5',
        lg: 'text-base px-4 py-2 gap-2',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    const variantClasses = {
        balance: 'bg-[#0F766E] text-white hover:bg-[#0D655E]',
        cost: 'bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20',
        transaction: amount >= 0 
            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
            : 'bg-red-500/10 text-red-600 border border-red-500/20',
    };

    const formattedAmount = variant === 'transaction' 
        ? (amount >= 0 ? `+${amount}` : `${amount}`)
        : amount.toLocaleString();

    return (
        <button
            onClick={handleClick}
            disabled={!clickable}
            className={`
                inline-flex items-center rounded-full font-medium
                transition-all duration-200
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${clickable ? 'cursor-pointer shadow-sm hover:shadow-md' : 'cursor-default'}
            `}
        >
            <Coins className={iconSizes[size]} />
            <span className="tabular-nums">{formattedAmount}</span>
            {variant === 'balance' && <span className="opacity-80">credits</span>}
        </button>
    );
}
