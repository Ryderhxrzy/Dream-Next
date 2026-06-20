import type { Metadata } from "next"

import { buildPageMetadata } from "@/app/seo"
import ShopPartnerPageClient from "@/components/shop/ShopPartnerPageClient"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{
    partner: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  const normalizedPartner = resolved.partner.trim().toLowerCase()
  const displayName = normalizedPartner || "Partner Store"

  return buildPageMetadata({
    title: displayName,
    description: `Discover premium furniture, appliances, and inspired spaces on ${displayName}.`,
    path: `/shop/${normalizedPartner}`,
  })
}

export default async function PartnerShopPage({ params }: PageProps) {
  const resolved = await params
  const normalizedPartner = resolved.partner.trim().toLowerCase()

  if (!normalizedPartner) {
    return null
  }

  return <ShopPartnerPageClient partnerSlug={normalizedPartner} />
}
