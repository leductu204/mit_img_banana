'use client';
import React, { useState } from 'react';
import { useGenerateImage } from '@/hooks/useGenerateImage';
import ImagePreview from '@/components/generators/ImagePreview';
import { Button, Input, Select, Card } from '../common';

const modelOptions = [
    { value: 'nano', label: 'Nano (t2i / i2i)' },
    { value: 'openai', label: 'OpenAI DALL·E' },
];

export default function ImageForm() {
    const [prompt, setPrompt] = useState('');
    const [modelKey, setModelKey] = useState('nano');
    const { generate, result, loading, error } = useGenerateImage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await generate({ prompt, model: modelKey });
    };

    return (
        <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Prompt"
                    value={prompt}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
                    placeholder="Nhập prompt của bạn ở đây: "
                    required
                />
                <Select
                    label="Model"
                    options={modelOptions}
                    value={modelKey}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setModelKey(e.target.value)}
                />
                <Button type="submit" disabled={loading}>
                    {loading ? 'ĐANG TẠO...' : 'Tạo ảnh'}
                </Button>
                {error && <p className="text-red-500">{error}</p>}
            </form>
            {result?.image_url && <ImagePreview imageUrl={result.image_url} />}
        </Card>
    );
}
