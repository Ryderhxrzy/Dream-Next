import { baseApi } from "./baseApi"

/**
 * Brand follower endpoints (customer-facing).
 *
 * Backend routes (Laravel, prefixed with /api):
 *   POST /api/followers/follow          { brand_id }   (auth)
 *   POST /api/followers/unfollow        { brand_id }   (auth)
 *   GET  /api/followers/following                      (auth)
 *   GET  /api/product-brands/{id}/followers/count      (public)
 */

export interface FollowMutationResponse {
  message: string
  is_following: boolean
  followers_count: number
}

export interface FollowingResponse {
  user_id: number
  following: number[]
}

export interface BrandFollowerCountResponse {
  brand_id: number
  followers_count: number
}

export const followersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Brand ids the authenticated customer currently follows. One call lets the
    // UI resolve "is following" for any brand without a per-brand request.
    getFollowing: builder.query<FollowingResponse, void>({
      query: () => ({
        url: "/api/followers/following",
        method: "GET",
      }),
      providesTags: [{ type: "Followers", id: "FOLLOWING" }],
    }),
    // Public follower count for a single brand (visible to guests too).
    getBrandFollowerCount: builder.query<BrandFollowerCountResponse, number>({
      query: (brandId) => ({
        url: `/api/product-brands/${brandId}/followers/count`,
        method: "GET",
      }),
      providesTags: (_result, _error, brandId) => [
        { type: "Followers", id: `COUNT-${brandId}` },
      ],
    }),
    followBrand: builder.mutation<FollowMutationResponse, number>({
      query: (brandId) => ({
        url: "/api/followers/follow",
        method: "POST",
        body: { brand_id: brandId },
      }),
      // Also invalidate "Brands" so the optionally-authenticated brand GET
      // (which now carries is_followed / followers_count) refetches fresh.
      invalidatesTags: (_result, _error, brandId) => [
        { type: "Followers", id: "FOLLOWING" },
        { type: "Followers", id: `COUNT-${brandId}` },
        "Brands",
      ],
    }),
    unfollowBrand: builder.mutation<FollowMutationResponse, number>({
      query: (brandId) => ({
        url: "/api/followers/unfollow",
        method: "POST",
        body: { brand_id: brandId },
      }),
      invalidatesTags: (_result, _error, brandId) => [
        { type: "Followers", id: "FOLLOWING" },
        { type: "Followers", id: `COUNT-${brandId}` },
        "Brands",
      ],
    }),
  }),
})

export const {
  useGetFollowingQuery,
  useGetBrandFollowerCountQuery,
  useFollowBrandMutation,
  useUnfollowBrandMutation,
} = followersApi
