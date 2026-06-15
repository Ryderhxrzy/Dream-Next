"use client"

import { useRef, useState } from "react"
import type {
  ZqCachedProduct,
  ZqPublicProductResponse,
} from "@/store/api/productsApi"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"

import GlobalProductImageGallery from "./GlobalProductImageGallery"
import GlobalProductInfo from "./GlobalProductInfo"

type Product = ZqPublicProductResponse["product"]
type Spec = NonNullable<Product["specs"]>[number]

// ─── helpers ──────────────────────────────────────────────────────────────────

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#049;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")

const extractCleanText = (value: string | null | undefined): string => {
  if (!value) return ""
  let s = value.trim()
  for (let i = 0; i < 3; i++) {
    const n = decodeHtmlEntities(s)
    if (n === s) break
    s = n
  }
  return s
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<\s*\/div\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<\s*\/li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const extractDescriptionImages = (
  value: string | null | undefined
): string[] => {
  if (!value) return []
  let s = value.trim()
  for (let i = 0; i < 3; i++) {
    const n = decodeHtmlEntities(s)
    if (n === s) break
    s = n
  }
  const matches = [...s.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  const seen = new Set<string>()
  return matches
    .map((m) => m[1]?.trim() ?? "")
    .filter((src) => {
      if (!src || seen.has(src)) return false
      seen.add(src)
      return true
    })
}

type DescAttribute = { label: string; value: string }

// ZQ descriptions store specs as a grid of <p><strong>Label</strong></p> + <p>Value</p> pairs.
const parseDescriptionAttributes = (
  value: string | null | undefined
): DescAttribute[] => {
  if (!value) return []
  let s = value.trim()
  for (let i = 0; i < 3; i++) {
    const n = decodeHtmlEntities(s)
    if (n === s) break
    s = n
  }

  const blocks = [...s.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  const attrs: { label: string; values: string[] }[] = []
  let current: { label: string; values: string[] } | null = null

  for (const m of blocks) {
    const inner = m[1] ?? ""
    const isLabel = /<strong\b/i.test(inner)
    const text = inner
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
    if (!text) continue
    if (isLabel) {
      current = { label: text.replace(/[:：]\s*$/, ""), values: [] }
      attrs.push(current)
    } else if (current) {
      current.values.push(text)
    }
  }

  return attrs
    .filter((a) => a.values.length > 0)
    .map((a) => ({ label: a.label, value: a.values.join(", ") }))
}

// ─── Brand card (matches ProductPageClient BrandCardComponent style) ───────────

function GlobalBrandCard({ totalStock }: { totalStock: number }) {
  return (
    <div className="relative z-20 rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-4 sm:items-center sm:gap-6">
        {/* Logo */}
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white sm:h-32 sm:w-32 dark:border-gray-600 dark:bg-gray-700">
          <Image
            src="/Images/af_home_logo.png"
            alt="AF Home Global Brand"
            fill
            className="object-contain p-3"
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-xl leading-tight font-bold text-gray-900 sm:text-2xl dark:text-white">
                AF Home Global Brand
              </h2>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                Online
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Browse all products from this brand
          </p>

          {/* Metrics */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Chat Performance: 95%</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <span>Overall Rating: N/A</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>Total Products: {totalStock.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Joined: Jan 2024</span>
            </div>
          </div>
        </div>
      </div>

      {/* View Brand button */}
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
        <Link
          href="/by-brand?brand=af-home-global-brand"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-400 bg-transparent px-4 py-2.5 text-sm font-semibold text-sky-500 transition-colors hover:bg-sky-50 dark:border-sky-500 dark:text-sky-400 dark:hover:bg-sky-900"
        >
          View Brand
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

// ─── Related product card ─────────────────────────────────────────────────────

function ZqRelatedCard({
  product,
  index,
}: {
  product: ZqCachedProduct
  index: number
}) {
  const price =
    Number(product.priceMinCents ?? product.priceMaxCents ?? 0) / 100
  const comparePrice =
    Number(product.priceMaxCents ?? product.priceMinCents ?? 0) / 100
  const image =
    product.primaryImage || product.images?.[0] || "/Images/af_home_logo.png"
  const fmt = (n: number) =>
    `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.08 }}
    >
      <Link
        href={`/global-product/${product.id}`}
        className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-sky-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-sky-500"
      >
        <div className="relative aspect-square overflow-hidden bg-white dark:bg-gray-700">
          <div className="absolute top-2 left-2 z-10 rounded-sm bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">
            Register to get 6% discount
          </div>
          <Image
            src={image}
            alt={product.subject}
            fill
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        </div>
        <div className="flex flex-1 flex-col border-t border-gray-100 p-3 dark:border-gray-700">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
            AF HOME GLOBAL BRAND
          </p>
          <h3 className="line-clamp-2 flex-1 text-sm leading-snug font-semibold text-slate-800 dark:text-gray-100">
            {product.subject}
          </h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
            <span className="text-base font-black text-sky-500">
              {fmt(price)}
            </span>
            {comparePrice > price && (
              <span className="text-xs text-gray-400 line-through">
                {fmt(comparePrice)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
            {product.totalStock.toLocaleString()} in stock · Global Supplier
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GlobalProductDetail({
  product,
  relatedProducts = [],
}: {
  product: Product
  relatedProducts?: ZqCachedProduct[]
}) {
  const [preferredImage, setPreferredImage] = useState<string | undefined>(
    undefined
  )
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)
  const descriptionAttributes = parseDescriptionAttributes(product.description)
  const description =
    descriptionAttributes.length > 0
      ? ""
      : extractCleanText(product.description)
  const descriptionImages = extractDescriptionImages(product.description)
  const hasDescriptionContent =
    descriptionAttributes.length > 0 ||
    Boolean(description) ||
    descriptionImages.length > 0

  const scrollCarousel = (dir: "left" | "right") => {
    const el = carouselRef.current
    if (!el) return
    el.scrollBy({
      left: dir === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8,
      behavior: "smooth",
    })
  }

  const handleVariantChange = (spec: Spec | null) => {
    if (spec?.image) setPreferredImage(spec.image)
  }

  const specs = [
    { label: "Brand", value: "AF Home Global Brand" },
    product.categoryName
      ? { label: "Category", value: product.categoryName }
      : null,
    { label: "SKU", value: product.externalId },
    { label: "Total Stock", value: product.totalStock.toLocaleString() },
    { label: "Variants", value: String(product.variantCount) },
    product.sourceType ? { label: "Source", value: product.sourceType } : null,
    product.shippingTo
      ? { label: "Ships To", value: product.shippingTo }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-gray-900 dark:text-white">
      {/* Breadcrumb — matches regular product page */}
      <div className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <Link
              href="/"
              className="font-medium transition-colors hover:text-sky-500 dark:hover:text-sky-400"
            >
              Home
            </Link>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {product.categoryName && (
              <>
                <span>{product.categoryName}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </>
            )}
            <span className="max-w-48 truncate font-semibold text-slate-600 dark:text-gray-300">
              {product.subject}
            </span>
          </nav>
        </div>
      </div>

      {/* Main grid — matches regular product page exactly */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 items-start gap-12 pb-20 lg:grid-cols-2">
          {/* LEFT: Gallery + Brand Card */}
          <div className="space-y-4">
            <div className="relative">
              <GlobalProductImageGallery
                primaryImage={product.primaryImage}
                images={product.images ?? []}
                productName={product.subject}
                preferredActiveImage={preferredImage}
              />
            </div>
            <div className="relative z-20">
              <GlobalBrandCard totalStock={product.totalStock} />
            </div>
          </div>

          {/* RIGHT: Product Info */}
          <GlobalProductInfo
            product={product}
            onVariantChange={handleVariantChange}
          />
        </div>

        {/* Description + Specs + Reviews — same border-t style as regular page */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-0 space-y-4 border-t border-gray-200 pt-10 dark:border-gray-700"
        >
          {/* Description */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
              Description
            </h3>

            {!hasDescriptionContent && (
              <p className="text-sm text-gray-400 italic">
                No description available.
              </p>
            )}

            {/* Attribute grid (parsed from ZQ description table) */}
            {descriptionAttributes.length > 0 && (
              <div className="mb-6 grid gap-2 sm:grid-cols-2">
                {descriptionAttributes.map((attr, i) => (
                  <div
                    key={`${attr.label}-${i}`}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 dark:border-gray-700 dark:bg-gray-700/40"
                  >
                    <span className="w-28 shrink-0 pt-0.5 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                      {attr.label}
                    </span>
                    <span className="text-sm leading-snug font-medium text-slate-700 dark:text-gray-200">
                      {attr.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Free-form text content (fallback when no attribute grid) */}
            {description && (
              <div className="mb-6 space-y-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {description.split(/\n{2,}/).map((para, i) => {
                  const trimmed = para.trim()
                  if (!trimmed) return null
                  return (
                    <p key={i} className="whitespace-pre-line">
                      {trimmed}
                    </p>
                  )
                })}
              </div>
            )}

            {/* Description image carousel */}
            {descriptionImages.length > 0 && (
              <>
                {(description || descriptionAttributes.length > 0) && (
                  <div className="mb-4 border-t border-gray-100 dark:border-gray-700" />
                )}
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                    Product Photos
                    <span className="ml-1.5 text-gray-300 dark:text-gray-600">
                      ({descriptionImages.length})
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setGalleryOpen(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-sky-500 transition-colors hover:text-sky-600"
                  >
                    View all
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>

                <div className="group/carousel relative">
                  <div
                    ref={carouselRef}
                    className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {descriptionImages.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxSrc(src)}
                        className="group w-44 shrink-0 cursor-zoom-in snap-start overflow-hidden rounded-xl border border-gray-100 bg-white transition-all duration-200 hover:border-sky-400 sm:w-52 dark:border-gray-700 dark:bg-gray-700 dark:hover:border-sky-500"
                      >
                        <div className="relative aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`Product detail ${i + 1}`}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Carousel nav arrows */}
                  {descriptionImages.length > 2 && (
                    <>
                      <button
                        type="button"
                        onClick={() => scrollCarousel("left")}
                        className="absolute top-1/2 left-2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-slate-600 opacity-0 shadow-md backdrop-blur-sm transition-all group-hover/carousel:opacity-100 hover:text-sky-500 sm:flex dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300"
                        aria-label="Scroll left"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollCarousel("right")}
                        className="absolute top-1/2 right-2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-slate-600 opacity-0 shadow-md backdrop-blur-sm transition-all group-hover/carousel:opacity-100 hover:text-sky-500 sm:flex dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300"
                        aria-label="Scroll right"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Pinterest-style "View all" gallery modal */}
          {galleryOpen && (
            <div className="fixed inset-0 z-[150] flex flex-col bg-white dark:bg-gray-900">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-6 dark:border-gray-800 dark:bg-gray-900/95">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Product Photos
                  </h3>
                  <p className="text-xs text-gray-400">
                    {descriptionImages.length} images
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGalleryOpen(false)}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Close
                </button>
              </div>

              {/* Pinterest masonry */}
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
                  {descriptionImages.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxSrc(src)}
                      className="group block w-full cursor-zoom-in break-inside-avoid overflow-hidden rounded-xl border border-gray-100 transition-all duration-200 hover:border-sky-400 hover:shadow-lg dark:border-gray-700 dark:hover:border-sky-500"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Product detail ${i + 1}`}
                        className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lightbox */}
          {lightboxSrc && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
              onClick={() => setLightboxSrc(null)}
            >
              <button
                onClick={() => setLightboxSrc(null)}
                className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxSrc}
                alt="Product detail"
                className="max-h-[90vh] w-auto max-w-full rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Specifications */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
              Specifications
            </h3>
            <div className="space-y-2">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-center justify-between rounded border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm last:border-b-0 dark:border-gray-700 dark:bg-gray-700/50"
                >
                  <span className="w-36 shrink-0 font-semibold text-slate-700 dark:text-gray-200">
                    {spec.label}
                  </span>
                  <span className="text-right text-gray-500 dark:text-gray-300">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
              Reviews (0)
            </h3>
            <div className="mb-3 flex items-center gap-4 rounded-xl bg-sky-50 p-4 dark:bg-sky-900/20">
              <div className="shrink-0 text-center">
                <div className="text-3xl font-bold text-sky-500 dark:text-sky-400">
                  0.0
                </div>
                <div className="mt-1 flex justify-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="#e5e7eb"
                      stroke="none"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <div className="mt-1 text-xs text-gray-400">0 reviews</div>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-gray-500 dark:text-gray-400">
                      {star}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="#38bdf8"
                      className="shrink-0"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div className="h-full w-0 rounded-full bg-sky-400" />
                    </div>
                    <span className="w-4 text-right text-gray-400 dark:text-gray-500">
                      0
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
              No reviews yet. Be the first to share your experience.
            </div>
          </div>
        </motion.div>

        {/* You Might Also Like */}
        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 border-t border-gray-200 pt-10 dark:border-gray-700"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-gray-100">
                You Might Also Like
              </h2>
              <Link
                href="/by-brand?brand=af-home-global-brand"
                className="flex items-center gap-1 text-sm font-semibold text-sky-500 transition-colors hover:text-sky-600 dark:text-sky-400"
              >
                View all
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {relatedProducts.map((related, index) => (
                <ZqRelatedCard
                  key={related.id}
                  product={related}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
