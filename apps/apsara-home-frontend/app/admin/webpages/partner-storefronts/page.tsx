import PartnerStorefrontStudio from "@/components/superAdmin/webpages/PartnerStorefrontStudio"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Partner Storefronts",
  description: "Manage branded partner shop pages and their visible catalog.",
  path: "/admin/webpages/partner-storefronts",
  noIndex: true,
})

export default function AdminPartnerStorefrontsPage() {
  return <PartnerStorefrontStudio />
}
