import type { CategoryProduct } from "@/libs/CategoryData"
import { getPartnerStorefrontBySlug } from "@/libs/partnerStorefrontServer"
import {
  buildCanonicalProductSlug,
  getProductPageData,
} from "@/libs/productPageData"
import { serverFetch } from "@/libs/serverFetch"
import { getNavbarCategories } from "@/libs/serverStorefront"
import type { Product } from "@/store/api/productsApi"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import ScrollToTop from "@/components/landing-page/ScrollToTop"
import CompleteTheLook from "@/components/product/CompleteTheLook"
import ProductPageClient from "@/components/product/ProductPageClient"
import ProductPageWrapper from "@/components/product/ProductPageWrapper"
import ProductQA from "@/components/product/ProductQA"
import ProductTabs from "@/components/product/ProductTabs"
import RelatedProducts from "@/components/product/RelatedProduct"
import { buildPageMetadata } from "@/app/seo"

export const revalidate = 60

type PageProps = {
  params: Promise<{ partner: string; slug: string }>
}

const ChevronRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

function PartnerOrderFooter({ partnerName }: { partnerName: string }) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
        Orders from{" "}
        <span className="font-semibold text-slate-800">{partnerName}</span> are
        still processed through AF Home.
      </div>
    </footer>
  )
}

const toTitle = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || value

const mapProductToCategoryProduct = (
  product: Product,
  apiUrl?: string
): CategoryProduct => {
  const resolveImageUrl = (rawImage: string | null | undefined) => {
    if (!rawImage) return "/Images/HeroSection/chairs_stools.jpg"
    if (rawImage.startsWith("http://") || rawImage.startsWith("https://"))
      return rawImage
    if (rawImage.startsWith("/")) return rawImage
    if (!apiUrl) return `/${rawImage}`
    return `${apiUrl.replace(/\/$/, "")}/${rawImage.replace(/^\/+/, "")}`
  }

  return {
    id: product.id,
    name: product.name,
    createdAt: product.createdAt ?? null,
    price: Number(product.priceSrp ?? 0),
    priceDp: Number(product.priceDp ?? 0) || undefined,
    priceMember: Number(product.priceMember ?? 0) || undefined,
    priceSrp: Number(product.priceSrp ?? 0) || undefined,
    prodpv: Number(product.prodpv ?? 0) || undefined,
    originalPrice: Number(product.priceSrp ?? 0) || undefined,
    image: resolveImageUrl(product.image),
    images: Array.isArray(product.images) ? product.images : undefined,
    badge: product.salespromo
      ? "SALE"
      : product.bestseller
        ? "BEST SELLER"
        : product.musthave
          ? "MUST HAVE"
          : undefined,
    brand: product.brand ?? undefined,
    stock: Number(product.qty ?? 0),
    manualCheckoutEnabled: Boolean(product.manualCheckoutEnabled),
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { partner, slug } = await params
  const normalizedPartner = partner.trim().toLowerCase()
  const storefront = await getPartnerStorefrontBySlug(normalizedPartner)

  const data = await getProductPageData(slug)
  if (!data) {
    return buildPageMetadata({
      title: `${storefront?.displayName ?? toTitle(partner)} Product`,
      description: `Browse ${storefront?.displayName ?? toTitle(partner)} storefront products.`,
      path: `/shop/${partner}/product`,
    })
  }

  const canonicalSlug = buildCanonicalProductSlug(
    data.product.name,
    data.product.id
  )
  const fallbackDescription = `Buy ${data.product.name} on ${toTitle(partner)}.`
  const safeDescription = (
    data.product.description || fallbackDescription
  ).slice(0, 160)

  const baseMeta = buildPageMetadata({
    title: data.product.name,
    description: safeDescription,
    path: `/shop/${normalizedPartner}/product/${canonicalSlug}`,
    image: data.product.image,
    siteName: storefront?.displayName || toTitle(partner),
  })

  return {
    ...baseMeta,
    icons:
      storefront?.tabLogoUrl || storefront?.logoUrl
        ? {
            icon: [
              {
                url: storefront.tabLogoUrl || storefront.logoUrl || "",
                type: "image/png",
              },
            ],
            apple: storefront.tabLogoUrl || storefront.logoUrl || "",
          }
        : baseMeta.icons,
  }
}

export default async function PartnerProductDetailPage({ params }: PageProps) {
  const { partner, slug } = await params
  const normalizedPartner = partner.trim().toLowerCase()
  const storefront = await getPartnerStorefrontBySlug(normalizedPartner)
  if (!storefront) notFound()

  const dynamicData = await getProductPageData(slug)
  if (!dynamicData) {
    redirect(`/shop/${normalizedPartner}/product`)
  }
  const navbarCategories = await getNavbarCategories()
  const allowedCategoryIdSet = new Set(
    (storefront.allowedCategoryIds ?? []).map((id) => Number(id))
  )
  const partnerNavbarCategories = navbarCategories.filter((category) =>
    allowedCategoryIdSet.has(Number(category.id))
  )
  const apiUrl =
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL

  const canonicalSlug = buildCanonicalProductSlug(
    dynamicData.product.name,
    dynamicData.product.id
  )
  if (slug !== canonicalSlug) {
    redirect(`/shop/${normalizedPartner}/product/${canonicalSlug}`)
  }

  const selectedProductIds = storefront.featuredProductIds.filter(
    (id) => id !== dynamicData.product.id
  )
  const forceRealPrice = !Boolean(storefront.enableActivateDiscount)
  let storefrontSelectedProducts: CategoryProduct[] = []

  if (apiUrl && selectedProductIds.length > 0) {
    const productResponses = await Promise.all(
      selectedProductIds.map(async (id) => {
        try {
          const response = await serverFetch(`${apiUrl}/api/products/${id}`, {
            method: "GET",
            headers: { Accept: "application/json" },
            next: { revalidate: 60, tags: ["storefront:products"] },
          })
          if (!response.ok) return null
          const json = (await response.json()) as { product?: Product }
          return json.product ?? null
        } catch {
          return null
        }
      })
    )

    storefrontSelectedProducts = productResponses
      .filter((product): product is Product => Boolean(product))
      .map((product) => mapProductToCategoryProduct(product, apiUrl))
  }

  const selectedProductsById = new Map(
    storefrontSelectedProducts.map((product) => [product.id, product] as const)
  )
  const relatedProducts = dynamicData.relatedProducts.filter((product) => {
    const productId = Number(product.id ?? 0)
    return productId > 0 && selectedProductsById.has(productId)
  })

  return (
    <ProductPageWrapper
      initialCategories={partnerNavbarCategories}
      hideTopBar
      logoSrc={
        storefront.logoUrl ||
        storefront.tabLogoUrl ||
        "/Images/af_home_logo.png"
      }
      logoAlt={storefront.displayName}
      logoHref={`/shop/${normalizedPartner}/product`}
      categoryOnlyNav
      stickToTop
      showGuestCartWishlist
    >
      <main className="flex-1 bg-white dark:bg-gray-900">
        <div className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <Link
                href={`/shop/${normalizedPartner}/product`}
                className="font-medium transition-colors hover:text-sky-500 dark:hover:text-sky-400"
              >
                Home
              </Link>
              <ChevronRight />
              <Link
                href={`/shop/${normalizedPartner}/category/${dynamicData.categorySlug}`}
                className="transition-colors hover:text-sky-500 dark:hover:text-sky-400"
              >
                {dynamicData.categoryLabel}
              </Link>
              <ChevronRight />
              <span className="max-w-48 truncate font-semibold text-slate-600 dark:text-gray-300">
                {dynamicData.product.name}
              </span>
            </nav>
          </div>
        </div>
        <div className="container mx-auto px-4 py-10">
          <ProductPageClient
            product={dynamicData.product}
            categoryLabel={dynamicData.categoryLabel}
            reviewSummary={dynamicData.reviewSummary}
            forceRealPrice={forceRealPrice}
            allowGuestWishlist
          />
          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <ProductTabs
              product={dynamicData.product}
              reviewSummary={dynamicData.reviewSummary}
              reviews={dynamicData.reviews ?? []}
            />
          </div>
          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <RelatedProducts
              products={relatedProducts}
              category={dynamicData.categorySlug}
              viewAllHref={`/shop/${normalizedPartner}/product`}
              forceRealPrice={forceRealPrice}
            />
          </div>
          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <ProductQA />
          </div>
          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <CompleteTheLook
              currentCategory={dynamicData.categorySlug}
              currentCategoryId={dynamicData.categoryId}
              currentCategoryLabel={dynamicData.categoryLabel}
              currentProductId={dynamicData.product.id}
              presetItems={storefrontSelectedProducts}
              enableActivateDiscount={Boolean(
                storefront.enableActivateDiscount
              )}
            />
          </div>
        </div>
      </main>
      <PartnerOrderFooter partnerName={storefront.displayName} />
      <ScrollToTop />
    </ProductPageWrapper>
  )
}
