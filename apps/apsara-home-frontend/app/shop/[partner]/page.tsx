import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import PartnerLandingPageView from '@/components/partner/PartnerLandingPageView'
import { resolvePartnerStorefrontPublicUrl } from '@/libs/partnerStorefront'
import {
  getPartnerStorefrontBySlug,
  getPartnerStorefrontItemBySlug,
  isStorefrontSubscriptionExpired,
} from '@/libs/partnerStorefrontServer'
import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{
    partner: string
  }>
  searchParams?: Promise<{
    preview?: string
  }>
}

const BLANK_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  const requestHeaders = await headers()
  const requestHost = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? ''
  const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://afhome.ph'
  const SITE_URL = RAW_SITE_URL.startsWith('http') ? RAW_SITE_URL : `https://${RAW_SITE_URL}`
  const partnerName = resolved.partner
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
  const title = partnerName.toLowerCase().endsWith('shop') ? partnerName : `${partnerName} Shop`
  const description = `Browse the curated storefront for ${resolved.partner}.`
  const path = `/shop/${resolved.partner}`
  const partnerConfig = await getPartnerStorefrontBySlug(resolved.partner)
  const resolvedPublicShopUrl = resolvePartnerStorefrontPublicUrl(partnerConfig, requestHost)
  const canonicalUrl = resolvedPublicShopUrl || `${SITE_URL}${path}`
  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'AF Home',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }

  const iconUrl = partnerConfig?.tabLogoUrl || partnerConfig?.logoUrl

  metadata.icons = iconUrl
    ? {
      icon: [{ url: iconUrl, type: 'image/png' }],
      apple: iconUrl,
    }
    : {
      icon: [{ url: BLANK_FAVICON, type: 'image/svg+xml' }],
      apple: BLANK_FAVICON,
    }

  return metadata
}

export default async function PartnerShopPage({ params }: PageProps) {
  const resolved = await params

  const expired = await isStorefrontSubscriptionExpired(resolved.partner)
  if (expired) {
    notFound()
  }

  const storefrontItem = await getPartnerStorefrontItemBySlug(resolved.partner)
  if (!storefrontItem) {
    notFound()
  }

  return <PartnerLandingPageView partnerSlug={resolved.partner} storefrontItem={storefrontItem} />
}
