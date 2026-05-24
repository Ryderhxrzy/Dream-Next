import { useState, useEffect } from 'react';
import { userBehaviorService, type RecommendedProduct } from '../services/userBehaviorService';

interface UseRecommendationsOptions {
  token?: string | null;
  limit?: number;
  enabled?: boolean;
}

export function useRecommendations({
  token,
  limit = 20,
  enabled = true,
}: UseRecommendationsOptions) {
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    if (!token || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const data = await userBehaviorService.getRecommendations(token, limit);
      setRecommendations(data);
    } catch (err) {
      // Silently fail - no data yet is normal for new users
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [token, limit, enabled]);

  const refetch = async () => {
    await fetchRecommendations();
  };

  return {
    recommendations,
    loading,
    error,
    refetch,
  };
}
