import { baseApi } from './baseApi'

export interface SupplierPushNotification {
  spn_id: number
  spn_supplier_id: number
  spn_title: string
  spn_body: string
  spn_image?: string | null
  spn_recipients: number[]
  spn_sent_count: number
  spn_failed_count: number
  spn_sent_at?: string | null
  spn_created_at?: string | null
  spn_updated_at?: string | null
}

export interface Device {
  customer_id: number
  device_name: string
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
}

export interface SendNotificationResponse {
  message: string
  notification_id: number
  sent: number
  failed: number
  total_tokens: number
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
  endpoints: (builder) => ({
    getAvailableCustomers: builder.query<AvailableCustomersResponse, void>({
      query: () => ({
        url: '/api/supplier/push-notifications/available-customers',
        method: 'GET',
      }),
      keepUnusedDataFor: 300,
    }),
    getPushNotificationsHistory: builder.query<PushNotificationsHistoryResponse, void>({
      query: () => ({
        url: '/api/supplier/push-notifications/history',
        method: 'GET',
      }),
      keepUnusedDataFor: 60,
      providesTags: ['PushNotifications'],
    }),
    sendPushNotification: builder.mutation<SendNotificationResponse, SendNotificationRequest>({
      query: (body) => ({
        url: '/api/supplier/push-notifications/send',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PushNotifications'],
    }),
    getCloudinarySignature: builder.mutation<CloudinarySignResponse, CloudinarySignRequest>({
      query: (body) => ({
        url: '/api/supplier/cloudinary-sign',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useGetAvailableCustomersQuery,
  useGetPushNotificationsHistoryQuery,
  useSendPushNotificationMutation,
  useGetCloudinarySignatureMutation,
} = supplierPushNotificationsApi
