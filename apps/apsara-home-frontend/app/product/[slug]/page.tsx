import { Suspense } from "react"
import {
  buildCanonicalProductSlug,
  getProductCore,
  getRelatedProducts,
} from "@/libs/productPageData"
import { getNavbarCategories } from "@/libs/serverStorefront"
import SkeletonBox from "@/components/ui/SkeletonBox"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import Footer from "@/components/landing-page/Footer"
import ScrollToTop from "@/components/landing-page/ScrollToTop"
import CompleteTheLook from "@/components/product/CompleteTheLook"
import ProductPageClient from "@/components/product/ProductPageClient"
import ProductPageWrapper from "@/components/product/ProductPageWrapper"
import ProductQA from "@/components/product/ProductQA"
import ProductTabs from "@/components/product/ProductTabs"
import RelatedProducts from "@/components/product/RelatedProduct"
import { buildPageMetadata } from "@/app/seo"

export const revalidate = 60

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await getProductCore(slug)
  if (!data) {
    return buildPageMetadata({
      title: "Product Details",
      description: "Browse product details on AF Home.",
      path: "/product",
    })
  }

  const canonicalSlug = buildCanonicalProductSlug(
    data.product.name,
    data.product.id
  )
  const fallbackDescription = `Buy ${data.product.name} on AF Home.`
  const safeDescription = (
    data.product.description || fallbackDescription
  ).slice(0, 160)

  return buildPageMetadata({
    title: data.product.name,
    description: safeDescription,
    path: `/product/${canonicalSlug}`,
    image: data.product.image,
  })
}

function RelatedProductsSkeleton() {
  return (
    <div>
      <SkeletonBox className="mb-6 h-7 w-56" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <SkeletonBox className="aspect-square w-full" />
            <SkeletonBox className="h-4 w-3/4" />
            <SkeletonBox className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Streamed independently so the heavy 300-product listing never blocks the
// main product render.
async function RelatedProductsSection({
  slug,
  categorySlug,
}: {
  slug: string
  categorySlug: string
}) {
  const products = await getRelatedProducts(slug, categorySlug)
  return <RelatedProducts products={products} category={categorySlug} />
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const [dynamicData, navbarCategories] = await Promise.all([
    getProductCore(slug),
    getNavbarCategories(),
  ])
  if (!dynamicData) return notFound()

  const canonicalSlug = buildCanonicalProductSlug(
    dynamicData.product.name,
    dynamicData.product.id
  )
  if (slug !== canonicalSlug) {
    redirect(`/product/${canonicalSlug}`)
  }

  return (
    <ProductPageWrapper initialCategories={navbarCategories}>
      <main className="flex-1 bg-white dark:bg-gray-900">
        <div className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <Link
                href="/"
                className="font-medium transition-colors hover:text-sky-500 dark:hover:text-sky-400"
              >
                Home
              </Link>
              <ChevronRight />
              <Link
                href={`/category/${dynamicData.categorySlug}`}
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
          />
          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <ProductTabs
              product={dynamicData.product}
              reviewSummary={dynamicData.reviewSummary}
              reviews={dynamicData.reviews ?? []}
            />
          </div>
          <div className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700">
            <Suspense
              fallback={<RelatedProductsSkeleton />}
            >
              <RelatedProductsSection
                slug={slug}
                categorySlug={dynamicData.categorySlug}
              />
            </Suspense>
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
            />
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </ProductPageWrapper>
  )
}
