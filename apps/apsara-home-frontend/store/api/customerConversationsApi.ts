import { baseApi } from "./baseApi"
import type { ConversationMessage } from "./adminConversationsApi"

export type { ConversationMessage }

export interface CustomerConversation {
  id: number
  subject: string
  description: string | null
  status: string
  assigned_agent_id: number | null
  assigned_agent: { id: number; name: string; email: string } | null
  last_message: {
    message: string
    sent_at: string
    sender_id: number
    sender_type: "customer" | "admin"
  } | null
  message_count: number
  unread_count: number
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface CustomerConversationsResponse {
  data: CustomerConversation[]
}

export interface CustomerMessagesResponse {
  data: ConversationMessage[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export const customerConversationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerConversations: builder.query<CustomerConversationsResponse, void>({
      query: () => ({ url: "/api/conversations", method: "GET" }),
    }),

    getCustomerMessages: builder.query<CustomerMessagesResponse, number>({
      query: (id) => ({
        url: `/api/conversations/${id}/messages`,
        method: "GET",
        params: { per_page: 100 },
      }),
    }),

    createCustomerConversation: builder.mutation<
      { data: CustomerConversation },
      { subject: string; description?: string }
    >({
      query: (body) => ({ url: "/api/conversations", method: "POST", body }),
    }),

    sendCustomerMessage: builder.mutation<
      { data: ConversationMessage },
      { conversationId: number; message: string }
    >({
      query: ({ conversationId, message }) => ({
        url: `/api/conversations/${conversationId}/messages`,
        method: "POST",
        body: { message },
      }),
      async onQueryStarted({ conversationId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const msg = data?.data
          if (!msg) return
          dispatch(
            customerConversationsApi.util.updateQueryData(
              "getCustomerMessages",
              conversationId,
              (draft) => {
                if (!draft?.data) return
                if (draft.data.some((m) => m.id === msg.id)) return
                draft.data.push(msg)
              }
            )
          )
        } catch {
          // ignore
        }
      },
    }),

    // Response shape varies ({ unread_count } or { data: { unread_count } }) — read defensively.
    getCustomerUnreadCount: builder.query<Record<string, unknown>, void>({
      query: () => ({ url: "/api/conversations/unread/count", method: "GET" }),
    }),
  }),
})

export const {
  useGetCustomerConversationsQuery,
  useGetCustomerMessagesQuery,
  useCreateCustomerConversationMutation,
  useSendCustomerMessageMutation,
  useGetCustomerUnreadCountQuery,
} = customerConversationsApi
