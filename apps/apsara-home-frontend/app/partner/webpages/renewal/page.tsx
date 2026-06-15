import PartnerStorefrontRenewalPage from "@/components/partner/PartnerStorefrontRenewalPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Partner Renewal",
  description:
    "Renew an expired partner storefront and start a new checkout flow.",
  path: "/partner/webpages/renewal",
  noIndex: true,
})

export default function Page() {
  return <PartnerStorefrontRenewalPage />
}
