import { baseApi } from "./baseApi"

export type ServiceInquiryStatus = "new" | "viewed" | "responded" | "closed"

export interface ServiceInquiryItem {
  id: number
  product_id: number
  supplier_id: number
  customer_id: number | null
  fullname: string
  email: string
  contact: string
  address: string
  intent: string | null
  status: ServiceInquiryStatus
  created_at: string | null
  updated_at: string | null
  product?: {
    pd_id: number
    pd_name: string
    pd_image: string | null
  } | null
  customer?: {
    c_userid: number
    c_avatar_url: string | null
  } | null
}

export interface ServiceInquiryCounts {
  total: number
  new: number
  viewed: number
  responded: number
  closed: number
}

export interface ServiceInquiriesResponse {
  inquiries: ServiceInquiryItem[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  counts: ServiceInquiryCounts
}

export interface SubmitInquiryPayload {
  product_id: number
  fullname: string
  email: string
  contact: string
  address: string
  intent: string
}

export interface SubmitInquiryResponse {
  message: string
  inquiry: {
    id: number
    product_id: number
    status: ServiceInquiryStatus
    created_at: string | null
  }
}

export const serviceInquiriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    submitServiceInquiry: builder.mutation<
      SubmitInquiryResponse,
      SubmitInquiryPayload
    >({
      query: (body) => ({
        url: "/api/service-inquiries",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ServiceInquiries"],
    }),
    getSupplierServiceInquiries: builder.query<
      ServiceInquiriesResponse,
      { status?: string; per_page?: number } | void
    >({
      query: (params) => ({
        url: "/api/supplier/service-inquiries",
        method: "GET",
        params: params ?? undefined,
      }),
      providesTags: ["ServiceInquiries"],
    }),
    updateServiceInquiryStatus: builder.mutation<
      {
        message: string
        inquiry: {
          id: number
          status: ServiceInquiryStatus
          updated_at: string
        }
      },
      { id: number; status: ServiceInquiryStatus }
    >({
      query: ({ id, status }) => ({
        url: `/api/supplier/service-inquiries/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["ServiceInquiries"],
    }),
    getAdminServiceInquiries: builder.query<
      ServiceInquiriesResponse,
      { status?: string; search?: string; per_page?: number } | void
    >({
      query: (params) => ({
        url: "/api/admin/service-inquiries",
        method: "GET",
        params: params ?? undefined,
      }),
      providesTags: ["ServiceInquiries"],
    }),
    updateAdminServiceInquiryStatus: builder.mutation<
      {
        message: string
        inquiry: {
          id: number
          status: ServiceInquiryStatus
          updated_at: string
        }
      },
      { id: number; status: ServiceInquiryStatus }
    >({
      query: ({ id, status }) => ({
        url: `/api/admin/service-inquiries/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["ServiceInquiries"],
    }),
    deleteServiceInquiry: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/api/supplier/service-inquiries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ServiceInquiries"],
    }),
  }),
})

export const {
  useSubmitServiceInquiryMutation,
  useGetSupplierServiceInquiriesQuery,
  useUpdateServiceInquiryStatusMutation,
  useGetAdminServiceInquiriesQuery,
  useUpdateAdminServiceInquiryStatusMutation,
  useDeleteServiceInquiryMutation,
} = serviceInquiriesApi
