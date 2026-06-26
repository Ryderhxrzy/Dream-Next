import { Suspense } from "react"
import { serverFetch } from "@/libs/serverFetch"
import { getNavbarCategories } from "@/libs/serverStorefront"
import type { Category } from "@/store/api/categoriesApi"
import type { Product, ProductsResponse } from "@/store/api/productsApi"
import CategoryListProductMain from "@/components/category/CategoryListProductMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "All Categories",
  description: "Browse all products on AF Home.",
  path: "/category",
})

export const revalidate = 60

type Row = Record<string, unknown>

const toNum = (v: unknown): number => {
  const n =
    typeof v === "string"
      ? Number(v.replace(/[^0-9.-]/g, ""))
      : Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

const toBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v
  if (typeof v === "number") return v === 1
  if (typeof v === "string") {
    const s = v.trim().toLowerCase()
    return s === "1" || s === "true" || s === "yes"
  }
  return false
}

const toStrArr = (v: unknown): string[] => {
  if (Array.isArray(v))
    return v.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0
    )
  if (typeof v === "string" && v.trim()) {
    try {
      const p = JSON.parse(v) as unknown
      if (Array.isArray(p))
        return p.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        )
    } catch {
      // fall through
    }
    return [v]
  }
  return []
}

const resolveImg = (raw: string | null | undefined, apiUrl?: string): string => {
  if (!raw) return "/Images/HeroSection/chairs_stools.jpg"
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  if (raw.startsWith("/")) return raw
  return apiUrl
    ? `${apiUrl.replace(/\/$/, "")}/${raw.replace(/^\/+/, "")}`
    : `/${raw}`
}

function mapProduct(product: Product, apiUrl?: string) {
  const r = product as unknown as Row
  const srp = toNum(r.priceSrp ?? r.pd_price_srp)
  const member = toNum(r.priceMember ?? r.pd_price_member)
  const dp = toNum(r.priceDp ?? r.pd_price_dp)
  const rawImgs = toStrArr(r.images ?? r.pd_images)
  let badge: string | undefined
  if (toBool(r.salespromo ?? r.pd_salespromo)) badge = "SALE"
  else if (toBool(r.bestseller ?? r.pd_bestseller)) badge = "BEST SELLER"
  else if (toBool(r.musthave ?? r.pd_musthave)) badge = "MUST HAVE"
  return {
    id: toNum(r.id ?? r.pd_id) || undefined,
    name: String(r.name ?? r.pd_name ?? "Untitled"),
    price: srp,
    priceSrp: srp > 0 ? srp : undefined,
    priceMember: member > 0 ? member : undefined,
    priceDp: dp > 0 ? dp : undefined,
    prodpv: toNum(r.prodpv ?? r.pd_prodpv),
    image: resolveImg(String(r.image ?? r.pd_image ?? ""), apiUrl),
    images: rawImgs.map((img) => resolveImg(img, apiUrl)),
    badge,
    brand: typeof r.brand === "string" ? r.brand : undefined,
    verified: toBool(r.verified ?? r.pd_verified),
    soldCount: toNum(r.soldCount ?? r.sold_count),
    rating: toNum(r.avgRating ?? r.avg_rating ?? r.rating),
    stock: toNum(r.qty ?? r.pd_qty),
    createdAt:
      typeof r.createdAt === "string"
        ? r.createdAt
        : typeof r.pd_date === "string"
          ? r.pd_date
          : null,
  }
}

async function fetchAllProducts(): Promise<{
  products: ReturnType<typeof mapProduct>[]
  total: number
}> {
  const apiUrl =
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL
  if (!apiUrl) return { products: [], total: 0 }

  try {
    const url = new URL(`${apiUrl}/api/products`)
    url.searchParams.set("page", "1")
    url.searchParams.set("per_page", "100")
    url.searchParams.set("status", "1")

    const res = await serverFetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: ["storefront:products"] },
    })

    if (!res.ok) return { products: [], total: 0 }

    const json = (await res.json()) as ProductsResponse & {
      meta?: { total?: number } | null
    }
    const raw = Array.isArray(json.products) ? json.products : []
    const total = toNum(json.meta?.total ?? raw.length) || raw.length

    return { products: raw.map((p) => mapProduct(p, apiUrl)), total }
  } catch {
    return { products: [], total: 0 }
  }
}

async function AllCategoryContent({
  navbarCategories,
}: {
  navbarCategories: Category[]
}) {
  const { products, total } = await fetchAllProducts()
  return (
    <CategoryListProductMain
      slug="all"
      initialCategoryLabel="All Category"
      initialProducts={products}
      initialTotalProducts={total}
      initialCategories={navbarCategories}
    />
  )
}

function AllCategoryFallback({
  navbarCategories,
}: {
  navbarCategories: Category[]
}) {
  return (
    <CategoryListProductMain
      slug="all"
      isLoading
      initialCategoryLabel="All Category"
      initialCategories={navbarCategories}
      initialProducts={[]}
    />
  )
}

export default async function CategoryIndexPage() {
  const navbarCategories = await getNavbarCategories()
  return (
    <Suspense
      fallback={<AllCategoryFallback navbarCategories={navbarCategories} />}
    >
      <AllCategoryContent navbarCategories={navbarCategories} />
    </Suspense>
  )
}
