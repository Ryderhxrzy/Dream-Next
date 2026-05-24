import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const TOKEN_TIMESTAMP_KEY = 'token_timestamp';
const ONBOARDED_KEY = 'has_onboarded';
const CHATBOT_HIDDEN_KEY = 'chatbot_icon_hidden';

// Helper function to check if SecureStore is available
const isSecureStoreAvailable = () => {
  try {
    return !!SecureStore;
  } catch (error) {
    console.error('SecureStore not available:', error);
    return false;
  }
};

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  avatar_original_url?: string;
  phone?: string;
  address?: string;
  barangay?: string;
  city?: string;
  province?: string;
  region?: string;
  country?: string;
  middle_name?: string;
  birth_date?: string;
  gender?: string;
  occupation?: string;
  rank?: number;
  badge?: number;
  badge_name?: string;
  account_status?: number;
  lock_status?: number;
  verification_status?: string;
  profile_complete?: boolean;
  profile_completion_percentage?: number;
  email_verified?: boolean;
  password_change_required?: boolean;
  two_factor_enabled?: boolean;
  totp_enabled?: boolean;
  referrer_id?: number;
  referrer_username?: string;
  referrer_name?: string;
  monthly_activation?: {
    current_month_pv: number;
    threshold_pv: number;
    remaining_pv: number;
  };
  [key: string]: any; // Allow additional fields
}

export const storageService = {
  // Save authentication data with timestamp
  async saveAuthData(token: string, user: StoredUser): Promise<void> {
    try {
      if (!isSecureStoreAvailable()) {
        console.warn('SecureStore not available, using in-memory storage');
        return;
      }
      const now = Date.now();
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      await SecureStore.setItemAsync(TOKEN_TIMESTAMP_KEY, now.toString());
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  },

  // Get stored token
  async getToken(): Promise<string | null> {
    try {
      if (!isSecureStoreAvailable()) {
        console.warn('SecureStore not available, returning null');
        return null;
      }
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const timestamp = await SecureStore.getItemAsync(TOKEN_TIMESTAMP_KEY);
      
      if (!token || !timestamp) {
        return null;
      }

      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 1 week

      if (tokenAge > maxAge) {
        await this.clearAuthData();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  // Get stored user
  async getUser(): Promise<StoredUser | null> {
    try {
      if (!isSecureStoreAvailable()) {
        console.warn('SecureStore not available, returning null');
        return null;
      }
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      const user = await this.getUser();
      if (!token || !user) {
        return false;
      }

      const tokenTimestamp = await SecureStore.getItemAsync(TOKEN_TIMESTAMP_KEY);
      if (!tokenTimestamp) {
        return false;
      }

      const timestamp = parseInt(tokenTimestamp, 10);
      const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
      const currentTime = Date.now();
      const isExpired = (currentTime - timestamp) > oneWeekInMs;

      if (isExpired) {
        // Clear expired authentication data
        await this.clearAuthData();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  // Clear all authentication data
  async clearAuthData(): Promise<void> {
    try {
      if (!isSecureStoreAvailable()) {
        console.warn('SecureStore not available, skipping clear');
        return;
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(TOKEN_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  },

  async hasOnboarded(): Promise<boolean> {
    try {
      const val = await SecureStore.getItemAsync(ONBOARDED_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async setOnboarded(): Promise<void> {
    try {
      await SecureStore.setItemAsync(ONBOARDED_KEY, 'true');
    } catch {}
  },

  async resetOnboarding(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ONBOARDED_KEY);
    } catch {}
  },

  // Get remaining time in session (in milliseconds)
  async getSessionTimeRemaining(): Promise<number> {
    try {
      const tokenTimestamp = await SecureStore.getItemAsync(TOKEN_TIMESTAMP_KEY);
      if (!tokenTimestamp) {
        return 0;
      }

      const timestamp = parseInt(tokenTimestamp, 10);
      const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
      const currentTime = Date.now();
      const timeElapsed = currentTime - timestamp;
      const timeRemaining = Math.max(0, oneWeekInMs - timeElapsed);

      return timeRemaining;
    } catch (error) {
      console.error('Error getting session time remaining:', error);
      return 0;
    }
  },

  // Refresh token timestamp (to extend session for 2 more weeks)
  async refreshTokenTimestamp(): Promise<void> {
    try {
      if (!isSecureStoreAvailable()) {
        console.warn('SecureStore not available, skipping refresh');
        return;
      }
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const now = Date.now();
        await SecureStore.setItemAsync(TOKEN_TIMESTAMP_KEY, now.toString());
        console.log('Authentication session extended for 2 more weeks');
      }
    } catch (error) {
      console.error('Error refreshing token timestamp:', error);
    }
  },

  // Save chatbot hidden state
  async setChatbotHidden(isHidden: boolean): Promise<void> {
    try {
      if (!isSecureStoreAvailable()) {
        console.warn('SecureStore not available, skipping chatbot state save');
        return;
      }
      await SecureStore.setItemAsync(CHATBOT_HIDDEN_KEY, JSON.stringify(isHidden));
    } catch (error) {
      console.error('Error saving chatbot state:', error);
    }
  },

  // Get chatbot hidden state
  async getChatbotHidden(): Promise<boolean> {
    try {
      if (!isSecureStoreAvailable()) {
        console.warn('SecureStore not available, returning false');
        return false;
      }
      const val = await SecureStore.getItemAsync(CHATBOT_HIDDEN_KEY);
      return val === 'true' ? true : false;
    } catch (error) {
      console.error('Error getting chatbot state:', error);
      return false;
    }
  },

  // Generic get item
  async getItem(key: string): Promise<string | null> {
    try {
      if (!isSecureStoreAvailable()) {
        console.warn('SecureStore not available, returning null');
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  },

  // Generic set item
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (!isSecureStoreAvailable()) {
        console.warn('SecureStore not available, skipping set');
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  },
};
