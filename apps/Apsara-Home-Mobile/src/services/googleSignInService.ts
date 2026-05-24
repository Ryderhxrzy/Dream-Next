import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, LoginResponse, AuthError } from './authService';

export interface GoogleSignInConfig {
  webClientId: string;
  iosClientId?: string;
}

class GoogleSignInService {
  private static isInitialized = false;

  static async initialize(config: GoogleSignInConfig) {
    if (this.isInitialized) {
      return;
    }

    try {
      GoogleSignin.configure({
        webClientId: config.webClientId,
        iosClientId: config.iosClientId,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
        accountName: '', // Allow account selection
      });
      this.isInitialized = true;
      console.log('[GoogleSignIn] Initialized successfully');
    } catch (error) {
      console.error('[GoogleSignIn] Initialization failed:', error);
      throw error;
    }
  }

  static async hasPlayServices(): Promise<boolean> {
    try {
      await GoogleSignin.hasPlayServices();
      return true;
    } catch (error: any) {
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.error('[GoogleSignIn] Play Services not available');
        return false;
      }
      throw error;
    }
  }

  static async signIn() {
    try {
      console.log('[GoogleSignIn] Starting sign-in flow');

      // Check for Play Services availability (Android)
      const hasPlayServices = await this.hasPlayServices();
      if (!hasPlayServices) {
        throw new Error('Google Play Services not available');
      }

      // Sign out first to clear cached account and force account picker
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore errors during sign out
      }

      const userInfo = await GoogleSignin.signIn();

      if (!userInfo || !userInfo.data || !userInfo.data.user) {
        throw new Error('Invalid user data from Google Sign-In');
      }

      return userInfo;
    } catch (error: any) {
      this.handleSignInError(error);
      throw error;
    }
  }

  static async signOut() {
    try {
      await GoogleSignin.signOut();
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('[GoogleSignIn] Sign-out failed:', error);
      throw error;
    }
  }

  static async getCurrentUser() {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo;
    } catch (error) {
      console.error('[GoogleSignIn] Get current user failed:', error);
      return null;
    }
  }

  static async handleGoogleLogin(fcmToken?: string): Promise<LoginResponse> {
    try {
      // Step 1: Sign in with Google
      const userInfo = await this.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Step 2: Send ID token to backend for authentication (with optional FCM token)
      const loginResponse = await authService.googleLogin(idToken, fcmToken);

      if (!loginResponse.user || !loginResponse.token) {
        throw new Error('Invalid response from server');
      }

      // Step 3: Save token and user data
      await AsyncStorage.setItem('authToken', loginResponse.token);
      await AsyncStorage.setItem('user', JSON.stringify(loginResponse.user));

      return loginResponse;
    } catch (error: any) {
      // Handle specific cancellation case
      if (error?.message === 'Sign in was cancelled') {
        throw {
          message: 'Login cancelled',
          type: 'GOOGLE_LOGIN_CANCELLED',
        } as AuthError;
      }

      // If it's already an AuthError from authService, pass it through
      if (error?.type === 'GOOGLE_LOGIN_ERROR' || (error?.message && !error?.message?.includes('Sign in was cancelled'))) {
        throw error;
      }

      // Default error
      throw {
        message: error?.message || 'Google login failed',
        type: 'GOOGLE_LOGIN_ERROR',
      } as AuthError;
    }
  }

  private static handleSignInError(error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      const cancelError = new Error('Sign in was cancelled');
      console.log('[GoogleSignIn] User cancelled login');
      throw cancelError;
    } else if (error.code === statusCodes.IN_PROGRESS) {
      const inProgressError = new Error('Sign in is already in progress');
      console.log('[GoogleSignIn] Sign-in is in progress');
      throw inProgressError;
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      const servicesError = new Error('Google Play Services not available');
      console.log('[GoogleSignIn] Play Services not available');
      throw servicesError;
    } else {
      console.error('[GoogleSignIn] Unexpected error:', error);
      throw error;
    }
  }
}

export default GoogleSignInService;
