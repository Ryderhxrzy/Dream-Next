import OneSignal from 'react-native-onesignal';

export class OneSignalNotificationService {
  static async initialize(
    oneSignalAppId: string,
    handleNotification?: (notification: any) => void,
    navigation?: any
  ): Promise<void> {
    try {
      OneSignal.initialize(oneSignalAppId);
      OneSignal.Notifications.requestPermission(true);

      // Handle notification when user taps on it
      OneSignal.Notifications.addEventListener('click', (event) => {
        console.log('👆 Notification tapped:', event);
        this.handleNotificationPress(event.notification, navigation);
      });

      // Handle foreground notifications
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        console.log('📬 Notification received in foreground:', event);
        if (handleNotification) {
          handleNotification(event.notification);
        }
      });

      console.log('✅ OneSignal initialized successfully');
    } catch (error) {
      console.error('Error initializing OneSignal:', error);
    }
  }

  static async getPlayerId(): Promise<string | null> {
    try {
      const state = await OneSignal.User.pushSubscription.getIdAsync();
      return state;
    } catch (error) {
      console.error('Error getting OneSignal player ID:', error);
      return null;
    }
  }

  static async addExternalId(externalId: string | number): Promise<void> {
    try {
      OneSignal.User.addAlias('customer_id', externalId.toString());
      console.log('✅ External ID set:', externalId);
    } catch (error) {
      console.error('Error setting external ID:', error);
    }
  }

  static async removeExternalId(): Promise<void> {
    try {
      OneSignal.User.removeAlias('customer_id');
      console.log('✅ External ID removed');
    } catch (error) {
      console.error('Error removing external ID:', error);
    }
  }

  static async setTags(tags: Record<string, string>): Promise<void> {
    try {
      OneSignal.User.addTags(tags);
      console.log('✅ Tags set:', tags);
    } catch (error) {
      console.error('Error setting tags:', error);
    }
  }

  private static handleNotificationPress(notification: any, navigation?: any): void {
    try {
      const data = notification.additionalData || notification.data || {};
      const href = data.href;
      const title = notification.title || 'Notification';
      const body = notification.body || '';

      console.log('🧭 Navigating with notification data:', {
        href,
        title,
        body,
        data,
      });

      if (!href) {
        console.warn('⚠️ No href provided in notification data');
        navigation?.navigate?.('Orders');
        return;
      }

      // Parse href: format is "purchases://status/identifier"
      const hrefRegex = /^(\w+):\/\/([^\/]+)(?:\/(.+))?$/;
      const match = href.match(hrefRegex);

      if (!match) {
        console.warn('⚠️ Invalid href format:', href);
        navigation?.navigate?.('Orders');
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
          navigation?.navigate?.('Orders', {
            status: status,
            orderId: identifier,
            checkoutId: identifier,
          });
          break;

        case 'wallet':
          navigation?.navigate?.('Wallet', {
            status: status,
          });
          break;

        case 'profile':
          navigation?.navigate?.('Profile', {
            section: status,
          });
          break;

        case 'referral':
          navigation?.navigate?.('Profile', {
            section: 'referrals',
          });
          break;

        default:
          console.log('📦 Unknown scheme, defaulting to Orders:', scheme);
          navigation?.navigate?.('Orders', {
            status: status,
            orderId: identifier,
          });
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
      navigation?.navigate?.('Orders');
    }
  }
}
