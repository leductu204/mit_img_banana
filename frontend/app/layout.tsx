import type React from "react"
import { Inter, Manrope } from "next/font/google"
import "../styles/globals.css"
import NotificationDialog from "@/components/common/NotificationDialog"
import Providers from "./providers"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" })

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
            <body className={`${inter.variable} ${manrope.variable} font-sans antialiased bg-background-dark text-slate-200`} suppressHydrationWarning>
                <Providers>
                    <NotificationDialog />
                    {children}
                </Providers>
            </body>
        </html>
    )
}
