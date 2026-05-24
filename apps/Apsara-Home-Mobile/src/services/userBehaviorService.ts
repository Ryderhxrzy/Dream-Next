import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type BehaviorType =
  | 'search'
  | 'product_view'
  | 'product_click'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'cart_add'
  | 'cart_remove'
  | 'purchase'
  | 'category_view'
  | 'brand_view';

export interface RecommendedProduct {
  id: number;
  name: string;
  image: string;
  priceMember: number;
  priceSrp: number;
  soldCount: number;
}

export const userBehaviorService = {
  /**
   * Track user behavior
   */
  async trackBehavior(
    token: string,
    behaviorType: BehaviorType,
    productId?: number,
    categoryId?: number,
    brandId?: number,
    searchQuery?: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const payload: any = {
        behavior_type: behaviorType,
      };

      if (productId) payload.product_id = productId;
      if (categoryId) payload.category_id = categoryId;
      if (brandId) payload.brand_id = brandId;
      if (searchQuery) payload.search_query = searchQuery;
      if (metadata) payload.metadata = metadata;

      await api.post('/user-behavior/track', payload, { headers });
      return true;
    } catch (error) {
      console.error('Error tracking behavior:', error);
      return false;
    }
  },

  /**
   * Get personalized product recommendations
   */
  async getRecommendations(token: string, limit: number = 20): Promise<RecommendedProduct[]> {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const response = await api.get(`/user-behavior/recommendations?limit=${limit}`, { headers });
      return response.data.data || [];
    } catch (error) {
      // Silently return empty - no tracking data yet is normal for new users
      return [];
    }
  },

  /**
   * Get user's behavior stats
   */
  async getUserStats(token: string, days: number = 30) {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const response = await api.get(`/user-behavior/stats?days=${days}`, { headers });
      return response.data.data || null;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  },

  /**
   * Clear user's behavior history
   */
  async clearBehavior(token: string, behaviorType?: BehaviorType): Promise<boolean> {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      let url = '/user-behavior';
      if (behaviorType) {
        url += `?type=${behaviorType}`;
      }

      await api.delete(url, { headers });
      return true;
    } catch (error) {
      console.error('Error clearing behavior:', error);
      return false;
    }
  },
};

export default userBehaviorService;
