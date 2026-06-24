"use client"

import { useEffect, useMemo, useState } from "react"
import { getPartnerStorefrontConfig } from "@/libs/partnerStorefront"
import type { WebPageItem } from "@/store/api/webPagesApi"
import { usePathname } from "next/navigation"

import LoadingScreen from "@/components/ui/LoadingScreen"
import RouteProgressBar from "@/components/ui/RouteProgressBar"

type PartnerStorefrontApiResponse = {
  items?: WebPageItem[]
}
const STOREFRONT_CACHE_KEY = "partner-storefronts:payload:v1"
const STOREFRONT_CACHE_TTL_MS = 5 * 60 * 1000
const STOREFRONT_FETCH_COOLDOWN_MS = 45 * 1000

const normalizeLogoUrl = (value: string) => {
  const raw = value.trim()
  if (!raw) return raw
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    raw.startsWith("http://")
  ) {
    return `https://${raw.slice("http://".length)}`
  }
  return raw
}

const normalizeSlug = (value: string) => {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  try {
    return decodeURIComponent(raw).trim().toLowerCase()
  } catch {
    return raw.toLowerCase()
  }
}

export default function PartnerLoading() {
  const pathname = usePathname()
  const partnerSlug = useMemo(
    () => normalizeSlug(pathname.split("/").filter(Boolean)[0] ?? ""),
    [pathname]
  )
  const brandText = useMemo(() => {
    if (!partnerSlug) return "PARTNER STOREFRONT"
    return partnerSlug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  }, [partnerSlug])
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  // Show the branded partner splash only once per session per storefront — like
  // the AF Home home splash. On later navigations within the same storefront we
  // render only a subtle top bar so it does not flash on every page.
  const [splashAllowed, setSplashAllowed] = useState(false)

  useEffect(() => {
    if (!partnerSlug) return
    let alreadyShown = false
    try {
      alreadyShown =
        window.sessionStorage.getItem(
          `afhome:partner-splash-shown:${partnerSlug}`
        ) === "1"
    } catch {
      return
    }
    if (alreadyShown) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSplashAllowed(true)
  }, [partnerSlug])

  // Mark the splash as "shown" only AFTER the partner logo has displayed (or a
  // short fallback for logo-less storefronts). Otherwise the once-per-session
  // splash fires on the first load — before the logo finishes fetching — so the
  // brand logo would never appear.
  useEffect(() => {
    if (!partnerSlug || !splashAllowed) return
    const markShown = () => {
      try {
        window.sessionStorage.setItem(
          `afhome:partner-splash-shown:${partnerSlug}`,
          "1"
        )
      } catch {
        // best-effort only
      }
    }
    if (logoSrc) {
      markShown()
      return
    }
    const timer = window.setTimeout(markShown, 3000)
    return () => window.clearTimeout(timer)
  }, [partnerSlug, splashAllowed, logoSrc])

  useEffect(() => {
    if (!partnerSlug) return
    const apiBase = (process.env.NEXT_PUBLIC_LARAVEL_API_URL || "").replace(
      /\/+$/,
      ""
    )
    const iconStorageKey = `partner-storefront-icon:${partnerSlug}`
    const loadingLogoStorageKey = `partner-storefront-loading-logo:${partnerSlug}`
    const setIcon = (rel: string, href: string) => {
      let link = document.querySelector(
        `link[rel~="${rel}"]`
      ) as HTMLLinkElement | null
      if (!link) {
        link = document.createElement("link")
        link.rel = rel
        document.head.appendChild(link)
      }
      link.href = href
    }

    if (typeof window !== "undefined") {
      const cachedLoadingLogo = window.localStorage.getItem(
        loadingLogoStorageKey
      )
      if (cachedLoadingLogo) {
        const normalizedCachedLoadingLogo = normalizeLogoUrl(cachedLoadingLogo)
        const isDefaultAfHome = normalizedCachedLoadingLogo.includes(
          "/Images/af_home_logo.png"
        )
        if (!isDefaultAfHome) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setLogoSrc(normalizedCachedLoadingLogo)
        }
      }
    }

    const resolveFromPayload = (payload: PartnerStorefrontApiResponse) => {
      const item = (payload.items ?? []).find(
        (entry) => getPartnerStorefrontConfig(entry)?.slug === partnerSlug
      )
      const storefront = getPartnerStorefrontConfig(item)
      if (!storefront) return false

      const resolvedLoadingLogo = storefront.logoUrl || storefront.tabLogoUrl
      const resolvedTabIcon = storefront.tabLogoUrl || storefront.logoUrl

      if (resolvedLoadingLogo) {
        const normalizedLoadingLogo = normalizeLogoUrl(resolvedLoadingLogo)
        setLogoSrc(normalizedLoadingLogo)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            loadingLogoStorageKey,
            normalizedLoadingLogo
          )
        }
      }

      if (resolvedTabIcon) {
        const normalizedTabIcon = normalizeLogoUrl(resolvedTabIcon)
        setIcon("icon", normalizedTabIcon)
        setIcon("apple-touch-icon", normalizedTabIcon)
        setIcon("shortcut icon", normalizedTabIcon)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(iconStorageKey, normalizedTabIcon)
        }
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `partner-storefront-name:${partnerSlug}`,
          brandText
        )
      }
      return true
    }

    const tryReadCachedPayload = () => {
      if (typeof window === "undefined") return false
      const raw = window.localStorage.getItem(STOREFRONT_CACHE_KEY)
      if (!raw) return false
      try {
        const cached = JSON.parse(raw) as {
          ts?: number
          cooldownUntil?: number
          payload?: PartnerStorefrontApiResponse
        }
        if (
          typeof cached.cooldownUntil === "number" &&
          Date.now() < cached.cooldownUntil
        ) {
          return Boolean(cached.payload && resolveFromPayload(cached.payload))
        }
        if (
          typeof cached.ts === "number" &&
          Date.now() - cached.ts <= STOREFRONT_CACHE_TTL_MS &&
          cached.payload
        ) {
          return resolveFromPayload(cached.payload)
        }
      } catch {
        // ignore cache parse issues
      }
      return false
    }

    async function loadStorefrontLogo() {
      if (tryReadCachedPayload()) return

      try {
        const endpoint = apiBase
          ? `${apiBase}/api/web-pages/partner-storefronts`
          : "/api/web-pages/partner-storefronts"
        const response = await fetch(endpoint, {
          headers: { Accept: "application/json" },
          cache: "force-cache",
        })
        if (!response.ok) {
          if (typeof window !== "undefined") {
            const existing = window.localStorage.getItem(STOREFRONT_CACHE_KEY)
            let parsed: { payload?: PartnerStorefrontApiResponse } = {}
            if (existing) {
              try {
                parsed = JSON.parse(existing) as {
                  payload?: PartnerStorefrontApiResponse
                }
              } catch {
                parsed = {}
              }
            }
            window.localStorage.setItem(
              STOREFRONT_CACHE_KEY,
              JSON.stringify({
                ts: Date.now(),
                cooldownUntil: Date.now() + STOREFRONT_FETCH_COOLDOWN_MS,
                payload: parsed.payload,
              })
            )
          }
          return
        }

        const payload = (await response.json()) as PartnerStorefrontApiResponse
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            STOREFRONT_CACHE_KEY,
            JSON.stringify({
              ts: Date.now(),
              cooldownUntil: 0,
              payload,
            })
          )
        }
        resolveFromPayload(payload)
      } catch {
        // Keep cached logo if fetch fails.
      }
    }

    loadStorefrontLogo()
  }, [brandText, partnerSlug])

  // Subtle bar on repeat navigations within the storefront (no full splash).
  if (!splashAllowed) {
    return <RouteProgressBar />
  }

  return (
    <LoadingScreen
      logoSrc={logoSrc}
      logoAlt={`${brandText} Logo`}
      brandText={brandText}
      tagline="Partner Storefront"
      useDefaultLogoFallback={false}
    />
  )
}
