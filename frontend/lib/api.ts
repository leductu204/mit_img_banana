// lib/api.ts
import { NEXT_PUBLIC_API } from './config';

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${NEXT_PUBLIC_API}${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error ${response.status}: ${errorBody}`);
    }
    return (await response.json()) as T;
}
