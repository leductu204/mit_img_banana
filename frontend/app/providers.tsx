"use client"

import { ReactNode } from 'react'
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/contexts/ToastContext"
import { UserPreferencesProvider } from "@/hooks/useUserPreferences"

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ToastProvider>
                <UserPreferencesProvider>
                    {children}
                </UserPreferencesProvider>
            </ToastProvider>
        </AuthProvider>
    )
}
