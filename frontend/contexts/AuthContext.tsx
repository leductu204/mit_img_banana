"use client"

// contexts/AuthContext.tsx
/**
 * Authentication context for managing user state globally
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getToken, setToken, removeToken, isTokenValid, getAuthHeader } from '@/lib/auth';
import { NEXT_PUBLIC_API } from '@/lib/config';

export interface User {
    user_id: string;
    email: string;
    username: string;
    avatar_url: string | null;
    credits: number;
    is_banned: boolean;
    created_at: string;
}

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    updateCredits: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        const token = getToken();
        if (!token || !isTokenValid(token)) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${NEXT_PUBLIC_API}/auth/me`, {
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                // Token invalid or expired
                removeToken();
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const login = useCallback(() => {
        // Redirect to Google OAuth with absolute URL
        const apiUrl = NEXT_PUBLIC_API || 'https://dtnanotool.io.vn';
        window.location.href = `${apiUrl}/auth/google/login`;
    }, []);

    const logout = useCallback(() => {
        removeToken();
        setUser(null);
        window.location.href = '/login';
    }, []);

    const refreshUser = useCallback(async () => {
        await fetchUser();
    }, [fetchUser]);

    const updateCredits = useCallback((newBalance: number) => {
        setUser(prev => prev ? { ...prev, credits: newBalance } : null);
    }, []);

    const value: AuthContextValue = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        updateCredits,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
