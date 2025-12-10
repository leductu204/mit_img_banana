import type React from "react"
import { Geist, Geist_Mono } from "next/font/google"
import "../styles/globals.css"
import NotificationDialog from "@/components/common/NotificationDialog"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/contexts/ToastContext"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata = {
  title: "Trạm Sáng Tạo - AI Studio",
  description: "Tạo ảnh và video với AI nhanh chóng và hoàn toàn tự động.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`font-sans antialiased`} suppressHydrationWarning>
                <AuthProvider>
                    <ToastProvider>
                        <NotificationDialog />
                        {children}
                    </ToastProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
