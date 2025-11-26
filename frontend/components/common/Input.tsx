import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    className?: string;
}

export default function Input({ label, className = '', ...rest }: InputProps) {
    return (
        <div className={`flex flex-col ${className}`}>
            {label && <label className="mb-1 text-sm font-medium">{label}</label>}
            <input
                className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...rest}
            />
        </div>
    );
}
