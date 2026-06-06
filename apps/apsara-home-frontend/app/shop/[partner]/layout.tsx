import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getPartnerStorefrontBySlug, getPartnerStorefrontRecordBySlug, isStorefrontSubscriptionExpired } from '@/libs/partnerStorefrontServer'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { partnerAuthOptions } from '@/libs/partnerAuth'
import { adminAuthOptions } from '@/libs/adminAuth'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ partner: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { partner } = await params
  const normalizedPartner = String(partner ?? '').trim().toLowerCase()
  const storefront = await getPartnerStorefrontBySlug(normalizedPartner)
  const apiUrl = process.env.LARAVEL_API_URL ?? process.env.NEXT_PUBLIC_LARAVEL_API_URL

  const rawIconUrl = storefront?.tabLogoUrl || storefront?.logoUrl || ''
  const iconUrl = (() => {
    const value = String(rawIconUrl).trim()
    if (!value) return undefined
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value
    if (!apiUrl) return value.startsWith('/') ? value : `/${value}`
    return `${apiUrl.replace(/\/$/, '')}/${value.replace(/^\/+/, '')}`
  })()
  if (!iconUrl) return {}

  return {
    icons: {
      icon: iconUrl,
      apple: iconUrl,
      shortcut: iconUrl,
    },
  }
}

export default async function PartnerShopLayout({ children, params }: LayoutProps) {
  const { partner } = await params
  const normalizedPartner = String(partner ?? '').trim().toLowerCase()
  const requestHeaders = await headers()
  const referer = requestHeaders.get('referer') ?? ''
  const isAdminPreview = /\/admin\/webpages\/partner-storefronts/i.test(referer)

  if (isAdminPreview) {
    return children
  }

  // Block everyone when the subscription is expired — admin sessions do not bypass this.
  const [record, expired] = await Promise.all([
    getPartnerStorefrontRecordBySlug(normalizedPartner, { fresh: true }),
    isStorefrontSubscriptionExpired(normalizedPartner),
  ])

  if (expired) {
    notFound()
  }

  const adminSession = await getServerSession(adminAuthOptions)
  if (adminSession?.user) {
    return children
  }

  // Also block a logged-in partner user if their session marks this storefront disabled.
  const session = await getServerSession(partnerAuthOptions)
  const user = session?.user

  if (user) {
    const normalizedRole = String((user as { role?: string } | undefined)?.role ?? '').trim().toLowerCase()
    const userLevelId = Number((user as { userLevelId?: number } | undefined)?.userLevelId ?? 0)
    const isAdminByRole = normalizedRole === 'super_admin' || normalizedRole === 'admin' || normalizedRole === 'web_content'
    const isAdminByLevel = userLevelId === 1 || userLevelId === 2

    if (isAdminByRole || isAdminByLevel) {
      return children
    }

    if (record) {
      const disabledStorefrontIds = (user.disabledStorefrontIds ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))

      if (disabledStorefrontIds.includes(record.id)) {
        notFound()
      }
    }
  }

  return children
}
