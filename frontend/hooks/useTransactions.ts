// hooks/useTransactions.ts
/**
 * Hook for fetching user credit transaction history
 */

import { useState, useCallback } from 'react';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { getAuthHeader } from '@/lib/auth';

export interface Transaction {
    id: string;
    user_id: string;
    type: 'deduct' | 'refund' | 'initial' | 'admin_add';
    amount: number;
    balance_after: number;
    job_id?: string;
    reason?: string;
    created_at: string;
}

export interface TransactionsResponse {
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export function useTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ total: 0, pages: 0, page: 1 });

    const getMyTransactions = useCallback(async (
        page: number = 1,
        limit: number = 10,
        type?: string
    ): Promise<TransactionsResponse | null> => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (type) params.append('type', type);

            const response = await fetch(
                `${NEXT_PUBLIC_API}/users/me/transactions?${params}`,
                {
                    headers: {
                        ...getAuthHeader(),
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }

            const data: TransactionsResponse = await response.json();
            setTransactions(data.transactions);
            setPagination({
                total: data.total,
                pages: data.pages,
                page: data.page,
            });
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        transactions,
        loading,
        error,
        pagination,
        getMyTransactions,
    };
}
