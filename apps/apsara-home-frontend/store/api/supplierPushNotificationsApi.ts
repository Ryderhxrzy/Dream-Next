import { baseApi } from "./baseApi"

export interface SupplierPushNotification {
  spn_id: number
  spn_supplier_id: number
  spn_title: string
  spn_body: string
  spn_image?: string | null
  spn_button_text?: string | null
  spn_recipients: number[]
  spn_sent_count: number
  spn_failed_count: number
  spn_schedule_type: 'once' | 'daily' | 'weekly' | 'monthly'
  spn_schedule_config?: {
    time?: string // HH:MM format
    days?: number[] // 0-6 for weekly (0=Sunday)
    interval?: number // days between sends (for daily frequency)
    end_date?: string // when to stop recurring
    month_day?: number // 1-31 for monthly
    month_pattern?: 'first' | 'second' | 'third' | 'fourth' | 'last' // first Monday, etc
  } | null
  spn_timezone: string // e.g., 'UTC', 'Asia/Manila', 'America/New_York'
  spn_status: 'active' | 'paused' | 'completed' | 'cancelled'
  spn_sent_at?: string | null
  spn_next_scheduled_at?: string | null
  spn_last_sent_at?: string | null
  spn_send_limit?: number | null // max number of sends
  spn_send_count: number // times already sent
  spn_created_at?: string | null
  spn_updated_at?: string | null
}

export interface Device {
  customer_id: number
  device_name: string
}

export interface Recipient {
  c_userid: number
  c_fullname: string
  device_count: number
  purchase_count: number
  last_purchase_date: string | null
}

export interface RecipientsForNotificationResponse {
  data: Recipient[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface AvailableCustomersResponse {
  total_customers_with_devices: number
  customer_ids: number[]
  devices: Device[]
}

export interface SendNotificationRequest {
  title: string
  body: string
  image?: string | null
  recipients: number[]
  buttonText?: string
  schedule_type?: 'once' | 'daily' | 'weekly' | 'monthly'
  schedule_config?: {
    time?: string // HH:MM format
    days?: number[] // 0-6 for weekly (0=Sunday)
    interval?: number // days between sends (for daily)
    end_date?: string // when to stop recurring
    month_day?: number // 1-31 for monthly
    month_pattern?: 'first' | 'second' | 'third' | 'fourth' | 'last'
    send_limit?: number // max times to send
  } | null
  timezone?: string // e.g., 'UTC', 'Asia/Manila'
  scheduled_at?: string | null
}

export interface SendNotificationResponse {
  message: string
  notification_id: number
  sent?: number
  failed?: number
  total_tokens?: number
  scheduled_at?: string
  status?: "sent" | "scheduled"
}

export interface PushNotificationsHistoryResponse {
  data: SupplierPushNotification[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface CloudinarySignRequest {
  params_to_sign: Record<string, unknown>
}

export interface CloudinarySignResponse {
  signature: string
}

export const supplierPushNotificationsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRecipientsForNotification: builder.query<RecipientsForNotificationResponse, void>({
      query: () => ({
        url: "/api/supplier/push-notifications/recipients",
        method: "GET",
      }),
      keepUnusedDataFor: 300,
    }),
    getAvailableCustomers: builder.query<AvailableCustomersResponse, void>({
      query: () => ({
        url: "/api/supplier/push-notifications/available-customers",
        method: "GET",
      }),
      keepUnusedDataFor: 300,
    }),
    getPushNotificationsHistory: builder.query<
      PushNotificationsHistoryResponse,
      void
    >({
      query: () => ({
        url: "/api/supplier/push-notifications/history",
        method: "GET",
      }),
      keepUnusedDataFor: 60,
      providesTags: ["PushNotifications"],
    }),
    sendPushNotification: builder.mutation<
      SendNotificationResponse,
      SendNotificationRequest
    >({
      query: (body) => ({
        url: "/api/supplier/push-notifications/send",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PushNotifications"],
    }),
    getCloudinarySignature: builder.mutation<
      CloudinarySignResponse,
      CloudinarySignRequest
    >({
      query: (body) => ({
        url: "/api/supplier/cloudinary-sign",
        method: "POST",
        body,
      }),
    }),
  }),
})

export const {
  useGetRecipientsForNotificationQuery,
  useGetAvailableCustomersQuery,
  useGetPushNotificationsHistoryQuery,
  useSendPushNotificationMutation,
  useGetCloudinarySignatureMutation,
} = supplierPushNotificationsApi
