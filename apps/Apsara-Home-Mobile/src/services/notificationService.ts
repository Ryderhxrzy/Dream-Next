// Notification navigation handler
export class NotificationService {
  /**
   * Handle notification tap navigation using href from backend
   */
  static handleNotificationPress(data: any, navigation: any): void {
    try {
      // Prioritize href from backend (on_href from OrderNotification table)
      const href = data.href;
      const title = data.title || 'Notification';
      const body = data.body || '';

      console.log('🧭 Navigating with href:', {
        href,
        title,
        body,
        data,
      });

      if (!href) {
        console.warn('⚠️ No href provided in notification data');
        navigation.navigate?.('Orders');
        return;
      }

      // Parse href: format is "purchases://status/identifier"
      // e.g., "purchases://delivered/cs_c9c78aa27c0dd63e99e22c2e"
      const hrefRegex = /^(\w+):\/\/([^\/]+)(?:\/(.+))?$/;
      const match = href.match(hrefRegex);

      if (!match) {
        console.warn('⚠️ Invalid href format:', href);
        navigation.navigate?.('Orders');
        return;
      }

      const [, scheme, status, identifier] = match;

      console.log('📋 Parsed href:', {
        scheme,
        status,
        identifier,
      });

      // Route based on scheme
      switch (scheme) {
        case 'purchases':
        case 'orders':
          // Navigate to Orders/Purchases with status and identifier
          navigation.navigate?.('Orders', {
            status: status,
            orderId: identifier,
            checkoutId: identifier,
          });
          break;

        case 'wallet':
          navigation.navigate?.('Wallet', {
            status: status,
          });
          break;

        case 'profile':
          navigation.navigate?.('Profile', {
            section: status,
          });
          break;

        case 'referral':
          navigation.navigate?.('Profile', {
            section: 'referrals',
          });
          break;

        default:
          console.log('📦 Unknown scheme, defaulting to Orders:', scheme);
          navigation.navigate?.('Orders', {
            status: status,
            orderId: identifier,
          });
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
      // Fallback to Orders screen
      navigation?.navigate?.('Orders');
    }
  }

  /**
   * Handle notification when app is opened from closed state
   * Note: Not currently used - we rely on addNotificationResponseReceivedListener
   * which handles actual user taps and doesn't cause repeat triggers
   */
  static async handleInitialNotification(navigation: any) {
    try {
      const notification = await Notifications.getLastNotificationResponseAsync();

      if (notification) {
        const notificationId = notification.notification.request.identifier;

        // Skip if we've already processed this notification
        if (processedNotificationIds.has(notificationId)) {
          console.log('⏭️ Notification already processed, skipping:', notificationId);
          return;
        }

        // Mark this notification as processed
        processedNotificationIds.add(notificationId);

        console.log('📲 App opened from notification:', notificationId);
        const data = notification.notification.request.content.data;
        this.handleNotificationPress(data, navigation);
      }
    } catch (error) {
      console.error('Error handling initial notification:', error);
    }
  }
}
