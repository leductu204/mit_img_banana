"use client"

// components/account/TransactionHistoryTable.tsx
/**
 * Table component for displaying credit transaction history
 */

import { Transaction } from '@/hooks/useTransactions';
import { Minus, Plus, Gift, Settings, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Button from '../common/Button';
import { TableSkeleton } from '../common/SkeletonLoader';

interface TransactionHistoryTableProps {
    transactions: Transaction[];
    loading: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const typeConfig = {
    deduct: { 
        icon: Minus, 
        color: 'text-red-500', 
        bg: 'bg-red-500/10', 
        label: 'Trừ credits',
        sign: '-'
    },
    refund: { 
        icon: Plus, 
        color: 'text-green-500', 
        bg: 'bg-green-500/10', 
        label: 'Hoàn tiền',
        sign: '+'
    },
    initial: { 
        icon: Gift, 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/10', 
        label: 'Khởi tạo',
        sign: '+'
    },
    admin_add: { 
        icon: Settings, 
        color: 'text-purple-500', 
        bg: 'bg-purple-500/10', 
        label: 'Admin thêm',
        sign: '+'
    },
};

export default function TransactionHistoryTable({
    transactions,
    loading,
    currentPage,
    totalPages,
    onPageChange,
}: TransactionHistoryTableProps) {
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (hours < 1) return 'Vừa xong';
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">Lịch sử giao dịch credits</h3>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Loại</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Số lượng</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Số dư</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Lý do</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Thời gian</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-4">
                                    <TableSkeleton rows={5} />
                                </td>
                            </tr>
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                    Chưa có lịch sử giao dịch
                                </td>
                            </tr>
                        ) : (
                            transactions.map((tx) => {
                                const config = typeConfig[tx.type] || typeConfig.deduct;
                                const TypeIcon = config.icon;
                                const isPositive = tx.type !== 'deduct';
                                
                                return (
                                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                                                <TypeIcon className="h-3 w-3" />
                                                {config.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-sm font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                                {config.sign}{Math.abs(tx.amount)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-foreground font-medium">
                                                {tx.balance_after}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <span className="text-sm text-muted-foreground truncate block" title={tx.reason || ''}>
                                                {tx.reason || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-muted-foreground">
                                                {formatTime(tx.created_at)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        Trang {currentPage} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground h-8 px-3"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground h-8 px-3"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
