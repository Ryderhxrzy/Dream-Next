import type { Metadata } from "next"

import {
  getPartnerStorefrontConfig,
  type PartnerStorefrontConfig,
} from "@/libs/partnerStorefront"
import type { WebPageItem } from "@/store/api/webPagesApi"
import type { ShopBuilderApiResponse } from "@/components/sections/ShopBuilderSections"
import { buildPageMetadata } from "@/app/seo"
import ShopPartnerPageClient from "@/components/shop/ShopPartnerPageClient"

// Public storefront data: cache + refresh via storefront tags instead of
// forcing dynamic rendering (no cookies/headers here).
export const revalidate = 60

type PageProps = {
  params: Promise<{
    partner: string
  }>
}

// Fetch the storefront on the server (cached) so the client renders instantly
// with the partner's branding — no client-side loading screen / AF Home flash
// on every navigation.
async function getPartnerShopData(slug: string): Promise<{
  partner: PartnerStorefrontConfig
  shopData: ShopBuilderApiResponse
} | null> {
  const apiBase = (
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? ""
  ).replace(/\/+$/, "")
  if (!apiBase) return null

  const requestHeaders = { Accept: "application/json" }

  try {
    const [storefrontRes, webPagesRes, categoriesRes, productsRes] =
      await Promise.all([
        fetch(`${apiBase}/api/web-pages/partner-storefronts`, {
          headers: requestHeaders,
          next: { revalidate: 300, tags: ["storefront:partner-storefronts"] },
        }),
        fetch(`${apiBase}/api/web-pages/shop-builder`, {
          headers: requestHeaders,
          next: { revalidate: 300, tags: ["storefront:shop-builder"] },
        }),
        fetch(`${apiBase}/api/categories?page=1&per_page=100&used_only=1`, {
          headers: requestHeaders,
          next: { revalidate: 300, tags: ["storefront:categories"] },
        }),
        fetch(`${apiBase}/api/products?page=1&per_page=200&status=1`, {
          headers: requestHeaders,
          next: { revalidate: 60, tags: ["storefront:products"] },
        }),
      ])

    if (
      !storefrontRes.ok ||
      !webPagesRes.ok ||
      !categoriesRes.ok ||
      !productsRes.ok
    ) {
      return null
    }

    const storefrontJson = (await storefrontRes.json()) as {
      items?: WebPageItem[]
    }
    const storefrontItem = (storefrontJson.items ?? []).find(
      (item) => getPartnerStorefrontConfig(item)?.slug === slug
    )
    const partner = getPartnerStorefrontConfig(storefrontItem)
    if (!partner) return null

    const webPagesJson = (await webPagesRes.json()) as {
      items?: ShopBuilderApiResponse["items"]
    }
    const categoriesJson = (await categoriesRes.json()) as {
      categories?: ShopBuilderApiResponse["categories"]
    }
    const productsJson = (await productsRes.json()) as {
      products?: ShopBuilderApiResponse["products"]
    }

    return {
      partner,
      shopData: {
        items: webPagesJson.items ?? [],
        categories: categoriesJson.categories ?? [],
        products: productsJson.products ?? [],
      },
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  const normalizedPartner = resolved.partner.trim().toLowerCase()
  const displayName = normalizedPartner || "Partner Store"

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
    return null
  }

  const initial = await getPartnerShopData(normalizedPartner)

  return (
    <ShopPartnerPageClient
      partnerSlug={normalizedPartner}
      initialPartner={initial?.partner ?? null}
      initialShopData={initial?.shopData ?? null}
    />
  )
}

