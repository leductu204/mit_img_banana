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
                    }
                });
                setCostsLoaded(true);
            }
        };

        fetchCosts();
        
        // Refresh costs every 30 seconds to pick up admin changes
        const interval = setInterval(fetchCosts, 30000);
        
        return () => clearInterval(interval);
    }, []);

    /**
     * Estimate cost for image generation
     */
    const estimateImageCost = (
        model: string,
        aspectRatio: string = "16:9",
        resolution?: string
    ): number => {
        
        if (!costsLoaded) {
            return 2; // Loading fallback
        }

        const costs = modelCosts[model];
        
        if (!costs) {
            return 2; // Default fallback
        }

        // For models with resolution tiers (like nano-banana-pro)
        if (resolution && costs[resolution]) {
            const cost = costs[resolution][aspectRatio] ?? costs[resolution]["16:9"] ?? 6;
            return cost;
        }

        // For nano-banana (direct aspect ratio lookup, no resolution)
        // Check if aspectRatio key exists directly in costs
        if (costs[aspectRatio] !== undefined) {
            return costs[aspectRatio];
        }

        // Fallback to 16:9 or any available ratio
        const fallbackCost = costs["16:9"] ?? costs["1:1"] ?? 2;
        return fallbackCost;
    };

    /**
     * Estimate cost for video generation
     */
    const estimateVideoCost = (
        model: string,
        duration: string = "5s",
        resolution: string = "720p",
        aspectRatio: string = "16:9"
    ): number => {
        if (!costsLoaded) return 5; // Loading fallback

        const costs = modelCosts[model];
        if (!costs) return 5; // Default fallback

        if (costs[resolution]) {
            // Try with aspect ratio first (for kling-o1-video)
            const keyWithAspect = `${duration}-${aspectRatio}`;
            if (costs[resolution][keyWithAspect] !== undefined) {
                return costs[resolution][keyWithAspect];
            }
            
            // Try without aspect ratio
            if (costs[resolution][duration] !== undefined) {
                return costs[resolution][duration];
            }
            
            return costs[resolution]["5s"] ?? 5;
        }

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
        
        // Check if this is a model with direct aspect ratios (nano-banana)
        // Structure: { "1:1": 1, "16:9": 2, ... }
        const firstKey = Object.keys(costs)[0];
        if (firstKey && typeof costs[firstKey] === 'number') {
            return Object.keys(costs);
        }
        
        // For nano-banana-pro (resolution-based)
        if (resolution && costs[resolution]) {
            return Object.keys(costs[resolution]);
        }
        
        // Get all unique aspect ratios across all resolutions
        const allRatios = new Set<string>();
        Object.keys(costs).forEach(key => {
            if (typeof costs[key] === 'object') {
                Object.keys(costs[key]).forEach(ratio => allRatios.add(ratio));
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
