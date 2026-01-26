"use client"

// contexts/ToastContext.tsx
/**
 * Toast notification system for user feedback
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    onClick?: () => void;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType, duration?: number, onClick?: () => void) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    link: (message: string, url: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000, onClick?: () => void) => {
        const id = Math.random().toString(36).substr(2, 9);
        const toast: Toast = { id, type, message, duration, onClick };
        
        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string, duration?: number) => {
        showToast(message, 'success', duration);
    }, [showToast]);

    const error = useCallback((message: string, duration?: number) => {
        showToast(message, 'error', duration);
    }, [showToast]);

    const warning = useCallback((message: string, duration?: number) => {
        showToast(message, 'warning', duration);
    }, [showToast]);

    const info = useCallback((message: string, duration?: number) => {
        showToast(message, 'info', duration);
    }, [showToast]);

    const link = useCallback((message: string, url: string, duration: number = 8000) => {
        showToast(message, 'info', duration, () => window.open(url, '_blank'));
    }, [showToast]);

    const value: ToastContextValue = {
        showToast,
        success,
        error,
        warning,
        info,
        link,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

// Toast Container Component
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

// Individual Toast Item
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const config = {
        success: {
            icon: CheckCircle,
            bg: 'bg-green-500',
            border: 'border-green-600',
            text: 'text-white',
        },
        error: {
            icon: XCircle,
            bg: 'bg-red-500',
            border: 'border-red-600',
            text: 'text-white',
        },
        warning: {
            icon: AlertCircle,
            bg: 'bg-amber-500',
            border: 'border-amber-600',
            text: 'text-white',
        },
        info: {
            icon: Info,
            bg: 'bg-blue-500',
            border: 'border-blue-600',
            text: 'text-white',
        },
    };

    const { icon: Icon, bg, border, text } = config[toast.type];
    const isClickable = !!toast.onClick;

    const handleClick = () => {
        if (toast.onClick) {
            toast.onClick();
            onRemove(toast.id);
        }
    };

    return (
        <div
            onClick={isClickable ? handleClick : undefined}
            className={`
                ${bg} ${border} ${text} border-l-4 rounded-lg shadow-lg p-4
                flex items-start gap-3 pointer-events-auto
                animate-in slide-in-from-right duration-300
                ${isClickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
            `}
        >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-medium">{toast.message}</p>
                {isClickable && (
                    <p className="text-xs opacity-80 mt-1 underline">Ấn vào đây để mở</p>
                )}
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
                className="flex-shrink-0 hover:opacity-70 transition-opacity"
                aria-label="Close"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
