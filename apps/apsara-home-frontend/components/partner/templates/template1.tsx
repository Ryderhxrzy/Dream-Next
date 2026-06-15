"use client"

export interface Template1Props {
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

export default function Template1({
  storeName = "Your Store",
  tagline = "Sell Premium Furniture Under Your Brand",
  description = "No inventory. No warehouse. Just your brand powered by Apsara Home.",
  primaryColor = "#6366f1",
  heroImage = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=80",
  heroBtnPrimary = "Browse Collection",
  heroBtnSecondary = "Learn More",
  featuresTitle = "Why Choose Us",
  featuresSubtitle = "Everything you need, nothing you don't.",
  ctaTitle = "Ready to Start Selling?",
  ctaSubtitle = "Join hundreds of partners already earning with us.",
  ctaBtnText = "Become a Partner",
  stat1Value = "500+",
  stat1Label = "Products",
  stat2Value = "98%",
  stat2Label = "Satisfaction",
  stat3Value = "0",
  stat3Label = "Inventory Needed",
  stat4Value = "24h",
  stat4Label = "Support",
  shopSlug,
}: Template1Props) {
  const stats = [
    { value: stat1Value, label: stat1Label },
    { value: stat2Value, label: stat2Label },
    { value: stat3Value, label: stat3Label },
    { value: stat4Value, label: stat4Label },
  ]

  return (
    <div className="bg-[#0a0a0f] font-sans text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 px-10 py-5">
        <span className="text-xl font-black tracking-tight">{storeName}</span>
        <div className="hidden items-center gap-8 text-sm text-white/50 md:flex">
          <span className="cursor-pointer transition hover:text-white">
            Home
          </span>
          <span className="cursor-pointer transition hover:text-white">
            Products
          </span>
          <span className="cursor-pointer transition hover:text-white">
            About
          </span>
          <span className="cursor-pointer transition hover:text-white">
            Contact
          </span>
        </div>
        <a
          href={shopSlug ? `/shop/${shopSlug}` : "#"}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          Shop Now
        </a>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: 580 }}>
        <img
          src={heroImage}
          alt="Hero"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-linear-to-b from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]" />
        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-32 text-center">
          <span
            className="mb-5 inline-block rounded-full border px-4 py-1 text-xs font-semibold tracking-widest uppercase"
            style={{ borderColor: `${primaryColor}60`, color: primaryColor }}
          >
            Partner Storefront
          </span>
          <h1 className="max-w-3xl text-5xl leading-tight font-black lg:text-6xl">
            {tagline}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60">
            {description}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              className="rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-2xl transition hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {heroBtnPrimary}
            </button>
            <button
              type="button"
              className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
            >
              {heroBtnSecondary}
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-white/5 px-10 py-14">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="text-4xl font-black"
                style={{ color: primaryColor }}
              >
                {s.value}
              </p>
              <p className="mt-2 text-sm text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-10 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold">{featuresTitle}</h2>
            <p className="mt-2 text-sm text-white/50">{featuresSubtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "🛋️",
                title: "Curated Catalog",
                desc: "Premium furniture sourced and quality-checked by Apsara Home.",
              },
              {
                icon: "🎨",
                title: "Your Brand",
                desc: "Your logo, your colors, your store. Fully white-labeled.",
              },
              {
                icon: "📦",
                title: "Zero Logistics",
                desc: "We handle storage, packing, and delivery. You just sell.",
              },
              {
                icon: "💰",
                title: "Earn Commissions",
                desc: "Get paid on every completed order automatically.",
              },
              {
                icon: "⚡",
                title: "Launch in Days",
                desc: "Go live fast. No technical setup required.",
              },
              {
                icon: "📊",
                title: "Live Dashboard",
                desc: "Track orders, earnings, and performance in real time.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20"
              >
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-10 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-4xl font-black">{ctaTitle}</h2>
          <p className="mt-4 text-base text-white/50">{ctaSubtitle}</p>
          <button
            type="button"
            className="mt-10 rounded-2xl px-12 py-4 text-sm font-bold text-white shadow-2xl transition hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            {ctaBtnText}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-10 py-8 text-center text-xs text-white/30">
        © {new Date().getFullYear()} {storeName} · Powered by Apsara Home
      </footer>
    </div>
  )
}
