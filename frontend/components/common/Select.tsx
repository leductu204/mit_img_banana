import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
    className?: string;
}

export default function Select({ label, options, className = '', ...rest }: SelectProps) {
    return (
        <div className={`flex flex-col ${className}`}>
            {label && <label className="mb-1 text-sm font-medium">{label}</label>}
            <select
                className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...rest}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
