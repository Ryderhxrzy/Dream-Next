'use client'

import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChevronLeft, ChevronRight, Play, X } from 'lucide-react'
import { useGetPublicWebPageItemsQuery, type WebPageItem } from '@/store/api/webPagesApi'
import { useGetPublicProductsQuery } from '@/store/api/productsApi'
import type { ProductBrand } from '@/store/api/productBrandsApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CataloguePage {
  url: string
  type: 'image' | 'video'
  name?: string
  description?: string
}

interface FlipState {
  dir: 'next' | 'prev'
  from: number
  to: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const preserve3d: React.CSSProperties = {
  transformStyle: 'preserve-3d',
  WebkitTransformStyle: 'preserve-3d' as React.CSSProperties['WebkitTransformStyle'],
}
const backfaceHidden: React.CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden' as React.CSSProperties['WebkitBackfaceVisibility'],
}

function brandItemKey(brandId: number) {
  return `brand-${brandId}`
}

function stripHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageMedia({ page, className, contain }: { page: CataloguePage | null; className?: string; contain?: boolean }) {
  const cls = className ?? (contain ? 'h-full w-full object-contain' : 'h-full w-full object-cover')
  if (!page) return null
  if (page.type === 'video') {
    return <video src={page.url} className={cls} autoPlay loop muted playsInline preload="metadata" />
  }
  return <img src={page.url} alt="" className={cls} draggable={false} />
}

function CoverPage({ brand }: { brand: ProductBrand }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      {brand.image && (
        <>
          <img src={brand.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm scale-110" draggable={false} />
          <div className="absolute inset-0 bg-linear-to-b from-slate-900/30 via-slate-900/50 to-slate-900/95" />
        </>
      )}
      <div className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
        {brand.image ? (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 p-2 ring-1 ring-white/20 shadow-2xl backdrop-blur-sm">
            <img src={brand.image} alt={brand.name} className="h-full w-full object-contain" draggable={false} />
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 text-4xl font-black text-white/70 ring-1 ring-white/20 shadow-2xl">
            {brand.name[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="absolute bottom-[28%] left-0 right-0 px-7 text-center">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.35em] text-white/35">Product Catalogue</p>
        <h1 className="font-black uppercase leading-tight tracking-wide text-white drop-shadow-xl" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 2.2rem)' }}>
          {brand.name}
        </h1>
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex items-center gap-3 px-8">
        <div className="h-px flex-1 bg-white/12" />
        <span className="text-[9px] font-semibold uppercase tracking-widest text-white/30">{new Date().getFullYear()}</span>
        <div className="h-px flex-1 bg-white/12" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-black/30 to-transparent" />
    </div>
  )
}

function EndpaperPage() {
  return (
    <div className="h-full w-full bg-slate-800" style={{ backgroundImage: 'radial-gradient(circle at 60% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
  )
}

function PageSlot({ pages, spreadIdx, side, brand, containImages }: { pages: CataloguePage[]; spreadIdx: number; side: 'left' | 'right'; brand: ProductBrand; containImages?: boolean }) {
  if (spreadIdx === 0) return side === 'right' ? <CoverPage brand={brand} /> : <EndpaperPage />
  const idx = (spreadIdx - 1) * 2 + (side === 'right' ? 1 : 0)
  const page = pages[idx] ?? null
  if (!page) {
    return side === 'left'
      ? <div className="h-full w-full bg-slate-800 flex items-center justify-center"><BookOpen className="h-10 w-10 text-slate-600" /></div>
      : <div className="h-full w-full bg-slate-900" />
  }
  if (containImages) {
    return (
      <div className="h-full w-full bg-white flex flex-col">
        <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-50 p-4">
          <PageMedia page={page} className="max-h-full max-w-full object-contain" />
        </div>
        {(page.name || page.description) && (
          <div className="shrink-0 border-t border-slate-100 px-5 py-4">
            {page.name && <p className="text-sm font-semibold leading-snug text-slate-800">{page.name}</p>}
            {page.description && <p className="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-slate-500">{page.description}</p>}
          </div>
        )}
      </div>
    )
  }
  return <PageMedia page={page} />
}

function PageLabel({ pages, spreadIdx, side }: { pages: CataloguePage[]; spreadIdx: number; side: 'left' | 'right' }) {
  if (spreadIdx === 0) return null
  const idx = (spreadIdx - 1) * 2 + (side === 'right' ? 1 : 0)
  if (idx >= pages.length) return null
  return (
    <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white/70 pointer-events-none">
      {idx + 1}
    </span>
  )
}

function FlipbookViewer({ pages, brand, onClose, containImages }: { pages: CataloguePage[]; brand: ProductBrand; onClose: () => void; containImages?: boolean }) {
  const [spread, setSpread] = useState(0)
  const [flipState, setFlipState] = useState<FlipState | null>(null)
  const totalSpreads = 1 + Math.ceil(pages.length / 2)
  const isAnimating = flipState !== null
  const isFirst = spread === 0
  const isLast = spread >= totalSpreads - 1
  const bgSpread = flipState ? flipState.to : spread

  const goNext = useCallback(() => {
    if (isAnimating || spread >= totalSpreads - 1) return
    setFlipState({ dir: 'next', from: spread, to: spread + 1 })
  }, [isAnimating, spread, totalSpreads])

  const goPrev = useCallback(() => {
    if (isAnimating || spread <= 0) return
    setFlipState({ dir: 'prev', from: spread, to: spread - 1 })
  }, [isAnimating, spread])

  const onFlipComplete = useCallback(() => {
    setSpread(prev => flipState?.to ?? prev)
    setFlipState(null)
  }, [flipState])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goNext()
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') goPrev()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, onClose])

  const jumpTo = useCallback((targetSpread: number) => {
    if (isAnimating || targetSpread === spread) return
    setFlipState({ dir: targetSpread > spread ? 'next' : 'prev', from: spread, to: targetSpread })
  }, [isAnimating, spread])

  const slotProps = { pages, brand, containImages }
  const isCoverStatic = spread === 0 && !flipState
  const isCoverFlipping = !!flipState && flipState.dir === 'next' && flipState.from === 0
  const isCoverBackFlipping = !!flipState && flipState.dir === 'prev' && flipState.to === 0

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-white">{brand.name}</span>
          <span className="text-slate-500">—</span>
          <span className="text-sm text-slate-400">Catalogue Flipbook</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            {spread === 0 ? 'Cover' : `Pages ${(spread - 1) * 2 + 1}–${Math.min((spread - 1) * 2 + 2, pages.length)}`}
            {' · '}{spread + 1} / {totalSpreads}
          </span>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Book area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <button onClick={goPrev} disabled={isFirst || isAnimating} className="absolute left-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/15 disabled:pointer-events-none disabled:opacity-20">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div style={{ perspective: '2200px', perspectiveOrigin: '50% 50%' }}>
          <div
            className={`relative ${!isCoverStatic && !isCoverFlipping && !isCoverBackFlipping ? 'shadow-[0_30px_60px_rgba(0,0,0,0.6)]' : ''}`}
            style={{ width: 'min(62vw, 960px)', height: 'min(72vh, 660px)' }}
          >
            {isCoverStatic ? (
              <div className="absolute inset-y-0 right-0 overflow-hidden rounded-sm shadow-[0_30px_60px_rgba(0,0,0,0.6)]" style={{ width: '50%' }}>
                <CoverPage brand={brand} />
              </div>
            ) : isCoverFlipping ? (
              <div className="absolute inset-y-0 right-0 overflow-hidden rounded-r-sm shadow-[0_30px_60px_rgba(0,0,0,0.6)]" style={{ width: '50%' }}>
                <PageSlot {...slotProps} spreadIdx={flipState.to} side="right" />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-linear-to-r from-black/40 to-transparent" />
              </div>
            ) : isCoverBackFlipping ? (
              <div className="absolute inset-y-0 right-0 overflow-hidden rounded-r-sm" style={{ width: '50%' }}>
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

            {flipState?.dir === 'next' && (
              <>
                {flipState.from !== 0 && (
                  <div className="absolute inset-y-0 left-0 z-20 overflow-hidden rounded-l-sm" style={{ width: '50%' }}>
                    <PageSlot {...slotProps} spreadIdx={flipState.from} side="left" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-black/40 to-transparent" />
                    <PageLabel {...slotProps} spreadIdx={flipState.from} side="left" />
                  </div>
                )}
                <motion.div className="absolute inset-y-0 z-30" style={{ left: '50%', right: 0, ...preserve3d, transformOrigin: 'left center' }} initial={{ rotateY: 0 }} animate={{ rotateY: -180 }} transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }} onAnimationComplete={onFlipComplete}>
                  <div className="absolute inset-0 overflow-hidden rounded-r-sm" style={backfaceHidden}>
                    <PageSlot {...slotProps} spreadIdx={flipState.from} side="right" />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-black/30 to-transparent" />
                    <PageLabel {...slotProps} spreadIdx={flipState.from} side="right" />
                  </div>
                  <div className="absolute inset-0 overflow-hidden rounded-l-sm" style={{ ...backfaceHidden, transform: 'rotateY(180deg)' }}>
                    <PageSlot {...slotProps} spreadIdx={flipState.to} side="left" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-black/30 to-transparent" />
                  </div>
                </motion.div>
              </>
            )}

            {flipState?.dir === 'prev' && (
              <>
                <div className="absolute inset-y-0 right-0 z-20 overflow-hidden rounded-r-sm" style={{ width: '50%' }}>
                  <PageSlot {...slotProps} spreadIdx={flipState.from} side="right" />
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-linear-to-r from-black/40 to-transparent" />
                  <PageLabel {...slotProps} spreadIdx={flipState.from} side="right" />
                </div>
                <motion.div className="absolute inset-y-0 z-30" style={{ left: 0, right: '50%', ...preserve3d, transformOrigin: 'right center' }} initial={{ rotateY: 0 }} animate={{ rotateY: 180 }} transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }} onAnimationComplete={onFlipComplete}>
                  <div className="absolute inset-0 overflow-hidden rounded-l-sm" style={backfaceHidden}>
                    <PageSlot {...slotProps} spreadIdx={flipState.from} side="left" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-black/30 to-transparent" />
                    <PageLabel {...slotProps} spreadIdx={flipState.from} side="left" />
                  </div>
                  <div className="absolute inset-0 overflow-hidden rounded-r-sm" style={{ ...backfaceHidden, transform: 'rotateY(180deg)' }}>
                    <PageSlot {...slotProps} spreadIdx={flipState.to} side="right" />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-black/30 to-transparent" />
                  </div>
                </motion.div>
              </>
            )}

            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-40 w-1 -translate-x-1/2 bg-linear-to-r from-slate-700 via-slate-300 to-slate-700" />

            {!isAnimating && (
              <>
                {!isFirst && <button onClick={goPrev} className="absolute inset-y-0 left-0 z-50 w-1/2 cursor-w-resize" aria-label="Previous page" />}
                {!isLast && <button onClick={goNext} className="absolute inset-y-0 right-0 z-50 w-1/2 cursor-e-resize" aria-label="Next page" />}
              </>
            )}
          </div>
        </div>

        <button onClick={goNext} disabled={isLast || isAnimating} className="absolute right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/15 disabled:pointer-events-none disabled:opacity-20">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="h-[90px] shrink-0 overflow-x-auto border-t border-white/8 bg-slate-900/80 px-4">
        <div className="flex h-full items-center gap-2">
          <button onClick={() => jumpTo(0)} className={`relative h-[62px] w-[46px] shrink-0 overflow-hidden rounded transition-all ${spread === 0 ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-slate-900' : 'opacity-40 hover:opacity-75'}`}>
            <div className="h-full w-full bg-slate-800 flex items-center justify-center" style={{ backgroundImage: brand.image ? `url(${brand.image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              {!brand.image && <BookOpen className="h-4 w-4 text-slate-500" />}
              <div className="absolute inset-0 bg-slate-900/50" />
            </div>
            <span className="absolute inset-x-0 bottom-0 bg-black/70 py-px text-center text-[8px] text-white/80">Cover</span>
          </button>
          {pages.map((page, i) => {
            const s = Math.floor(i / 2) + 1
            const active = s === spread
            return (
              <button key={i} onClick={() => jumpTo(s)} className={`relative h-[62px] w-[46px] shrink-0 overflow-hidden rounded transition-all ${active ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-slate-900' : 'opacity-40 hover:opacity-75'}`}>
                {page.type === 'video' ? (
                  <><video src={page.url} className="h-full w-full object-cover" preload="metadata" muted /><div className="absolute inset-0 flex items-center justify-center"><Play className="h-3 w-3 fill-white text-white drop-shadow" /></div></>
                ) : (
                  <img src={page.url} alt={`Pg ${i + 1}`} className="h-full w-full object-cover" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-px text-center text-[8px] text-white/80">{i + 1}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function BrandCatalogueFlipbook({ brand }: { brand: ProductBrand }) {
  const [viewerOpen, setViewerOpen] = useState(false)

  const { data: catalogueData } = useGetPublicWebPageItemsQuery('merchant-catalogue')
  const { data: productsData } = useGetPublicProductsQuery(
    { page: 1, perPage: 100, brandType: brand.id },
  )

  const catalogueItem = (catalogueData?.items ?? [] as WebPageItem[]).find((item: WebPageItem) => item.key === brandItemKey(brand.id))
  const cataloguePages: CataloguePage[] = (catalogueItem?.payload?.pages as CataloguePage[] | undefined) ?? []

  // Fall back to product images when no catalogue pages have been uploaded
  const productPages: CataloguePage[] = (productsData?.products ?? [])
    .filter(p => !!p.image)
    .map(p => ({
      url: p.image!,
      type: 'image' as const,
      name: p.name,
      description: p.description ? stripHtml(p.description) : undefined,
    }))

  const pages = cataloguePages.length > 0 ? cataloguePages : productPages
  const isCatalogue = cataloguePages.length > 0

  if (pages.length === 0) return null

  return (
    <>
      <button
        onClick={() => setViewerOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-lg hover:shadow-violet-300 active:scale-95 dark:shadow-violet-900/40 dark:hover:shadow-violet-900/60"
      >
        <BookOpen className="h-4 w-4" />
        View Digital Catalogue
      </button>

      <AnimatePresence>
        {viewerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <FlipbookViewer pages={pages} brand={brand} onClose={() => setViewerOpen(false)} containImages={!isCatalogue} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
