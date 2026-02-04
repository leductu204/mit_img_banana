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
    plan?: 'free' | 'starter' | 'pro'; // Added plan field
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
        // Detect if running in an embedded webview (Zalo, Messenger, Facebook, etc.)
        const userAgent = navigator.userAgent || navigator.vendor || '';
        const isEmbeddedWebview = 
            /FBAN|FBAV|Instagram|Zalo|Line|Twitter|Messenger/i.test(userAgent) ||
            // iOS webview detection
            (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent)) ||
            // Android webview detection
            (/wv\)|\.0\.0\.0 Mobile/i.test(userAgent));
        
        const apiUrl = NEXT_PUBLIC_API || 'https://tramsangtao.com';
        const authUrl = `${apiUrl}/auth/google/login`;
        
        if (isEmbeddedWebview) {
            // For embedded webviews, try to open in external browser
            // Method 1: Use intent for Android
            const isAndroid = /Android/i.test(userAgent);
            const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
            
            if (isAndroid) {
                // Android: Use intent to open in Chrome/default browser
                window.location.href = `intent://${authUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
            } else if (isIOS) {
                // iOS: Try x-safari-https scheme or show alert
                // Note: This may not work in all webviews
                const safariUrl = `x-safari-${authUrl}`;
                window.location.href = safariUrl;
                
                // Fallback: Show alert after a short delay
                setTimeout(() => {
                    alert('Vui lòng mở liên kết trong Safari hoặc Chrome để đăng nhập.\n\nPlease open this link in Safari or Chrome to login.');
                }, 1000);
            } else {
                // Generic fallback: Show alert
                alert('Vui lòng mở trang web này trong trình duyệt Chrome hoặc Safari để đăng nhập.\n\nPlease open this website in Chrome or Safari to login.');
            }
        } else {
            // Normal browser: Direct redirect
            window.location.href = authUrl;
        }
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
