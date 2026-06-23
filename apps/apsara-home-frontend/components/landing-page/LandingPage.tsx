import dynamic from "next/dynamic"

import Header from "@/components/landing-page/Header"
import HeroSection from "@/components/landing-page/HeroSection"

// Below-the-fold sections are code-split into their own chunks so the initial
// payload stays small. SSR stays on (default), so content remains in the HTML
// for SEO — only the JavaScript is deferred/split.
const ExperienceSection = dynamic(
  () => import("@/components/landing-page/ExperienceSection")
)
const HowItWorksSection = dynamic(
  () => import("@/components/landing-page/HowItWorksSection")
)
const ProductsBrandsSection = dynamic(
  () => import("@/components/landing-page/ProductsBrandsSection")
)
const CommissionSection = dynamic(
  () => import("@/components/landing-page/CommissionSection")
)
const LifetimeBenefitsSection = dynamic(
  () => import("@/components/landing-page/LifetimeBenefitsSection")
)
const TeamSection = dynamic(
  () => import("@/components/landing-page/TeamSection")
)
const TrainingSupportSection = dynamic(
  () => import("@/components/landing-page/TrainingSupportSection")
)
const TargetAudienceSection = dynamic(
  () => import("@/components/landing-page/TargetAudienceSection")
)
const CTASection = dynamic(() => import("@/components/landing-page/CTASection"))
const Testimonials = dynamic(
  () => import("@/components/landing-page/Testimonials")
)
const Newsletter = dynamic(
  () => import("@/components/landing-page/Newsletter")
)
const Footer = dynamic(() => import("@/components/landing-page/Footer"))
const ScrollToTop = dynamic(
  () => import("@/components/landing-page/ScrollToTop")
)

type LandingPageProps = {
  partnerSlug?: string
}

export default function LandingPage({ partnerSlug }: LandingPageProps = {}) {
  return (
    <div className="bg-af-cream min-h-screen dark:bg-gray-950">
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[100]" />

      <Header cartCount={0} partnerSlug={partnerSlug} />

      <main>
        <HeroSection />
        <div id="ecosystem">
          <ExperienceSection />
        </div>
        <HowItWorksSection />
        <ProductsBrandsSection />
        <div id="earnings">
          <CommissionSection />
        </div>
        <div id="benefits">
          <LifetimeBenefitsSection />
        </div>
        <div id="team">
          <TeamSection />
        </div>
        <div id="training">
          <TrainingSupportSection />
        </div>
        <TargetAudienceSection />
        <CTASection />
        <Testimonials />
        <Newsletter />
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  )
}
