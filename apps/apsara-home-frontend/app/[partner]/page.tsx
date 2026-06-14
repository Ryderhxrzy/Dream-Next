import LandingPageView from '@/components/partner/PartnerLandingPageView'
import type { Metadata } from 'next'
import { getPartnerStorefrontBySlug, getPartnerStorefrontItemBySlug } from '@/libs/partnerStorefrontServer'

type PageProps = {
  params: Promise<{ partner: string }>
}

function formatPartnerName(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { partner } = await params
  const normalizedPartner = partner.trim().toLowerCase()
  const storefront = await getPartnerStorefrontBySlug(normalizedPartner)
  const displayName = storefront?.displayName?.trim() || formatPartnerName(normalizedPartner) || normalizedPartner
  const apiBase = (process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? '').replace(/\/+$/, '')
  const rawIcon = storefront?.tabLogoUrl || storefront?.logoUrl
  const resolvedIcon = (() => {
    if (!rawIcon) return null
    const trimmed = rawIcon.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed
    if (trimmed.startsWith('/Images/')) return trimmed
    if (apiBase) return `${apiBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
    return trimmed
  })()
  const version = storefront?.logoVersion?.trim() || '1'
  const iconWithVersion = resolvedIcon
    ? `${resolvedIcon}${resolvedIcon.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`
    : undefined

  return {
    title: displayName,
    description: `Discover premium furniture, appliances, and inspired spaces on ${displayName}.`,
    alternates: { canonical: `/${normalizedPartner}` },
    icons: iconWithVersion
      ? {
        icon: iconWithVersion,
        apple: iconWithVersion,
        shortcut: iconWithVersion,
      }
      : undefined,
    openGraph: {
      title: displayName,
      description: `Discover premium furniture, appliances, and inspired spaces on ${displayName}.`,
      url: `/${normalizedPartner}`,
      siteName: displayName,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: displayName,
      description: `Discover premium furniture, appliances, and inspired spaces on ${displayName}.`,
    },
  }
}

export default async function PartnerLandingPage({ params }: PageProps) {
  const { partner } = await params
  const normalizedPartner = partner.trim().toLowerCase()
  const storefrontItem = await getPartnerStorefrontItemBySlug(normalizedPartner)

  return <LandingPageView partnerSlug={normalizedPartner} storefrontItem={storefrontItem ?? undefined} />
}
