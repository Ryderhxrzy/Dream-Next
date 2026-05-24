import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface OrderCounts {
  all: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  completed: number;
  paid: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  description?: string;
  count?: number;
  severity: 'success' | 'info' | 'warning' | 'error';
  href?: string;
  latest_at?: string | null;
  created_at?: string;
  is_read: boolean;
  amount?: number;
  product_image?: string;
  mobile_order_id?: string;
  order_id?: string;
}

export interface Notifications {
  unread_count: number;
  items: NotificationItem[];
  generated_at: string;
}

export const orderService = {
  async getOrderCounts(token: string): Promise<OrderCounts> {
    try {
      const response = await api.get('/orders/counts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load order counts',
        details: error.response?.data,
        status: error.response?.status,
      };
    }
  },

  async getNotifications(token: string): Promise<any> {
    try {
      const response = await api.get('/mobile/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load notifications',
        details: error.response?.data,
        status: error.response?.status,
      };
    }
  },

  async readNotification(token: string, notificationId: string | number): Promise<any> {
    try {
      const response = await api.patch(`/mobile/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to mark notification as read',
        details: error.response?.data,
        status: error.response?.status,
      };
    }
  },
};
