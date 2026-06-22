import { baseApi } from "./baseApi"

export interface OrderProductVariant {
  id: number
  sku: string
  name: string | null
  color: string | null
  size: string | null
  style: string | null
  priceSrp: number | null
  priceDp: number | null
  priceMember: number | null
  prodpv: number | null
  status: number
  qty: number
}

export interface OrderProductResult {
  id: number
  name: string
  sku: string | null
  image: string | null
  priceSrp: number | null
  priceDp: number | null
  priceMember: number | null
  prodpv: number | null
  status: number
  variants: OrderProductVariant[]
}

export interface AdminOrderItem {
  product_id: number
  product_name: string
  product_sku?: string
  product_image?: string | null
  product_pv?: number
  unit_price: number
  quantity: number
  variant_color?: string
  variant_size?: string
  variant_type?: string
}

export interface CreateAdminOrderPayload {
  member_id: number
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  items: AdminOrderItem[]
  shipping_fee?: number
  shipping_address: string
  payment_method: string
  notes?: string
}

export interface CreateAdminOrderResponse {
  message: string
  checkout_id: string
  item_ids: number[]
}

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createAdminOrder: builder.mutation<
      CreateAdminOrderResponse,
      CreateAdminOrderPayload
    >({
      query: (body) => ({
        url: "/api/admin/orders",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Orders"],
    }),
    searchOrderProducts: builder.query<
      { products: OrderProductResult[] },
      string
    >({
      query: (q) => ({
        url: "/api/admin/orders/product-search",
        method: "GET",
        params: { q },
      }),
    }),
  }),
})

export const { useCreateAdminOrderMutation, useLazySearchOrderProductsQuery } = ordersApi
