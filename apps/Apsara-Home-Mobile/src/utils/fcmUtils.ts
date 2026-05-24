import { getMessaging, getToken } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = 'fcm_token';

export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messaging = getMessaging();
    const currentToken = await getToken(messaging);

    if (!currentToken) {
      console.warn('[FCMUtils] No FCM token available');
      return null;
    }

    // Check if we have a stored token
    const storedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);

    // If tokens match, no need to send to backend (device hasn't changed)
    if (storedToken === currentToken) {
      console.log('[FCMUtils] FCM token unchanged, no need to update backend');
      return null;
    }

    // Token is new or different (device is new or token was reset)
    console.log('[FCMUtils] New or updated FCM token:', currentToken.substring(0, 20) + '...');

    // Store the new token for future comparisons
    await AsyncStorage.setItem(FCM_TOKEN_KEY, currentToken);

    return currentToken;
  } catch (error: any) {
    // FCM might not be available in all cases (e.g., no Google Play Services on Android)
    console.error('[FCMUtils] Failed to get FCM token:', error.message);
    return null;
  }
};
