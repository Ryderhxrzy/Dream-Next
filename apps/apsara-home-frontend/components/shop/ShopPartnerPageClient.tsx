"use client"

import { useEffect, useMemo, useState } from "react"

import { getPartnerStorefrontConfig, type PartnerStorefrontConfig } from "@/libs/partnerStorefront"
import type { WebPageItem } from "@/store/api/webPagesApi"

import LoadingScreen from "@/components/ui/LoadingScreen"
import PartnerStorefrontPage from "@/components/partner/PartnerStorefrontPage"
import type { ShopBuilderApiResponse } from "@/components/sections/ShopBuilderSections"

type PartnerStorefrontApiResponse = {
  items?: WebPageItem[]
}

type ApiCategoriesResponse = {
  categories?: ShopBuilderApiResponse["categories"]
}

type ApiProductsResponse = {
  products?: ShopBuilderApiResponse["products"]
}

const titleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

type ShopPartnerPageClientProps = {
  partnerSlug: string
  initialPartner?: PartnerStorefrontConfig | null
  initialShopData?: ShopBuilderApiResponse | null
}

export default function ShopPartnerPageClient({
  partnerSlug,
  initialPartner = null,
  initialShopData = null,
}: ShopPartnerPageClientProps) {
  const hasInitialData = Boolean(initialPartner && initialShopData)
  const [partner, setPartner] = useState<PartnerStorefrontConfig | null>(
    initialPartner
  )
  const [shopData, setShopData] = useState<ShopBuilderApiResponse | null>(
    initialShopData
  )
  // When the server already provided the storefront data, render it instantly —
  // no client-side loading screen flashing on every navigation.
  const [loading, setLoading] = useState(!hasInitialData)
  const [error, setError] = useState<string | null>(null)

  const displayName = useMemo(
    () => (partnerSlug ? titleCase(partnerSlug) : "Shop"),
    [partnerSlug]
  )

  useEffect(() => {
    // SSR already supplied the storefront — skip the client fetch so there is no
    // loading flash. Freshness is handled by the cached server fetch on each
    // navigation.
    if (initialPartner && initialShopData) return

    const controller = new AbortController()
    const apiBase = (process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "").replace(
      /\/+$/,
      ""
    )
    const storefrontUrl = apiBase
      ? `${apiBase}/api/web-pages/partner-storefronts`
      : "/api/web-pages/partner-storefronts"
    const shopBuilderUrl = apiBase
      ? `${apiBase}/api/web-pages/shop-builder`
      : "/api/web-pages/shop-builder"
    const categoriesUrl = apiBase
      ? `${apiBase}/api/categories?page=1&per_page=100&used_only=1`
      : "/api/categories?page=1&per_page=100&used_only=1"
    const productsUrl = apiBase
      ? `${apiBase}/api/products?page=1&per_page=200&status=1`
      : "/api/products?page=1&per_page=200&status=1"

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [storefrontRes, webPagesRes, categoriesRes, productsRes] =
          await Promise.all([
            fetch(storefrontUrl, {
              headers: { Accept: "application/json" },
              signal: controller.signal,
              cache: "no-store",
            }),
            fetch(shopBuilderUrl, {
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

        if (!storefrontRes.ok || !webPagesRes.ok || !categoriesRes.ok || !productsRes.ok) {
          throw new Error("Failed to load storefront data.")
        }

        const storefrontJson =
          (await storefrontRes.json()) as PartnerStorefrontApiResponse
        const webPagesJson = (await webPagesRes.json()) as {
          items?: ShopBuilderApiResponse["items"]
        }
        const categoriesJson =
          (await categoriesRes.json()) as ApiCategoriesResponse
        const productsJson = (await productsRes.json()) as ApiProductsResponse

        const storefrontItem = (storefrontJson.items ?? []).find((item) => {
          const config = getPartnerStorefrontConfig(item)
          return config?.slug === partnerSlug
        })
        const storefront = getPartnerStorefrontConfig(storefrontItem)

        if (!storefront) {
          throw new Error("Storefront not found.")
        }

        setPartner(storefront)
        setShopData({
          items: webPagesJson.items ?? [],
          categories: categoriesJson.categories ?? [],
          products: productsJson.products ?? [],
        })
      } catch (fetchError) {
        if (controller.signal.aborted) return
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load storefront."
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
  }, [partnerSlug, initialPartner, initialShopData])

  if (loading) {
    return (
      <LoadingScreen
        logoSrc={partner?.logoUrl ?? partner?.tabLogoUrl ?? null}
        brandText={displayName}
        tagline="Partner Storefront"
        useDefaultLogoFallback={false}
      />
    )
  }

  if (!partner || !shopData) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Storefront unavailable
          </p>
          <h1 className="mt-3 text-3xl font-bold">{displayName}</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {error || "We could not load this storefront right now. Please refresh and try again."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <PartnerStorefrontPage
      partner={partner}
      data={shopData}
      publicShopUrl={partner.publicShopUrl || `/shop/${partner.slug}`}
    />
  )
}
