import { baseApi } from "./baseApi"

export type BrandRequestStatus = "pending" | "approved" | "rejected"

export interface BrandRequestItem {
  id: number
  name: string
  image?: string | null
  note?: string | null
  status: BrandRequestStatus
  reason?: string | null
  created_brand_id?: number | null
  seen: boolean
  created_at?: string | null
  decided_at?: string | null
  // admin list only:
  supplier_id?: number
  supplier_name?: string | null
}

export interface MerchantOwnedBrand {
  id: number
  name: string
  image?: string | null
  status: number
}

export interface MyBrandProduct {
  id: number
  name: string
  image?: string | null
  price?: number | null
  original_price?: number | null
  member_price?: number | null
  pv?: number | null
  status: number
}

export interface MyBrandProductsResponse {
  brand: { id: number; name: string }
  products: MyBrandProduct[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface BrandRequestCounts {
  all: number
  pending: number
  approved: number
  rejected: number
}

interface CreateBrandRequestPayload {
  name: string
  image?: string | null
  note?: string | null
}

export const brandRequestsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Merchant (supplier portal) ──
    getMyBrands: builder.query<{ brands: MerchantOwnedBrand[] }, void>({
      query: () => ({ url: "/api/supplier/brands", method: "GET" }),
      providesTags: ["BrandRequests"],
    }),
    getMyBrandProducts: builder.query<
      MyBrandProductsResponse,
      { id: number; page?: number; q?: string }
    >({
      query: ({ id, page, q }) => ({
        url: `/api/supplier/brands/${id}/products`,
        method: "GET",
        params: { page, q: q || undefined },
      }),
      providesTags: ["BrandRequests"],
    }),
    getMyBrandRequests: builder.query<{ requests: BrandRequestItem[] }, void>({
      query: () => ({ url: "/api/supplier/brand-requests", method: "GET" }),
      providesTags: ["BrandRequests"],
    }),
    createBrandRequest: builder.mutation<
      { message: string; request: BrandRequestItem },
      CreateBrandRequestPayload
    >({
      query: (body) => ({
        url: "/api/supplier/brand-requests",
        method: "POST",
        body,
      }),
      invalidatesTags: ["BrandRequests"],
    }),
    markBrandRequestsSeen: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/api/supplier/brand-requests/seen",
        method: "POST",
      }),
      invalidatesTags: ["BrandRequests"],
    }),

    // ── Admin ──
    getAdminBrandRequests: builder.query<
      { requests: BrandRequestItem[]; counts: BrandRequestCounts },
      { status?: string } | void
    >({
      query: (params) => ({
        url: "/api/admin/brand-requests",
        method: "GET",
        params: params ?? undefined,
      }),
      providesTags: ["BrandRequests", "Brands"],
    }),
    decideBrandRequest: builder.mutation<
      { message: string; request: BrandRequestItem },
      { id: number; action: "approve" | "reject"; reason?: string }
    >({
      query: ({ id, action, reason }) => ({
        url: `/api/admin/brand-requests/${id}`,
        method: "PATCH",
        body: { action, reason },
      }),
      invalidatesTags: ["BrandRequests", "Brands"],
    }),
  }),
})

export const {
  useGetMyBrandsQuery,
  useGetMyBrandProductsQuery,
  useGetMyBrandRequestsQuery,
  useCreateBrandRequestMutation,
  useMarkBrandRequestsSeenMutation,
  useGetAdminBrandRequestsQuery,
  useDecideBrandRequestMutation,
} = brandRequestsApi
