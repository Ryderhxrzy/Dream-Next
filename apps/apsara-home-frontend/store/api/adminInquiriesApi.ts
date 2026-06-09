import { baseApi } from "./baseApi";

export type UsernameChangeRequestStatus = 'pending_review' | 'approved' | 'rejected';
export type WebstoreRequestStatus = 'pending_review' | 'approved' | 'rejected' | 'deleted';

export interface AdminUsernameChangeRequest {
  id: number;
  ticket_id: number;
  customer_id: number;
  customer_name?: string | null;
  customer_email?: string | null;
  current_username?: string | null;
  requested_username?: string | null;
  status: UsernameChangeRequestStatus;
  submitted_at?: string | null;
}

export interface AdminUsernameChangeRequestsResponse {
  requests: AdminUsernameChangeRequest[];
}

export interface AdminWebstoreReceiptItem {
  id?: number | null;
  label?: string | null;
  submitted_at?: string | null;
  receipt_urls?: string[] | null;
  billing_option?: string | null;
  payment_method?: string | null;
  checkout_id?: string | null;
  payment_reference?: string | null;
  payment_intent_id?: string | null;
  approval_status?: string | null;
  approved_at?: string | null;
  approved_by?: number | null;
  type?: string | null;
}

export interface AdminWebstoreRequest {
  id: number;
  ticket_id: number;
  customer_id: number;
  customer_name?: string | null;
  customer_email?: string | null;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  slug_name?: string | null;
  display_name?: string | null;
  reference_no?: string | null;
  plan?: 'test' | 'quarterly' | 'semi_annual' | 'annual' | null;
  plan_term?: string | null;
  plan_term_months?: number | null;
  subscription_fee?: number | null;
  effective_monthly?: number | null;
  billing_option?: string | null;
  payment_method?: string | null;
  checkout_id?: string | null;
  payment_reference?: string | null;
  payment_intent_id?: string | null;
  base_checkout_id?: string | null;
  base_payment_reference?: string | null;
  base_payment_intent_id?: string | null;
  receipt_urls?: string[] | null;
  receipt_items?: AdminWebstoreReceiptItem[] | null;
  remaining_balance?: number | null;
  payment_count?: number | null;
  total_paid_amount?: number | null;
  status: WebstoreRequestStatus;
  created_at?: string | null;
  reviewed_at?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  latest_receipt_submitted_at?: string | null;
  latest_receipt_status?: string | null;
  latest_receipt_urls?: string[] | null;
}

export interface AdminWebstoreRequestsResponse {
  requests: AdminWebstoreRequest[];
}

export interface PartnerWebstoreRequestsResponse {
  requests: AdminWebstoreRequest[];
}

export const adminInquiriesApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getUsernameChangeRequests: builder.query<AdminUsernameChangeRequestsResponse, void>({
      query: () => ({
        url: '/api/admin/inquiries/username-changes',
        method: 'GET',
      }),
      providesTags: ['AdminNotifications'],
    }),
    approveUsernameChange: builder.mutation<{ message: string }, { id: number }>({
      query: ({ id }) => ({
        url: `/api/admin/inquiries/username-changes/${id}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: ['AdminNotifications'],
    }),
    rejectUsernameChange: builder.mutation<{ message: string }, { id: number }>({
      query: ({ id }) => ({
        url: `/api/admin/inquiries/username-changes/${id}/reject`,
        method: 'PATCH',
      }),
      invalidatesTags: ['AdminNotifications'],
    }),
    getWebstoreRequests: builder.query<AdminWebstoreRequestsResponse, void>({
      query: () => ({
        url: '/api/admin/inquiries/webstore-requests',
        method: 'GET',
      }),
      providesTags: ['AdminNotifications', 'WebstoreRequests'],
    }),
    getPartnerWebstoreRequests: builder.query<PartnerWebstoreRequestsResponse, void>({
      query: () => ({
        url: '/api/admin/partner/webstore-requests',
        method: 'GET',
      }),
      providesTags: ['AdminNotifications', 'WebstoreRequests'],
    }),
    approveWebstoreRequest: builder.mutation<{ message: string }, { id: number }>({
      query: ({ id }) => ({
        url: `/api/admin/inquiries/webstore-requests/${id}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: ['AdminNotifications', 'WebstoreRequests', 'User'],
    }),
    approveWebstoreReceipt: builder.mutation<{ message: string }, { id: number; detailId: number }>({
      query: ({ id, detailId }) => ({
        url: `/api/admin/inquiries/webstore-requests/${id}/receipts/${detailId}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: ['AdminNotifications', 'WebstoreRequests', 'User'],
    }),
    rejectWebstoreReceipt: builder.mutation<{ message: string }, { id: number; detailId: number }>({
      query: ({ id, detailId }) => ({
        url: `/api/admin/inquiries/webstore-requests/${id}/receipts/${detailId}/reject`,
        method: 'PATCH',
      }),
      invalidatesTags: ['AdminNotifications', 'WebstoreRequests', 'User'],
    }),
    rejectWebstoreRequest: builder.mutation<{ message: string }, { id: number }>({
      query: ({ id }) => ({
        url: `/api/admin/inquiries/webstore-requests/${id}/reject`,
        method: 'PATCH',
      }),
      invalidatesTags: ['AdminNotifications', 'WebstoreRequests', 'User'],
    }),
    deleteWebstoreRequest: builder.mutation<{ message: string }, { id: number }>({
      query: ({ id }) => ({
        url: `/api/admin/inquiries/webstore-requests/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminNotifications', 'WebstoreRequests', 'User'],
    }),
    deletePartnerWebstoreRequest: builder.mutation<{ message: string }, { id: number }>({
      query: ({ id }) => ({
        url: `/api/admin/partner/webstore-requests/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WebstoreRequests'],
    }),
    deletePartnerWebstoreReceiptItem: builder.mutation<{ message: string }, { id: number }>({
      query: ({ id }) => ({
        url: `/api/admin/partner/webstore-receipt-items/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WebstoreRequests'],
    }),
    createPartnerWebstorePaymentSession: builder.mutation<
      { checkout_id: string; checkout_url: string; payment_mode: string },
      { plan: string; billing_option: string; payment_method: string; payment_mode?: string; slug_name?: string }
    >({
      query: (body) => ({
        url: '/api/admin/partner/webstore-requests/payment-session',
        method: 'POST',
        body,
      }),
    }),
    verifyPartnerWebstorePaymentSession: builder.query<
      {
        checkout_id: string; status: string; is_paid: boolean; payment_mode: string;
        payment_method: string; proof_url: string; payment_intent_id: string;
        payment_reference: string; raw?: Record<string, unknown>;
      },
      string | { checkoutId: string; paymentMode?: 'test' | 'live' }
    >({
      query: (arg) => {
        const checkoutId = typeof arg === 'string' ? arg : arg.checkoutId;
        const paymentMode = typeof arg === 'string' ? undefined : arg.paymentMode;
        return {
          url: `/api/admin/partner/webstore-requests/payment-session/${checkoutId}`,
          method: 'GET',
          params: paymentMode ? { payment_mode: paymentMode } : undefined,
        };
      },
    }),
    submitPartnerWebstoreRequest: builder.mutation<
      { message: string; request: { id: number; submitted_at?: string } },
      {
        full_name: string; username: string; email: string; slug_name: string; display_name: string;
        plan: string; billing_option: string; payment_method: string;
        receipt_urls: string[]; checkout_id?: string | null; payment_reference: string;
        payment_intent_id?: string | null; accepted_terms: boolean; renewal_enabled?: boolean;
      }
    >({
      query: (body) => ({
        url: '/api/admin/partner/webstore-requests/submit',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WebstoreRequests'],
    }),
  }),
});

export const {
  useGetUsernameChangeRequestsQuery,
  useApproveUsernameChangeMutation,
  useRejectUsernameChangeMutation,
  useGetWebstoreRequestsQuery,
  useGetPartnerWebstoreRequestsQuery,
  useApproveWebstoreRequestMutation,
  useApproveWebstoreReceiptMutation,
  useRejectWebstoreReceiptMutation,
  useRejectWebstoreRequestMutation,
  useDeleteWebstoreRequestMutation,
  useDeletePartnerWebstoreRequestMutation,
  useDeletePartnerWebstoreReceiptItemMutation,
  useCreatePartnerWebstorePaymentSessionMutation,
  useLazyVerifyPartnerWebstorePaymentSessionQuery,
  useSubmitPartnerWebstoreRequestMutation,
} = adminInquiriesApi;
