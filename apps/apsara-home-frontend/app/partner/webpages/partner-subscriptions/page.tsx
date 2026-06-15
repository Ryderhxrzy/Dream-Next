import PartnerSubscriptionsPageComponent from "@/components/partner/PartnerSubscriptionsPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Partner Subscriptions",
  description: "Manage your partner webstore subscription plans and payments.",
  path: "/partner/webpages/partner-subscriptions",
  noIndex: true,
})

export default function Page() {
  return <PartnerSubscriptionsPageComponent />
}
