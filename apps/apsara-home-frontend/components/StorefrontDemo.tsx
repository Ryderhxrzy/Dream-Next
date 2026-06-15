"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  ArrowRightLeft,
  BadgeDollarSign,
  Bell,
  CheckCircle2,
  ChevronRight,
  Layers,
  Moon,
  Package,
  Palette,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react"

/* ─── Data ──────────────────────────────────────────────────── */
const AF_PRODUCTS = [
  { name: "Minimalist Sofa", price: "₱12,499", category: "Living Room" },
  { name: "Oak Coffee Table", price: "₱5,299", category: "Living Room" },
  { name: "Linen Curtains", price: "₱1,899", category: "Bedroom" },
  { name: "Velvet Armchair", price: "₱8,799", category: "Living Room" },
  { name: "Marble Lamp", price: "₱3,499", category: "Lighting" },
  { name: "Geometric Rug", price: "₱6,999", category: "Decor" },
]

const STOREFRONTS = [
  {
    name: "LivingCo",
    slug: "livingco",
    tagline: "Modern Living, Delivered.",
    theme: "#0d9488",
    accent: "#f97316",
    glow: "rgba(13,148,136,0.3)",
    initial: "LC",
    badge: "Home & Living",
    pickedProducts: [0, 1, 3],
    stats: { orders: "1,240", members: "380", revenue: "₱248K" },
  },
  {
    name: "NestHaus",
    slug: "nesthaus",
    tagline: "Your Home, Your Style.",
    theme: "#7c3aed",
    accent: "#fbbf24",
    glow: "rgba(124,58,237,0.3)",
    initial: "NH",
    badge: "Premium Interiors",
    pickedProducts: [3, 4, 5],
    stats: { orders: "890", members: "220", revenue: "₱178K" },
  },
  {
    name: "CasaBlanca",
    slug: "casablanca",
    tagline: "Elegance for Every Room.",
    theme: "#be123c",
    accent: "#0ea5e9",
    glow: "rgba(190,18,60,0.3)",
    initial: "CB",
    badge: "Luxury Spaces",
    pickedProducts: [1, 2, 4],
    stats: { orders: "560", members: "145", revenue: "₱112K" },
  },
]

const BENEFITS = [
  {
    icon: Layers,
    label: "AF Homes Catalog",
    desc: "All products sourced and managed by AF Homes",
  },
  {
    icon: Palette,
    label: "Custom Branding",
    desc: "Your logo, colors, and store name",
  },
  {
    icon: Package,
    label: "Product Curation",
    desc: "Pick which AF Homes products appear in your store",
  },
  {
    icon: Bell,
    label: "Instant Notifications",
    desc: "Get notified on every order instantly",
  },
  {
    icon: BadgeDollarSign,
    label: "Commission Earnings",
    desc: "Earn on every delivered order",
  },
  {
    icon: Zap,
    label: "Zero Inventory",
    desc: "No stock management — AF Homes handles it all",
  },
]

const STEPS = [
  {
    n: "01",
    label: "Apply as Partner",
    desc: "Sign up and get approved as an Apsara Home partner.",
  },
  {
    n: "02",
    label: "Curate Your Products",
    desc: "Choose which AF Homes products appear in your store.",
  },
  {
    n: "03",
    label: "Brand Your Store",
    desc: "Set your logo, colors, and store name — fully yours.",
  },
  {
    n: "04",
    label: "Your Store Goes Live",
    desc: "Customers shop under your brand at your unique link.",
  },
  {
    n: "05",
    label: "You Earn",
    desc: "Commission credited to your wallet on every delivered order.",
  },
]

const EARNINGS_FEED = [
  {
    store: "LivingCo",
    product: "Minimalist Sofa",
    amount: "₱624",
    time: "Just now",
  },
  {
    store: "NestHaus",
    product: "Velvet Armchair",
    amount: "₱440",
    time: "2 min ago",
  },
  {
    store: "CasaBlanca",
    product: "Marble Lamp",
    amount: "₱175",
    time: "5 min ago",
  },
  {
    store: "LivingCo",
    product: "Linen Curtains",
    amount: "₱95",
    time: "8 min ago",
  },
  {
    store: "NestHaus",
    product: "Geometric Rug",
    amount: "₱350",
    time: "12 min ago",
  },
]

const SCENES = [
  "intro",
  "problem",
  "highlight",
  "concept",
  "showcase",
  "earnings",
  "benefits",
  "howItWorks",
  "cta",
] as const
type Scene = (typeof SCENES)[number]
const DURATIONS: Record<Scene, number> = {
  intro: 3500,
  problem: 4500,
  highlight: 6000,
  concept: 7000,
  showcase: 12000,
  earnings: 8000,
  benefits: 9000,
  howItWorks: 11000,
  cta: 99999,
}

/* ─── Highlight Scene ───────────────────────────────────────── */
const HIGHLIGHT_CARDS = [
  {
    rotate: -8,
    x: -320,
    y: -80,
    delay: 0.3,
    content: (
      <div className="w-48 rounded-2xl border border-white/10 bg-[#111115] p-4 shadow-2xl">
        <p className="mb-2 text-[10px] tracking-widest text-white/40 uppercase">
          New Order
        </p>
        <p className="text-sm font-bold text-white">Minimalist Sofa</p>
        <p className="mt-1 text-xl font-black text-emerald-400">+₱624</p>
        <p className="mt-1 text-[10px] text-white/25">
          LivingCo Store · Just now
        </p>
      </div>
    ),
  },
  {
    rotate: 6,
    x: 300,
    y: -100,
    delay: 0.5,
    content: (
      <div className="w-44 rounded-2xl border border-white/10 bg-[#111115] p-4 shadow-2xl">
        <p className="mb-2 text-[10px] tracking-widest text-white/40 uppercase">
          This Month
        </p>
        <p className="text-2xl font-black text-emerald-400">₱48,200</p>
        <p className="mt-1 text-[10px] text-white/25">Commission earned</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-3/4 rounded-full bg-emerald-400" />
        </div>
      </div>
    ),
  },
  {
    rotate: -5,
    x: -280,
    y: 100,
    delay: 0.7,
    content: (
      <div className="w-44 rounded-2xl border border-white/10 bg-[#111115] p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500 text-[10px] font-bold text-white">
            LC
          </div>
          <div>
            <p className="text-xs font-semibold text-white">LivingCo</p>
            <p className="text-[9px] text-white/30">Your Storefront</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {["Sofa", "Table", "Curtains"].map((p) => (
            <div
              key={p}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              <span className="text-[10px] text-white/50">{p}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    rotate: 7,
    x: 290,
    y: 90,
    delay: 0.9,
    content: (
      <div className="w-44 rounded-2xl border border-white/10 bg-[#111115] p-4 shadow-2xl">
        <p className="mb-2 text-[10px] tracking-widest text-white/40 uppercase">
          Active Stores
        </p>
        <div className="flex flex-wrap gap-1.5">
          {["LC", "NH", "CB", "FG", "NK"].map((s, i) => (
            <div
              key={s}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[9px] font-bold text-white"
              style={{
                backgroundColor: [
                  "#0d9488",
                  "#7c3aed",
                  "#be123c",
                  "#ca8a04",
                  "#0891b2",
                ][i],
              }}
            >
              {s}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-white/25">5 storefronts live</p>
      </div>
    ),
  },
]

function HighlightScene() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.7 }}
      className="relative flex min-h-[500px] w-full max-w-4xl items-center justify-center"
    >
      {/* Floating cards */}
      {HIGHLIGHT_CARDS.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8, x: card.x * 0.5, y: card.y * 0.5 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: card.x,
            y: card.y,
            rotate: card.rotate,
          }}
          transition={{
            delay: card.delay,
            duration: 0.7,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ position: "absolute" }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
          >
            {card.content}
          </motion.div>
        </motion.div>
      ))}

      {/* Center typography */}
      <div className="relative z-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5 text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase"
        >
          Partner Storefront
        </motion.p>

        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.2,
              duration: 0.7,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-6xl leading-none font-black text-transparent"
          >
            No inventory.
          </motion.h1>
        </div>
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.45,
              duration: 0.7,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-6xl leading-none font-black text-transparent"
          >
            No warehouse.
          </motion.h1>
        </div>
        <div className="mt-1 overflow-hidden">
          <motion.h1
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.7,
              duration: 0.7,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="text-6xl leading-none font-black text-amber-400"
          >
            Just your brand.
          </motion.h1>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mx-auto mt-5 max-w-xs text-base leading-relaxed text-white/30"
        >
          Sell thousands of AF Homes products under your own brand — zero
          logistics, zero stock.
        </motion.p>
      </div>
    </motion.div>
  )
}

/* ─── Orbs ──────────────────────────────────────────────────── */
function Orbs({ color }: { color: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 -left-40 h-[700px] w-[700px] rounded-full opacity-25 blur-[130px]"
        style={{ backgroundColor: color }}
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute -right-40 -bottom-40 h-[600px] w-[600px] rounded-full opacity-15 blur-[130px]"
        style={{ backgroundColor: color }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#050508_100%)]" />
    </div>
  )
}

/* ─── Product Card ──────────────────────────────────────────── */
function ProductCard({
  product,
  highlighted,
  brandColor,
  delay = 0,
}: {
  product: (typeof AF_PRODUCTS)[0]
  highlighted?: boolean
  brandColor?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="overflow-hidden rounded-xl border transition-all duration-300"
      style={{
        backgroundColor: highlighted
          ? `${brandColor}15`
          : "rgba(255,255,255,0.03)",
        borderColor: highlighted ? `${brandColor}40` : "rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="flex h-16 items-center justify-center"
        style={{
          background: highlighted
            ? `linear-gradient(135deg,${brandColor}20,${brandColor}05)`
            : "rgba(255,255,255,0.02)",
        }}
      >
        <Package
          size={20}
          className={highlighted ? "text-white/40" : "text-white/15"}
        />
      </div>
      <div className="p-3">
        <p className="truncate text-[11px] font-medium text-white">
          {product.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-white/35">{product.price}</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/25">
            {product.category}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Browser Mockup ────────────────────────────────────────── */
function BrowserMockup({ sf }: { sf: (typeof STOREFRONTS)[0] }) {
  const products = sf.pickedProducts.map((i) => AF_PRODUCTS[i])
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000"
  const shopHref = `${origin}/shop/${sf.slug}`
  const loginHref = `${origin}/${sf.slug}/login`
  return (
    <motion.div
      key={sf.name}
      initial={{ opacity: 0, y: 24, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 2 }}
      exit={{ opacity: 0, y: -16, rotateX: -4 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ perspective: 1200 }}
      className="w-full max-w-[600px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
    >
      {/* Chrome */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-[#1a1a1d] px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 font-mono text-xs text-white/30">
          <div className="h-2 w-2 rounded-full bg-green-400/60" />
          http://localhost:3000/{sf.slug}
        </div>
      </div>

      {/* Store */}
      <div className="relative overflow-hidden bg-[#0c0c0f]">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: `radial-gradient(ellipse at 50% -10%, ${sf.theme} 0%, transparent 65%)`,
          }}
        />

        {/* Nav */}
        <div className="relative flex items-center justify-between border-b border-white/5 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: sf.theme }}
            >
              {sf.initial}
            </div>
            <span className="text-sm font-semibold text-white">{sf.name}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${sf.accent}20`, color: sf.accent }}
            >
              {sf.badge}
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4 text-xs text-white/30">
              <a
                href={loginHref}
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
                aria-label="Partner login"
              >
                <User size={15} className="text-white/60" />
              </a>
              <div className="relative">
                <ShoppingBag size={15} className="text-white/50" />
                <div
                  className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ backgroundColor: sf.accent }}
                >
                  2
                </div>
              </div>
              <div className="h-5 w-px bg-white/20" />
              <Moon size={15} className="text-white/50" />
            </div>
            <a
              href={shopHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-slate-800 px-3.5 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Browse Shop
            </a>
          </div>
        </div>

        {/* Hero */}
        <div className="relative px-5 py-6">
          <p
            className="mb-2 text-[10px] font-semibold tracking-widest uppercase"
            style={{ color: sf.accent }}
          >
            Featured Collection
          </p>
          <h2 className="mb-1 text-xl font-bold text-white">{sf.tagline}</h2>
          <p className="mb-4 text-xs text-white/35">
            Curated products available exclusively at {sf.name}.
          </p>
          <button
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white"
            style={{ backgroundColor: sf.theme }}
          >
            Shop Now <ArrowRight size={11} />
          </button>
        </div>

        {/* Products */}
        <div className="grid grid-cols-3 gap-3 px-5 pb-5">
          {products.map((p, i) => (
            <ProductCard
              key={p.name}
              product={p}
              highlighted
              brandColor={sf.theme}
              delay={0.3 + i * 0.1}
            />
          ))}
        </div>

        {/* Powered by tag */}
        <div className="flex justify-end px-5 pb-4">
          <span className="flex items-center gap-1 text-[9px] text-white/15">
            <Store size={9} /> Powered by Apsara Home
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Concept Scene ─────────────────────────────────────────── */
function ConceptScene() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const steps = [0, 1, 2]
    let i = 0
    const t = setInterval(() => {
      i++
      if (i < steps.length) setStep(i)
      else clearInterval(t)
    }, 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl"
    >
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold tracking-widest text-amber-400 uppercase">
          The Concept
        </p>
        <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
          One Catalog. Many Brands.
        </h2>
        <p className="mt-3 text-sm text-white/35">
          AF Homes manages all products. Partners just choose what to show —
          under their own brand.
        </p>
      </div>

      <div className="flex items-stretch gap-4">
        {/* AF Homes catalog */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400">
              <Store size={16} className="text-black" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">AF Homes</p>
              <p className="text-[10px] text-white/30">
                Master Product Catalog
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {AF_PRODUCTS.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"
              >
                <Package size={12} className="shrink-0 text-amber-400" />
                <span className="flex-1 truncate text-[11px] text-white">
                  {p.name}
                </span>
                <span className="text-[10px] text-white/30">{p.price}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Arrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
          className="flex flex-col items-center justify-center gap-3 px-2"
        >
          <div className="flex flex-col items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: step >= 0 ? [0.3, 1, 0.3] : 0 }}
                transition={{ delay: i * 0.3, duration: 1.5, repeat: Infinity }}
                className="h-1 w-1 rounded-full bg-amber-400"
              />
            ))}
          </div>
          <div className="rounded-full border border-amber-400/30 bg-amber-400/10 p-2">
            <ArrowRightLeft size={16} className="text-amber-400" />
          </div>
          <p className="text-center text-[9px] font-medium tracking-wide text-amber-400/60 uppercase">
            Partner
            <br />
            Curates
          </p>
        </motion.div>

        {/* Partner stores */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-1 flex-col gap-3"
        >
          {STOREFRONTS.map((sf, i) => (
            <motion.div
              key={sf.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              className="relative flex-1 overflow-hidden rounded-2xl border p-4"
              style={{
                borderColor: `${sf.theme}30`,
                backgroundColor: `${sf.theme}08`,
              }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  background: `radial-gradient(ellipse at top right, ${sf.theme}, transparent 70%)`,
                }}
              />
              <div className="relative mb-3 flex items-center gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                  style={{ backgroundColor: sf.theme }}
                >
                  {sf.initial}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{sf.name}</p>
                  <p className="text-[9px] text-white/30">
                    http://localhost:3000/{sf.slug}
                  </p>
                </div>
              </div>
              <div className="relative flex gap-1.5">
                {sf.pickedProducts.map((pi) => (
                  <div
                    key={pi}
                    className="flex-1 truncate rounded-lg border px-2 py-1.5 text-center text-[9px] text-white/60"
                    style={{
                      borderColor: `${sf.theme}30`,
                      backgroundColor: `${sf.theme}15`,
                    }}
                  >
                    {AF_PRODUCTS[pi].name.split(" ")[0]}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="mt-6 flex items-center justify-center gap-2 text-xs text-white/25"
      >
        <Tag size={11} className="text-amber-400/50" />
        Same AF Homes products — displayed under each partner&apos;s unique
        brand identity
      </motion.div>
    </motion.div>
  )
}

/* ─── Stat card ─────────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ElementType
  label: string
  value: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
        <Icon size={14} className="text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-white">{value}</p>
        <p className="text-[10px] text-white/35">{label}</p>
      </div>
    </motion.div>
  )
}

/* ─── Nav dots ──────────────────────────────────────────────── */
function SceneNav({ scene, goTo }: { scene: Scene; goTo: (s: Scene) => void }) {
  return (
    <div className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
      {SCENES.map((s) => (
        <button
          key={s}
          onClick={() => goTo(s)}
          className={`rounded-full transition-all duration-300 ${scene === s ? "h-2 w-5 bg-amber-400" : "h-2 w-2 bg-white/20 hover:bg-white/50"}`}
        />
      ))}
    </div>
  )
}

/* ─── Main ──────────────────────────────────────────────────── */
export default function StorefrontDemo() {
  const [scene, setScene] = useState<Scene>("intro")
  const [sfIdx, setSfIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sceneIdx = SCENES.indexOf(scene)
  const sf = STOREFRONTS[sfIdx]

  const goTo = (s: Scene) => {
    if (timer.current) clearTimeout(timer.current)
    setScene(s)
    setPlaying(true)
  }

  // Spacebar to pause/play
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!playing) return
    timer.current = setTimeout(() => {
      const next = SCENES[sceneIdx + 1]
      if (next) setScene(next)
    }, DURATIONS[scene])
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [scene, playing, sceneIdx])

  useEffect(() => {
    if (scene !== "showcase") return
    const t = setInterval(
      () => setSfIdx((i) => (i + 1) % STOREFRONTS.length),
      4000
    )
    return () => clearInterval(t)
  }, [scene])

  const orbColor = scene === "showcase" ? sf.glow : "#b8952a33"

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050508] text-white">
      <Orbs color={orbColor} />

      {/* Grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <SceneNav scene={scene} goTo={goTo} />

      {!playing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-6 right-6 z-50 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/40 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Paused — press Space
        </motion.div>
      )}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {scene === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.7 }}
              className="max-w-2xl text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_60px_rgba(251,191,36,0.35)]"
              >
                <Store size={38} className="text-white" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs font-semibold tracking-[0.2em] text-amber-400/80 uppercase"
              >
                Apsara Home
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-3 mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-6xl leading-tight font-black text-transparent"
              >
                Partner Storefront
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xl text-white/40"
              >
                Your brand. Your store. Powered by Apsara Home.
              </motion.p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="mt-8 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
              />
            </motion.div>
          )}

          {/* Problem */}
          {scene === "problem" && (
            <motion.div
              key="problem"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7 }}
              className="max-w-3xl text-center"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-6 text-sm font-semibold tracking-widest text-amber-400 uppercase"
              >
                The Challenge
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl leading-tight font-black text-transparent"
              >
                Want to sell online
                <br />
                under your own brand?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mb-8 text-lg text-white/40"
              >
                Building your own store takes months and costs a fortune.
                <br />
                There&apos;s a better way.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-5 py-2.5 text-sm font-medium text-amber-300"
              >
                <Sparkles size={14} /> Apsara Home Partner Storefront solves
                this
              </motion.div>
            </motion.div>
          )}

          {/* Highlight */}
          {scene === "highlight" && <HighlightScene key="highlight" />}

          {/* Concept */}
          {scene === "concept" && <ConceptScene key="concept" />}

          {/* Showcase */}
          {scene === "showcase" && (
            <motion.div
              key="showcase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex w-full max-w-4xl flex-col items-center gap-8"
            >
              <div className="text-center">
                <p className="mb-3 text-xs font-semibold tracking-widest text-amber-400 uppercase">
                  Live Storefronts
                </p>
                <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-black text-transparent">
                  Same Products. Different Brands.
                </h2>
                <p className="mt-2 text-sm text-white/30">
                  AF Homes catalog — displayed under each partner&apos;s
                  identity.
                </p>
              </div>

              <div className="flex gap-2">
                {STOREFRONTS.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => setSfIdx(i)}
                    className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300"
                    style={
                      sfIdx === i
                        ? {
                            backgroundColor: s.theme,
                            borderColor: s.theme,
                            color: "white",
                          }
                        : {
                            backgroundColor: "transparent",
                            borderColor: "rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.4)",
                          }
                    }
                  >
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold"
                      style={{
                        backgroundColor:
                          sfIdx === i
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(255,255,255,0.05)",
                      }}
                    >
                      {s.initial}
                    </span>
                    {s.name}
                  </button>
                ))}
              </div>

              <div className="flex w-full items-start gap-6">
                <AnimatePresence mode="wait">
                  <BrowserMockup key={sfIdx} sf={sf} />
                </AnimatePresence>
                <motion.div
                  key={sfIdx + "stats"}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex min-w-[160px] flex-col gap-3"
                >
                  <p className="text-[10px] font-medium tracking-widest text-white/25 uppercase">
                    Partner Stats
                  </p>
                  <StatCard
                    icon={ShoppingBag}
                    label="Total Orders"
                    value={sf.stats.orders}
                    delay={0.1}
                  />
                  <StatCard
                    icon={Users}
                    label="Members"
                    value={sf.stats.members}
                    delay={0.2}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Revenue"
                    value={sf.stats.revenue}
                    delay={0.3}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Earnings */}
          {scene === "earnings" && (
            <motion.div
              key="earnings"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-3xl"
            >
              <div className="mb-10 text-center">
                <p className="mb-3 text-xs font-semibold tracking-widest text-amber-400 uppercase">
                  Partner Earnings
                </p>
                <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
                  Earn on Every Sale
                </h2>
                <p className="mt-3 text-sm text-white/35">
                  Every order delivered from your store earns you a commission —
                  automatically credited to your wallet.
                </p>
              </div>

              <div className="flex items-start gap-6">
                {/* Live feed */}
                <div className="flex flex-1 flex-col gap-3">
                  <p className="flex items-center gap-2 text-[10px] font-medium tracking-widest text-white/25 uppercase">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                    Live Commission Feed
                  </p>
                  {EARNINGS_FEED.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.18, duration: 0.4 }}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10">
                        <BadgeDollarSign
                          size={15}
                          className="text-emerald-400"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">
                          {item.product}
                        </p>
                        <p className="text-[10px] text-white/30">
                          {item.store} · {item.time}
                        </p>
                      </div>
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: i * 0.18 + 0.3,
                          type: "spring",
                          stiffness: 200,
                        }}
                        className="shrink-0 text-sm font-bold text-emerald-400"
                      >
                        +{item.amount}
                      </motion.span>
                    </motion.div>
                  ))}
                </div>

                {/* Summary card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex min-w-[180px] flex-col gap-3"
                >
                  <p className="text-[10px] font-medium tracking-widest text-white/25 uppercase">
                    This Month
                  </p>
                  <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-emerald-600/5 p-5">
                    <p className="mb-1 text-xs text-white/40">Total Earned</p>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="text-3xl font-black text-emerald-400"
                    >
                      ₱12,480
                    </motion.p>
                    <p className="mt-1 text-[10px] text-white/25">
                      248 delivered orders
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <p className="mb-2 text-xs text-white/40">
                      Commission Rate
                    </p>
                    <p className="text-lg font-bold text-white">Per Order</p>
                    <p className="mt-1 text-[11px] text-white/30">
                      Based on delivered orders from your storefront
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <p className="mb-2 text-xs text-white/40">
                      Payout Schedule
                    </p>
                    <p className="text-sm font-bold text-white">Weekly</p>
                    <p className="mt-1 text-[11px] text-white/30">
                      Every Friday to your registered bank account
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Benefits */}
          {scene === "benefits" && (
            <motion.div
              key="benefits"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-3xl"
            >
              <div className="mb-12 text-center">
                <p className="mb-3 text-xs font-semibold tracking-widest text-amber-400 uppercase">
                  Why Partner With Us
                </p>
                <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
                  Everything Included
                </h2>
                <p className="mt-3 text-sm text-white/30">
                  Focus on selling. We handle the rest.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {BENEFITS.map((b, i) => (
                  <motion.div
                    key={b.label}
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06]"
                  >
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(ellipse at top left,rgba(251,191,36,0.05) 0%,transparent 60%)",
                      }}
                    />
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                      <b.icon size={18} className="text-amber-400" />
                    </div>
                    <p className="mb-1 text-sm font-semibold text-white">
                      {b.label}
                    </p>
                    <p className="text-xs leading-relaxed text-white/35">
                      {b.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* How It Works */}
          {scene === "howItWorks" && (
            <motion.div
              key="how"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-2xl"
            >
              <div className="mb-12 text-center">
                <p className="mb-3 text-xs font-semibold tracking-widest text-amber-400 uppercase">
                  Simple Process
                </p>
                <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
                  How It Works
                </h2>
              </div>
              <div className="relative">
                <div className="absolute top-6 bottom-6 left-[23px] w-px bg-gradient-to-b from-amber-400/50 via-amber-400/20 to-transparent" />
                <div className="flex flex-col gap-4">
                  {STEPS.map((s, i) => (
                    <motion.div
                      key={s.n}
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.18, duration: 0.5 }}
                      className="flex items-start gap-5"
                    >
                      <div
                        className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xs font-black text-black shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                        style={{
                          background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                        }}
                      >
                        {s.n}
                      </div>
                      <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">
                            {s.label}
                          </p>
                          {i < STEPS.length - 1 ? (
                            <ChevronRight size={12} className="text-white/20" />
                          ) : (
                            <CheckCircle2
                              size={12}
                              className="text-emerald-400"
                            />
                          )}
                        </div>
                        <p className="text-xs leading-relaxed text-white/35">
                          {s.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* CTA */}
          {scene === "cta" && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 14 }}
                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/20 to-amber-600/10 shadow-[0_0_80px_rgba(251,191,36,0.2)]"
              >
                <Sparkles size={40} className="text-amber-400" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-6xl leading-tight font-black text-transparent"
              >
                Start Selling
                <br />
                Under Your Brand
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-10 text-lg text-white/40"
              >
                Join Apsara Home and launch your branded storefront — no
                inventory, no hassle.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap items-center justify-center gap-4"
              >
                <button className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-4 font-bold text-black shadow-[0_0_40px_rgba(251,191,36,0.3)] transition-all hover:from-amber-300 hover:to-amber-400 hover:shadow-[0_0_60px_rgba(251,191,36,0.5)]">
                  Become a Partner{" "}
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
                <button
                  onClick={() => goTo("intro")}
                  className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
                >
                  Watch Again
                </button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-10 flex items-center justify-center gap-6 text-xs text-white/25"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400/60" /> No
                  inventory needed
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400/60" />{" "}
                  Launch in days
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400/60" />{" "}
                  Full support included
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="fixed right-0 bottom-0 left-0 z-50">
        <div className="h-px bg-white/5">
          <motion.div
            key={scene}
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: DURATIONS[scene] / 1000, ease: "linear" }}
          />
        </div>
        <div className="flex justify-center pt-2 pb-3">
          <span className="text-[10px] tracking-[0.2em] text-white/15 uppercase">
            {scene === "intro" && "Introduction"}
            {scene === "problem" && "The Challenge"}
            {scene === "highlight" && "No Inventory. No Hassle."}
            {scene === "concept" && "The Concept"}
            {scene === "showcase" && "Live Showcase"}
            {scene === "earnings" && "Partner Earnings"}
            {scene === "benefits" && "Benefits"}
            {scene === "howItWorks" && "How It Works"}
            {scene === "cta" && "Get Started"}
          </span>
        </div>
      </div>
    </div>
  )
}
