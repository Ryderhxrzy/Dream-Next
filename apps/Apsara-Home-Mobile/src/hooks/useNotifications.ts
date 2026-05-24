import { useEffect, useState, useCallback } from 'react';
import { pusherService } from '../services/pusherService';
import Toast from 'react-native-toast-message';
import { useTokenRefresh } from './useTokenRefresh';

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  description: string;
  message?: string;
  count?: number;
  severity: string;
  href: string;
  latest_at: string;
  order_id?: number;
  checkout_id?: string;
  status?: string;
  created_at: string;
}

export interface OrderStatusData {
  order_id?: number;
  checkout_id: string;
  event_type?: string;
  title?: string;
  description?: string;
  message?: string;
  status: string;
  payment_status?: string;
  tracking_number?: string;
  created_at?: string;
}

export const useNotifications = (userId: string | number, token: string, onNavigateToPurchases?: (status: string, orderId?: string) => void, onNotificationUpdate?: () => void) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lastOrderNotification, setLastOrderNotification] = useState<OrderStatusData | null>(null);
  const { validateToken } = useTokenRefresh();

  useEffect(() => {
    if (!userId || !token) {
      console.log('[useNotifications] missing userId or token, skipping realtime setup', { userId, token: !!token });
      return;
    }

    let isMounted = true;

    const initializeNotifications = async () => {
      // First, validate the token
      console.log('[useNotifications] validating token before initializing Pusher...');
      const isTokenValid = await validateToken(token);

      if (!isMounted) return;

      if (!isTokenValid) {
        const msg = 'Token invalid or expired. Please login again.';
        console.error('[useNotifications]', msg);
        setAuthError(msg);
        return;
      }

      const channelName = `private-customer-${userId}`;
      console.log('[useNotifications] initializing realtime notifications', {
        channelName,
        tokenLength: token?.length,
        userId,
      });

      // Initialize Pusher
      pusherService.init(token);

      // Subscribe to customer's private channel
      const channel = pusherService.subscribe(channelName);
      console.log('[useNotifications] subscribed to channel', channelName);

      channel.bind('pusher:subscription_succeeded', () => {
        if (isMounted) {
          console.log('[useNotifications] ✅ pusher subscription succeeded for:', channelName);
          setAuthError(null);
        }
      });

      channel.bind('pusher:subscription_error', (error: any) => {
        if (isMounted) {
          console.error('[useNotifications] ❌ pusher subscription error:', {
            channel: channelName,
            status: error?.status,
            error: error?.error,
            type: error?.type,
          });
          
          if (error?.status === 403) {
            setAuthError('Token expired or invalid. Please login again.');
          } else {
            setAuthError(error?.error || 'Failed to subscribe to notifications');
          }
        }
      });

      // Listen for new notifications
      channel.bind('notification.created', (data: NotificationData) => {
        if (isMounted) {
          console.log('New notification received:', data);

          // Add to notifications list
          setNotifications(prev => [data, ...prev]);
          setUnreadCount(prev => prev + (data.count || 1));

          // Show toast notification with actual message from backend
          Toast.show({
            type: data.severity === 'critical' ? 'error' : data.severity === 'warning' ? 'info' : 'success',
            text1: data.title,
            text2: data.description || data.message,
            position: 'top',
            visibilityTime: 5000,
            onPress: () => {
              if (onNavigateToPurchases && data.href) {
                // Parse deep link format: purchases://status or purchases://status/mobile-order-id
                const deepLinkRegex = /^purchases:\/\/([^\/]+)(?:\/(.+))?$/;
                const match = data.href.match(deepLinkRegex);
                if (match && match[1]) {
                  const status = match[1];
                  const orderId = match[2] || (data.order_id?.toString());
                  onNavigateToPurchases(status, orderId);
                }
              }
            },
          });
        }
      });

      // Listen for order status updates
      channel.bind('order.notification.updated', (data: OrderStatusData) => {
        if (isMounted) {
          console.log('Order notification updated:', data);

          // Only trigger if the notification data has actually changed
          const hasChanged = !lastOrderNotification ||
            lastOrderNotification.checkout_id !== data.checkout_id ||
            lastOrderNotification.status !== data.status ||
            lastOrderNotification.message !== data.message;

          if (hasChanged) {
            setLastOrderNotification(data);

            // Trigger refresh in notification screen
            onNotificationUpdate?.();

            // Show toast for order status change with actual message from backend
            Toast.show({
              type: 'info',
              text1: data.title || 'Order Status Updated',
              text2: data.message || `Order ${data.checkout_id}: ${data.status}`,
              position: 'top',
              visibilityTime: 5000,
              onPress: () => {
                if (onNavigateToPurchases) {
                  onNavigateToPurchases(data.status, data.checkout_id);
                }
              },
            });
          } else {
            console.log('[useNotifications] Ignoring duplicate notification:', data);
          }
        }
      });

      channel.bind('notification.count.updated', (data: { unread_count: number; updated_at: string }) => {
        if (isMounted) {
          setUnreadCount(data.unread_count);
        }
      });
    };

    initializeNotifications();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      pusherService.unsubscribe(`private-customer-${userId}`);
    };
  }, [userId, token, validateToken]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, /* mark as read logic */ } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications,
    authError,
  };
};