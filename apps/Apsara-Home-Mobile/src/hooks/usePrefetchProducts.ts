import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { API_CONFIG } from '../config/api';

export const usePrefetchProducts = (token?: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const prefetchData = async () => {
      try {
        const startTime = Date.now();
        await queryClient.prefetchInfiniteQuery({
          queryKey: ['products', { roomId: null, categoryId: null, brandId: null, perPage: 20 }],
          queryFn: async ({ pageParam = 1 }) => {
            const headers = { Authorization: `Bearer ${token}` };
            const response = await fetch(
              `${API_CONFIG.BASE_URL}/products?status=1&page=${pageParam}&per_page=20`,
              { headers }
            );
            const data = await response.json();
            const products = data?.data || data?.products || [];
            const total = data?.meta?.total || data?.total || 0;
            const totalPages = Math.ceil(total / 20);

            return {
              products,
              pageParam,
              totalPages,
              total,
              hasMore: pageParam < totalPages,
            };
          },
          initialPageParam: 1,
        });

        const duration = Date.now() - startTime;
        console.log(`🔄 Prefetched Shop products (${duration}ms) - ready for instant display`);
      } catch (error) {
        console.log('Prefetch notice: Could not prefetch products', error instanceof Error ? error.message : '');
      }
    };

    const timeoutId = setTimeout(prefetchData, 100);
    return () => clearTimeout(timeoutId);
  }, [token, queryClient]);
};
