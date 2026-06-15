import { buildPageMetadata } from "@/app/seo"
import LandingPageStudio from "@/components/partner/LandingPageStudio"

export const metadata = buildPageMetadata({
  title: "Landing Page",
  description: "Manage your partner storefront landing page.",
  path: "/partner/webpages/partner-landing-page",
  noIndex: true,
})

export default function PartnerLandingPage() {
  return <LandingPageStudio />
}
