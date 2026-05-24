const { Pusher } = require('pusher-js/react-native') as { Pusher: any };
import { API_CONFIG } from '../config/api';

class PusherService {
  private pusher: any = null;
  private channels: Map<string, any> = new Map();

  init(token: string) {
    if (this.pusher) {
      this.pusher.disconnect();
    }

    console.log('[PusherService] init with token:', {
      tokenExists: !!token,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 20) + '...',
    });

    this.pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.EXPO_PUBLIC_PUSHER_APP_CLUSTER || 'ap3',
      authorizer: (channel: any) => ({
        authorize: (socketId: string, callback: (error: any, authData: any) => void) => {
          fetch('https://backend.afhome.ph/api/realtime/pusher/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          })
            .then(async (response) => {
              if (!response.ok) {
                const errorText = await response.text();
                console.error('[PusherService] auth error:', response.status, errorText);
                throw new Error(`Auth failed with status ${response.status}: ${errorText}`);
              }
              return response.json();
            })
            .then((data) => {
              console.log('[PusherService] auth success:', data);
              callback(null, data);
            })
            .catch((error) => {
              console.error('[PusherService] auth fetch error:', error);
              callback(error, null);
            });
        },
      }),
      forceTLS: true,
      enabledTransports: ['ws', 'wss'],
    });

    if (this.pusher && this.pusher.connection) {
      this.pusher.connection.bind('state_change', (states: any) => {
        console.log('[PusherService] connection state change:', states.previous, '→', states.current);
      });

      this.pusher.connection.bind('error', (error: any) => {
        console.error('[PusherService] connection error:', error);
      });
    }
  }

  subscribe(channelName: string) {
    if (!this.pusher) {
      throw new Error('Pusher not initialized. Call init() first.');
    }

    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = this.pusher.subscribe(channelName);
    this.channels.set(channelName, channel);
    return channel;
  }

  unsubscribe(channelName: string) {
    if (!this.pusher) return;

    this.pusher.unsubscribe(channelName);
    this.channels.delete(channelName);
  }

  disconnect() {
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
      this.channels.clear();
    }
  }
}

export const pusherService = new PusherService();