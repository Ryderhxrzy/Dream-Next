import PartnerMembersPage from "@/components/partner/PartnerMembersPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Partner Members",
  description: "View member profiles for your partner storefront.",
  path: "/partner/webpages/partner-members",
  noIndex: true,
})

export default function PartnerMembersPortalPage() {
  return <PartnerMembersPage />
}
