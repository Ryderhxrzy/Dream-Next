"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"

import ProductPageWrapper from "@/components/product/ProductPageWrapper"
import LoadingScreen from "@/components/ui/LoadingScreen"
import SkeletonBox from "@/components/ui/SkeletonBox"

const normalizeSlug = (value: string) => {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  try {
    return decodeURIComponent(raw).trim().toLowerCase()
  } catch {
    return raw.toLowerCase()
  }
}

const titleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

export default function ShopLoading() {
  const pathname = usePathname()
  const partnerSlug = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    return normalizeSlug(segments[1] ?? "")
  }, [pathname])

  if (!partnerSlug) {
    // Instant page shell on /shop navigation: real navbar + a product-grid
    // skeleton (Lazada-style) instead of a blank white screen or full splash.
    return (
      <ProductPageWrapper initialCategories={[]}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6">
          <SkeletonBox className="mb-6 h-44 w-full rounded-2xl" />
          <div className="mb-6 flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBox key={i} className="h-9 w-28 shrink-0 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <SkeletonBox className="aspect-3/4 w-full" />
                <SkeletonBox className="h-4 w-3/4" />
                <SkeletonBox className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </ProductPageWrapper>
    )
  }

  return (
    <LoadingScreen
      logoSrc={null}
      logoAlt={`${titleCase(partnerSlug)} Logo`}
      brandText={titleCase(partnerSlug)}
      tagline="Partner Storefront"
      useDefaultLogoFallback={false}
    />
  )
}
