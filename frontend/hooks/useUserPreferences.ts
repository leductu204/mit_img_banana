"use client"

import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';

interface UserPreferences {
    showHistorySidebar: boolean;
}

interface UserPreferencesContextType {
    preferences: UserPreferences;
    updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
    toggleHistorySidebar: () => void;
    isLoaded: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
    showHistorySidebar: true,
};

const STORAGE_KEY = 'user_preferences';

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load preferences from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
            }
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save preferences to localStorage whenever they change
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
            } catch (error) {
                console.error('Failed to save user preferences:', error);
            }
        }
    }, [preferences, isLoaded]);

    const updatePreference = <K extends keyof UserPreferences>(
        key: K,
        value: UserPreferences[K]
    ) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const toggleHistorySidebar = () => {
        setPreferences(prev => ({
            ...prev,
            showHistorySidebar: !prev.showHistorySidebar,
        }));
    };

    // Use createElement instead of JSX to avoid needing .tsx extension
    return createElement(
        UserPreferencesContext.Provider,
        {
            value: {
                preferences,
                updatePreference,
                toggleHistorySidebar,
                isLoaded,
            }
        },
        children
    );
}

export function useUserPreferences() {
    const context = useContext(UserPreferencesContext);
    if (context === undefined) {
        throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
    }
    return context;
}
