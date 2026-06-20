import { baseApi } from "./baseApi"

export interface ProductBrand {
  id: number
  name: string
  image?: string | null
  status: number
  // Owning merchant (tbl_supplier). A brand belongs to exactly one merchant.
  supplier_id?: number | null
  supplier_name?: string | null
}

interface ProductBrandsResponse {
  brands: ProductBrand[]
  total: number
}

export interface BrandProduct {
  id: number
  name: string
  image?: string | null
  price?: number | null
  status: number
  supplier_name?: string | null
}

export interface BrandProductsResponse {
  brand: { id: number; name: string }
  products: BrandProduct[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

interface ProductBrandPayload {
  pb_name: string
  pb_image?: string | null
  pb_status?: number
  // The merchant that owns this brand (required when creating).
  supplier_id?: number
}

export const productBrandsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPublicProductBrands: builder.query<
      ProductBrandsResponse,
      { search?: string } | void
    >({
      query: (params) => ({
        url: "/api/product-brands",
        method: "GET",
        params: {
          q: params?.search,
        },
      }),
      providesTags: ["Brands"],
      keepUnusedDataFor: 300,
      refetchOnFocus: false,
      refetchOnReconnect: false,
      refetchOnMountOrArgChange: false,
    }),
    getProductBrands: builder.query<
      ProductBrandsResponse,
      { search?: string; supplier_id?: number } | void
    >({
      query: (params) => ({
        url: "/api/admin/product-brands",
        method: "GET",
        params: {
          q: params?.search,
          supplier_id: params?.supplier_id,
        },
      }),
      providesTags: ["Brands"],
    }),
    createProductBrand: builder.mutation<
      { message: string; brand: ProductBrand },
      ProductBrandPayload
    >({
      query: (body) => ({
        url: "/api/admin/product-brands",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Brands"],
    }),
    updateProductBrand: builder.mutation<
      { message: string },
      { id: number; data: ProductBrandPayload }
    >({
      query: ({ id, data }) => ({
        url: `/api/admin/product-brands/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Brands"],
    }),
    deleteProductBrand: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/api/admin/product-brands/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Brands"],
    }),
    getBrandProducts: builder.query<
      BrandProductsResponse,
      { id: number; page?: number; q?: string; per_page?: number }
    >({
      query: ({ id, page, q, per_page }) => ({
        url: `/api/admin/product-brands/${id}/products`,
        method: "GET",
        params: { page, q: q || undefined, per_page },
      }),
      providesTags: ["Brands", "Products"],
    }),
  }),
})

export const {
  useGetPublicProductBrandsQuery,
  useGetProductBrandsQuery,
  useCreateProductBrandMutation,
  useUpdateProductBrandMutation,
  useDeleteProductBrandMutation,
  useGetBrandProductsQuery,
} = productBrandsApi
