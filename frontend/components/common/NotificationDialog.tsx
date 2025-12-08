"use client"

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

interface NotificationDialogProps {
    title?: string
    message?: React.ReactNode
    onClose?: () => void
}

export default function NotificationDialog({ 
    title = "Thông báo ",
    message = (
        <span>
            OPEN BETA - Sử dụng miễn phí Nano Banana PRO và KLING. Nếu website gặp lỗi, hãy liên hệ{" "}
            <a 
                href="https://zalo.me/0352143210" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
                ZALO 0352143210
            </a>
        </span>
    ),
    onClose 
}: NotificationDialogProps) {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        // Show notification after a short delay on every page load
        const timer = setTimeout(() => {
            setIsOpen(true)
        }, 1000)
        
        return () => clearTimeout(timer)
    }, [])

    const handleClose = () => {
        setIsOpen(false)
        onClose?.()
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={handleClose}
            />
            
            {/* Dialog */}
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl border border-blue-200 dark:border-gray-700 overflow-hidden">
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 p-6 text-white">
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <h2 className="text-xl font-bold pr-8">{title}</h2>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-6">
                            {message}
                        </p>

                        {/* Action Button */}
                        <Button
                            onClick={handleClose}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            Đã đọc
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
