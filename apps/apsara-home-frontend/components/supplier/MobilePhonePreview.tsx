"use client"

import { useRef } from "react"
import {
  BadgeCheck,
  ChevronLeft,
  Copy,
  Heart,
  MoreHorizontal,
  Search,
  Star,
  Tag,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react"

// Palette mirrored from the mobile app (src/constants/colors.ts)
const C = {
  sky: "#0ea5e9",
  skyDark: "#0284c7",
  text: "#0f172a",
  textSecondary: "#334155",
  white: "#ffffff",
  containerBg: "#f5f5f5",
  cardBorder: "#e2e8f0",
  divider: "#eef2f7",
}

const VOUCHERS = [
  { id: 1, discount: "30%", description: "Discount on all products", code: "SAVE30", minSpend: "₱500" },
  { id: 2, discount: "₱200", description: "Off on purchases", code: "BRAND200", minSpend: "₱1000" },
  { id: 3, discount: "25%", description: "Special discount", code: "SPECIAL25", minSpend: "₱750" },
]

const FEATURED = [
  { id: 1, name: "Modern Fabric Sofa", price: 12999, original: 15999, gradient: "from-amber-200 to-orange-300" },
  { id: 2, name: "Oak Dining Table", price: 8499, original: 9999, gradient: "from-emerald-200 to-teal-300" },
  { id: 3, name: "Velvet Accent Chair", price: 4299, original: 5500, gradient: "from-rose-200 to-pink-300" },
]

const BEST = [
  { id: 4, name: "Minimalist Bookshelf", price: 3999, original: 4999, gradient: "from-sky-200 to-blue-300" },
  { id: 5, name: "Linen Bed Frame", price: 15999, original: 18999, gradient: "from-violet-200 to-purple-300" },
  { id: 6, name: "Rattan Lounge Set", price: 22999, original: 27999, gradient: "from-lime-200 to-green-300" },
]

const TABS = ["Home", "Products", "Categories"] as const

/**
 * Scroll container that feels like a touch device: no visible scrollbar and
 * click-and-drag (mouse) panning along one axis.
 */
function DragScroll({
  children,
  axis = "y",
  className = "",
}: {
  children: React.ReactNode
  axis?: "x" | "y"
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, start: 0, scroll: 0 })

  const onDown = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    drag.current.active = true
    drag.current.start = axis === "x" ? e.pageX : e.pageY
    drag.current.scroll = axis === "x" ? el.scrollLeft : el.scrollTop
  }

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el || !drag.current.active) return
    e.preventDefault()
    const delta = (axis === "x" ? e.pageX : e.pageY) - drag.current.start
    if (axis === "x") el.scrollLeft = drag.current.scroll - delta
    else el.scrollTop = drag.current.scroll - delta
  }

  const stop = () => {
    drag.current.active = false
  }

  return (
    <div
      ref={ref}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={stop}
      onMouseLeave={stop}
      className={`mp-noscroll cursor-grab select-none active:cursor-grabbing ${
        axis === "x" ? "overflow-x-auto" : "overflow-y-auto"
      } ${className}`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {children}
    </div>
  )
}

function ProductCard({
  name,
  price,
  original,
  gradient,
}: {
  name: string
  price: number
  original: number
  gradient: string
}) {
  const discountPct = Math.round(((original - price) / original) * 100)

  return (
    <div
      className="w-[108px] shrink-0 overflow-hidden rounded-lg border bg-[#f8f9fa]"
      style={{ borderColor: C.cardBorder }}
    >
      {/* Image */}
      <div className={`relative h-[88px] w-full bg-gradient-to-br ${gradient}`}>
        {/* Discount ribbon (top-left) */}
        <div
          className="absolute left-0 top-0 flex items-center gap-0.5 rounded-br-lg px-1 py-0.5"
          style={{ backgroundColor: C.sky, opacity: 0.92 }}
        >
          <Tag className="h-2 w-2 text-white" strokeWidth={2.5} />
          <span className="text-[6px] font-bold text-white">Enjoy {discountPct}% OFF</span>
        </div>
        {/* Wishlist (top-right) */}
        <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/40">
          <Heart className="h-2.5 w-2.5 text-white" />
        </div>
      </div>

      <div className="h-px w-full" style={{ backgroundColor: C.cardBorder }} />

      {/* Info */}
      <div className="px-1.5 py-1.5">
        <p className="truncate text-[8px] font-semibold" style={{ color: C.text }}>
          {name}
        </p>

        {/* Badges row */}
        <div className="mt-1 flex gap-1">
          <span
            className="flex items-center gap-0.5 rounded px-1 py-0.5"
            style={{ background: `linear-gradient(135deg, ${C.sky}, ${C.skyDark})` }}
          >
            <TrendingUp className="h-1.5 w-1.5 text-white" strokeWidth={2.5} />
            <span className="text-[5px] font-bold text-white">PV 12</span>
          </span>
          <span
            className="flex items-center gap-0.5 rounded px-1 py-0.5"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
          >
            <Tag className="h-1.5 w-1.5 text-white" strokeWidth={2.5} />
            <span className="text-[5px] font-bold text-white">
              Save ₱{(original - price).toLocaleString()}
            </span>
          </span>
        </div>

        {/* Price */}
        <div className="mt-1 flex items-center gap-1">
          <span className="text-[9px] font-extrabold" style={{ color: C.sky }}>
            ₱{price.toLocaleString()}
          </span>
          <span className="text-[7px] line-through" style={{ color: C.textSecondary }}>
            ₱{original.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="mb-2 overflow-hidden rounded-lg border bg-white"
      style={{ borderColor: C.cardBorder }}
    >
      <div
        className="flex items-center justify-between border-b px-2 py-1.5"
        style={{ borderColor: C.divider }}
      >
        <p className="text-[10px] font-extrabold" style={{ color: C.text }}>
          {title}
        </p>
        <span className="text-[8px] font-bold" style={{ color: C.sky }}>
          See More
        </span>
      </div>
      <DragScroll axis="x" className="flex gap-1.5 p-1.5">
        {children}
      </DragScroll>
    </div>
  )
}

interface MobilePhonePreviewProps {
  brandName?: string
  brandImage?: string | null
}

export default function MobilePhonePreview({
  brandName = "Your Brand",
  brandImage = null,
}: MobilePhonePreviewProps) {
  const brandInitial = brandName.trim().charAt(0).toUpperCase() || "?"

  return (
    <div className="sticky top-6">
      <style>{`.mp-noscroll::-webkit-scrollbar{display:none}`}</style>
      <div className="rounded-lg border border-slate-200/80 bg-white/50 p-4 dark:border-slate-700/50 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
          Preview
        </h2>

        <div className="flex justify-center">
          <div className="w-full max-w-xs">
            {/* Phone Bezel */}
            <div
              className="relative overflow-hidden rounded-[2rem] bg-black"
              style={{
                aspectRatio: "9/19.5",
                boxShadow: "0 0 0 11px #1f2937, 0 0 0 12px #000",
              }}
            >
              {/* Screen */}
              <div
                className="relative flex h-full w-full flex-col overflow-hidden"
                style={{ backgroundColor: C.containerBg }}
              >
                {/* Status bar */}
                <div
                  className="flex items-center justify-between px-3 pt-1.5 pb-1 text-[9px] font-semibold"
                  style={{ color: C.text }}
                >
                  <span>9:41</span>
                  <div className="flex items-center gap-1 text-[8px]">
                    <span>📶</span>
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Notch */}
                <div className="absolute left-1/2 top-1 z-20 h-3.5 w-16 -translate-x-1/2 rounded-b-2xl bg-black" />

                {/* ── Brand store header (white) ── */}
                <div className="border-b bg-white" style={{ borderColor: C.cardBorder }}>
                  {/* Search row */}
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <ChevronLeft className="h-4 w-4 shrink-0" style={{ color: C.text }} />
                    <div
                      className="flex h-6 flex-1 items-center gap-1 rounded-lg px-2"
                      style={{ backgroundColor: "#f1f5f9" }}
                    >
                      <Search className="h-2.5 w-2.5 shrink-0" style={{ color: C.textSecondary }} />
                      <span className="truncate text-[8px]" style={{ color: C.textSecondary }}>
                        Search in {brandName}
                      </span>
                    </div>
                    <MoreHorizontal className="h-4 w-4 shrink-0" style={{ color: C.text }} />
                  </div>

                  {/* Brand identity row */}
                  <div className="flex items-center gap-2 px-3 pb-2 pt-1">
                    {/* Logo */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white"
                      style={{ borderColor: C.cardBorder }}
                    >
                      {brandImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brandImage} alt={brandName} className="h-full w-full object-contain" />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-[12px] font-extrabold text-white"
                          style={{ backgroundColor: C.sky }}
                        >
                          {brandInitial}
                        </div>
                      )}
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-0.5">
                        <span
                          className="truncate text-[12px] font-extrabold tracking-tight"
                          style={{ color: C.text }}
                        >
                          {brandName}
                        </span>
                        <BadgeCheck className="h-3 w-3 shrink-0" style={{ color: C.sky }} fill={C.sky} stroke="#fff" />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <Star className="h-2.5 w-2.5" style={{ color: "#fbbf24" }} fill="#fbbf24" />
                        <span className="text-[8px] font-semibold" style={{ color: C.text }}>
                          4.8
                        </span>
                        <span className="text-[8px]" style={{ color: C.textSecondary }}>
                          •
                        </span>
                        <Users className="h-2.5 w-2.5" style={{ color: C.textSecondary }} />
                        <span className="text-[8px] font-semibold" style={{ color: C.textSecondary }}>
                          12.5K followers
                        </span>
                      </div>
                    </div>

                    {/* Follow */}
                    <button
                      className="flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1"
                      style={{ backgroundColor: C.sky }}
                    >
                      <Heart className="h-2.5 w-2.5 text-white" />
                      <span className="text-[8px] font-bold text-white">Follow</span>
                    </button>
                  </div>

                  {/* Tab bar */}
                  <div className="flex items-center px-2">
                    {TABS.map((tab, i) => (
                      <div key={tab} className="relative flex flex-1 items-center justify-center py-1.5">
                        <span
                          className="text-[9px]"
                          style={{
                            color: i === 0 ? C.sky : C.textSecondary,
                            fontWeight: i === 0 ? 700 : 600,
                          }}
                        >
                          {tab}
                        </span>
                        {i === 0 && (
                          <span
                            className="absolute bottom-0 h-0.5 w-[70%] rounded-full"
                            style={{ backgroundColor: C.sky }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Scrollable content (drag to scroll, mobile feel) ── */}
                <DragScroll axis="y" className="flex-1 p-2">
                  {/* Voucher section */}
                  <div
                    className="mb-2 overflow-hidden rounded-lg border bg-white"
                    style={{ borderColor: C.cardBorder }}
                  >
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <div>
                        <p className="text-[10px] font-bold" style={{ color: C.text }}>
                          Special Offers
                        </p>
                        <p className="text-[7px]" style={{ color: C.textSecondary }}>
                          Check out available vouchers
                        </p>
                      </div>
                      <Ticket className="h-4 w-4" style={{ color: C.sky }} />
                    </div>

                    <DragScroll axis="x" className="flex gap-1.5 px-2 pb-2">
                      {VOUCHERS.map((v) => (
                        <div
                          key={v.id}
                          className="flex w-[140px] shrink-0 overflow-hidden rounded-lg border py-1.5"
                          style={{ borderColor: C.sky, backgroundColor: "#f9fafb" }}
                        >
                          <div className="flex items-center justify-center px-2">
                            <div className="text-center">
                              <p className="text-[12px] font-extrabold" style={{ color: C.sky }}>
                                {v.discount}
                              </p>
                              <p className="text-[7px] font-bold" style={{ color: C.sky }}>
                                OFF
                              </p>
                            </div>
                          </div>
                          <div className="my-1 w-px" style={{ backgroundColor: C.sky, opacity: 0.3 }} />
                          <div className="flex flex-1 flex-col justify-center px-1.5">
                            <p className="truncate text-[8px] font-semibold" style={{ color: C.text }}>
                              {v.description}
                            </p>
                            <p className="text-[7px] font-semibold" style={{ color: C.textSecondary }}>
                              {v.code}
                            </p>
                            <p className="text-[6px]" style={{ color: C.textSecondary }}>
                              Min. {v.minSpend}
                            </p>
                            <div
                              className="mt-1 flex items-center justify-center gap-0.5 rounded py-0.5"
                              style={{ backgroundColor: "#e0f2fe" }}
                            >
                              <Copy className="h-2 w-2" style={{ color: C.sky }} />
                              <span className="text-[7px] font-semibold" style={{ color: C.sky }}>
                                Copy
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </DragScroll>
                  </div>

                  {/* Featured products */}
                  <SectionCard title="Featured Products">
                    {FEATURED.map((p) => (
                      <ProductCard key={p.id} {...p} />
                    ))}
                  </SectionCard>

                  {/* Banner carousel */}
                  <div className="relative mb-2 h-20 overflow-hidden rounded-lg">
                    <div className="h-full w-full bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-400" />
                    <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
                      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: C.sky }} />
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                    </div>
                  </div>

                  {/* Best products */}
                  <SectionCard title="Best Products">
                    {BEST.map((p) => (
                      <ProductCard key={p.id} {...p} />
                    ))}
                  </SectionCard>
                </DragScroll>

                {/* Home indicator */}
                <div className="absolute bottom-1 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-black/70" />
              </div>
            </div>

            {/* Caption */}
            <div className="mt-4 rounded-lg bg-sky-50 p-3 text-center dark:bg-sky-500/10">
              <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                ✓ Mobile Preview
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
