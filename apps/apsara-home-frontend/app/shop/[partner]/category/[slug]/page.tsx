import {
  filterPartnerCategories,
  normalizeCategorySlug,
  resolvePartnerStorefrontPublicUrl,
} from "@/libs/partnerStorefront"
import { getPartnerStorefrontBySlug } from "@/libs/partnerStorefrontServer"
import type { Category } from "@/store/api/categoriesApi"
import type { Product } from "@/store/api/productsApi"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import CategoryListProductMain from "@/components/category/CategoryListProductMain"
import { buildPageMetadata } from "@/app/seo"

// Cache the storefront data fetches (revalidate + tags). The route stays dynamic
// via headers() for custom-domain links, but force-dynamic would suppress the
// fetch cache, so we drop it to keep category navigation fast.
export const revalidate = 60

type PageProps = {
  params: Promise<{
    partner: string
    slug: string
  }>
}

type ApiCategoriesResponse = {
  categories?: Category[]
}

type ApiProductsResponse = {
  products?: Product[]
}
type ApiProductResponse = {
  product?: Product
}

type DisplayProduct = {
  id?: number
  name: string
  createdAt?: string | null
  price: number
  priceMember?: number
  prodpv?: number
  originalPrice?: number
  image: string
  images?: string[]
  badge?: string
  verified?: boolean
  stock?: number
}
const BLANK_FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"

const resolveImageUrl = (
  rawImage: string | null | undefined,
  apiUrl?: string
) => {
  if (!rawImage) return "/Images/HeroSection/chairs_stools.jpg"
  if (rawImage.startsWith("http://") || rawImage.startsWith("https://"))
    return rawImage
  if (rawImage.startsWith("/")) return rawImage
  if (!apiUrl) return `/${rawImage}`
  return `${apiUrl.replace(/\/$/, "")}/${rawImage.replace(/^\/+/, "")}`
}

const resolveStorefrontAssetUrl = (
  rawValue: string | null | undefined,
  apiUrl?: string
) => {
  const value = String(rawValue ?? "").trim()
  if (!value) return ""
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  )
    return value
  if (value.startsWith("/Images/")) return value
  if (!apiUrl) return value.startsWith("/") ? value : `/${value}`
  return `${apiUrl.replace(/\/$/, "")}/${value.replace(/^\/+/, "")}`
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    )
  }

  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0
        )
      }
    } catch {
      return [value]
    }
    return [value]
  }

  return []
}

const mapProductToDisplay = (
  product: Product,
  apiUrl?: string
): DisplayProduct => ({
  id: product.id,
  name: product.name,
  createdAt: product.createdAt ?? null,
  price: Number(product.priceSrp ?? 0),
  priceMember: Number(product.priceMember ?? 0) || undefined,
  prodpv: Number(product.prodpv ?? 0) || undefined,
  image: resolveImageUrl(product.image, apiUrl),
  images: toStringArray(product.images).map((item) =>
    resolveImageUrl(item, apiUrl)
  ),
  badge: product.salespromo
    ? "SALE"
    : product.bestseller
      ? "BEST SELLER"
      : product.musthave
        ? "MUST HAVE"
        : undefined,
  verified: Boolean(product.verified),
  stock: Number(product.qty ?? 0),
})

const toCategoryTitle = (slug: string) =>
  decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

export async function generateMetadata({ params }: PageProps) {
  const resolved = await params
  const requestHeaders = await headers()
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? ""
  const categoryTitle = toCategoryTitle(resolved.slug)
  const metadata = buildPageMetadata({
    title: `${resolved.slug} Category`,
    description: `Browse ${resolved.slug} products for ${resolved.partner}.`,
    path: `/shop/${resolved.partner}/category/${resolved.slug}`,
  })

  const partnerConfig = await getPartnerStorefrontBySlug(resolved.partner)
  const resolvedPublicShopUrl = resolvePartnerStorefrontPublicUrl(
    partnerConfig,
    requestHost
  )
  const plainTitle = `${partnerConfig?.displayName ?? resolved.partner} | ${categoryTitle}`
  const apiUrl =
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL
  const iconUrl = resolveStorefrontAssetUrl(
    partnerConfig?.tabLogoUrl || partnerConfig?.logoUrl,
    apiUrl
  )

  return {
    ...metadata,
    title: plainTitle,
    alternates: resolvedPublicShopUrl
      ? {
          canonical: `${resolvedPublicShopUrl.replace(/\/$/, "")}/category/${resolved.slug}`,
        }
      : metadata.alternates,
    icons: iconUrl
      ? {
          icon: [{ url: iconUrl, type: "image/png" }],
          apple: iconUrl,
        }
      : {
          icon: [{ url: BLANK_FAVICON, type: "image/svg+xml" }],
          apple: BLANK_FAVICON,
        },
    openGraph: metadata.openGraph
      ? {
          ...metadata.openGraph,
          title: plainTitle,
        }
      : undefined,
    twitter: metadata.twitter
      ? {
          ...metadata.twitter,
          title: plainTitle,
        }
      : undefined,
  }
}

async function getPartnerCategoryPageData(
  partnerSlug: string,
  categorySlug: string
) {
  const apiUrl =
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL
  if (!apiUrl) return null

  try {
    const [partnerRaw, categoriesRes] = await Promise.all([
      getPartnerStorefrontBySlug(partnerSlug),
      fetch(`${apiUrl}/api/categories?used_only=1`, {
        method: "GET",
        headers: { Accept: "application/json" },
        next: { revalidate: 300, tags: ["storefront:categories"] },
      }),
    ])

    if (!partnerRaw || !categoriesRes.ok) return null

    const categoriesJson = (await categoriesRes.json()) as ApiCategoriesResponse

    const partner = partnerRaw
      ? {
          ...partnerRaw,
          logoUrl:
            resolveStorefrontAssetUrl(partnerRaw.logoUrl, apiUrl) || null,
          tabLogoUrl:
            resolveStorefrontAssetUrl(partnerRaw.tabLogoUrl, apiUrl) || null,
          heroVideoUrl:
            resolveStorefrontAssetUrl(partnerRaw.heroVideoUrl, apiUrl) || null,
        }
      : null
    if (!partner) return null

    const allowedCategories = filterPartnerCategories(
      categoriesJson.categories ?? [],
      partner
    )
    const normalizedRequestedCategorySlug = normalizeCategorySlug(
      categorySlug,
      categorySlug
    )
    const category = allowedCategories.find(
      (item) =>
        normalizeCategorySlug(item.url, item.name) ===
        normalizedRequestedCategorySlug
    )
    if (!category)
      return {
        partner,
        category: null,
        categories: allowedCategories,
        products: [] as DisplayProduct[],
      }
    const selectedProductIdSet = new Set(partner.featuredProductIds)
    const allowedCategoryIdSet = new Set(
      allowedCategories.map((item) => item.id)
    )

    const productsRes = await fetch(
      `${apiUrl}/api/products?page=1&per_page=200&status=1&cat_id=${category.id}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        next: { revalidate: 60, tags: ["storefront:products"] },
      }
    )

    if (!productsRes.ok) {
      return {
        partner,
        category,
        categories: allowedCategories,
        products: [] as DisplayProduct[],
      }
    }

    const productsJson = (await productsRes.json()) as ApiProductsResponse
    const categoryProducts = (productsJson.products ?? []).filter(
      (product) => product.catid === category.id
    )

    // If selected products exist, prefer them, but gracefully fall back to category products
    // so category pages never look broken when featured IDs are stale/missing.
    let resolvedProducts: Product[] = categoryProducts

    if (selectedProductIdSet.size > 0) {
      const selectedProductEntries = await Promise.all(
        Array.from(selectedProductIdSet).map(async (productId) => {
          try {
            const response = await fetch(
              `${apiUrl}/api/products/${productId}`,
              {
                method: "GET",
                headers: { Accept: "application/json" },
                next: { revalidate: 60, tags: ["storefront:products"] },
              }
            )
            if (!response.ok) return null
            const json = (await response.json()) as ApiProductResponse
            const product = json.product
            if (!product) return null
            if (!allowedCategoryIdSet.has(product.catid)) return null
            return product
          } catch {
            return null
          }
        })
      )

      const selectedProductsInCategory = selectedProductEntries
        .filter((product): product is Product => Boolean(product))
        .filter((product) => product.catid === category.id)

      if (selectedProductsInCategory.length > 0) {
        resolvedProducts = selectedProductsInCategory
      }
    }

    return {
      partner,
      category,
      categories: allowedCategories,
      products: resolvedProducts.map((product) =>
        mapProductToDisplay(product, apiUrl)
      ),
    }
  } catch {
    return null
  }
}

export default async function PartnerCategoryPage({ params }: PageProps) {
  const resolved = await params
  const payload = await getPartnerCategoryPageData(
    resolved.partner,
    resolved.slug
  )
  const normalizedSlug = normalizeCategorySlug(resolved.slug, resolved.slug)
  const requestHeaders = await headers()
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? ""
  const partnerPublicShopUrl = resolvePartnerStorefrontPublicUrl(
    payload?.partner ?? null,
    requestHost
  )

  if (!payload) {
    notFound()
  }
  if (!payload.category && normalizedSlug !== "interior-services") {
    redirect(`/shop/${resolved.partner}/product`)
  }

  return (
    <CategoryListProductMain
      slug={resolved.slug}
      initialCategoryLabel={payload.category?.name ?? "Interior Services"}
      initialProducts={payload.category ? payload.products : []}
      initialCategories={payload.categories}
      partnerBranding={{
        logoSrc:
          payload.partner.logoUrl ||
          payload.partner.tabLogoUrl ||
          "/Images/af_home_logo.png",
        displayName: payload.partner.displayName,
        productHref: `${partnerPublicShopUrl || `/shop/${resolved.partner}`}/product`,
        heroVideoUrl: payload.partner.heroVideoUrl || undefined,
        enableActivateDiscount: Boolean(payload.partner.enableActivateDiscount),
      }}
    />
  )
}
