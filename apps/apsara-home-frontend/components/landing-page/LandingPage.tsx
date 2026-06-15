"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"

import CommissionSection from "@/components/landing-page/CommissionSection"
import CTASection from "@/components/landing-page/CTASection"
import ExperienceSection from "@/components/landing-page/ExperienceSection"
import Footer from "@/components/landing-page/Footer"
import Header from "@/components/landing-page/Header"
import HeroSection from "@/components/landing-page/HeroSection"
import HowItWorksSection from "@/components/landing-page/HowItWorksSection"
import LifetimeBenefitsSection from "@/components/landing-page/LifetimeBenefitsSection"
import Newsletter from "@/components/landing-page/Newsletter"
import type { Product } from "@/components/landing-page/ProductCard"
import ProductsBrandsSection from "@/components/landing-page/ProductsBrandsSection"
import QuickViewModal from "@/components/landing-page/QuickViewModal"
import ScrollToTop from "@/components/landing-page/ScrollToTop"
import TargetAudienceSection from "@/components/landing-page/TargetAudienceSection"
import TeamSection from "@/components/landing-page/TeamSection"
import Testimonials from "@/components/landing-page/Testimonials"
import TrainingSupportSection from "@/components/landing-page/TrainingSupportSection"

type LandingPageProps = {
  partnerSlug?: string
}

export default function LandingPage({ partnerSlug }: LandingPageProps = {}) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  const handleCloseQuickView = () => {
    setIsQuickViewOpen(false)
    setTimeout(() => setSelectedProduct(null), 300)
  }

  const handleAddToCart = (_product: Product, quantity: number) => {
    setCartCount((prev) => prev + quantity)
  }

  return (
    <div className="bg-af-cream min-h-screen dark:bg-gray-950">
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[100]" />

      <Header cartCount={cartCount} partnerSlug={partnerSlug} />

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

      <AnimatePresence>
        <QuickViewModal
          product={selectedProduct}
          isOpen={isQuickViewOpen}
          onClose={handleCloseQuickView}
          onAddToCart={handleAddToCart}
        />
      </AnimatePresence>
    </div>
  )
}
