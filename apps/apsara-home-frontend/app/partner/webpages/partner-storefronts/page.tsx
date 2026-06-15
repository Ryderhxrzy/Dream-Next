import PartnerStorefrontStudio from "@/components/superAdmin/webpages/PartnerStorefrontStudio"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Partner Storefronts",
  description: "Manage your partner storefront settings.",
  path: "/partner/webpages/partner-storefronts",
  noIndex: true,
})

export default function PartnerStorefrontsPage() {
  return <PartnerStorefrontStudio />
}
