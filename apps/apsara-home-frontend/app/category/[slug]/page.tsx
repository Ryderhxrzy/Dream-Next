import { Suspense } from "react"
import { serverFetch } from "@/libs/serverFetch"
import { getNavbarCategories } from "@/libs/serverStorefront"
import type { Category } from "@/store/api/categoriesApi"
import type { Product, ProductsResponse } from "@/store/api/productsApi"

import CategoryListProductMain from "@/components/category/CategoryListProductMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Category Details",
  description: "Browse the Category Details page on AF Home.",
  path: "/category/[slug]",
})
export const dynamic = "force-dynamic"

interface ApiCategoriesResponse {
  categories?: Category[]
}

type LooseRecord = Record<string, unknown>
const toLooseRecord = (value: unknown): LooseRecord => value as LooseRecord

interface DisplayProduct {
  id?: number
  name: string
  createdAt?: string | null
  price: number
  priceSrp?: number
  priceMember?: number
  priceDp?: number
  prodpv?: number
  originalPrice?: number
  image: string
  images?: string[]
  badge?: string
  verified?: boolean
  stock?: number
  brand?: string
  soldCount?: number
  avgRating?: number
  rating?: number
  material?: string
  warranty?: string
  description?: string
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
const normalizeCategorySlug = (
  rawUrl: string | null | undefined,
  fallbackName: string
) => {
  const source = (rawUrl ?? "").trim()
  if (!source || source === "0") return slugify(fallbackName)

  const withoutDomain = source.replace(/^https?:\/\/[^/]+/i, "")
  const cleaned = withoutDomain
    .replace(/^\/+/, "")
    .replace(/^category\//i, "")
    .replace(/\/+$/, "")

  return cleaned || slugify(fallbackName)
}
const titleFromSlug = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")

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

const asArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : []

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "")
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "1" || normalized === "true" || normalized === "yes")
      return true
    if (
      normalized === "0" ||
      normalized === "false" ||
      normalized === "no" ||
      normalized === ""
    )
      return false
  }
  return false
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
      // fallback below
    }
    return [value]
  }

  return []
}

const resolveDisplayStock = (
  baseStock: number,
  variants?: Array<{ qty?: number; status?: number }>
): number => {
  if (!variants || variants.length === 0) return baseStock

  const activeVariants = variants.filter((variant) => {
    if (variant.status == null) return true
    return Number(variant.status) === 1
  })

  if (activeVariants.length === 0) return 0

  const hasVariantQty = activeVariants.some(
    (variant) => typeof variant.qty === "number"
  )
  if (!hasVariantQty) return baseStock

  return activeVariants.reduce(
    (sum, variant) => sum + Math.max(0, Number(variant.qty ?? 0)),
    0
  )
}

const extractCategories = (json: unknown): Category[] => {
  const source = json as { categories?: unknown; data?: unknown }
  const direct = asArray<Category>(source?.categories)
  if (direct.length > 0) return direct

  const data = source?.data as { categories?: unknown } | unknown[] | undefined
  if (Array.isArray(data)) return data as Category[]
  return asArray<Category>(
    (data as { categories?: unknown } | undefined)?.categories
  )
}

const extractProducts = (json: unknown): Product[] => {
  const source = json as { products?: unknown; data?: unknown }
  const direct = asArray<Product>(source?.products)
  if (direct.length > 0) return direct

  const data = source?.data as { products?: unknown } | unknown[] | undefined
  if (Array.isArray(data)) return data as Product[]
  return asArray<Product>(
    (data as { products?: unknown } | undefined)?.products
  )
}

const resolveProductCategorySlug = (row: LooseRecord): string | null => {
  const directName = row.categoryName ?? row.category_name ?? row.cat_name
  if (typeof directName === "string" && directName.trim())
    return slugify(directName)

  const nestedCategory = row.category as LooseRecord | undefined
  const nestedName = nestedCategory?.name
  if (typeof nestedName === "string" && nestedName.trim())
    return slugify(nestedName)

  return null
}

const mapProductToDisplay = (
  product: Product | LooseRecord,
  apiUrl?: string
): DisplayProduct => {
  const row = toLooseRecord(product)
  const name = String(row.name ?? row.pd_name ?? "Untitled Product")
  const srp = toNumber(row.priceSrp ?? row.pd_price_srp ?? 0)
  const member = toNumber(row.priceMember ?? row.pd_price_member ?? 0)
  const dp = toNumber(row.priceDp ?? row.pd_price_dp ?? 0)
  const prodpv = toNumber(row.prodpv ?? row.pd_prodpv ?? 0)
  const price = srp

  const rawVariants = Array.isArray(row.variants)
    ? row.variants
    : Array.isArray(row.pd_variants)
      ? row.pd_variants
      : []

  const variants = rawVariants.map((variantRow: unknown) => {
    const variant = toLooseRecord(variantRow)
    return {
      qty: toNumber(variant.qty ?? variant.pv_qty ?? 0),
      status: toNumber(variant.status ?? variant.pv_status ?? 1),
    }
  })

  const stock = resolveDisplayStock(
    toNumber(row.qty ?? row.pd_qty ?? 0),
    variants
  )
  const rawImage = (row.image ?? row.pd_image) as string | null | undefined
  const rawImages = toStringArray(row.images ?? row.pd_images)
  const verified = toBoolean(row.verified ?? row.pd_verified)
  const brand = typeof row.brand === "string" ? row.brand : undefined
  const soldCount = toNumber(row.soldCount ?? row.sold_count ?? 0)
  const avgRating = toNumber(row.avgRating ?? row.avg_rating ?? row.rating ?? 0)

  let badge: string | undefined
  if (toBoolean(row.salespromo ?? row.pd_salespromo)) badge = "SALE"
  else if (toBoolean(row.bestseller ?? row.pd_bestseller)) badge = "BEST SELLER"
  else if (toBoolean(row.musthave ?? row.pd_musthave)) badge = "MUST HAVE"

  return {
    id: toNumber(row.id ?? row.pd_id ?? 0) || undefined,
    name,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : typeof row.pd_date === "string"
          ? row.pd_date
          : null,
    price,
    priceSrp: srp > 0 ? srp : undefined,
    priceMember: member > 0 ? member : undefined,
    priceDp: dp > 0 ? dp : undefined,
    prodpv,
    originalPrice: undefined,
    image: resolveImageUrl(rawImage, apiUrl),
    images: rawImages.map((img) => resolveImageUrl(img, apiUrl)),
    badge,
    verified,
    stock,
    brand,
    soldCount,
    avgRating,
    rating: avgRating,
    material:
      typeof row.material === "string"
        ? row.material
        : typeof row.pd_material === "string"
          ? row.pd_material
          : undefined,
    warranty:
      typeof row.warranty === "string"
        ? row.warranty
        : typeof row.pd_warranty === "string"
          ? row.pd_warranty
          : undefined,
    description:
      typeof row.description === "string"
        ? row.description
        : typeof row.pd_description === "string"
          ? row.pd_description
          : undefined,
  }
}

async function getCategoryProducts(slug: string): Promise<{
  label?: string
  products?: DisplayProduct[]
  totalProducts?: number
}> {
  const apiUrl =
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL
  if (!apiUrl)
    return { label: titleFromSlug(slug), products: [], totalProducts: 0 }

  try {
    const categoriesRes = await serverFetch(`${apiUrl}/api/categories`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

    if (!categoriesRes.ok) {
      return { label: titleFromSlug(slug), products: [], totalProducts: 0 }
    }

    const categoriesJson = (await categoriesRes.json()) as ApiCategoriesResponse
    const categories = extractCategories(categoriesJson)

    const slugKey = slug.toLowerCase()
    const matchingCategories = categories.filter((item) => {
      const normalized = normalizeCategorySlug(item.url, item.name)
      const byUrl = normalized === slugKey
      const byName = slugify(item.name) === slugKey
      return byUrl || byName
    })

    // If there are duplicate categories sharing the same slug, prefer the one
    // with the largest active catalog, then newest id as a tiebreaker.
    const category = matchingCategories.slice().sort((a, b) => {
      const countDiff =
        Number(b.product_count ?? 0) - Number(a.product_count ?? 0)
      if (countDiff !== 0) return countDiff
      return Number(b.id ?? 0) - Number(a.id ?? 0)
    })[0]

    const categoryLabel = category?.name ?? titleFromSlug(slug)
    const categoryId = category ? Number(category.id) : undefined
    const categoryIds = Array.from(
      new Set(
        matchingCategories
          .map((item) => Number(item.id))
          .filter((id) => Number.isFinite(id))
      )
    )

    const fetchProductsByCategory = async (
      id?: number,
      minimumCount = 50
    ): Promise<DisplayProduct[]> => {
      const perPage = 100

      const seenIds = new Set<number>()
      const seenNames = new Set<string>()
      const result: DisplayProduct[] = []

      const normalizeKey = (value: string) => value.trim().toLowerCase()

      let page = 1
      let lastPage = 1

      const fetchPage = async (pageToFetch: number) => {
        const productsUrl = new URL(`${apiUrl}/api/products`)
        productsUrl.searchParams.set("page", String(pageToFetch))
        productsUrl.searchParams.set("per_page", String(perPage))
        productsUrl.searchParams.set("status", "1")

        const productsRes = await serverFetch(productsUrl.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        })

        if (!productsRes.ok) {
          return { products: [] as Product[], metaLastPage: 1 }
        }

        const productsJson = (await productsRes.json()) as ProductsResponse & {
          meta?: { last_page?: number } | null
        }

        return {
          products: extractProducts(productsJson),
          metaLastPage: Number(productsJson?.meta?.last_page ?? 1) || 1,
        }
      }

      const slugLower = slug.toLowerCase()
      const matchingCategoryIdSet = new Set(categoryIds)

      while (page <= lastPage && result.length < minimumCount) {
        const batch = await fetchPage(page)

        lastPage = batch.metaLastPage || lastPage

        for (const item of batch.products) {
          if (result.length >= minimumCount) break

          const row = toLooseRecord(item)

          const productCategoryId = Number(
            row.catid ??
              row.pd_catid ??
              row.cat_id ??
              row.category_id ??
              (row.category as LooseRecord | undefined)?.id ??
              -1
          )
          const productCategorySlug = resolveProductCategorySlug(row)

          const byId =
            matchingCategoryIdSet.size > 0
              ? matchingCategoryIdSet.has(productCategoryId)
              : typeof categoryId === "number" &&
                Number.isFinite(categoryId) &&
                productCategoryId === categoryId

          const bySlug = productCategorySlug === slugLower

          if (!(byId || bySlug)) continue

          const display = mapProductToDisplay(item, apiUrl)

          const currentId = display.id ? Number(display.id) : undefined
          if (
            typeof currentId === "number" &&
            Number.isFinite(currentId) &&
            currentId > 0
          ) {
            if (seenIds.has(currentId)) continue
            seenIds.add(currentId)
          } else {
            const key = normalizeKey(display.name)
            if (seenNames.has(key)) continue
            seenNames.add(key)
          }

          result.push(display)
        }

        page += 1

        if (!Number.isFinite(lastPage) || lastPage < 1) break
      }

      return result
    }

    const minimumDisplayProducts = 50
    const filteredMapped =
      categoryIds.length > 0
        ? (
            await Promise.all(
              categoryIds.map((id) =>
                fetchProductsByCategory(id, minimumDisplayProducts)
              )
            )
          ).flat()
        : await fetchProductsByCategory(categoryId, minimumDisplayProducts)
    const totalProducts =
      Number(category?.product_count ?? filteredMapped.length ?? 0) || 0

    return {
      label: categoryLabel,
      products: filteredMapped,
      totalProducts,
    }
  } catch {
    return {
      label: titleFromSlug(slug),
      products: [],
      totalProducts: 0,
    }
  }
}

async function CategoryContent({
  slug,
  navbarCategories,
}: {
  slug: string
  navbarCategories: Category[]
}) {
  const { label, products, totalProducts } = await getCategoryProducts(slug)

  return (
    <CategoryListProductMain
      slug={slug}
      initialCategoryLabel={label}
      initialProducts={products}
      initialTotalProducts={totalProducts}
      initialCategories={navbarCategories}
    />
  )
}

function CategoryLoadingFallback({
  slug,
  navbarCategories,
}: {
  slug: string
  navbarCategories: Category[]
}) {
  return (
    <CategoryListProductMain
      slug={slug}
      isLoading={true}
      initialCategories={navbarCategories}
      initialProducts={[]}
    />
  )
}

function CategoryErrorFallback({ slug }: { slug: string }) {
  return (
    <CategoryListProductMain
      slug={slug}
      hasError={true}
      initialCategories={[]}
      initialProducts={[]}
    />
  )
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const navbarCategories = await getNavbarCategories()

  return (
    <Suspense
      fallback={
        <CategoryLoadingFallback
          slug={slug}
          navbarCategories={navbarCategories}
        />
      }
    >
      <CategoryContent slug={slug} navbarCategories={navbarCategories} />
    </Suspense>
  )
}
