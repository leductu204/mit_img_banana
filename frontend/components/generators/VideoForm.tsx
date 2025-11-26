'use client';
import React, { useState } from 'react';
import { useGenerateVideo } from '@/hooks/useGenerateVideo';
import VideoPreview from '@/components/generators/VideoPreview';
import { Button, Input, Select, Card } from '../common';

const modelOptions = [
    { value: 'kling', label: 'Kling (t2v)' },
    { value: 'openai', label: 'OpenAI Video' },
];

export default function VideoForm() {
    const [prompt, setPrompt] = useState('');
    const [modelKey, setModelKey] = useState('kling');
    const { generate, result, loading, error } = useGenerateVideo();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await generate({ prompt, model_key: modelKey });
    };

    return (
        <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Prompt"
                    value={prompt}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
                    placeholder="Describe the video you want"
                    required
                />
                <Select
                    label="Model"
                    options={modelOptions}
                    value={modelKey}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setModelKey(e.target.value)}
                />
                <Button type="submit" disabled={loading}>
                    {loading ? 'Generating...' : 'Generate Video'}
                </Button>
                {error && <p className="text-red-500">{error}</p>}
            </form>
            {result?.video_url && <VideoPreview videoUrl={result.video_url} />}
        </Card>
    );
}
