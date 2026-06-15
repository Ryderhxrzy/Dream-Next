import { buildPageMetadata } from "@/app/seo"
import PartnerSubscriptionsPageComponent from "@/components/partner/PartnerSubscriptionsPage"

export const metadata = buildPageMetadata({
  title: "Partner Subscriptions",
  description: "Manage your partner webstore subscription plans and payments.",
  path: "/partner/webpages/partner-subscriptions",
  noIndex: true,
})

export default function Page() {
  return <PartnerSubscriptionsPageComponent />
}
