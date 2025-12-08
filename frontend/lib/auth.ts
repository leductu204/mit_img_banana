// lib/auth.ts
/**
 * JWT Token utilities for authentication
 */

const TOKEN_KEY = 'auth_token';

export interface DecodedToken {
    user_id: string;
    email: string;
    exp: number;
    iat: number;
}

/**
 * Get stored JWT token
 */
export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store JWT token
 */
export function setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove JWT token (logout)
 */
export function removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Decode JWT token payload (without verification)
 */
export function decodeToken(token: string): DecodedToken | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payload = JSON.parse(atob(parts[1]));
        return payload as DecodedToken;
    } catch {
        return null;
    }
}

/**
 * Check if token is valid and not expired
 */
export function isTokenValid(token: string | null): boolean {
    if (!token) return false;
    
    const decoded = decodeToken(token);
    if (!decoded) return false;
    
    // Check expiry (exp is in seconds, Date.now() is in milliseconds)
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp > now;
}

/**
 * Get auth header for API requests
 */
export function getAuthHeader(): Record<string, string> {
    const token = getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}
