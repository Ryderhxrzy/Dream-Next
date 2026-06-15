import { buildPageMetadata } from '@/app/seo'
import LandingPageStudio from '@/components/partner/LandingPageStudio'

export const metadata = buildPageMetadata({
  title: 'Partner Landing Page',
  description: 'Design the public-facing landing page for your partner storefront.',
  path: '/admin/webpages/partner-landing-page',
  noIndex: true,
})

export default function AdminPartnerLandingPage() {
  return <LandingPageStudio />
}
