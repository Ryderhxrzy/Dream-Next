import PartnerUsersPage from "@/components/superAdmin/webpages/PartnerUsersPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Partner Users",
  description: "Manage users for your partner storefront.",
  path: "/partner/webpages/partner-users",
  noIndex: true,
})

export default function PartnerUsersPortalPage() {
  return <PartnerUsersPage showStorefrontFilter={false} />
}
