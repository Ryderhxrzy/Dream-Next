import type { Metadata } from "next"

import { buildPageMetadata } from "@/app/seo"
import PartnerProductDetailClient from "@/components/product/PartnerProductDetailClient"

export const revalidate = 60

type PageProps = {
  params: Promise<{ partner: string; slug: string }>
}

const toTitle = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || value

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { partner, slug } = await params
  const normalizedPartner = partner.trim().toLowerCase()
  const fallbackTitle = `${toTitle(slug)} | ${toTitle(partner)}`

  return buildPageMetadata({
    title: fallbackTitle,
    description: `Browse ${toTitle(slug)} from ${toTitle(partner)}.`,
    path: `/shop/${normalizedPartner}/product/${slug}`,
  })
}

export default async function PartnerProductDetailPage({ params }: PageProps) {
  const { partner, slug } = await params
  const normalizedPartner = partner.trim().toLowerCase()

  if (!normalizedPartner || !slug.trim()) {
    return null
  }

  return (
    <PartnerProductDetailClient
      partnerSlug={normalizedPartner}
      productSlug={slug.trim()}
    />
  )
}
