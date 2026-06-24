"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Megaphone,
  Package,
  Pause,
  Play,
  ShoppingCart,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Truck,
  Upload,
} from "lucide-react"

/* ─── Data ──────────────────────────────────────────────────── */
const MERCHANT_STATS = {
  totalProducts: "1,248",
  pendingOrders: "34",
  deliveredThisMonth: "312",
  revenue: "₱2.4M",
  avgRating: "4.8",
  activeCategories: "12",
}

const RECENT_ORDERS = [
  {
    id: "#ORD-8821",
    product: "L-Shape Sofa Set",
    qty: 2,
    amount: "₱37,000",
    status: "Processing",
    color: "#f59e0b",
  },
  {
    id: "#ORD-8820",
    product: "Kolin Aircon 1.5HP",
    qty: 1,
    amount: "₱29,995",
    status: "Shipped",
    color: "#3b82f6",
  },
  {
    id: "#ORD-8819",
    product: "Dining Set 6-Seater",
    qty: 1,
    amount: "₱14,999",
    status: "Delivered",
    color: "#10b981",
  },
  {
    id: "#ORD-8818",
    product: "Nordic Wall Art",
    qty: 3,
    amount: "₱7,497",
    status: "Delivered",
    color: "#10b981",
  },
  {
    id: "#ORD-8817",
    product: "Velvet Accent Chair",
    qty: 2,
    amount: "₱17,598",
    status: "Processing",
    color: "#f59e0b",
  },
]

const PRODUCTS_LIST = [
  {
    name: "L-Shape Sofa Set",
    sku: "SOF-001",
    stock: 12,
    price: "₱18,500",
    cat: "Furniture",
    status: "Active",
  },
  {
    name: "Kolin Aircon 1.5HP",
    sku: "APP-031",
    stock: 8,
    price: "₱29,995",
    cat: "Appliances",
    status: "Active",
  },
  {
    name: "Dining Set 6-Seater",
    sku: "FUR-042",
    stock: 5,
    price: "₱14,999",
    cat: "Furniture",
    status: "Low Stock",
  },
  {
    name: "Nordic Wall Art",
    sku: "DEC-017",
    stock: 24,
    price: "₱2,499",
    cat: "Home Decor",
    status: "Active",
  },
  {
    name: 'Stand Fan 16"',
    sku: "APP-018",
    stock: 0,
    price: "₱1,499",
    cat: "Appliances",
    status: "Out of Stock",
  },
]

const MONTHLY_REVENUE = [
  { month: "Jan", value: 820 },
  { month: "Feb", value: 1100 },
  { month: "Mar", value: 960 },
  { month: "Apr", value: 1380 },
  { month: "May", value: 1650 },
  { month: "Jun", value: 1420 },
  { month: "Jul", value: 1890 },
  { month: "Aug", value: 2140 },
  { month: "Sep", value: 1980 },
  { month: "Oct", value: 2380 },
  { month: "Nov", value: 2100 },
  { month: "Dec", value: 2400 },
]

const FEATURES = [
  {
    icon: LayoutDashboard,
    label: "Live Dashboard",
    desc: "Real-time stats for orders, revenue, and products",
  },
  {
    icon: Package,
    label: "Product Management",
    desc: "Add, edit, and manage your entire catalog",
  },
  {
    icon: ShoppingCart,
    label: "Order Processing",
    desc: "View and fulfill orders as they come in",
  },
  {
    icon: BarChart3,
    label: "Analytics & Reports",
    desc: "Track revenue, deliveries, and performance",
  },
  {
    icon: Megaphone,
    label: "Mobile Ads",
    desc: "Promote products across the AF Home mobile app",
  },
  {
    icon: Upload,
    label: "CSV Import",
    desc: "Bulk-upload hundreds of products in seconds",
  },
]

const HOW_IT_WORKS = [
  {
    n: "01",
    label: "Register as Merchant",
    desc: "Apply and get approved as an AF Home merchant partner.",
  },
  {
    n: "02",
    label: "Upload Your Products",
    desc: "Add products manually or bulk-import via CSV.",
  },
  {
    n: "03",
    label: "Receive Orders",
    desc: "Get notified instantly when customers place orders.",
  },
  {
    n: "04",
    label: "Ship & Fulfill",
    desc: "Process, pack, and mark orders as shipped.",
  },
  {
    n: "05",
    label: "Get Paid",
    desc: "Revenue credited to your account after delivery confirmation.",
  },
]

const HIGHLIGHT_CARDS = [
  {
    rotate: -7,
    x: -300,
    y: -90,
    delay: 0.3,
    content: (
      <div className="w-48 rounded-2xl border border-white/10 bg-[#0d1117] p-4 shadow-2xl">
        <p className="mb-2 text-[10px] tracking-widest text-white/40 uppercase">
          New Order
        </p>
        <p className="text-sm font-bold text-white">L-Shape Sofa Set</p>
        <p className="mt-1 text-xl font-black text-sky-400">₱18,500</p>
        <p className="mt-1 text-[10px] text-white/25">AF Home · Just now</p>
      </div>
    ),
  },
  {
    rotate: 5,
    x: 295,
    y: -95,
    delay: 0.5,
    content: (
      <div className="w-44 rounded-2xl border border-white/10 bg-[#0d1117] p-4 shadow-2xl">
        <p className="mb-2 text-[10px] tracking-widest text-white/40 uppercase">
          This Month
        </p>
        <p className="text-2xl font-black text-sky-400">₱2.4M</p>
        <p className="mt-1 text-[10px] text-white/25">Total revenue</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-4/5 rounded-full bg-sky-400" />
        </div>
      </div>
    ),
  },
  {
    rotate: -4,
    x: -275,
    y: 105,
    delay: 0.7,
    content: (
      <div className="w-44 rounded-2xl border border-white/10 bg-[#0d1117] p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500">
            <Package size={13} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Catalog</p>
            <p className="text-[9px] text-white/30">1,248 products</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {["Furniture", "Appliances", "Decor"].map((c) => (
            <div
              key={c}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span className="text-[10px] text-white/50">{c}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    rotate: 6,
    x: 285,
    y: 95,
    delay: 0.9,
    content: (
      <div className="w-44 rounded-2xl border border-white/10 bg-[#0d1117] p-4 shadow-2xl">
        <p className="mb-2 text-[10px] tracking-widest text-white/40 uppercase">
          Orders Today
        </p>
        <div className="space-y-2">
          {["Processing", "Shipped", "Delivered"].map((s, i) => (
            <div key={s} className="flex items-center justify-between">
              <span className="text-[10px] text-white/50">{s}</span>
              <span className="text-xs font-bold text-white">
                {[8, 14, 21][i]}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-white/25">43 total orders</p>
      </div>
    ),
  },
]

/* ─── Scene types ───────────────────────────────────────────── */
const SCENES = [
  "intro",
  "challenge",
  "highlight",
  "dashboard",
  "products",
  "orders",
  "analytics",
  "features",
  "howItWorks",
  "cta",
] as const
type Scene = (typeof SCENES)[number]
const DURATIONS: Record<Scene, number> = {
  intro: 3500,
  challenge: 4500,
  highlight: 6000,
  dashboard: 8000,
  products: 9000,
  orders: 8000,
  analytics: 8500,
  features: 9000,
  howItWorks: 11000,
  cta: 99999,
}

/* ─── Orbs ──────────────────────────────────────────────────── */
function Orbs({ color }: { color: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 -left-40 h-[700px] w-[700px] rounded-full opacity-20 blur-[140px]"
        style={{ backgroundColor: color }}
      />
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute -right-40 -bottom-40 h-[600px] w-[600px] rounded-full opacity-15 blur-[140px]"
        style={{ backgroundColor: color }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#030609_100%)]" />
    </div>
  )
}

/* ─── Scene Nav ─────────────────────────────────────────────── */
function SceneNav({ scene, goTo }: { scene: Scene; goTo: (s: Scene) => void }) {
  return (
    <div className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
      {SCENES.map((s) => (
        <button
          key={s}
          onClick={() => goTo(s)}
          className={`rounded-full transition-all duration-300 ${scene === s ? "h-2 w-5 bg-sky-400" : "h-2 w-2 bg-white/20 hover:bg-white/50"}`}
        />
      ))}
    </div>
  )
}

function SceneControls({
  playing,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  onToggle,
}: {
  playing: boolean
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
  onToggle: () => void
}) {
  const buttonBase =
    "flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-md transition hover:border-sky-300/40 hover:bg-sky-400/15 hover:text-sky-100 disabled:pointer-events-none disabled:opacity-30"

  return (
    <div className="fixed right-4 bottom-14 z-50 flex items-center gap-2 sm:right-6">
      <button
        type="button"
        aria-label="Previous slide"
        title="Previous"
        onClick={onPrevious}
        disabled={!canPrevious}
        className={buttonBase}
      >
        <SkipBack size={18} />
      </button>
      <button
        type="button"
        aria-label={playing ? "Pause slideshow" : "Play slideshow"}
        title={playing ? "Pause" : "Play"}
        onClick={onToggle}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-300/30 bg-sky-400/15 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.18)] backdrop-blur-md transition hover:bg-sky-400/25"
      >
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button
        type="button"
        aria-label="Next slide"
        title="Next"
        onClick={onNext}
        disabled={!canNext}
        className={buttonBase}
      >
        <SkipForward size={18} />
      </button>
    </div>
  )
}

/* ─── Highlight Scene ───────────────────────────────────────── */
function HighlightScene() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.7 }}
      className="relative flex min-h-[500px] w-full max-w-4xl items-center justify-center"
    >
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
      <div className="relative z-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5 text-xs font-semibold tracking-[0.2em] text-sky-400 uppercase"
        >
          Merchant Dashboard
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
            One dashboard.
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
            Everything visible.
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
            className="text-6xl leading-none font-black text-sky-400"
          >
            Always in control.
          </motion.h1>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mx-auto mt-5 max-w-xs text-base leading-relaxed text-white/30"
        >
          Manage products, orders, and revenue from a single powerful merchant
          hub.
        </motion.p>
      </div>
    </motion.div>
  )
}

/* ─── Dashboard Scene ───────────────────────────────────────── */
function DashboardScene() {
  const stats = [
    {
      icon: Package,
      label: "Total Products",
      value: MERCHANT_STATS.totalProducts,
      color: "#38bdf8",
      bg: "rgba(56,189,248,0.08)",
    },
    {
      icon: Clock,
      label: "Pending Orders",
      value: MERCHANT_STATS.pendingOrders,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
    },
    {
      icon: Truck,
      label: "Delivered This Month",
      value: MERCHANT_STATS.deliveredThisMonth,
      color: "#10b981",
      bg: "rgba(16,185,129,0.08)",
    },
    {
      icon: TrendingUp,
      label: "Monthly Revenue",
      value: MERCHANT_STATS.revenue,
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.08)",
    },
    {
      icon: Star,
      label: "Avg Rating",
      value: MERCHANT_STATS.avgRating,
      color: "#fb7185",
      bg: "rgba(251,113,133,0.08)",
    },
    {
      icon: Tag,
      label: "Active Categories",
      value: MERCHANT_STATS.activeCategories,
      color: "#34d399",
      bg: "rgba(52,211,153,0.08)",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl"
    >
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold tracking-widest text-sky-400 uppercase">
          Dashboard Overview
        </p>
        <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
          Your Business at a Glance
        </h2>
        <p className="mt-3 text-sm text-white/35">
          Real-time metrics across your entire merchant operation — all in one
          place.
        </p>
      </div>

      {/* Mock dashboard chrome */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
        style={{ background: "rgba(13,17,23,0.9)" }}
      >
        {/* Chrome bar */}
        <div
          className="flex items-center gap-3 border-b border-white/5 px-4 py-3"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
            <div className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 font-mono text-xs text-white/25">
            <div className="h-2 w-2 rounded-full bg-sky-400/60" />
            afhome.ph/merchant/dashboard
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-400/10 px-2.5 py-1">
            <Bell size={10} className="text-sky-400" />
            <span className="text-[10px] font-semibold text-sky-400">
              3 alerts
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 p-5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
              className="rounded-xl border border-white/5 p-4"
              style={{ backgroundColor: s.bg }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}20` }}
                >
                  <s.icon size={15} style={{ color: s.color }} />
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.6 + i * 0.1,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="flex items-center gap-1"
                >
                  <TrendingUp size={9} style={{ color: s.color }} />
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: s.color }}
                  >
                    +12%
                  </span>
                </motion.div>
              </div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="mt-1 text-[10px] text-white/35">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Notification bar */}
        <div className="flex gap-2 px-5 pb-4">
          {[
            {
              text: "5 orders awaiting fulfillment",
              color: "#f59e0b",
              icon: Clock,
            },
            {
              text: "Kolin Aircon low stock: 2 left",
              color: "#fb7185",
              icon: AlertCircle,
            },
          ].map((n) => (
            <motion.div
              key={n.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.4 }}
              className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2"
              style={{
                backgroundColor: `${n.color}08`,
                borderColor: `${n.color}25`,
              }}
            >
              <n.icon size={11} style={{ color: n.color }} />
              <span className="text-[10px] text-white/50">{n.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Products Scene ────────────────────────────────────────── */
function ProductsScene() {
  const [activeRow, setActiveRow] = useState<number | null>(null)

  useEffect(() => {
    const seq = [0, 1, 2, 3, 4, null, 2]
    let i = 0
    const t = setInterval(() => {
      setActiveRow(seq[i] ?? null)
      i++
      if (i >= seq.length) clearInterval(t)
    }, 1100)
    return () => clearInterval(t)
  }, [])

  const statusColors: Record<string, string> = {
    Active: "#10b981",
    "Low Stock": "#f59e0b",
    "Out of Stock": "#fb7185",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl"
    >
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold tracking-widest text-sky-400 uppercase">
          Product Management
        </p>
        <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
          Your Full Catalog
        </h2>
        <p className="mt-3 text-sm text-white/35">
          Add, update, and track every product in your inventory — with
          real-time stock visibility.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="overflow-hidden rounded-2xl border border-white/10"
        style={{ background: "rgba(13,17,23,0.9)" }}
      >
        {/* Table header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10">
              <Package size={15} className="text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Products</p>
              <p className="text-[10px] text-white/30">1,248 total items</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[10px] text-white/30">
              <Upload size={10} /> Import CSV
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-[10px] font-semibold text-sky-400">
              + Add Product
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div
          className="grid border-b border-white/5 px-5 py-2 text-[9px] font-bold tracking-[0.16em] text-white/25 uppercase"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 0.8fr" }}
        >
          <span>Product</span>
          <span>SKU</span>
          <span>Stock</span>
          <span>Price</span>
          <span>Category</span>
          <span>Status</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/[0.04]">
          {PRODUCTS_LIST.map((p, i) => (
            <motion.div
              key={p.sku}
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: 1,
                x: 0,
                backgroundColor:
                  activeRow === i ? "rgba(56,189,248,0.06)" : "transparent",
              }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.35 }}
              className="grid cursor-pointer items-center px-5 py-3"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 0.8fr" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/5">
                  <Box size={13} className="text-white/30" />
                </div>
                <span className="text-xs font-medium text-white">{p.name}</span>
              </div>
              <span className="font-mono text-[11px] text-white/30">
                {p.sku}
              </span>
              <span
                className={`text-xs font-semibold ${p.stock === 0 ? "text-rose-400" : p.stock < 6 ? "text-amber-400" : "text-white/70"}`}
              >
                {p.stock === 0 ? "—" : p.stock}
              </span>
              <span className="text-xs text-white/70">{p.price}</span>
              <span className="text-[11px] text-white/40">{p.cat}</span>
              <span
                className="w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  color: statusColors[p.status],
                  backgroundColor: `${statusColors[p.status]}15`,
                }}
              >
                {p.status}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Orders Scene ──────────────────────────────────────────── */
function OrdersScene() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl"
    >
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold tracking-widest text-sky-400 uppercase">
          Order Management
        </p>
        <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
          Every Order, Every Status
        </h2>
        <p className="mt-3 text-sm text-white/35">
          Track from placement to delivery — in real time.
        </p>
      </div>

      <div className="flex items-start gap-5">
        {/* Order list */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 overflow-hidden rounded-2xl border border-white/10"
          style={{ background: "rgba(13,17,23,0.9)" }}
        >
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10">
                <ClipboardList size={15} className="text-sky-400" />
              </div>
              <p className="text-sm font-semibold text-white">Recent Orders</p>
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/30">
              34 pending
            </span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {RECENT_ORDERS.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.12, duration: 0.4 }}
                className="flex items-center gap-4 px-5 py-3"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${o.color}15` }}
                >
                  <ShoppingCart size={13} style={{ color: o.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">
                    {o.product}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {o.id} · Qty {o.qty}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-white">{o.amount}</p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                    style={{ color: o.color, backgroundColor: `${o.color}15` }}
                  >
                    {o.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Status summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex min-w-[175px] flex-col gap-3"
        >
          <p className="text-[10px] font-medium tracking-widest text-white/25 uppercase">
            Order Breakdown
          </p>
          {[
            { label: "Processing", count: 8, color: "#f59e0b", pct: 19 },
            { label: "Shipped", count: 14, color: "#38bdf8", pct: 33 },
            { label: "Delivered", count: 21, color: "#10b981", pct: 49 },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.12 }}
              className="rounded-xl border border-white/5 p-4"
              style={{ backgroundColor: `${s.color}08` }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  {s.label}
                </span>
                <span className="text-lg font-black text-white">{s.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.pct}%` }}
                  transition={{
                    delay: 0.8 + i * 0.12,
                    duration: 0.7,
                    ease: "easeOut",
                  }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: s.color }}
                />
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-4"
          >
            <p className="mb-1 text-[10px] text-white/40">Fulfillment Rate</p>
            <p className="text-2xl font-black text-sky-400">97.4%</p>
            <p className="mt-0.5 text-[10px] text-white/25">Last 30 days</p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ─── Analytics Scene ───────────────────────────────────────── */
function AnalyticsScene() {
  const max = Math.max(...MONTHLY_REVENUE.map((r) => r.value))
  const chartWidth = 640
  const chartHeight = 220
  const paddingX = 42
  const paddingY = 24
  const innerWidth = chartWidth - paddingX * 2
  const innerHeight = chartHeight - paddingY * 2
  const step = innerWidth / (MONTHLY_REVENUE.length - 1)
  const points = MONTHLY_REVENUE.map((r, i) => ({
    ...r,
    x: paddingX + i * step,
    y: paddingY + innerHeight - (r.value / max) * innerHeight,
  }))
  const linePath = points
    .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
  const barWidth = Math.max(16, step * 0.46)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl"
    >
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold tracking-widest text-sky-400 uppercase">
          Analytics & Reports
        </p>
        <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
          Data-Driven Selling
        </h2>
        <p className="mt-3 text-sm text-white/35">
          Track revenue trends, top products, and delivery performance — all in
          one view.
        </p>
      </div>

      <div className="flex items-start gap-5">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex-1 rounded-2xl border border-white/10 p-5"
          style={{ background: "rgba(13,17,23,0.9)" }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                Monthly Revenue
              </p>
              <p className="mt-0.5 text-[10px] text-white/30">
                Jan – Dec 2024 · in thousands ₱
              </p>
            </div>
            <div className="rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[10px] font-semibold text-sky-400">
              ₱2.4M total
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/20 px-2 pt-3 pb-1">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Monthly revenue trend graph"
              className="h-52 w-full"
            >
              <defs>
                <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="revenueBar" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.55" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const y = paddingY + innerHeight - tick * innerHeight
                return (
                  <g key={tick}>
                    <line
                      x1={paddingX}
                      x2={chartWidth - paddingX}
                      y1={y}
                      y2={y}
                      stroke="rgba(255,255,255,0.08)"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-white/25 text-[10px]"
                    >
                      {Math.round((max * tick) / 100) / 10}M
                    </text>
                  </g>
                )
              })}

              {points.map((point, i) => {
                const barHeight = chartHeight - paddingY - point.y
                return (
                  <motion.rect
                    key={point.month}
                    x={point.x - barWidth / 2}
                    y={chartHeight - paddingY}
                    width={barWidth}
                    height={0}
                    rx={5}
                    initial={{ y: chartHeight - paddingY, height: 0 }}
                    animate={{ y: point.y, height: barHeight }}
                    transition={{
                      delay: 0.42 + i * 0.05,
                      duration: 0.55,
                      ease: "easeOut",
                    }}
                    fill={
                      point.month === "Dec"
                        ? "url(#revenueBar)"
                        : "rgba(56,189,248,0.28)"
                    }
                  />
                )
              })}

              <motion.path
                d={areaPath}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.85, duration: 0.5 }}
                fill="url(#revenueArea)"
              />
              <motion.path
                d={linePath}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.75, duration: 1, ease: "easeOut" }}
                fill="none"
                stroke="#38bdf8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />
              {points.map((point, i) => (
                <g key={`${point.month}-label`}>
                  <motion.circle
                    cx={point.x}
                    cy={point.y}
                    r={0}
                    animate={{ r: point.month === "Dec" ? 6 : 4 }}
                    transition={{ delay: 1 + i * 0.04, duration: 0.25 }}
                    fill={point.month === "Dec" ? "#e0f2fe" : "#38bdf8"}
                    stroke="#082f49"
                    strokeWidth="2"
                  />
                  <text
                    x={point.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    className="fill-white/30 text-[10px] font-semibold"
                  >
                    {point.month}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </motion.div>

        {/* Top products + stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex min-w-[185px] flex-col gap-3"
        >
          <p className="text-[10px] font-medium tracking-widest text-white/25 uppercase">
            Top Performers
          </p>
          {[
            { name: "L-Shape Sofa", revenue: "₱342K", bar: 88 },
            { name: "Kolin Aircon", revenue: "₱298K", bar: 76 },
            { name: "Dining Set", revenue: "₱187K", bar: 48 },
          ].map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.12 }}
              className="rounded-xl border border-white/5 bg-white/[0.03] p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-white">
                  {p.name}
                </span>
                <span className="text-[11px] font-bold text-sky-400">
                  {p.revenue}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${p.bar}%` }}
                  transition={{
                    delay: 0.8 + i * 0.1,
                    duration: 0.7,
                    ease: "easeOut",
                  }}
                  className="h-full rounded-full bg-sky-400"
                />
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-1 grid grid-cols-2 gap-2"
          >
            {[
              { label: "Avg. Order", value: "₱7,680" },
              { label: "Return Rate", value: "1.2%" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-3"
              >
                <p className="mb-1 text-[9px] text-white/30">{s.label}</p>
                <p className="text-sm font-bold text-white">{s.value}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ─── Features Scene ────────────────────────────────────────── */
function FeaturesScene() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-3xl"
    >
      <div className="mb-12 text-center">
        <p className="mb-3 text-xs font-semibold tracking-widest text-sky-400 uppercase">
          Platform Features
        </p>
        <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
          Built for Merchants
        </h2>
        <p className="mt-3 text-sm text-white/30">
          Everything you need to run your business through AF Home.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all duration-300 hover:border-sky-400/20 hover:bg-white/[0.06]"
          >
            <div
              className="absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(ellipse at top left,rgba(56,189,248,0.06) 0%,transparent 60%)",
              }}
            />
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10">
              <f.icon size={18} className="text-sky-400" />
            </div>
            <p className="mb-1 text-sm font-semibold text-white">{f.label}</p>
            <p className="text-xs leading-relaxed text-white/35">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── How It Works Scene ────────────────────────────────────── */
function HowItWorksScene() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-2xl"
    >
      <div className="mb-12 text-center">
        <p className="mb-3 text-xs font-semibold tracking-widest text-sky-400 uppercase">
          Merchant Onboarding
        </p>
        <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black text-transparent">
          Getting Started
        </h2>
      </div>
      <div className="relative">
        <div className="absolute top-6 bottom-6 left-[23px] w-px bg-gradient-to-b from-sky-400/50 via-sky-400/20 to-transparent" />
        <div className="flex flex-col gap-4">
          {HOW_IT_WORKS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.18, duration: 0.5 }}
              className="flex items-start gap-5"
            >
              <div
                className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xs font-black text-white shadow-[0_0_20px_rgba(56,189,248,0.25)]"
                style={{
                  background: "linear-gradient(135deg,#38bdf8,#0ea5e9)",
                }}
              >
                {s.n}
              </div>
              <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4">
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{s.label}</p>
                  {i < HOW_IT_WORKS.length - 1 ? (
                    <ChevronRight size={12} className="text-white/20" />
                  ) : (
                    <CheckCircle2 size={12} className="text-sky-400" />
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
  )
}

/* ─── Main Component ────────────────────────────────────────── */
export default function SupplierDemo() {
  const [scene, setScene] = useState<Scene>("intro")
  const [playing, setPlaying] = useState(true)
  const [progressPct, setProgressPct] = useState(0)
  const frame = useRef<number | null>(null)
  const elapsedBeforePause = useRef(0)
  const progressStartedAt = useRef<number | null>(null)
  const progressScene = useRef<Scene>("intro")
  const sceneIdx = SCENES.indexOf(scene)

  const stopProgressFrame = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [])

  const resetProgress = useCallback((nextScene: Scene) => {
    stopProgressFrame()
    elapsedBeforePause.current = 0
    progressStartedAt.current = null
    progressScene.current = nextScene
    setProgressPct(0)
  }, [stopProgressFrame])

  const goTo = (s: Scene) => {
    resetProgress(s)
    setScene(s)
    setPlaying(true)
  }

  const goPrevious = () => {
    const previous = SCENES[sceneIdx - 1]
    if (previous) {
      resetProgress(previous)
      setScene(previous)
      setPlaying(true)
    }
  }

  const goNext = () => {
    const next = SCENES[sceneIdx + 1]
    if (next) {
      resetProgress(next)
      setScene(next)
      setPlaying(true)
    }
  }

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
    stopProgressFrame()

    if (progressScene.current !== scene) {
      elapsedBeforePause.current = 0
      progressStartedAt.current = null
      progressScene.current = scene
      setProgressPct(0)
    }

    if (!playing) {
      progressStartedAt.current = null
      return
    }

    progressStartedAt.current = performance.now()
    const duration = DURATIONS[scene]

    const tick = (now: number) => {
      const startedAt = progressStartedAt.current ?? now
      const elapsed = elapsedBeforePause.current + now - startedAt
      const nextProgress = Math.min(100, (elapsed / duration) * 100)

      setProgressPct(nextProgress)

      if (elapsed >= duration) {
        const next = SCENES[sceneIdx + 1]
        if (next) {
          resetProgress(next)
          setScene(next)
        } else {
          setPlaying(false)
        }
        return
      }

      frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)

    return () => {
      stopProgressFrame()
      if (progressStartedAt.current !== null) {
        elapsedBeforePause.current +=
          performance.now() - progressStartedAt.current
        progressStartedAt.current = null
      }
    }
  }, [scene, playing, sceneIdx, resetProgress, stopProgressFrame])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030609] text-white">
      <Orbs color="#0ea5e955" />

      {/* Subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <SceneNav scene={scene} goTo={goTo} />
      <SceneControls
        playing={playing}
        canPrevious={sceneIdx > 0}
        canNext={sceneIdx < SCENES.length - 1}
        onPrevious={goPrevious}
        onNext={goNext}
        onToggle={() => setPlaying((current) => !current)}
      />

      {!playing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-6 right-6 z-50 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/40 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
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
                className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_60px_rgba(56,189,248,0.35)]"
              >
                <LayoutDashboard size={38} className="text-white" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs font-semibold tracking-[0.2em] text-sky-400/80 uppercase"
              >
                AF Home
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-3 mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-6xl leading-tight font-black text-transparent"
              >
                Merchant Dashboard
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xl text-white/40"
              >
                Manage. Sell. Grow. Powered by AF Home.
              </motion.p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="mt-8 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent"
              />
            </motion.div>
          )}

          {/* Challenge */}
          {scene === "challenge" && (
            <motion.div
              key="challenge"
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
                className="mb-6 text-sm font-semibold tracking-widest text-sky-400 uppercase"
              >
                The Problem
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl leading-tight font-black text-transparent"
              >
                Managing a product
                <br />
                catalog shouldn&apos;t be chaos.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mb-8 text-lg text-white/40"
              >
                Scattered spreadsheets, missed orders, no visibility on
                inventory.
                <br />
                There&apos;s a better way.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-5 py-2.5 text-sm font-medium text-sky-300"
              >
                <Sparkles size={14} /> AF Home Merchant Dashboard solves this
              </motion.div>
            </motion.div>
          )}

          {/* Highlight */}
          {scene === "highlight" && <HighlightScene key="highlight" />}

          {/* Dashboard */}
          {scene === "dashboard" && <DashboardScene key="dashboard" />}

          {/* Products */}
          {scene === "products" && <ProductsScene key="products" />}

          {/* Orders */}
          {scene === "orders" && <OrdersScene key="orders" />}

          {/* Analytics */}
          {scene === "analytics" && <AnalyticsScene key="analytics" />}

          {/* Features */}
          {scene === "features" && <FeaturesScene key="features" />}

          {/* How It Works */}
          {scene === "howItWorks" && <HowItWorksScene key="howItWorks" />}

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
                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-400/20 to-blue-600/10 shadow-[0_0_80px_rgba(56,189,248,0.2)]"
              >
                <Building2 size={40} className="text-sky-400" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-6xl leading-tight font-black text-transparent"
              >
                Start Selling
                <br />
                on AF Home
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-10 text-lg text-white/40"
              >
                Join early merchant partners preparing to manage their business
                through the AF Home platform.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap items-center justify-center gap-4"
              >
                <button className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 px-8 py-4 font-bold text-white shadow-[0_0_40px_rgba(56,189,248,0.3)] transition-all hover:from-sky-300 hover:to-blue-400 hover:shadow-[0_0_60px_rgba(56,189,248,0.5)]">
                  Register as Merchant{" "}
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
                  <CheckCircle2 size={12} className="text-sky-400/60" /> Full
                  inventory control
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-sky-400/60" />{" "}
                  Real-time order tracking
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-sky-400/60" />{" "}
                  Built-in analytics
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="fixed right-0 bottom-0 left-0 z-50">
        <div className="h-px bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-blue-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-center pt-2 pb-3">
          <span className="text-[10px] tracking-[0.2em] text-white/15 uppercase">
            {scene === "intro" && "Introduction"}
            {scene === "challenge" && "The Problem"}
            {scene === "highlight" && "One Dashboard. Everything."}
            {scene === "dashboard" && "Dashboard Overview"}
            {scene === "products" && "Product Management"}
            {scene === "orders" && "Order Management"}
            {scene === "analytics" && "Analytics & Reports"}
            {scene === "features" && "Platform Features"}
            {scene === "howItWorks" && "Getting Started"}
            {scene === "cta" && "Join as Merchant"}
          </span>
        </div>
      </div>
    </div>
  )
}
