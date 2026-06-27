import { baseApi } from "./baseApi"

export type SectionType = "banner" | "carousel" | "products"

export interface BannerContent {
  image_url: string
  link_type?: string | null
  link_target?: string | null
}

export interface CarouselItem {
  id?: number
  image_url: string
  order?: number
  link_type?: string | null
  link_target?: string | null
}

export interface SectionProduct {
  id: number
  order: number
  name: string
  image?: string | null
  price?: number | null
  original_price?: number | null
  member_price?: number | null
  pv?: number | null
}

export interface ProductSectionContent {
  label: string
  button_text?: string | null
  button_link?: string | null
  products: SectionProduct[]
}

export interface HomeSection {
  id: number
  type: SectionType
  order: number
  is_active: boolean
  banner?: BannerContent
  items?: CarouselItem[]
  product_section?: ProductSectionContent
}

// ── Create / update payloads ──
export interface BannerPayload {
  type: "banner"
  image_url: string
  link_type?: string | null
  link_target?: string | null
}

export interface CarouselPayload {
  type: "carousel"
  items: Array<{
    image_url: string
    link_type?: string | null
    link_target?: string | null
  }>
}

export interface ProductsPayload {
  type: "products"
  label: string
  button_text?: string | null
  button_link?: string | null
  product_ids: number[]
}

export type CreateSectionPayload =
  | BannerPayload
  | CarouselPayload
  | ProductsPayload

// ── Brand profile cover photo ──
export interface BrandCover {
  image_url: string
}

export const supplierBrandHomeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBrandHome: builder.query<{ sections: HomeSection[] }, number>({
      query: (brandId) => ({
        url: `/api/supplier/brands/${brandId}/home`,
        method: "GET",
      }),
      providesTags: ["BrandHome"],
    }),

    createHomeSection: builder.mutation<
      { message: string; section: HomeSection },
      { brandId: number; body: CreateSectionPayload }
    >({
      query: ({ brandId, body }) => ({
        url: `/api/supplier/brands/${brandId}/home/sections`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["BrandHome"],
    }),

    updateHomeSection: builder.mutation<
      { message: string; section: HomeSection },
      { sectionId: number; body: CreateSectionPayload | { is_active: boolean } }
    >({
      query: ({ sectionId, body }) => ({
        url: `/api/supplier/home/sections/${sectionId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["BrandHome"],
    }),

    deleteHomeSection: builder.mutation<{ message: string }, number>({
      query: (sectionId) => ({
        url: `/api/supplier/home/sections/${sectionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["BrandHome"],
    }),

    reorderHomeSections: builder.mutation<
      { message: string },
      { brandId: number; order: number[] }
    >({
      query: ({ brandId, order }) => ({
        url: `/api/supplier/brands/${brandId}/home/reorder`,
        method: "PATCH",
        body: { order },
      }),
      invalidatesTags: ["BrandHome"],
    }),

    getBrandCover: builder.query<{ cover: BrandCover | null }, number>({
      query: (brandId) => ({
        url: `/api/supplier/brands/${brandId}/cover`,
        method: "GET",
      }),
      providesTags: ["BrandCover"],
    }),

    saveBrandCover: builder.mutation<
      { message: string; cover: BrandCover | null },
      { brandId: number; image_url: string }
    >({
      query: ({ brandId, image_url }) => ({
        url: `/api/supplier/brands/${brandId}/cover`,
        method: "PUT",
        body: { image_url },
      }),
      invalidatesTags: ["BrandCover"],
    }),
  }),
})

export const {
  useGetBrandHomeQuery,
  useCreateHomeSectionMutation,
  useUpdateHomeSectionMutation,
  useDeleteHomeSectionMutation,
  useReorderHomeSectionsMutation,
  useGetBrandCoverQuery,
  useSaveBrandCoverMutation,
} = supplierBrandHomeApi
