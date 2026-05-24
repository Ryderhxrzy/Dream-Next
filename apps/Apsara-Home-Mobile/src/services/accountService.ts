import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoyaltyData {
  rank: number;
  tier: string;
  personal_pv: number;
  referral_count: number;
  active_members_count: number;
  active_builders_count: number;
  active_leaders_count: number;
}

export interface AccountSnapshot {
  loyalty: LoyaltyData;
}

export const accountService = {
  async getAccountSnapshot(token: string): Promise<AccountSnapshot> {
    try {
      const response = await api.get('/account/snapshot', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to load account snapshot',
        details: error.response?.data,
        status: error.response?.status,
      };
    }
  },
};
