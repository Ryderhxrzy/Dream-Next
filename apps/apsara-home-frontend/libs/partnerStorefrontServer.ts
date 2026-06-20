import { cache } from "react"

import {
  getPartnerStorefrontConfig,
  normalizeStorefrontHost,
  type PartnerStorefrontConfig,
} from "@/libs/partnerStorefront"
import type { WebPageItem } from "@/store/api/webPagesApi"

type PublicWebPageItemsResponse = {
  items?: WebPageItem[]
}

export type PartnerStorefrontRecord = {
  id: number
  config: PartnerStorefrontConfig
}

type StorefrontFetchOptions = {
  fresh?: boolean
}

const REQUEST_TIMEOUT_MS = 30000
const MAX_RETRIES = 3
const STOREFRONT_REVALIDATE_SECONDS = 120

async function fetchWithTimeout(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchPartnerStorefrontItems(
  options: StorefrontFetchOptions = { fresh: true }
): Promise<WebPageItem[] | null> {
  // Prefer 127.0.0.1 over localhost to avoid IPv6 resolution issues on Windows.
  const apiUrl = (
    process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? ""
  ).replace(/^http:\/\/localhost\b/, "http://127.0.0.1")
  if (!apiUrl) return null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        `${apiUrl}/api/web-pages/partner-storefronts`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          ...(options.fresh
            ? { cache: "no-store" as const }
            : {
                next: {
                  revalidate: STOREFRONT_REVALIDATE_SECONDS,
                  tags: ["storefront:partner-storefronts"],
                },
              }),
        }
      )
      if (!response.ok) {
        console.error(`[partnerStorefront] fetch attempt ${attempt + 1} non-OK: ${response.status} ${response.statusText}`)
        continue
      }

      const json = (await response.json()) as PublicWebPageItemsResponse
      console.error(`[partnerStorefront] fetched ${json.items?.length ?? 0} items`)
      return json.items ?? []
    } catch (err) {
      console.error(`[partnerStorefront] fetch attempt ${attempt + 1} threw:`, err)
    }
  }

  return null
}

const fetchPartnerStorefrontItemsCached = cache(
  async (fresh: boolean): Promise<WebPageItem[] | null> =>
    fetchPartnerStorefrontItems({ fresh })
)

export async function getPartnerStorefrontBySlug(
  partnerSlug: string,
  options: StorefrontFetchOptions = {}
): Promise<PartnerStorefrontConfig | null> {
  const record = await getPartnerStorefrontRecordBySlug(partnerSlug, {
    fresh: options.fresh ?? true,
  })

  return record?.config ?? null
}

export async function getPartnerStorefrontRecordBySlug(
  partnerSlug: string,
  options: StorefrontFetchOptions = { fresh: true }
): Promise<PartnerStorefrontRecord | null> {
  const normalized = String(partnerSlug ?? "")
    .trim()
    .toLowerCase()
  if (!normalized) return null

  const items = await fetchPartnerStorefrontItemsCached(options.fresh ?? true)
  if (!items) return null

  const storefrontItem = items.find((item) => {
    const config = getPartnerStorefrontConfig(item)
    return config?.slug === normalized
  })
  const config = getPartnerStorefrontConfig(storefrontItem)
  if (!config || !storefrontItem) return null

  return {
    id: storefrontItem.id,
    config,
  }
}

export async function getPartnerStorefrontItemBySlug(
  partnerSlug: string,
  options: StorefrontFetchOptions = { fresh: true }
): Promise<WebPageItem | null> {
  const normalized = String(partnerSlug ?? "")
    .trim()
    .toLowerCase()
  if (!normalized) return null

  const items = await fetchPartnerStorefrontItemsCached(options.fresh ?? true)
  if (!items) return null

  return (
    items.find((item) => {
      const config = getPartnerStorefrontConfig(item)
      return config?.slug === normalized
    }) ?? null
  )
}

export async function isStorefrontSubscriptionExpired(
  slug: string
): Promise<boolean> {
  const normalized = String(slug ?? "")
    .trim()
    .toLowerCase()
  if (!normalized) return false

  // Prefer 127.0.0.1 over localhost to avoid IPv6 resolution issues on Windows.
  const apiUrl = (
    process.env.LARAVEL_API_URL ??
    process.env.NEXT_PUBLIC_LARAVEL_API_URL ??
    ""
  ).replace(/^http:\/\/localhost\b/, "http://127.0.0.1")
  if (!apiUrl) return false

  try {
    const response = await fetch(
      `${apiUrl}/api/storefront-subscriptions/${encodeURIComponent(normalized)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    )
    if (!response.ok) return false
    const json = (await response.json()) as { is_expired?: boolean }
    return json.is_expired === true
  } catch {
    return false
  }
}

export async function getPartnerStorefrontRecordByHost(
  requestHost: string,
  options: StorefrontFetchOptions = { fresh: true }
): Promise<PartnerStorefrontRecord | null> {
  const normalizedHost = normalizeStorefrontHost(requestHost)
  if (!normalizedHost) return null

  const items = await fetchPartnerStorefrontItems(options)
  if (!items) return null

  const storefrontItem = items.find((item) => {
    const config = getPartnerStorefrontConfig(item)
    return normalizeStorefrontHost(config?.domainLink ?? "") === normalizedHost
  })
  const config = getPartnerStorefrontConfig(storefrontItem)
  if (!config || !storefrontItem) return null

  return {
    id: storefrontItem.id,
    config,
  }
}
