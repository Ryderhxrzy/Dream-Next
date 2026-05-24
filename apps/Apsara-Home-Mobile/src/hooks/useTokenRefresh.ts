import { useCallback } from 'react';
import { API_CONFIG } from '../config/api';

export const useTokenRefresh = () => {
  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // If 200 or 201, token is valid
      if (response.ok) {
        console.log('[useTokenRefresh] token is valid');
        return true;
      }

      // If 401 or 403, token is invalid/expired
      if (response.status === 401 || response.status === 403) {
        console.log('[useTokenRefresh] token is invalid/expired, status:', response.status);
        return false;
      }

      return false;
    } catch (error) {
      console.error('[useTokenRefresh] token validation error:', error);
      return false;
    }
  }, []);

  return { validateToken };
};
