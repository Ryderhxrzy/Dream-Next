"use client"

export interface Template3Props {
  storeName?: string
  tagline?: string
  description?: string
  primaryColor?: string
  accentColor?: string
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

export default function Template3({
  storeName = "Your Store",
  tagline = "Redefine Your Space",
  description = "Discover a curated world of premium furniture. Designed for life, built for style.",
  primaryColor = "#7c3aed",
  accentColor = "#a78bfa",
  heroImage = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1400&q=80",
  heroBtnPrimary = "Explore Now",
  heroBtnSecondary = "Watch Demo",
  featuresTitle = "Built for Partners",
  featuresSubtitle = "Every tool you need to succeed.",
  ctaTitle = "Launch Your Store Today",
  ctaSubtitle = "Join the growing community of partners earning with us.",
  ctaBtnText = "Become a Partner",
  stat1Value = "500+",
  stat1Label = "Active Partners",
  stat2Value = "10K+",
  stat2Label = "Products",
  stat3Value = "₱2.4M",
  stat3Label = "Monthly Revenue",
  stat4Value = "98%",
  stat4Label = "Satisfaction",
  shopSlug,
}: Template3Props) {
  const stats = [
    { value: stat1Value, label: stat1Label },
    { value: stat2Value, label: stat2Label },
    { value: stat3Value, label: stat3Label },
    { value: stat4Value, label: stat4Label },
  ]

  return (
    <div
      className="font-sans"
      style={{
        background:
          "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      }}
    >
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-10 py-6">
        <span className="text-xl font-black tracking-tight text-white">
          {storeName}
        </span>
        <div className="hidden items-center gap-8 text-sm text-white/50 md:flex">
          <span className="cursor-pointer transition hover:text-white">
            Home
          </span>
          <span className="cursor-pointer transition hover:text-white">
            Shop
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
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
          }}
        >
          Shop Now
        </a>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-10 py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div>
            <div
              className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-bold tracking-widest text-white uppercase"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}50, ${accentColor}30)`,
                border: `1px solid ${accentColor}40`,
              }}
            >
              ✦ Premium Partner Store
            </div>
            <h1 className="text-6xl leading-none font-black tracking-tight text-white lg:text-7xl">
              {tagline}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/60">
              {description}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="rounded-2xl px-8 py-4 text-sm font-bold text-white shadow-2xl transition hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                }}
              >
                {heroBtnPrimary} →
              </button>
              <button
                type="button"
                className="rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
              >
                {heroBtnSecondary}
              </button>
            </div>
          </div>
          <div className="relative">
            <div
              className="absolute inset-0 rounded-3xl opacity-30 blur-3xl"
              style={{
                background: `radial-gradient(circle, ${primaryColor}, transparent 70%)`,
              }}
            />
            <div
              className="relative overflow-hidden rounded-3xl shadow-2xl"
              style={{ border: `1px solid ${accentColor}30` }}
            >
              <img
                src={heroImage}
                alt="Hero"
                className="h-125 w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to top, ${primaryColor}60, transparent)`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section
        className="mx-10 my-6 overflow-hidden rounded-3xl"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="grid grid-cols-2 divide-x divide-white/10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="px-8 py-7 text-center">
              <p className="text-3xl font-black" style={{ color: accentColor }}>
                {s.value}
              </p>
              <p className="mt-1.5 text-xs text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-10 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white">{featuresTitle}</h2>
            <p className="mt-2 text-sm text-white/50">{featuresSubtitle}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: "🛋️",
                title: "Curated Catalog",
                desc: "Access 500+ premium furniture pieces. All quality-checked.",
              },
              {
                icon: "🎨",
                title: "Full Branding",
                desc: "Your name, your logo. Completely white-labeled.",
              },
              {
                icon: "📦",
                title: "Zero Inventory",
                desc: "No stock. No warehouse. AF Home handles it all.",
              },
              {
                icon: "💰",
                title: "Auto Commissions",
                desc: "Earn automatically on every delivered order.",
              },
              {
                icon: "⚡",
                title: "Instant Launch",
                desc: "Live in days. No tech skills needed.",
              },
              {
                icon: "🔒",
                title: "Secure Platform",
                desc: "Enterprise-grade security on all transactions.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 transition hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-bold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-10 py-24">
        <div
          className="mx-auto max-w-3xl overflow-hidden rounded-3xl p-14 text-center"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}60, ${accentColor}30)`,
            border: `1px solid ${accentColor}30`,
          }}
        >
          <h2 className="text-4xl font-black text-white">{ctaTitle}</h2>
          <p className="mt-4 text-base text-white/70">{ctaSubtitle}</p>
          <button
            type="button"
            className="mt-10 rounded-2xl px-12 py-4 text-sm font-bold text-white shadow-2xl transition hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            }}
          >
            {ctaBtnText} →
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
