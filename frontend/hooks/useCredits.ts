// hooks/useCredits.ts
/**
 * Hook for credits management and cost estimation
 */

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { getAuthHeader } from '@/lib/auth';

export function useCredits() {
    const { user, updateCredits, refreshUser } = useAuth();
    const [modelCosts, setModelCosts] = useState<Record<string, any>>({});
    const [costsLoaded, setCostsLoaded] = useState(false);

    const balance = user?.credits ?? 0;

    /**
     * Fetch model costs from backend
     */
    useEffect(() => {
        const fetchCosts = async () => {
            try {
                // Add timestamp to prevent browser caching
                const timestamp = new Date().getTime();
                const response = await fetch(`${NEXT_PUBLIC_API}/api/costs?t=${timestamp}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                if (response.ok) {
                    const costs = await response.json();
                    setModelCosts(costs);
                    setCostsLoaded(true);
                }
            } catch (error) {
                console.error('Failed to fetch model costs:', error);
                // Use fallback costs if API fails
                setModelCosts({
                    "nano-banana": {
                        "1:1": 1, "16:9": 2, "9:16": 2, "4:3": 2, "3:4": 2
                    },
                    "nano-banana-pro": {
                        "1k": { "1:1": 3, "16:9": 4, "9:16": 4, "4:3": 4, "3:4": 4 },
                        "2k": { "1:1": 5, "16:9": 6, "9:16": 6, "4:3": 6, "3:4": 6 },
                        "4k": { "1:1": 10, "16:9": 12, "9:16": 12, "4:3": 11, "3:4": 11 }
                    },
                    "kling-2.5-turbo": {
                        "720p": { "5s": 5, "10s": 8 }
                    },
                    "kling-o1-video": {
                        "720p": { "5s-16:9": 6, "10s-16:9": 10 }
                    },
                    "kling-2.6": {
                        "720p": { "5s": 8, "10s": 14, "5s-audio": 10, "10s-audio": 18 }
                    },
                    "veo3.1-low": { "8s": 5 },
                    "veo3.1-fast": { "8s": 5 },
                    "veo3.1-high": { "8s": 10 }
                });
                setCostsLoaded(true);
            }
        };

        fetchCosts();
        
        // Refresh costs every 5 minutes (costs rarely change)
        const interval = setInterval(fetchCosts, 300000);
        
        return () => clearInterval(interval);
    }, []);

    /**
     * Estimate cost for image generation
     */
    /**
     * Estimate cost for image generation
     */
    const estimateImageCost = (
        model: string,
        aspectRatio: string = "16:9",
        resolution?: string,
        speed: string = "fast"
    ): number => {
        
        if (!costsLoaded || !modelCosts[model]) {
            return 2; // Loading/Default fallback
        }

        const costs = modelCosts[model];
        const speedSuffix = speed.toLowerCase();

        // 1. Try resolution + speed (nano-banana-pro)
        if (resolution) {
            // "1k-fast"
            const key = `${resolution}-${speedSuffix}`;
            if (costs[key] !== undefined) return costs[key];
             // Fallback to just resolution
            if (costs[resolution] !== undefined && typeof costs[resolution] === 'number') return costs[resolution];
        }

        // 2. Try default + speed (nano-banana)
        const defaultKey = `default-${speedSuffix}`;
        if (costs[defaultKey] !== undefined) return costs[defaultKey];

        // 3. Fallback to nested structure (old format/fallback support)
        if (resolution && costs[resolution]) {
            // nano-banana-pro old structure: { "1k": { "16:9": 4 } }
             if (typeof costs[resolution] === 'object') {
                 const resCosts = costs[resolution];
                 return resCosts[aspectRatio] ?? resCosts["16:9"] ?? 6;
             }
        }
        
        // nano-banana old structure: { "1:1": 1 }
        if (costs[aspectRatio] !== undefined && typeof costs[aspectRatio] === 'number') {
            return costs[aspectRatio];
        }

        return 2;
    };

    const estimateVideoCost = (
        model: string,
        duration: string = "5s",
        resolution: string = "720p",
        aspectRatio: string = "16:9",
        audio: boolean = false,
        speed: string = "fast"
    ): number => {
        if (!costsLoaded || !modelCosts[model]) return 5;

        const costs = modelCosts[model];
        
        // Helper to normalize duration
        const dur = duration.replace("s", "") + "s";
        const res = resolution;
        const spd = speed.toLowerCase();

        // Potential keys to try in order of specificity
        const keysToTry: string[] = [];

        // Kling 2.6: 5s-audio-fast or 5s-fast
        if (model === 'kling-2.6') {
             if (audio) {
                 keysToTry.push(`${dur}-audio-${spd}`);
             }
             keysToTry.push(`${dur}-${spd}`);
        } else {
            // Other models (Kling 2.5/O1): resolution-duration-speed
            // Kling O1 might have aspect: resolution-duration-aspect-speed (future proofing)
             keysToTry.push(`${res}-${dur}-${aspectRatio}-${spd}`);
             keysToTry.push(`${res}-${dur}-${spd}`);
             
             // Universal flat fallback (matches Kling O1 new structure: 5s-fast)
             keysToTry.push(`${dur}-${spd}`);
             
             // Fallback for Veo (8s)
             keysToTry.push(`${dur}`);
             keysToTry.push("8s"); 
        }

        for (const key of keysToTry) {
            if (costs[key] !== undefined) {
                return costs[key];
            }
        }

        // Nested Fallback (Old structure support)
        if (costs[resolution] && typeof costs[resolution] === 'object') {
             const resCosts = costs[resolution];
             // Try specific duration/aspect
             const durKey = `${dur}-${aspectRatio}`;
             if (resCosts[durKey] !== undefined) return resCosts[durKey];
             if (resCosts[dur] !== undefined) return resCosts[dur];
             if (resCosts["5s"] !== undefined) return resCosts["5s"];
        }
        
        // Veo/Flat fallback
        if (costs[dur] !== undefined) return costs[dur];

        return 5;
    };

    /**
     * Check if user has enough credits
     */
    const hasEnoughCredits = (cost: number): boolean => {
        return balance >= cost;
    };

    /**
     * Refresh balance from backend
     */
    const refreshBalance = async (): Promise<number> => {
        try {
            const response = await fetch(`${NEXT_PUBLIC_API}/api/users/me/credits`, {
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                updateCredits(data.credits);
                return data.credits;
            }
        } catch (error) {
            console.error('Failed to refresh balance:', error);
        }
        return balance;
    };

    /**
     * Get available aspect ratios for a model
     */
    const getAvailableAspectRatios = (model: string, resolution?: string): string[] => {
        if (!costsLoaded || !modelCosts[model]) return [];

        const costs = modelCosts[model];
        const keys = Object.keys(costs);
        if (keys.length === 0) return [];
        
        const allRatios = new Set<string>();
        const firstValue = costs[keys[0]];
        
        // Check if this is nested structure (old format)
        if (typeof firstValue === 'object' && firstValue !== null) {
            // Nested: { "1k": { "16:9": 4, "1:1": 3 } }
            if (resolution && costs[resolution]) {
                return Object.keys(costs[resolution]);
            }
            
            // Get all unique ratios across all resolutions
            keys.forEach(key => {
                if (typeof costs[key] === 'object') {
                    Object.keys(costs[key]).forEach(ratio => allRatios.add(ratio));
                }
            });
            
            return Array.from(allRatios);
        }
        
        // Flat structure - parse keys to extract aspect ratios
        // Keys can be: "1k-16:9", "2k-1:1", "1k-auto", "default-fast", "1k-fast", etc.
        keys.forEach(key => {
            const parts = key.split('-');
            
            // Look for parts containing ':' (aspect ratio pattern) or 'auto'
            for (const part of parts) {
                if (part.includes(':') || part === 'auto') {
                    // Filter by resolution if provided
                    if (!resolution || key.startsWith(`${resolution}-`)) {
                        allRatios.add(part);
                    }
                }
            }
        });
        
        return Array.from(allRatios);
    };

    /**
     * Get available resolutions for a model
     */
    const getAvailableResolutions = (model: string): string[] => {
        if (!costsLoaded || !modelCosts[model]) return [];

        const costs = modelCosts[model];
        
        // Check if this model has resolution tiers (nested objects)
        // For nano-banana: costs = { "1:1": 1, "16:9": 2, ... } - these are aspect ratios, not resolutions
        // For nano-banana-pro: costs = { "1k": { "1:1": 3, ... }, "2k": { ... } } - these are resolutions
        
        const keys = Object.keys(costs);
        if (keys.length === 0) return [];
        
        // Check if the first key's value is an object (resolution tier) or a number (direct aspect ratio)
        const firstKey = keys[0];
        const firstValue = costs[firstKey];
        
        // If the value is a number, this model has direct aspect ratios (no resolutions)
        if (typeof firstValue === 'number') {
            return [];
        }
        
        // If the value is an object, these are resolution tiers
        if (typeof firstValue === 'object' && firstValue !== null) {
            return keys;
        }
        
        return [];
    };

    return {
        balance,
        estimateImageCost,
        estimateVideoCost,
        hasEnoughCredits,
        refreshBalance,
        updateCredits,
        costsLoaded,
        modelCosts,
        getAvailableAspectRatios,
        getAvailableResolutions,
    };
}
