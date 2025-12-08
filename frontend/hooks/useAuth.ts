// hooks/useAuth.ts
/**
 * Hook for accessing authentication context
 */

import { useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
    return useAuthContext();
}
