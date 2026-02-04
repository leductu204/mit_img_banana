"use client"

import { ReactNode } from 'react'
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/contexts/ToastContext"
import { UserPreferencesProvider } from "@/hooks/useUserPreferences"

import { JobsProvider } from "@/contexts/JobsContext"

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ToastProvider>
                <UserPreferencesProvider>
                    <JobsProvider>
                        {children}
                    </JobsProvider>
                </UserPreferencesProvider>
            </ToastProvider>
        </AuthProvider>
    )
}
