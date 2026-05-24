import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMessaging,
  onMessage,
  getToken,
  getInitialNotification,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

const PENDING_DEEPLINK_KEY = 'pending_background_deeplink';
let lastStoredDeeplink: string | null = null;

const extractDeeplinkFromMessage = (remoteMessage: any): string | null => {
  const data = remoteMessage?.data || {};
  const deeplink = data.href || data.deeplink || null;
  return typeof deeplink === 'string' && deeplink.trim() !== '' ? deeplink.trim() : null;
};

const storePendingBackgroundDeeplink = async (deeplink: string): Promise<void> => {
  lastStoredDeeplink = deeplink;
  await AsyncStorage.setItem(PENDING_DEEPLINK_KEY, deeplink);
};


export const getPendingBackgroundDeeplink = async (): Promise<string | null> => {
  if (lastStoredDeeplink) {
    const value = lastStoredDeeplink;
    lastStoredDeeplink = null;
    await AsyncStorage.removeItem(PENDING_DEEPLINK_KEY);
    return value;
  }

  const persisted = await AsyncStorage.getItem(PENDING_DEEPLINK_KEY);
  if (persisted) {
    await AsyncStorage.removeItem(PENDING_DEEPLINK_KEY);
    return persisted;
  }

  return null;
};

// Register handlers at module level (only once)
let backgroundHandlerRegistered = false;
let foregroundHandlerRegistered = false;

const registerBackgroundMessageHandler = () => {
  if (backgroundHandlerRegistered) return;
  backgroundHandlerRegistered = true;

  getMessaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[useFirebaseMessaging] Background message received:', remoteMessage);
    console.log('[useFirebaseMessaging] Background data payload:', remoteMessage.data);

    try {
      const deeplink = extractDeeplinkFromMessage(remoteMessage);
      if (deeplink) {
        await storePendingBackgroundDeeplink(deeplink);
        console.log('[useFirebaseMessaging] Stored background deeplink:', deeplink);
      }
    } catch (error) {
      console.error('[useFirebaseMessaging] Background message error:', error);
    }
  });
};

export const useFirebaseMessaging = (
  token: string | null,
  userId: string | number | null,
  onNotificationPressed?: (checkoutId: string, status: string) => void
) => {
  // Initialize notification handlers early, before auth is complete
  // This ensures notifications are handled even if token/userId are loading
  useEffect(() => {
    const setupNotificationHandlers = async () => {
      try {
        console.log('[useFirebaseMessaging] Setting up notification handlers...');
        registerBackgroundMessageHandler();

        const messaging_ = getMessaging();

        // Register foreground handler only once
        if (!foregroundHandlerRegistered) {
          foregroundHandlerRegistered = true;
          console.log('[useFirebaseMessaging] Registering foreground handler');

          onMessage(messaging_, async (remoteMessage) => {
            console.log('[useFirebaseMessaging] Foreground notification received:', remoteMessage);
            const deeplink = extractDeeplinkFromMessage(remoteMessage);
            if (deeplink) {
              lastStoredDeeplink = deeplink;
            }
          });
        }

        // Handle notification press (when user clicks the notification)
        onNotificationOpenedApp(messaging_, (remoteMessage) => {
          const deeplink = extractDeeplinkFromMessage(remoteMessage);
          if (deeplink && onNotificationPressed) {
            const normalized = deeplink.includes('apsarahome://purchases/')
              ? deeplink.replace('apsarahome://purchases/', '')
              : deeplink.replace('purchases://', '');
            const parts = normalized.split('/');
            const status = parts[0];
            const checkoutId = parts[1];

            console.log('[useFirebaseMessaging] Notification clicked:', { status, checkoutId, deeplink });

            if (checkoutId) {
              onNotificationPressed(checkoutId, status);
            }
          }
        });

        // Handle app opened from closed state
        const notificationOpenedApp = await getInitialNotification(messaging_);
        if (notificationOpenedApp && onNotificationPressed) {
          const deeplink = extractDeeplinkFromMessage(notificationOpenedApp);
          if (deeplink) {
            const normalized = deeplink.includes('apsarahome://purchases/')
              ? deeplink.replace('apsarahome://purchases/', '')
              : deeplink.replace('purchases://', '');
            const parts = normalized.split('/');
            const status = parts[0];
            const checkoutId = parts[1];

            console.log('[useFirebaseMessaging] App launched from notification:', { status, checkoutId, deeplink });

            if (checkoutId) {
              setTimeout(() => {
                onNotificationPressed(checkoutId, status);
              }, 300);
            }
          }
        }
      } catch (error) {
        console.error('[useFirebaseMessaging] Error setting up notification handlers:', error);
      }
    };

    setupNotificationHandlers();
  }, [onNotificationPressed]); // Only re-run if callback changes

  // Separate effect for token registration (depends on auth)
  useEffect(() => {
    if (!token || !userId) {
      return;
    }

    const setupTokenRegistration = async () => {
      try {
        console.log('[useFirebaseMessaging] Setting up token registration...');

        const messaging_ = getMessaging();
        let permissionEnabled = true;
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          const permissionResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          permissionEnabled = permissionResult === PermissionsAndroid.RESULTS.GRANTED;
        }

        if (!permissionEnabled) {
          console.warn('[useFirebaseMessaging] Notification permission not granted on Android');
          return;
        }

        const registerFcmToken = async (fcmToken: string) => {
          const platform = Platform.OS === 'android' ? 'android' : 'ios';
          await axios.post(
            `${API_CONFIG.BASE_URL}/notifications/fcm/register-token`,
            {
              fcm_token: fcmToken,
              device_name: `${platform}-device`,
              platform,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          console.log('[useFirebaseMessaging] FCM token registered');
        };

        const fcmToken = await getToken(messaging_);
        if (!fcmToken) {
          console.warn('[useFirebaseMessaging] Failed to get FCM token');
          return;
        }

        await registerFcmToken(fcmToken);

        const unsubscribeTokenRefresh = onTokenRefresh(messaging_, async (newToken) => {
          try {
            console.log('[useFirebaseMessaging] FCM token refreshed');
            await registerFcmToken(newToken);
          } catch (error) {
            console.error('[useFirebaseMessaging] Failed to register refreshed token:', error);
          }
        });

        return () => {
          unsubscribeTokenRefresh();
        };
      } catch (error) {
        console.error('[useFirebaseMessaging] Error setting up token registration:', error);
      }
    };

    setupTokenRegistration();
  }, [token, userId]);

  return null;
};
