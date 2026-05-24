import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

interface ProductsParams {
  token?: string | null;
  roomId?: number | null;
  categoryId?: number | null;
  brandId?: number | null;
  perPage?: number;
  enabled?: boolean;
}

const PER_PAGE = 20;

export const useProducts = ({
  token,
  roomId = null,
  categoryId = null,
  brandId = null,
  perPage = PER_PAGE,
  enabled = true,
}: ProductsParams) => {
  const query = useInfiniteQuery({
    queryKey: ['products', { roomId, categoryId, brandId, perPage }],
    queryFn: async ({ pageParam = 1 }) => {
      if (!token) throw new Error('Token is required');

      const startTime = Date.now();
      const headers = { Authorization: `Bearer ${token}` };
      const url = new URL(`${API_CONFIG.BASE_URL}/products`);

      url.searchParams.set('status', '1');
      url.searchParams.set('page', pageParam.toString());
      url.searchParams.set('per_page', perPage.toString());

      if (roomId) url.searchParams.set('room_type', roomId.toString());
      if (categoryId) url.searchParams.set('cat_id', categoryId.toString());
      if (brandId) url.searchParams.set('brand_type', brandId.toString());

      console.log(`🔍 [PAGE ${pageParam}] Fetching products...`);
      const response = await axios.get(url.toString(), { headers });
      const duration = Date.now() - startTime;

      let products = response.data?.data || response.data?.products || [];
      if (!Array.isArray(products)) products = [];

      const total = response.data?.meta?.total || response.data?.total || 0;
      const totalPages = Math.ceil(total / perPage);

      console.log(`✅ [PAGE ${pageParam}] ${products.length} products fetched in ${duration}ms`);

      return {
        products,
        pageParam,
        totalPages,
        total,
        hasMore: pageParam < totalPages,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.pageParam + 1 : undefined,
    initialPageParam: 1,
    enabled: !!token && enabled,
  });

  useEffect(() => {
    console.log(`📊 useProducts hook: loading=${query.isLoading}, hasData=${!!query.data?.pages?.[0]?.products?.length}`);
  }, [query.isLoading, query.data]);

  return query;
};
