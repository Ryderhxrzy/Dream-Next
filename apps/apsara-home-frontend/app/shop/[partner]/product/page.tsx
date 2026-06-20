import type { Metadata } from "next"

import { buildPageMetadata } from "@/app/seo"
import ShopPartnerProductPageClient from "../../../../components/category/ShopPartnerProductPageClient"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{
    partner: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  const normalizedPartner = resolved.partner.trim().toLowerCase()
  const title = `${normalizedPartner || "Partner"} Products`

  return buildPageMetadata({
    title,
    description: `Browse all products for ${normalizedPartner || "this partner"}.`,
    path: `/shop/${normalizedPartner}/product`,
  })
}

export default async function ShopPartnerProductPage({ params }: PageProps) {
  const resolved = await params
  const normalizedPartner = resolved.partner.trim().toLowerCase()

  if (!normalizedPartner) {
    return null
  }

  return <ShopPartnerProductPageClient partnerSlug={normalizedPartner} />
}
