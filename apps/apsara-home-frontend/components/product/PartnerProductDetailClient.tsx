"use client"

import { useEffect, useMemo, useState } from "react"

import type { CategoryProduct } from "@/libs/CategoryData"
import { getProductPageData } from "@/libs/productPageData"
import { getPartnerStorefrontConfig, type PartnerStorefrontConfig } from "@/libs/partnerStorefront"
import type { Category } from "@/store/api/categoriesApi"
import type { WebPageItem } from "@/store/api/webPagesApi"

import CompleteTheLook from "@/components/product/CompleteTheLook"
import ProductPageClient from "@/components/product/ProductPageClient"
import ProductPageWrapper from "@/components/product/ProductPageWrapper"
import ProductQA from "@/components/product/ProductQA"
import ProductTabs from "@/components/product/ProductTabs"
import RelatedProducts from "@/components/product/RelatedProduct"
import ScrollToTop from "@/components/landing-page/ScrollToTop"
import LoadingScreen from "@/components/ui/LoadingScreen"

type PartnerStorefrontApiResponse = {
  items?: WebPageItem[]
}

type ApiCategoriesResponse = {
  categories?: Category[]
}

type ProductPageData = Awaited<ReturnType<typeof getProductPageData>>

type PartnerProductDetailClientProps = {
  partnerSlug: string
  productSlug: string
}

const titleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

export default function PartnerProductDetailClient({
  partnerSlug,
  productSlug,
}: PartnerProductDetailClientProps) {
  const [partner, setPartner] = useState<PartnerStorefrontConfig | null>(null)
  const [navbarCategories, setNavbarCategories] = useState<Category[]>([])
  const [productData, setProductData] = useState<ProductPageData | null>(null)
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

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [storefrontRes, categoriesRes, data] = await Promise.all([
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
          getProductPageData(productSlug),
        ])

        if (!storefrontRes.ok || !categoriesRes.ok) {
          throw new Error("Failed to load storefront data.")
        }

        const storefrontJson =
          (await storefrontRes.json()) as PartnerStorefrontApiResponse
        const categoriesJson =
          (await categoriesRes.json()) as ApiCategoriesResponse

        const storefrontItem = (storefrontJson.items ?? []).find((item) => {
          const config = getPartnerStorefrontConfig(item)
          return config?.slug === partnerSlug
        })
        const storefront = getPartnerStorefrontConfig(storefrontItem)

        if (!storefront) {
          throw new Error("Storefront not found.")
        }

        const allCategories = categoriesJson.categories ?? []
        setPartner(storefront)
        // Pass ALL categories so the Navbar can resolve parent→subcategory
        // relationships. Filtering to only the allowed top-level categories is
        // done inside the Navbar via allowedCategoryIds.
        setNavbarCategories(allCategories)
        setProductData(data)
      } catch (fetchError) {
        if (controller.signal.aborted) return
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load product."
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
  }, [partnerSlug, productSlug])

  if (loading) {
    return (
      <LoadingScreen
        brandText={displayName}
        tagline="Product Details"
        useDefaultLogoFallback={false}
      />
    )
  }

  if (!partner || !productData) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Product unavailable
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            {titleCase(productSlug)}
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {error ||
              "We could not load this product right now. Please refresh and try again."}
          </p>
        </div>
      </div>
    )
  }

  const forceRealPrice = !Boolean(partner.enableActivateDiscount)

  return (
    <ProductPageWrapper
      initialCategories={navbarCategories}
      allowedCategoryIds={partner.allowedCategoryIds}
      hideTopBar
      logoSrc={
        partner.logoUrl || partner.tabLogoUrl || "/Images/af_home_logo.png"
      }
      logoAlt={partner.displayName}
      logoHref={`/shop/${partnerSlug}/product`}
      categoryOnlyNav
      stickToTop
      showGuestCartWishlist
    >
      <main className="flex-1 bg-white dark:bg-gray-900">
        <div className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <a
                href={`/shop/${partnerSlug}/product`}
                className="font-medium transition-colors hover:text-sky-500 dark:hover:text-sky-400"
              >
                Home
              </a>
              <span>/</span>
              <span className="transition-colors hover:text-sky-500 dark:hover:text-sky-400">
                {productData.categoryLabel}
              </span>
              <span>/</span>
              <span className="max-w-48 truncate font-semibold text-slate-600 dark:text-gray-300">
                {productData.product.name}
              </span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <ProductPageClient
            product={productData.product as CategoryProduct}
            categoryLabel={productData.categoryLabel}
            reviewSummary={productData.reviewSummary}
            forceRealPrice={forceRealPrice}
            allowGuestWishlist
          />

          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <ProductTabs
              product={productData.product as CategoryProduct}
              reviewSummary={productData.reviewSummary}
              reviews={productData.reviews ?? []}
            />
          </div>

          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <RelatedProducts
              products={productData.relatedProducts}
              category={productData.categorySlug}
              viewAllHref={`/shop/${partnerSlug}/product`}
              forceRealPrice={forceRealPrice}
            />
          </div>

          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <ProductQA />
          </div>

          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <CompleteTheLook
              currentCategory={productData.categorySlug}
              currentCategoryId={productData.categoryId}
              currentCategoryLabel={productData.categoryLabel}
              currentProductId={productData.product.id}
              enableActivateDiscount={Boolean(partner.enableActivateDiscount)}
            />
          </div>
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          Orders from{" "}
          <span className="font-semibold text-slate-800">
            {partner.displayName}
          </span>{" "}
          are still processed through AF Home.
        </div>
      </footer>
      <ScrollToTop />
    </ProductPageWrapper>
  )
}
