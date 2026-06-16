"use client"

import { motion } from "framer-motion"

const REVEAL = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: false, margin: "-80px" },
  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
} as const

const STAGGER_C = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: false, margin: "-80px" },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.13, delayChildren: 0.08 } },
  },
} as const

const STAGGER_I = {
  variants: {
    hidden: { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
  },
} as const

export interface Template2Props {
  storeName?: string
  tagline?: string
  description?: string
  primaryColor?: string
  heroImage?: string
  heroBtnPrimary?: string
  heroBtnSecondary?: string
  featuresTitle?: string
  featuresSubtitle?: string
  ctaTitle?: string
  ctaSubtitle?: string
  ctaBtnText?: string
  testimonialText?: string
  stat1Value?: string
  stat1Label?: string
  stat2Value?: string
  stat2Label?: string
  stat3Value?: string
  stat3Label?: string
  stat4Value?: string
  stat4Label?: string
  shopSlug?: string
}

export default function Template2({
  storeName = "Your Store",
  tagline = "Beautiful Furniture, Effortlessly Delivered",
  description = "Shop premium home furniture with zero hassle. Curated pieces, fast delivery, and a brand you can trust.",
  primaryColor = "#f97316",
  heroImage = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&q=80",
  heroBtnPrimary = "Explore Collection",
  heroBtnSecondary = "Learn More",
  featuresTitle = "What We Offer",
  featuresSubtitle = "Everything included. No surprises.",
  ctaTitle = "Start Your Journey Today",
  ctaSubtitle = "No inventory required. No risk. Just results.",
  ctaBtnText = "Get Started Free",
  testimonialText = "Launching my furniture store was a dream. With this platform, it became reality in less than a week.",
  stat1Value = "500+",
  stat1Label = "Active Partners",
  stat2Value = "10K+",
  stat2Label = "Products",
  stat3Value = "98%",
  stat3Label = "Satisfaction",
  stat4Value = "₱0",
  stat4Label = "Inventory Cost",
  shopSlug,
}: Template2Props) {
  const stats = [
    { value: stat1Value, label: stat1Label },
    { value: stat2Value, label: stat2Label },
    { value: stat3Value, label: stat3Label },
    { value: stat4Value, label: stat4Label },
  ]

  return (
    <div className="bg-[#faf7f3] font-sans text-[#1e293b]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between bg-white px-10 py-5 shadow-sm">
        <span className="text-xl font-black tracking-tight" style={{ color: primaryColor }}>
          {storeName}
        </span>
        <div className="hidden items-center gap-8 text-sm text-slate-500 md:flex">
          <span className="cursor-pointer transition hover:text-slate-900">Home</span>
          <span className="cursor-pointer transition hover:text-slate-900">Collections</span>
          <span className="cursor-pointer transition hover:text-slate-900">About</span>
          <span className="cursor-pointer transition hover:text-slate-900">Contact</span>
        </div>
        <a
          href={shopSlug ? `/shop/${shopSlug}` : "#"}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          Shop Now
        </a>
      </nav>

      {/* Hero — two column */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-10 py-20 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -44 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
            style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
          >
            Partner Storefront
          </span>
          <h1 className="text-5xl leading-tight font-black lg:text-6xl">{tagline}</h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-500">{description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {heroBtnPrimary}
            </button>
            <button
              type="button"
              className="rounded-2xl border border-slate-300 bg-white px-8 py-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {heroBtnSecondary}
            </button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            {["Free Delivery", "Easy Returns", "Quality Guarantee"].map((badge) => (
              <span key={badge} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                {badge}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, x: 44 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          <div className="overflow-hidden rounded-3xl shadow-2xl">
            <img src={heroImage} alt="Hero" className="h-120 w-full object-cover" />
          </div>
          <div className="absolute -bottom-5 -left-5 rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-xs font-semibold text-slate-400">This month</p>
            <p className="text-2xl font-black text-slate-900">₱2.4M</p>
            <p className="text-xs text-slate-500">Partner Revenue</p>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-white px-10 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div className="mb-14 text-center" {...REVEAL}>
            <h2 className="text-3xl font-bold text-slate-900">{featuresTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{featuresSubtitle}</p>
          </motion.div>
          <motion.div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" {...STAGGER_C}>
            {[
              { icon: "🛋️", title: "Full Catalog Access", desc: "500+ premium pieces at your fingertips." },
              { icon: "🚚", title: "Nationwide Delivery", desc: "We ship directly to your customers." },
              { icon: "💳", title: "Easy Payments", desc: "GCash, cards, and more accepted." },
              { icon: "📈", title: "Real-time Analytics", desc: "Know your numbers at a glance." },
            ].map((f) => (
              <motion.div
                key={f.title}
                className="rounded-2xl border border-slate-100 p-6 transition hover:shadow-md"
                {...STAGGER_I}
              >
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-1.5 font-bold text-slate-800">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-10 py-20">
        <motion.div
          className="mx-auto max-w-3xl rounded-3xl p-10 text-center text-white shadow-xl"
          style={{ backgroundColor: primaryColor }}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-2xl leading-relaxed font-bold">"{testimonialText}"</p>
          <p className="mt-6 text-sm font-semibold opacity-80">— Partner since 2024</p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-white px-10 py-16">
        <motion.div
          className="mx-auto grid max-w-4xl grid-cols-2 gap-10 md:grid-cols-4"
          {...STAGGER_C}
        >
          {stats.map((s) => (
            <motion.div key={s.label} className="text-center" {...STAGGER_I}>
              <p className="text-4xl font-black" style={{ color: primaryColor }}>{s.value}</p>
              <p className="mt-2 text-sm text-slate-500">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <motion.section className="bg-[#faf7f3] px-10 py-24 text-center" {...REVEAL}>
        <h2 className="text-4xl font-black text-slate-900">{ctaTitle}</h2>
        <p className="mt-4 text-base text-slate-500">{ctaSubtitle}</p>
        <button
          type="button"
          className="mt-10 rounded-2xl px-12 py-4 text-sm font-bold text-white shadow-xl transition hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          {ctaBtnText}
        </button>
      </motion.section>

      {/* Footer */}
      <motion.footer
        className="border-t border-slate-200 bg-white px-10 py-8 text-center text-xs text-slate-400"
        {...REVEAL}
      >
        © {new Date().getFullYear()} {storeName} · Powered by Apsara Home
      </motion.footer>
    </div>
  )
}
