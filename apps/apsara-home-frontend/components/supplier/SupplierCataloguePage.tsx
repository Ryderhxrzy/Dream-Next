"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import {
  useGetPublicProductBrandsQuery,
  type ProductBrand,
} from "@/store/api/productBrandsApi"
import { useGetSuppliersQuery } from "@/store/api/suppliersApi"
import {
  useCreateAdminWebPageItemMutation,
  useGetAdminWebPageItemsQuery,
  useUpdateAdminWebPageItemMutation,
} from "@/store/api/webPagesApi"
import { AnimatePresence, motion } from "framer-motion"
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid2x2,
  ImageIcon,
  Loader2,
  Play,
  Save,
  Upload,
  Video,
  X,
} from "lucide-react"
import { useSession } from "next-auth/react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CataloguePage {
  url: string
  type: "image" | "video"
}

function brandItemKey(brandId: number) {
  return `brand-${brandId}`
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 25 * 1024 * 1024

async function uploadCataloguePage(file: File): Promise<CataloguePage> {
  const isVideo = file.type.startsWith("video/")
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  const limitLabel = isVideo ? "25 MB" : "10 MB"
  if (file.size >= limit)
    throw new Error(`${file.name} must be less than ${limitLabel}.`)
  const fd = new FormData()
  fd.append("file", file)
  fd.append("folder", "merchant-catalogues")
  fd.append("asset_type", isVideo ? "video" : "image")
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
  const payload = (await res.json().catch(() => ({}))) as {
    url?: string
    error?: string
  }
  if (!res.ok || !payload.url)
    throw new Error(payload.error ?? "Upload failed.")
  return { url: payload.url, type: isVideo ? "video" : "image" }
}

// ─── PageMedia ────────────────────────────────────────────────────────────────

function PageMedia({
  page,
  className,
}: {
  page: CataloguePage | null
  className?: string
}) {
  const cls = className ?? "h-full w-full object-cover"
  if (!page) return null
  if (page.type === "video") {
    return (
      <video
        src={page.url}
        className={cls}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      />
    )
  }
  return <img src={page.url} alt="" className={cls} draggable={false} />
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function CoverPage({ brand }: { brand: ProductBrand }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      {brand.image && (
        <>
          <img
            src={brand.image}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-sm"
            draggable={false}
          />
          <div className="absolute inset-0 bg-linear-to-b from-slate-900/30 via-slate-900/50 to-slate-900/95" />
        </>
      )}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute bg-white/5"
          style={{
            width: "200%",
            height: "3px",
            top: "42%",
            left: "-50%",
            transform: "rotate(-28deg)",
            boxShadow: "0 0 24px 4px rgba(255,255,255,0.06)",
          }}
        />
        <div
          className="absolute bg-white/3"
          style={{
            width: "200%",
            height: "1px",
            top: "calc(42% + 8px)",
            left: "-50%",
            transform: "rotate(-28deg)",
          }}
        />
      </div>
      <div className="absolute top-[32%] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
        {brand.image ? (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-2xl ring-1 ring-white/20 backdrop-blur-sm">
            <img
              src={brand.image}
              alt={brand.name}
              className="h-full w-full object-contain"
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 text-4xl font-black text-white/70 shadow-2xl ring-1 ring-white/20">
            {brand.name[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="absolute right-0 bottom-[28%] left-0 px-7 text-center">
        <p className="mb-2 text-[9px] font-bold tracking-[0.35em] text-white/35 uppercase">
          Product Catalogue
        </p>
        <h1
          className="leading-tight font-black tracking-wide text-white uppercase drop-shadow-xl"
          style={{ fontSize: "clamp(1.3rem, 3.5vw, 2.2rem)" }}
        >
          {brand.name}
        </h1>
      </div>
      <div className="absolute right-0 bottom-6 left-0 flex items-center gap-3 px-8">
        <div className="h-px flex-1 bg-white/12" />
        <span className="text-[9px] font-semibold tracking-widest text-white/30 uppercase">
          {new Date().getFullYear()}
        </span>
        <div className="h-px flex-1 bg-white/12" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-black/30 to-transparent" />
    </div>
  )
}

function EndpaperPage() {
  return (
    <div
      className="h-full w-full bg-slate-800"
      style={{
        backgroundImage:
          "radial-gradient(circle at 60% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)",
      }}
    />
  )
}

// ─── Flipbook viewer ──────────────────────────────────────────────────────────

interface FlipState {
  dir: "next" | "prev"
  from: number
  to: number
}

const preserve3d: React.CSSProperties = {
  transformStyle: "preserve-3d",
  WebkitTransformStyle:
    "preserve-3d" as React.CSSProperties["WebkitTransformStyle"],
}
const backfaceHidden: React.CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility:
    "hidden" as React.CSSProperties["WebkitBackfaceVisibility"],
}

function PageSlot({
  pages,
  spreadIdx,
  side,
  brand,
}: {
  pages: CataloguePage[]
  spreadIdx: number
  side: "left" | "right"
  brand: ProductBrand
}) {
  if (spreadIdx === 0) {
    return side === "right" ? <CoverPage brand={brand} /> : <EndpaperPage />
  }
  const idx = (spreadIdx - 1) * 2 + (side === "right" ? 1 : 0)
  const page = pages[idx] ?? null
  if (!page) {
    return side === "left" ? (
      <div className="flex h-full w-full items-center justify-center bg-slate-800">
        <BookOpen className="h-10 w-10 text-slate-600" />
      </div>
    ) : (
      <div className="h-full w-full bg-slate-900" />
    )
  }
  return <PageMedia page={page} />
}

function PageLabel({
  pages,
  spreadIdx,
  side,
}: {
  pages: CataloguePage[]
  spreadIdx: number
  side: "left" | "right"
}) {
  if (spreadIdx === 0) return null
  const idx = (spreadIdx - 1) * 2 + (side === "right" ? 1 : 0)
  if (idx >= pages.length) return null
  return (
    <span className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white/70">
      {idx + 1}
    </span>
  )
}

function FlipbookViewer({
  pages,
  brand,
  onClose,
}: {
  pages: CataloguePage[]
  brand: ProductBrand
  onClose: () => void
}) {
  const [spread, setSpread] = useState(0)
  const [flipState, setFlipState] = useState<FlipState | null>(null)
  const totalSpreads = 1 + Math.ceil(pages.length / 2)
  const isAnimating = flipState !== null
  const isFirst = spread === 0
  const isLast = spread >= totalSpreads - 1
  const bgSpread = flipState ? flipState.to : spread

  const goNext = useCallback(() => {
    if (isAnimating || spread >= totalSpreads - 1) return
    setFlipState({ dir: "next", from: spread, to: spread + 1 })
  }, [isAnimating, spread, totalSpreads])

  const goPrev = useCallback(() => {
    if (isAnimating || spread <= 0) return
    setFlipState({ dir: "prev", from: spread, to: spread - 1 })
  }, [isAnimating, spread])

  const onFlipComplete = useCallback(() => {
    setSpread((prev) => flipState?.to ?? prev)
    setFlipState(null)
  }, [flipState])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") goNext()
      else if (e.key === "ArrowLeft" || e.key === "PageUp") goPrev()
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [goNext, goPrev, onClose])

  const jumpTo = useCallback(
    (targetSpread: number) => {
      if (isAnimating || targetSpread === spread) return
      setFlipState({
        dir: targetSpread > spread ? "next" : "prev",
        from: spread,
        to: targetSpread,
      })
    },
    [isAnimating, spread]
  )

  const slotProps = { pages, brand }
  const isCoverStatic = spread === 0 && !flipState
  const isCoverFlipping =
    !!flipState && flipState.dir === "next" && flipState.from === 0
  const isCoverBackFlipping =
    !!flipState && flipState.dir === "prev" && flipState.to === 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-white">{brand.name}</span>
          <span className="text-slate-500">—</span>
          <span className="text-sm text-slate-400">Catalogue Flipbook</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            {spread === 0
              ? "Cover"
              : `Pages ${(spread - 1) * 2 + 1}–${Math.min((spread - 1) * 2 + 2, pages.length)}`}
            {" · "}
            {spread + 1} / {totalSpreads}
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <button
          onClick={goPrev}
          disabled={isFirst || isAnimating}
          className="absolute left-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/15 disabled:pointer-events-none disabled:opacity-20"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div style={{ perspective: "2200px", perspectiveOrigin: "50% 50%" }}>
          <div
            className={`relative ${!isCoverStatic && !isCoverFlipping && !isCoverBackFlipping ? "shadow-[0_30px_60px_rgba(0,0,0,0.6)]" : ""}`}
            style={{ width: "min(62vw, 960px)", height: "min(72vh, 660px)" }}
          >
            {isCoverStatic ? (
              <div
                className="absolute inset-y-0 right-0 overflow-hidden rounded-sm shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                style={{ width: "50%" }}
              >
                <CoverPage brand={brand} />
              </div>
            ) : isCoverFlipping ? (
              <div
                className="absolute inset-y-0 right-0 overflow-hidden rounded-r-sm shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                style={{ width: "50%" }}
              >
                <PageSlot
                  {...slotProps}
                  spreadIdx={flipState.to}
                  side="right"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-linear-to-r from-black/40 to-transparent" />
              </div>
            ) : isCoverBackFlipping ? (
              <div
                className="absolute inset-y-0 right-0 overflow-hidden rounded-r-sm"
                style={{ width: "50%" }}
              >
                <CoverPage brand={brand} />
              </div>
            ) : (
              <div className="absolute inset-0 flex">
                <div className="relative flex-1 overflow-hidden rounded-l-sm">
                  <PageSlot {...slotProps} spreadIdx={bgSpread} side="left" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-black/40 to-transparent" />
                  <PageLabel {...slotProps} spreadIdx={bgSpread} side="left" />
                </div>
                <div className="w-1 shrink-0 bg-linear-to-r from-slate-700 via-slate-400 to-slate-700" />
                <div className="relative flex-1 overflow-hidden rounded-r-sm">
                  <PageSlot {...slotProps} spreadIdx={bgSpread} side="right" />
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-linear-to-r from-black/40 to-transparent" />
                  <PageLabel {...slotProps} spreadIdx={bgSpread} side="right" />
                </div>
              </div>
            )}

            {flipState?.dir === "next" && (
              <>
                {flipState.from !== 0 && (
                  <div
                    className="absolute inset-y-0 left-0 z-20 overflow-hidden rounded-l-sm"
                    style={{ width: "50%" }}
                  >
                    <PageSlot
                      {...slotProps}
                      spreadIdx={flipState.from}
                      side="left"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-black/40 to-transparent" />
                    <PageLabel
                      {...slotProps}
                      spreadIdx={flipState.from}
                      side="left"
                    />
                  </div>
                )}
                <motion.div
                  className="absolute inset-y-0 z-30"
                  style={{
                    left: "50%",
                    right: 0,
                    ...preserve3d,
                    transformOrigin: "left center",
                  }}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: -180 }}
                  transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                  onAnimationComplete={onFlipComplete}
                >
                  <div
                    className="absolute inset-0 overflow-hidden rounded-r-sm"
                    style={backfaceHidden}
                  >
                    <PageSlot
                      {...slotProps}
                      spreadIdx={flipState.from}
                      side="right"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-black/30 to-transparent" />
                    <PageLabel
                      {...slotProps}
                      spreadIdx={flipState.from}
                      side="right"
                    />
                  </div>
                  <div
                    className="absolute inset-0 overflow-hidden rounded-l-sm"
                    style={{ ...backfaceHidden, transform: "rotateY(180deg)" }}
                  >
                    <PageSlot
                      {...slotProps}
                      spreadIdx={flipState.to}
                      side="left"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-black/30 to-transparent" />
                  </div>
                </motion.div>
              </>
            )}

            {flipState?.dir === "prev" && (
              <>
                <div
                  className="absolute inset-y-0 right-0 z-20 overflow-hidden rounded-r-sm"
                  style={{ width: "50%" }}
                >
                  <PageSlot
                    {...slotProps}
                    spreadIdx={flipState.from}
                    side="right"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-linear-to-r from-black/40 to-transparent" />
                  <PageLabel
                    {...slotProps}
                    spreadIdx={flipState.from}
                    side="right"
                  />
                </div>
                <motion.div
                  className="absolute inset-y-0 z-30"
                  style={{
                    left: 0,
                    right: "50%",
                    ...preserve3d,
                    transformOrigin: "right center",
                  }}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 180 }}
                  transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                  onAnimationComplete={onFlipComplete}
                >
                  <div
                    className="absolute inset-0 overflow-hidden rounded-l-sm"
                    style={backfaceHidden}
                  >
                    <PageSlot
                      {...slotProps}
                      spreadIdx={flipState.from}
                      side="left"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-black/30 to-transparent" />
                    <PageLabel
                      {...slotProps}
                      spreadIdx={flipState.from}
                      side="left"
                    />
                  </div>
                  <div
                    className="absolute inset-0 overflow-hidden rounded-r-sm"
                    style={{ ...backfaceHidden, transform: "rotateY(180deg)" }}
                  >
                    <PageSlot
                      {...slotProps}
                      spreadIdx={flipState.to}
                      side="right"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-black/30 to-transparent" />
                  </div>
                </motion.div>
              </>
            )}

            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-40 w-1 -translate-x-1/2 bg-linear-to-r from-slate-700 via-slate-300 to-slate-700" />

            {!isAnimating && (
              <>
                {!isFirst && (
                  <button
                    onClick={goPrev}
                    className="absolute inset-y-0 left-0 z-50 w-1/2 cursor-w-resize"
                    aria-label="Previous page"
                  />
                )}
                {!isLast && (
                  <button
                    onClick={goNext}
                    className="absolute inset-y-0 right-0 z-50 w-1/2 cursor-e-resize"
                    aria-label="Next page"
                  />
                )}
              </>
            )}
          </div>
        </div>

        <button
          onClick={goNext}
          disabled={isLast || isAnimating}
          className="absolute right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/15 disabled:pointer-events-none disabled:opacity-20"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="h-22.5 shrink-0 overflow-x-auto border-t border-white/8 bg-slate-900/80 px-4">
        <div className="flex h-full items-center gap-2">
          <button
            onClick={() => jumpTo(0)}
            className={`relative h-15.5 w-11.5 shrink-0 overflow-hidden rounded transition-all ${spread === 0 ? "ring-2 ring-violet-400 ring-offset-1 ring-offset-slate-900" : "opacity-40 hover:opacity-75"}`}
          >
            <div
              className="flex h-full w-full items-center justify-center bg-slate-800"
              style={{
                backgroundImage: brand.image
                  ? `url(${brand.image})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!brand.image && <BookOpen className="h-4 w-4 text-slate-500" />}
              <div className="absolute inset-0 bg-slate-900/50" />
            </div>
            <span className="absolute inset-x-0 bottom-0 bg-black/70 py-px text-center text-[8px] text-white/80">
              Cover
            </span>
          </button>
          {pages.map((page, i) => {
            const s = Math.floor(i / 2) + 1
            const active = s === spread
            return (
              <button
                key={i}
                onClick={() => jumpTo(s)}
                className={`relative h-15.5 w-11.5 shrink-0 overflow-hidden rounded transition-all ${active ? "ring-2 ring-violet-400 ring-offset-1 ring-offset-slate-900" : "opacity-40 hover:opacity-75"}`}
              >
                {page.type === "video" ? (
                  <>
                    <video
                      src={page.url}
                      className="h-full w-full object-cover"
                      preload="metadata"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-3 w-3 fill-white text-white drop-shadow" />
                    </div>
                  </>
                ) : (
                  <img
                    src={page.url}
                    alt={`Pg ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-px text-center text-[8px] text-white/80">
                  {i + 1}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SupplierCataloguePage() {
  const { data: session, status } = useSession()
  const supplierId = Number(session?.user?.supplierId ?? 0)
  const supplierName =
    (session?.user as { supplierName?: string } | undefined)?.supplierName ||
    session?.user?.name ||
    ""

  const { data: suppliersData } = useGetSuppliersQuery(undefined, {
    skip: status !== "authenticated",
  })
  const { data: brandsData, isLoading: brandsLoading } =
    useGetPublicProductBrandsQuery()

  const supplier = useMemo(
    () => (suppliersData?.suppliers ?? []).find((s) => s.id === supplierId),
    [supplierId, suppliersData?.suppliers]
  )

  // Match the supplier's brand by name (same fuzzy logic as SupplierInventoryPage)
  const brand = useMemo<ProductBrand | null>(() => {
    const brands = brandsData?.brands ?? []
    if (!brands.length) return null
    const cands = [supplierName, supplier?.company, supplier?.name]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ""))
    if (!cands.length) return null
    const exact = brands.find((b) => {
      const k = String(b.name ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
      return k && cands.includes(k)
    })
    if (exact) return exact
    let bestBrand: ProductBrand | null = null,
      bestScore = 0,
      bestLen = 0
    brands.forEach((b) => {
      const k = String(b.name ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
      if (!k) return
      cands.forEach((c) => {
        let s = 0
        if (c === k) s = 3
        else if (c.includes(k)) s = 2
        else if (k.includes(c)) s = 1
        if (
          s > 0 &&
          (s > bestScore || (s === bestScore && k.length > bestLen))
        ) {
          bestScore = s
          bestLen = k.length
          bestBrand = b
        }
      })
    })
    return bestBrand
  }, [brandsData?.brands, supplier?.company, supplier?.name, supplierName])

  const { data: catalogueData, isLoading: catalogueLoading } =
    useGetAdminWebPageItemsQuery(
      { type: "merchant-catalogue", perPage: 100, status: "all" },
      { skip: !brand }
    )
  const [createItem] = useCreateAdminWebPageItemMutation()
  const [updateItem] = useUpdateAdminWebPageItemMutation()

  const [localPages, setLocalPages] = useState<CataloguePage[]>([])
  const loadedForBrandRef = useRef<number | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [saving, setSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const catalogueItem = brand
    ? (catalogueData?.items ?? []).find(
        (item) => item.key === brandItemKey(brand.id)
      )
    : null

  const savedPages: CataloguePage[] =
    (catalogueItem?.payload?.pages as CataloguePage[] | undefined) ?? []

  useEffect(() => {
    if (!brand) {
      setLocalPages([])
      loadedForBrandRef.current = null
      return
    }
    if (loadedForBrandRef.current !== brand.id && !catalogueLoading) {
      setLocalPages(savedPages)
      loadedForBrandRef.current = brand.id
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, catalogueLoading, catalogueItem])

  const isDirty = JSON.stringify(localPages) !== JSON.stringify(savedPages)
  const totalSpreads = Math.ceil(localPages.length / 2)

  const handleSave = useCallback(async () => {
    if (!brand) return
    setSaving(true)
    try {
      const payload = { pages: localPages }
      if (catalogueItem) {
        await updateItem({
          type: "merchant-catalogue",
          id: catalogueItem.id,
          data: { payload },
        }).unwrap()
      } else {
        await createItem({
          type: "merchant-catalogue",
          data: {
            key: brandItemKey(brand.id),
            title: brand.name,
            payload,
            is_active: true,
          },
        }).unwrap()
      }
      showSuccessToast("Catalogue saved.")
    } catch {
      showErrorToast("Failed to save catalogue.")
    } finally {
      setSaving(false)
    }
  }, [brand, localPages, catalogueItem, createItem, updateItem])

  const handleUpload = async (files: File[]) => {
    const valid = files.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    )
    if (!valid.length || !brand) return
    setUploading(true)
    setUploadProgress({ done: 0, total: valid.length })
    const uploaded: CataloguePage[] = []
    for (const file of valid) {
      try {
        const page = await uploadCataloguePage(file)
        uploaded.push(page)
        setUploadProgress((p) => ({ ...p, done: p.done + 1 }))
      } catch (err) {
        showErrorToast(err instanceof Error ? err.message : "Upload failed.")
      }
    }
    setUploading(false)
    setUploadProgress({ done: 0, total: 0 })
    if (uploaded.length) {
      setLocalPages((prev) => [...prev, ...uploaded])
      showSuccessToast(
        `${uploaded.length} page${uploaded.length > 1 ? "s" : ""} added. Click "Save Catalogue" to persist.`
      )
    }
  }

  const removePage = useCallback(
    async (index: number) => {
      if (!brand) return
      const next = localPages.filter((_, i) => i !== index)
      setLocalPages(next)
      setSaving(true)
      try {
        const payload = { pages: next }
        if (catalogueItem) {
          await updateItem({
            type: "merchant-catalogue",
            id: catalogueItem.id,
            data: { payload },
          }).unwrap()
        } else {
          await createItem({
            type: "merchant-catalogue",
            data: {
              key: brandItemKey(brand.id),
              title: brand.name,
              payload,
              is_active: true,
            },
          }).unwrap()
        }
      } catch {
        showErrorToast("Failed to remove page.")
        setLocalPages(localPages)
      } finally {
        setSaving(false)
      }
    },
    [brand, localPages, catalogueItem, createItem, updateItem]
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    void handleUpload(Array.from(e.dataTransfer.files))
  }
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleUpload(Array.from(e.target.files ?? []))
    e.target.value = ""
  }

  const isLoadingBrand = brandsLoading || status === "loading"
  const isLoadingContent =
    catalogueLoading && !!brand && loadedForBrandRef.current !== brand.id

  // ── Loading state ──
  if (isLoadingBrand) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  // ── No brand matched ──
  if (!brand) {
    return (
      <div className="space-y-5">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-8"
          style={{
            background:
              "linear-gradient(135deg, #ede9fe 0%, #f5f3ff 40%, #ede9fe 100%)",
          }}
        >
          <div className="pointer-events-none absolute right-64 bottom-0 h-32 w-32 rounded-full bg-violet-200/50" />
          <div className="pointer-events-none absolute top-5 right-52 h-3 w-3 rotate-45 bg-violet-400" />
          <div className="relative max-w-[60%]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              <BookOpen className="h-3 w-3" /> My Catalogue
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              Product Catalogue
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Upload and manage your brand catalogue pages.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <BookOpen className="h-8 w-8 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-600">
              No brand linked to your account
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Ask an admin to create a product brand matching your supplier
              name.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main view ──
  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-3xl px-8 py-8"
        style={{
          background:
            "linear-gradient(135deg, #ede9fe 0%, #f5f3ff 40%, #ede9fe 100%)",
        }}
      >
        <div className="pointer-events-none absolute right-64 bottom-0 h-32 w-32 rounded-full bg-violet-200/50" />
        <div className="pointer-events-none absolute right-56 -bottom-6 h-20 w-20 rounded-full bg-violet-200/40" />
        <div className="pointer-events-none absolute top-5 right-52 h-3 w-3 rotate-45 bg-violet-400" />
        <div className="pointer-events-none absolute right-36 bottom-6 h-2 w-2 rotate-45 bg-pink-400" />
        <button className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-violet-100 transition hover:bg-violet-50">
          <BookOpen className="h-5 w-5 text-violet-500" />
        </button>
        <div className="pointer-events-none absolute top-1/2 right-10 -translate-y-1/2 select-none">
          <div className="absolute -bottom-4 left-1/2 h-6 w-40 -translate-x-1/2 rounded-full bg-violet-400/20 blur-lg" />
          <div
            className="flex items-stretch overflow-hidden rounded-2xl shadow-2xl"
            style={{ height: "130px" }}
          >
            <div className="flex w-24 flex-col justify-between rounded-l-2xl bg-violet-500 px-4 py-4 shadow-lg">
              <div className="space-y-2.5">
                <div className="h-2.5 rounded-full bg-white/45" />
                <div className="h-2.5 rounded-full bg-white/45" />
                <div className="h-2.5 rounded-full bg-white/45" />
              </div>
              <div className="h-9 rounded-xl bg-white/30" />
            </div>
            <div className="w-2.5 bg-violet-700 shadow-inner" />
            <div className="flex w-24 flex-col justify-between rounded-r-2xl bg-violet-100 px-4 py-4 shadow-lg">
              <div className="space-y-2.5">
                <div className="h-2 rounded-full bg-violet-300/70" />
                <div className="h-2 rounded-full bg-violet-300/70" />
                <div className="h-2 rounded-full bg-violet-300/70" />
              </div>
              <div className="h-12 w-14 self-end rounded-xl bg-violet-300/60" />
            </div>
          </div>
        </div>
        <div className="relative max-w-[55%]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            <BookOpen className="h-3 w-3" /> My Catalogue
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
            Product Catalogue
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Upload catalogue pages or videos for{" "}
            <span className="font-semibold text-slate-700">{brand.name}</span>{" "}
            and view them as an interactive flipbook.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* ── Left: pages manager ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Catalogue Pages</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {isLoadingContent
                  ? "Loading…"
                  : `${localPages.length} page${localPages.length !== 1 ? "s" : ""} · ${totalSpreads} spread${totalSpreads !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-600">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </span>
              )}
              {isDirty && !saving && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600">
                  Unsaved changes
                </span>
              )}
              {localPages.length > 0 && (
                <button
                  onClick={() => setViewerOpen(true)}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                >
                  <BookOpen className="h-4 w-4" /> View Flipbook
                </button>
              )}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`mb-5 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all select-none ${isDragging ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-slate-50/60 hover:border-violet-300 hover:bg-violet-50/40"} ${uploading ? "pointer-events-none" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileInput}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="text-sm font-medium text-slate-500">
                  Uploading {uploadProgress.done} / {uploadProgress.total}…
                </p>
              </div>
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
                  <Upload className="h-5 w-5 text-violet-600" />
                </div>
                <p className="font-semibold text-slate-700">
                  Upload catalogue pages
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Click or drag and drop · Images (PNG, JPG, WEBP ≤ 10 MB)
                  <br />
                  or Videos (MP4, MOV ≤ 25 MB)
                </p>
              </>
            )}
          </div>

          {/* Page thumbnails */}
          {isLoadingContent ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading catalogue…
            </div>
          ) : localPages.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
              {localPages.map((page, i) => (
                <div
                  key={`${page.url}-${i}`}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50 px-2 py-1">
                    <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Uploaded
                    </span>
                    <button
                      onClick={() => void removePage(i)}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600 active:scale-95"
                      title="Remove page"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <div className="relative aspect-3/4 bg-slate-100">
                    {page.type === "video" ? (
                      <>
                        <video
                          src={page.url}
                          className="h-full w-full object-cover"
                          preload="metadata"
                          muted
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50">
                            <Play className="h-3.5 w-3.5 fill-white text-white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={page.url}
                        alt={`Page ${i + 1}`}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    )}
                  </div>
                  <div className="py-1 text-center text-[9px] font-bold text-slate-400">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-14">
              <ImageIcon className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-400">
                No pages yet — upload images or videos above
              </p>
            </div>
          )}
        </div>

        {/* ── Right: sidebar ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[9px] font-bold tracking-widest text-slate-400 uppercase">
              Your Brand
            </p>
            <div className="flex items-center gap-3">
              {brand.image ? (
                <img
                  src={brand.image}
                  alt={brand.name}
                  className="h-14 w-14 rounded-2xl object-contain ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-400 text-xl font-black text-white">
                  {brand.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">
                  {brand.name}
                </p>
                <p className="text-xs text-slate-400">ID #{brand.id}</p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {[
                {
                  icon: <FileText className="h-4 w-4 text-slate-400" />,
                  label: "Pages",
                  value: localPages.length,
                },
                {
                  icon: <Grid2x2 className="h-4 w-4 text-slate-400" />,
                  label: "Spreads",
                  value: totalSpreads,
                },
                {
                  icon: <Video className="h-4 w-4 text-slate-400" />,
                  label: "Videos",
                  value: localPages.filter((p) => p.type === "video").length,
                },
              ].map(({ icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    {icon}
                    {label}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => setViewerOpen(true)}
                disabled={uploading || localPages.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <BookOpen className="h-4 w-4" /> Open Flipbook
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={
                  saving || uploading || !isDirty || localPages.length === 0
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Catalogue
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
            <p className="mb-3 text-[9px] font-bold tracking-widest text-violet-500 uppercase">
              Tips
            </p>
            <ul className="space-y-2">
              {[
                "Upload pages in reading order — cover first",
                "Portrait ratio (3:4 or A4) looks best",
                "Even page count creates perfect spreads",
                "Videos auto-play in the flipbook viewer",
                "Use ← → arrow keys to flip pages",
              ].map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-xs text-slate-600"
                >
                  <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-violet-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {viewerOpen && localPages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FlipbookViewer
              pages={localPages}
              brand={brand}
              onClose={() => setViewerOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
