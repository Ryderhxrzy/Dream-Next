"use client"

import { useRef } from "react"
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  GalleryHorizontalEnd,
  Heart,
  Image as ImageIcon,
  MoreHorizontal,
  Search,
  ShoppingBag,
  Star,
  Users,
} from "lucide-react"
import type { HomeSection } from "@/store/api/supplierBrandHomeApi"

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

// ── Dynamic, DB-driven section renderers ─────────────────────────────────────

function DbProductCard({
  name,
  price,
  image,
}: {
  name: string
  price?: number | null
  image?: string | null
}) {
  return (
    <div
      className="w-[88px] shrink-0 overflow-hidden rounded-lg border bg-[#f8f9fa]"
      style={{ borderColor: C.cardBorder }}
    >
      <div className="relative h-[72px] w-full bg-slate-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ShoppingBag className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="px-1.5 py-1">
        <p className="truncate text-[8px] font-semibold" style={{ color: C.text }}>
          {name}
        </p>
        {price != null && (
          <p className="mt-0.5 text-[9px] font-extrabold" style={{ color: C.sky }}>
            ₱{price.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

function PreviewSection({ section }: { section: HomeSection }) {
  // Banner — single full-width image.
  if (section.type === "banner") {
    const url = section.banner?.image_url
    return (
      <div className="mb-2 overflow-hidden rounded-lg bg-slate-100">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Banner" className="aspect-[16/7] w-full object-cover" />
        ) : (
          <div className="flex aspect-[16/7] w-full items-center justify-center text-slate-300">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </div>
    )
  }

  // Carousel — first slide + dot indicators.
  if (section.type === "carousel") {
    const items = section.items ?? []
    const first = items[0]?.image_url
    return (
      <div className="relative mb-2 overflow-hidden rounded-lg bg-slate-100">
        {first ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first} alt="Carousel" className="aspect-[16/7] w-full object-cover" />
        ) : (
          <div className="flex aspect-[16/7] w-full items-center justify-center text-slate-300">
            <GalleryHorizontalEnd className="h-5 w-5" />
          </div>
        )}
        {items.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {items.map((it, i) => (
              <span
                key={it.id ?? i}
                className={`h-1 rounded-full ${i === 0 ? "w-2.5" : "w-1"}`}
                style={{ backgroundColor: i === 0 ? C.sky : "#cbd5e1" }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Products — label + button header, then a scrollable product row.
  const ps = section.product_section
  const products = ps?.products ?? []
  return (
    <div
      className="mb-2 overflow-hidden rounded-lg border bg-white"
      style={{ borderColor: C.cardBorder }}
    >
      <div
        className="flex items-center justify-between border-b px-2 py-1.5"
        style={{ borderColor: C.divider }}
      >
        <p className="truncate text-[10px] font-extrabold" style={{ color: C.text }}>
          {ps?.label || "Products"}
        </p>
        {ps?.button_text && (
          <span
            className="inline-flex shrink-0 items-center gap-0.5 text-[8px] font-bold"
            style={{ color: C.sky }}
          >
            {ps.button_text}
            <ChevronRight className="h-2 w-2" />
          </span>
        )}
      </div>
      <DragScroll axis="x" className="flex gap-1.5 p-1.5">
        {products.map((p) => (
          <DbProductCard key={p.id} name={p.name} price={p.price} image={p.image} />
        ))}
      </DragScroll>
    </div>
  )
}

interface MobilePhonePreviewProps {
  brandName?: string
  brandImage?: string | null
  sections?: HomeSection[]
}

export default function MobilePhonePreview({
  brandName = "Your Brand",
  brandImage = null,
  sections = [],
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

                {/* ── Scrollable content — dynamic, from the DB ── */}
                <DragScroll axis="y" className="flex-1 p-2">
                  {sections.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                      <p className="mt-2 text-[10px] font-semibold" style={{ color: C.textSecondary }}>
                        No sections yet
                      </p>
                      <p className="text-[8px]" style={{ color: C.textSecondary }}>
                        Add a banner, carousel, or product section to see it here.
                      </p>
                    </div>
                  ) : (
                    sections.map((section) => (
                      <PreviewSection key={section.id} section={section} />
                    ))
                  )}
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
