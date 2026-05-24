import { useInfiniteQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

interface ProductsParams {
  token?: string | null;
  roomId?: number | null;
  categoryId?: number | null;
  brandId?: number | null;
  sortBy?: 'popular' | 'best_selling' | 'lowest_price' | 'newest' | null;
  perPage?: number;
  enabled?: boolean;
}

interface FilterKey {
  roomId: number | null;
  categoryId: number | null;
  brandId: number | null;
  sortBy: string | null;
}

const PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

// Generate cache key for filter combinations
const getFilterKey = (filters: Partial<FilterKey>) => {
  return JSON.stringify(filters);
};

export const useOptimizedProducts = ({
  token,
  roomId = null,
  categoryId = null,
  brandId = null,
  sortBy = null,
  perPage = PER_PAGE,
  enabled = true,
}: ProductsParams) => {
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousFilterKeyRef = useRef<string>('');

  const filterKey = {
    roomId,
    categoryId,
    brandId,
    sortBy: sortBy || null,
  };

  const filterKeyString = getFilterKey(filterKey);

  // Detect filter change and trigger transition effect
  useEffect(() => {
    if (filterKeyString !== previousFilterKeyRef.current && previousFilterKeyRef.current !== '') {
      setIsTransitioning(true);
      const transitionTimeout = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(transitionTimeout);
    }
    previousFilterKeyRef.current = filterKeyString;
  }, [filterKeyString]);

  const query = useInfiniteQuery({
    queryKey: ['products_optimized', filterKey],
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

      // Add sorting parameter if specified
      if (sortBy === 'best_selling') {
        url.searchParams.set('sort', 'bestseller');
      } else if (sortBy === 'lowest_price') {
        url.searchParams.set('sort', 'price_asc');
      } else if (sortBy === 'newest') {
        url.searchParams.set('sort', 'newest');
      }

      console.log(`🔍 [FILTER: ${JSON.stringify({ roomId, categoryId, brandId, sortBy })}] Fetching page ${pageParam}...`);
      const response = await axios.get(url.toString(), { headers });
      const duration = Date.now() - startTime;

      let products = response.data?.data || response.data?.products || [];
      if (!Array.isArray(products)) products = [];

      const total = response.data?.meta?.total || response.data?.total || 0;
      const totalPages = Math.ceil(total / perPage);

      console.log(`✅ [FILTER] Page ${pageParam} fetched in ${duration}ms - ${products.length} products`);

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
    // CRITICAL: placeholderData with keepPreviousData maintains old data while fetching new data
    // This prevents blank screens during filter changes
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Prefetch common filter combinations
  const prefetchFilter = useCallback(
    async (presetFilter: Partial<FilterKey>) => {
      if (!token) return;
      try {
        await queryClient.prefetchInfiniteQuery({
          queryKey: ['products_optimized', presetFilter],
          queryFn: async ({ pageParam = 1 }) => {
            const headers = { Authorization: `Bearer ${token}` };
            const url = new URL(`${API_CONFIG.BASE_URL}/products`);

            url.searchParams.set('status', '1');
            url.searchParams.set('page', pageParam.toString());
            url.searchParams.set('per_page', perPage.toString());

            if (presetFilter.roomId) url.searchParams.set('room_type', presetFilter.roomId.toString());
            if (presetFilter.categoryId) url.searchParams.set('cat_id', presetFilter.categoryId.toString());
            if (presetFilter.brandId) url.searchParams.set('brand_type', presetFilter.brandId.toString());
            if (presetFilter.sortBy === 'best_selling') url.searchParams.set('sort', 'bestseller');
            else if (presetFilter.sortBy === 'lowest_price') url.searchParams.set('sort', 'price_asc');
            else if (presetFilter.sortBy === 'newest') url.searchParams.set('sort', 'newest');

            const response = await axios.get(url.toString(), { headers });
            let products = response.data?.data || response.data?.products || [];
            if (!Array.isArray(products)) products = [];

            const total = response.data?.meta?.total || response.data?.total || 0;
            const totalPages = Math.ceil(total / perPage);

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
        console.log(`🔮 Prefetched filter: ${getFilterKey(presetFilter)}`);
      } catch (error) {
        console.log('Prefetch error:', error instanceof Error ? error.message : '');
      }
    },
    [token, queryClient, perPage]
  );

  // Prefetch common filters on mount
  useEffect(() => {
    if (!token) return;

    // Prefetch best selling, lowest price, and newest in background
    const prefetchTimeout = setTimeout(() => {
      prefetchFilter({ roomId: null, categoryId: null, brandId: null, sortBy: 'best_selling' });
      prefetchFilter({ roomId: null, categoryId: null, brandId: null, sortBy: 'lowest_price' });
      prefetchFilter({ roomId: null, categoryId: null, brandId: null, sortBy: 'newest' });
    }, 500);

    return () => clearTimeout(prefetchTimeout);
  }, [token, prefetchFilter]);

  return {
    ...query,
    isTransitioning,
    prefetchFilter,
  };
};
