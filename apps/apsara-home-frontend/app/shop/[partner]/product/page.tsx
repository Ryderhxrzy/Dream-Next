import type { Metadata } from "next"

import {
  getPartnerStorefrontConfig,
  type PartnerStorefrontConfig,
} from "@/libs/partnerStorefront"
import type { Category } from "@/store/api/categoriesApi"
import type { Product } from "@/store/api/productsApi"
import type { WebPageItem } from "@/store/api/webPagesApi"
import { buildPageMetadata } from "@/app/seo"
import ShopPartnerProductPageClient from "../../../../components/category/ShopPartnerProductPageClient"

// Public storefront data: cache + refresh via storefront tags (no cookies/headers).
export const revalidate = 60

type PageProps = {
  params: Promise<{
    partner: string
  }>
}

// Server-fetch the partner + raw products/categories (cached) so the client
// renders instantly with the partner's listing — no loading screen / AF Home
// flash on navigation.
async function getPartnerProductData(slug: string): Promise<{
  partner: PartnerStorefrontConfig
  categories: Category[]
  products: Product[]
} | null> {
  const apiBase = (
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? ""
  ).replace(/\/+$/, "")
  if (!apiBase) return null

  const requestHeaders = { Accept: "application/json" }

  try {
    const [storefrontRes, categoriesRes, productsRes] = await Promise.all([
      fetch(`${apiBase}/api/web-pages/partner-storefronts`, {
        headers: requestHeaders,
        next: { revalidate: 300, tags: ["storefront:partner-storefronts"] },
      }),
      fetch(`${apiBase}/api/categories?page=1&per_page=100`, {
        headers: requestHeaders,
        next: { revalidate: 300, tags: ["storefront:categories"] },
      }),
      fetch(`${apiBase}/api/products?page=1&per_page=200&status=1`, {
        headers: requestHeaders,
        next: { revalidate: 60, tags: ["storefront:products"] },
      }),
    ])

    if (!storefrontRes.ok || !categoriesRes.ok || !productsRes.ok) return null

    const storefrontJson = (await storefrontRes.json()) as {
      items?: WebPageItem[]
    }
    const storefrontItem = (storefrontJson.items ?? []).find(
      (item) => getPartnerStorefrontConfig(item)?.slug === slug
    )
    const partner = getPartnerStorefrontConfig(storefrontItem)
    if (!partner) return null

    const categoriesJson = (await categoriesRes.json()) as {
      categories?: Category[]
    }
    const productsJson = (await productsRes.json()) as {
      products?: Product[]
    }

    return {
      partner,
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
  const title = `${normalizedPartner || "Partner"} Products`

  return buildPageMetadata({
    title,
    description: `Browse all products for ${normalizedPartner || "this partner"}.`,
    path: `/shop/${normalizedPartner}/product`,
  })
}

export default async function ShopPartnerProductPage({ params }: PageProps) {
  const resolved = await params
  const normalizedPartner = resolved.partner.trim().toLowerCase()

  if (!normalizedPartner) {
    return null
  }

  const initial = await getPartnerProductData(normalizedPartner)

  return (
    <ShopPartnerProductPageClient
      partnerSlug={normalizedPartner}
      initialPartner={initial?.partner ?? null}
      initialCategories={initial?.categories ?? null}
      initialProducts={initial?.products ?? null}
    />
  )
}
