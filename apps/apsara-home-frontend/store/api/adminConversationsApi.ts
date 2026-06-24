import { baseApi } from "./baseApi"

export interface ConversationMessage {
  id: number
  conversation_id: number
  sender_id: number
  message: string
  is_internal: boolean
  attachment_url: string | null
  attachment_filename: string | null
  is_read?: boolean
  read_at?: string | null
  created_at: string
  updated_at?: string
}

export interface ConversationCustomer {
  id: number
  name: string
  username: string
  email: string
  mobile: string
}

export interface AdminConversation {
  id: number
  customer: ConversationCustomer
  subject: string
  description: string | null
  status: string
  assigned_agent_id: number | null
  assigned_agent: { id: number; name: string; email: string } | null
  last_message: {
    message: string
    sent_at: string
    sender_id: number
    is_internal: boolean
  } | null
  message_count: number
  unread_count: number
  resolved_at: string | null
  created_at: string
  updated_at: string
  messages?: ConversationMessage[]
}

export interface AdminConversationResponse {
  data: AdminConversation
}

export interface AdminConversationsListResponse {
  data: AdminConversation[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface AdminConversationsQuery {
  status?: string
  assigned_to_me?: boolean
  search?: string
  per_page?: number
}

export const adminConversationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Find-or-create a conversation with a specific customer (from order/member context).
    createConversationWithCustomer: builder.mutation<
      AdminConversationResponse,
      { customer_id: number; subject?: string }
    >({
      query: (body) => ({
        url: "/api/admin/conversations/with-customer",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data?.data?.id) {
            // Seed the detail cache so the thread renders instantly (no second flash).
            dispatch(
              adminConversationsApi.util.upsertQueryData(
                "getAdminConversation",
                data.data.id,
                data
              )
            )
          }
        } catch {
          // ignore — UI surfaces the error state
        }
      },
    }),

    // Conversation list for the inbox (no nested messages).
    getAdminConversations: builder.query<
      AdminConversationsListResponse,
      AdminConversationsQuery | void
    >({
      query: (params) => ({
        url: "/api/admin/conversations",
        method: "GET",
        params: params || undefined,
      }),
    }),

    // Conversation detail incl. all messages (the live source the realtime hook updates).
    getAdminConversation: builder.query<AdminConversationResponse, number>({
      query: (id) => ({
        url: `/api/admin/conversations/${id}`,
        method: "GET",
      }),
    }),

    sendAdminMessage: builder.mutation<
      { data: ConversationMessage },
      { conversationId: number; message: string }
    >({
      query: ({ conversationId, message }) => ({
        url: `/api/admin/conversations/${conversationId}/messages`,
        method: "POST",
        body: { message },
      }),
      async onQueryStarted({ conversationId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const msg = data?.data
          if (!msg) return
          dispatch(
            adminConversationsApi.util.updateQueryData(
              "getAdminConversation",
              conversationId,
              (draft) => {
                if (!draft?.data) return
                if (!draft.data.messages) draft.data.messages = []
                // Dedupe — the realtime channel also echoes our own message.
                if (draft.data.messages.some((m) => m.id === msg.id)) return
                draft.data.messages.push(msg)
                draft.data.message_count = (draft.data.message_count ?? 0) + 1
                draft.data.last_message = {
                  message: msg.message,
                  sent_at: msg.created_at,
                  sender_id: msg.sender_id,
                  is_internal: msg.is_internal,
                }
              }
            )
          )
        } catch {
          // ignore
        }
      },
    }),
  }),
})

export const {
  useCreateConversationWithCustomerMutation,
  useGetAdminConversationsQuery,
  useGetAdminConversationQuery,
  useSendAdminMessageMutation,
} = adminConversationsApi
