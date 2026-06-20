"use client"

import { useEffect, useMemo, useState } from "react"

import { filterPartnerCategories, getPartnerStorefrontConfig, type PartnerStorefrontConfig } from "@/libs/partnerStorefront"
import type { CategoryProduct } from "@/libs/CategoryData"
import type { Category } from "@/store/api/categoriesApi"
import type { Product } from "@/store/api/productsApi"

import CategoryListProductMain from "@/components/category/CategoryListProductMain"
import LoadingScreen from "@/components/ui/LoadingScreen"

type PartnerStorefrontApiResponse = {
  items?: Array<{
    id?: number
    key?: string
    title?: string
    subtitle?: string | null
    body?: string | null
    payload?: {
      fields?: Record<string, string | null | undefined>
    }
  }>
}

type ApiCategoriesResponse = {
  categories?: Category[]
}

type ApiProductsResponse = {
  products?: Product[]
}

type ShopPartnerProductPageClientProps = {
  partnerSlug: string
}

const titleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const toNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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

const expandCategoriesWithChildren = (
  categories: Category[],
  allowedIds: number[]
) => {
  if (allowedIds.length === 0) return []

  const allowedSet = new Set(allowedIds.map((id) => Number(id)).filter(Number.isFinite))
  const childrenByParent = new Map<number, Category[]>()

  categories.forEach((category) => {
    const parentId = Number(category.parent_id ?? 0)
    if (!Number.isFinite(parentId) || parentId <= 0) return
    const existingChildren = childrenByParent.get(parentId) ?? []
    existingChildren.push(category)
    childrenByParent.set(parentId, existingChildren)
  })

  const queue = [...allowedSet]
  const visited = new Set<number>()

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (currentId == null || visited.has(currentId)) continue
    visited.add(currentId)

    const children = childrenByParent.get(currentId) ?? []
    children.forEach((child) => {
      const childId = Number(child.id)
      if (!allowedSet.has(childId)) {
        allowedSet.add(childId)
        queue.push(childId)
      }
    })
  }

  return categories.filter((category) => allowedSet.has(Number(category.id)))
}

const resolveImageUrl = (rawImage: string | null | undefined, apiUrl?: string) => {
  if (!rawImage) return "/Images/HeroSection/chairs_stools.jpg"
  if (rawImage.startsWith("http://") || rawImage.startsWith("https://"))
    return rawImage
  if (rawImage.startsWith("/")) return rawImage
  if (!apiUrl) return `/${rawImage}`
  return `${apiUrl.replace(/\/$/, "")}/${rawImage.replace(/^\/+/, "")}`
}

const mapProduct = (product: Product, apiUrl?: string): CategoryProduct => ({
  id: product.id,
  name: product.name,
  createdAt: product.createdAt ?? null,
  price: Number(product.priceSrp ?? 0),
  priceSrp: Number(product.priceSrp ?? 0) || undefined,
  priceDp: Number(product.priceDp ?? 0) || undefined,
  priceMember: Number(product.priceMember ?? 0) || undefined,
  prodpv: Number(product.prodpv ?? 0) || undefined,
  originalPrice: Number(product.priceSrp ?? 0) || undefined,
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
  brand: product.brand ?? undefined,
  sku: product.sku ?? undefined,
  variants: product.variants ?? undefined,
  type: product.type,
  musthave: Boolean(product.musthave),
  bestseller: Boolean(product.bestseller),
  salespromo: Boolean(product.salespromo),
  manualCheckoutEnabled: Boolean(product.manualCheckoutEnabled),
  weight: Number(product.weight ?? 0) || undefined,
  psweight: Number(product.psweight ?? 0) || undefined,
  pswidth: Number(product.pswidth ?? 0) || undefined,
  pslenght: Number(product.pslenght ?? 0) || undefined,
  psheight: Number(product.psheight ?? 0) || undefined,
  material: product.material ?? undefined,
  assemblyRequired: Boolean(product.assemblyRequired),
  warranty: product.warranty ?? undefined,
})

export default function ShopPartnerProductPageClient({
  partnerSlug,
}: ShopPartnerProductPageClientProps) {
  const [partner, setPartner] = useState<PartnerStorefrontConfig | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<CategoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const displayName = useMemo(
    () => (partnerSlug ? titleCase(partnerSlug) : "Shop"),
    [partnerSlug]
  )

  useEffect(() => {
    const controller = new AbortController()
    const apiBase = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "").replace(
      /\/+$/,
      ""
    )
    const storefrontUrl = apiBase
      ? `${apiBase}/api/web-pages/partner-storefronts`
      : "/api/web-pages/partner-storefronts"
    const categoriesUrl = apiBase
      ? `${apiBase}/api/categories?page=1&per_page=100`
      : "/api/categories?page=1&per_page=100"
    const productsUrl = apiBase
      ? `${apiBase}/api/products?page=1&per_page=200&status=1`
      : "/api/products?page=1&per_page=200&status=1"

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [storefrontRes, categoriesRes, productsRes] = await Promise.all([
          fetch(storefrontUrl, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(categoriesUrl, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(productsUrl, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
          }),
        ])

        if (!storefrontRes.ok || !categoriesRes.ok || !productsRes.ok) {
          throw new Error("Failed to load product listing.")
        }

        const storefrontJson =
          (await storefrontRes.json()) as PartnerStorefrontApiResponse
        const categoriesJson = (await categoriesRes.json()) as ApiCategoriesResponse
        const productsJson = (await productsRes.json()) as ApiProductsResponse

        const storefrontItem = (storefrontJson.items ?? []).find((item) => {
          const config = getPartnerStorefrontConfig(item)
          return config?.slug === partnerSlug
        })
        const storefront = getPartnerStorefrontConfig(storefrontItem)

        if (!storefront) {
          throw new Error("Storefront not found.")
        }

        const allowedCategories = filterPartnerCategories(
          categoriesJson.categories ?? [],
          storefront
        )
        const visibleCategories = expandCategoriesWithChildren(
          categoriesJson.categories ?? [],
          allowedCategories.map((category) => Number(category.id))
        )
        const allowedCategoryIdSet = new Set(
          visibleCategories.map((category) => Number(category.id))
        )
        const mappedProducts = (productsJson.products ?? [])
          .filter((product) => allowedCategoryIdSet.has(toNumber(product.catid)))
          .map((product) => mapProduct(product, apiBase))

        setPartner(storefront)
        setCategories(visibleCategories)
        setProducts(mappedProducts)
      } catch (fetchError) {
        if (controller.signal.aborted) return
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load product listing."
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      controller.abort()
    }
  }, [partnerSlug])

  if (loading) {
    return (
      <LoadingScreen
        brandText={displayName}
        tagline="Product Listing"
        useDefaultLogoFallback={false}
      />
    )
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Product listing unavailable
          </p>
          <h1 className="mt-3 text-3xl font-bold">{displayName}</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {error ||
              "We could not load this product listing right now. Please refresh and try again."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <CategoryListProductMain
      slug={`${partnerSlug}-products`}
      initialCategoryLabel="All Products"
      initialProducts={products}
      initialCategories={categories}
      partnerBranding={{
        logoSrc: partner.logoUrl || partner.tabLogoUrl || "/Images/af_home_logo.png",
        displayName: partner.displayName || displayName,
        productHref: `/shop/${partnerSlug}/product`,
        heroVideoUrl: partner.heroVideoUrl || undefined,
        enableActivateDiscount: Boolean(partner.enableActivateDiscount),
      }}
    />
  )
}
