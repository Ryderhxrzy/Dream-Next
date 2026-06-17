import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import PartnerStorefrontPage from "@/components/partner/PartnerStorefrontPage"
import { buildPageMetadata } from "@/app/seo"
import { getPartnerStorefrontBySlug } from "@/libs/partnerStorefrontServer"
import { resolvePartnerStorefrontPublicUrl } from "@/libs/partnerStorefront"
import { serverFetch } from "@/libs/serverFetch"
import type { ShopBuilderApiResponse } from "@/components/sections/ShopBuilderSections"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{
    partner: string
  }>
}

type ApiCategoriesResponse = {
  categories?: ShopBuilderApiResponse["categories"]
}

type ApiProductsResponse = {
  products?: ShopBuilderApiResponse["products"]
}

type ApiWebPagesResponse = {
  items?: ShopBuilderApiResponse["items"]
}

async function getShopBuilderData(): Promise<ShopBuilderApiResponse | null> {
  const apiUrl =
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL
  if (!apiUrl) return null

  try {
    const [webPagesRes, categoriesRes, productsRes] = await Promise.all([
      serverFetch(`${apiUrl}/api/web-pages/shop-builder`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      serverFetch(`${apiUrl}/api/categories?page=1&per_page=100&used_only=1`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      serverFetch(`${apiUrl}/api/products?page=1&per_page=200&status=1`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
    ])

    if (!webPagesRes.ok || !categoriesRes.ok || !productsRes.ok) return null

    const webPagesJson = (await webPagesRes.json()) as ApiWebPagesResponse
    const categoriesJson = (await categoriesRes.json()) as ApiCategoriesResponse
    const productsJson = (await productsRes.json()) as ApiProductsResponse

    return {
      items: webPagesJson.items ?? [],
      categories: categoriesJson.categories ?? [],
      products: productsJson.products ?? [],
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  const normalizedPartner = resolved.partner.trim().toLowerCase()
  const storefront = await getPartnerStorefrontBySlug(normalizedPartner)
  const displayName =
    storefront?.displayName?.trim() || normalizedPartner || "Partner Store"

  return buildPageMetadata({
    title: displayName,
    description: `Discover premium furniture, appliances, and inspired spaces on ${displayName}.`,
    path: `/shop/${normalizedPartner}`,
  })
}

export default async function PartnerShopPage({ params }: PageProps) {
  const resolved = await params
  const normalizedPartner = resolved.partner.trim().toLowerCase()
  if (!normalizedPartner) {
    notFound()
  }

  const requestHeaders = await headers()
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? ""

  const storefront = await getPartnerStorefrontBySlug(normalizedPartner)
  if (!storefront) {
    notFound()
  }

  const shopData = await getShopBuilderData()
  const publicShopUrl =
    resolvePartnerStorefrontPublicUrl(storefront, requestHost) ||
    storefront.publicShopUrl ||
    `/shop/${normalizedPartner}`

  return (
    <PartnerStorefrontPage
      partner={storefront}
      data={shopData}
      publicShopUrl={publicShopUrl}
    />
  )
}
