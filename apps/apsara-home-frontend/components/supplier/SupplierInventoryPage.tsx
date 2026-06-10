'use client'

import { useCallback, useRef, useState, useMemo } from 'react'
import { cn } from 'tailwind-variants'
import Image from 'next/image'
import {
  RefreshCw, Search, Warehouse, PackageCheck, PackageMinus,
  PackageX, Boxes, Plus, Minus, X, TrendingUp, ChevronRight,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useGetPublicProductBrandsQuery } from '@/store/api/productBrandsApi'
import { useGetSuppliersQuery } from '@/store/api/suppliersApi'
import {
  useGetZqCachedProductsQuery,
  useLazyGetZqInventoryQuery,
  useGetProductsQuery,
  useUpdateProductMutation,
  ZqCachedProduct,
  Product,
} from '@/store/api/productsApi'
import { showErrorToast, showSuccessToast } from '@/libs/toast'

/* ═══════════════════════════════════════════════════════════
   SPARKLINE — smoothstep interpolation between real checkpoints
═══════════════════════════════════════════════════════════ */

const N_POINTS = 30   // higher resolution → smoother curve

/**
 * Builds smooth sparkline data using smoothstep interpolation between
 * real checkpoints (one checkpoint per product added, sorted by id).
 * Each transition is an S-curve so the line flows naturally.
 */
function buildSparkline(products: Product[], getVal: (subset: Product[]) => number): number[] {
  const n = N_POINTS
  if (products.length === 0) return Array(n).fill(0)

  const sorted = [...products].sort((a, b) => a.id - b.id)

  // checkpoints: 0 → val after product 1 → val after product 2 → …
  const checkpoints = [0, ...sorted.map((_, i) => getVal(sorted.slice(0, i + 1)))]

  return Array.from({ length: n }, (_, i) => {
    const t        = i / (n - 1)                           // 0 … 1
    const cpFloat  = t * (checkpoints.length - 1)
    const lo       = Math.floor(cpFloat)
    const hi       = Math.min(lo + 1, checkpoints.length - 1)
    const frac     = cpFloat - lo
    const sf       = frac * frac * (3 - 2 * frac)         // smoothstep
    return checkpoints[lo] + (checkpoints[hi] - checkpoints[lo]) * sf
  })
}

function pctChange(points: number[]): number {
  const first = points[0] ?? 0
  const last  = points[points.length - 1] ?? 0
  if (first === 0 && last === 0) return 0
  if (first === 0) return 100
  return Math.round(((last - first) / Math.abs(first)) * 100)
}

/** Catmull-Rom → smooth cubic bezier path through all pts */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`
  const d = [`M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`)
  }
  return d.join(' ')
}

function SparklineChart({ data, color, uid }: { data: number[]; color: string; uid: string }) {
  const W = 110, H = 48, P = 3
  const allZero = data.every(v => v === 0)
  const peak    = allZero ? 1 : Math.max(...data)
  const yOf     = (v: number) => allZero ? H - 1 : H - P - (v / peak) * (H - P * 2)

  const pts = data.map((v, i) => ({
    x: P + (i / Math.max(data.length - 1, 1)) * (W - P * 2),
    y: yOf(v),
  }))

  const line = smoothPath(pts)
  const area = `${line} L${pts[pts.length - 1].x.toFixed(2)},${H} L${pts[0].x.toFixed(2)},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sgl-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gradient fill under the line */}
      {!allZero && <path d={area} fill={`url(#sgl-${uid})`} />}
      {/* smooth stroke line — no dots, modern look */}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════════ */

interface StatDef {
  key: string
  label: string
  displayValue: string
  points: number[]
  strokeColor: string
  iconBg: string
  iconColor: string
  icon: React.ReactNode
  positiveIsGood: boolean
}

function StatCard({ stat }: { stat: StatDef }) {
  const pct = pctChange(stat.points)
  const isUp   = pct > 0
  const isDown = pct < 0
  const changeColor = stat.positiveIsGood
    ? (isUp ? 'text-emerald-500' : isDown ? 'text-rose-500' : 'text-slate-400')
    : (isUp ? 'text-rose-500'   : isDown ? 'text-emerald-500' : 'text-slate-400')

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white px-5 pt-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Top row: icon+label left / sparkline right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Icon + label */}
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', stat.iconBg, stat.iconColor)}>
              {stat.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-tight">
              {stat.label}
            </span>
          </div>
          {/* Big value */}
          <p className="mt-3 text-[2.25rem] font-bold leading-none text-slate-900 dark:text-white">
            {stat.displayValue}
          </p>
        </div>

        {/* Sparkline */}
        <div className="h-17 w-26.5 shrink-0">
          <SparklineChart data={stat.points} color={stat.strokeColor} uid={stat.key} />
        </div>
      </div>

      {/* Bottom: pct change */}
      <div className="mt-3 pb-4 flex items-center gap-1.5">
        <span className={cn('flex items-center gap-0.5 text-[12px] font-bold', changeColor)}>
          {isUp ? (
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : isDown ? (
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          ) : (
            <span className="font-bold leading-none">—</span>
          )}
          {Math.abs(pct)}%
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">vs last 7 days</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MOVING BADGE
═══════════════════════════════════════════════════════════ */

function MovingBadge({ isMoving, lastSoldAt }: { isMoving?: boolean | null; lastSoldAt?: string | null }) {
  if (isMoving === null || isMoving === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        No sales yet
      </span>
    )
  }
  if (isMoving) {
    const label = lastSoldAt
      ? `Last sold ${new Date(lastSoldAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`
      : 'Moving'
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-bold text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:ring-cyan-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
        Moving · {label}
      </span>
    )
  }
  const label = lastSoldAt
    ? `Last sold ${new Date(lastSoldAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'No recent sales'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Non-moving · {label}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   STOCK BADGE
═══════════════════════════════════════════════════════════ */

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Out of stock
      </span>
    )
  if (qty <= 5)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-400">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        Low — {qty.toLocaleString()}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {qty.toLocaleString()} in stock
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   ADD STOCK MODAL
═══════════════════════════════════════════════════════════ */

interface StockModalState { product: Product; mode: 'add' | 'set' }

function AddStockModal({ state, onClose, onSaved }: {
  state: StockModalState
  onClose: () => void
  onSaved: (productId: number, qty: number) => void
}) {
  const { product } = state
  const hasVariants  = Array.isArray(product.variants) && product.variants.length > 0
  const [mode, setMode]             = useState<'add' | 'set'>(state.mode)
  const [simpleInput, setSimple]    = useState('')
  const [varInputs, setVarInputs]   = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {}
    ;(product.variants ?? []).forEach(v => { if (v.id != null) m[v.id] = '' })
    return m
  })
  const [saving, setSaving]         = useState(false)
  const [updateProduct]             = useUpdateProductMutation()
  const currentQty                  = Number(product.qty ?? 0)

  function step(delta: number) {
    setSimple(s => String(Math.max(0, (Number(s) || 0) + delta)))
  }
  function stepVar(id: number, delta: number) {
    setVarInputs(prev => ({ ...prev, [id]: String(Math.max(0, (Number(prev[id]) || 0) + delta)) }))
  }

  function previewQty(): number {
    if (hasVariants) {
      return (product.variants ?? []).reduce((t, v) => {
        if (v.id == null) return t
        const inp = Number(varInputs[v.id] ?? 0) || 0
        return t + (mode === 'add' ? Number(v.qty ?? 0) + inp : inp)
      }, 0)
    }
    const inp = Number(simpleInput) || 0
    return mode === 'add' ? currentQty + inp : inp
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      if (hasVariants) {
        const variants = (product.variants ?? []).map(v => ({
          pv_sku: v.sku ?? undefined,
          pv_name: v.name ?? undefined,
          pv_color: v.color ?? undefined,
          pv_size: v.size ?? undefined,
          pv_style: v.style ?? undefined,
          pv_price_srp: v.priceSrp ?? undefined,
          pv_price_dp: v.priceDp ?? undefined,
          pv_price_member: v.priceMember ?? undefined,
          pv_prodpv: v.prodpv ?? undefined,
          pv_qty: v.id != null
            ? (mode === 'add' ? Number(v.qty ?? 0) + (Number(varInputs[v.id] ?? 0) || 0) : Number(varInputs[v.id] ?? 0) || 0)
            : Number(v.qty ?? 0),
          pv_status: v.status ?? 1,
        }))
        await updateProduct({ id: product.id, data: { pd_variants: variants } }).unwrap()
        onSaved(product.id, previewQty())
        showSuccessToast('Variant stock updated.')
      } else {
        const inp = Number(simpleInput) || 0
        const newQty = mode === 'add' ? currentQty + inp : inp
        await updateProduct({ id: product.id, data: { pd_qty: newQty } }).unwrap()
        onSaved(product.id, newQty)
        showSuccessToast('Stock updated successfully.')
      }
      onClose()
    } catch {
      showErrorToast('Failed to update stock.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
              {product.image
                ? <Image src={product.image} alt={product.name} fill className="object-cover" unoptimized />
                : <div className="flex h-full w-full items-center justify-center"><Warehouse className="h-5 w-5 text-slate-300" /></div>}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Manage Stock</h2>
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{product.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Current stock */}
          <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Boxes className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Stock</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{currentQty.toLocaleString()} units</p>
            </div>
            {hasVariants && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600">
                {product.variants!.length} variants
              </span>
            )}
          </div>

          {/* Mode toggle */}
          <div className="mb-5 flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            {([{ v: 'add', l: '+ Add to Stock' }, { v: 'set', l: '= Set Exact Qty' }] as const).map(opt => (
              <button key={opt.v} type="button" onClick={() => setMode(opt.v)}
                className={cn('flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
                  mode === opt.v ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700')}>
                {opt.l}
              </button>
            ))}
          </div>

          {/* Input */}
          {hasVariants ? (
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {mode === 'add' ? 'Units to add per variant' : 'Set qty per variant'}
              </p>
              {(product.variants ?? []).map(v => {
                if (v.id == null) return null
                const label = [v.name, v.color, v.size, v.style].filter(Boolean).join(' · ') || `Variant #${v.id}`
                const cur = Number(v.qty ?? 0)
                const inp = Number(varInputs[v.id] ?? '') || 0
                const preview = mode === 'add' ? cur + inp : inp
                return (
                  <div key={v.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[12px] font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                      <p className="text-[11px] text-slate-400">
                        Current: <span className="font-semibold text-slate-600 dark:text-slate-300">{cur}</span>
                        {inp > 0 && <span className="ml-1 font-bold text-indigo-600"> → {preview}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => stepVar(v.id!, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                        <Minus className="h-3 w-3" />
                      </button>
                      <input type="number" min="0" value={varInputs[v.id] ?? ''} placeholder="0"
                        onChange={e => setVarInputs(p => ({ ...p, [v.id!]: e.target.value }))}
                        className="h-7 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                      <button type="button" onClick={() => stepVar(v.id!, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {mode === 'add' ? 'Units to add' : 'Set exact quantity'}
              </p>
              <div className="flex items-center gap-2">
                {[-10, -1].map(d => (
                  <button key={d} type="button" onClick={() => step(d)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                    {d === -1 ? <Minus className="h-4 w-4" /> : d}
                  </button>
                ))}
                <input type="number" min="0" value={simpleInput} placeholder="0" onChange={e => setSimple(e.target.value)}
                  className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-center text-2xl font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                {[1, 10].map(d => (
                  <button key={d} type="button" onClick={() => step(d)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                    {d === 1 ? <Plus className="h-4 w-4" /> : `+${d}`}
                  </button>
                ))}
              </div>
              {simpleInput !== '' && Number(simpleInput) > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-2.5 dark:bg-indigo-500/10">
                  <span className="text-xs text-indigo-500">
                    {mode === 'add' ? `${currentQty} + ${simpleInput}` : 'New quantity'}
                  </span>
                  <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                    {previewQty().toLocaleString()} units
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg> : <Plus className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Stock'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT ROW (local supplier)
═══════════════════════════════════════════════════════════ */

function ProductInventoryRow({ product, localQtyOverride, onAddStock }: {
  product: Product
  localQtyOverride?: number
  onAddStock: (p: Product) => void
}) {
  const qty        = localQtyOverride ?? Number(product.qty ?? 0)
  const isActive   = Number(product.status) === 1 || Number(product.status) === 2
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0
  const totalVal   = qty * Number(product.priceSrp ?? 0)

  return (
    <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/20">
      {/* Product */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            {product.image
              ? <Image src={product.image} alt={product.name} fill className="object-cover" unoptimized />
              : <div className="flex h-full w-full items-center justify-center"><Warehouse className="h-5 w-5 text-slate-300" /></div>}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-1 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{product.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                {product.sku || 'No SKU'}
              </span>
              {hasVariants && (
                <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {product.variants!.length} variants
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Quantity */}
      <td className="px-6 py-4">
        <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{qty.toLocaleString()}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">units</p>
      </td>

      {/* Stock Level */}
      <td className="px-6 py-4">
        <StockBadge qty={qty} />
      </td>

      {/* Movement */}
      <td className="px-6 py-4">
        <MovingBadge isMoving={product.isMoving} lastSoldAt={product.lastSoldAt} />
      </td>

      {/* Price SRP */}
      <td className="px-6 py-4">
        <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
          ₱{Number(product.priceSrp ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">SRP</p>
      </td>

      {/* Stock Value */}
      <td className="px-6 py-4">
        <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
          ₱{totalVal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">total value</p>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold',
          isActive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
        )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Action */}
      <td className="px-6 py-4">
        <button type="button" onClick={() => onAddStock(product)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-[12px] font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
          <Plus className="h-3.5 w-3.5" />
          Add Stock
        </button>
      </td>
    </tr>
  )
}

/* ═══════════════════════════════════════════════════════════
   ZQ ROW (unchanged)
═══════════════════════════════════════════════════════════ */

function InventoryRow({ product, index }: { product: ZqCachedProduct; index: number }) {
  const [checkLive, { data, isFetching, isError }] = useLazyGetZqInventoryQuery()
  const hasResult  = data !== undefined || isError
  const isPublished = String(product.status ?? '').toLowerCase() === 'published'

  return (
    <tr className={cn('border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800',
      index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-900/20' : 'bg-white dark:bg-slate-900')}>
      <td className="px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            {product.primaryImage
              ? <Image src={product.primaryImage} alt={product.subject} fill className="object-cover" unoptimized />
              : <div className="flex h-full w-full items-center justify-center"><Warehouse className="h-5 w-5 text-slate-300" /></div>}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800 dark:text-slate-100">{product.subject}</p>
            <span className="mt-1.5 inline-block rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              {product.externalId}
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{product.localCategoryName || product.categoryName || '—'}</p>
        {product.sourceType && <span className="mt-1 inline-block rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">{product.sourceType}</span>}
      </td>
      <td className="px-6 py-4">
        <StockBadge qty={product.totalStock} />
        <p className="mt-1.5 text-[11px] text-slate-400">{product.variantCount} variant{product.variantCount !== 1 ? 's' : ''}</p>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col items-start gap-2">
          <button type="button" disabled={isFetching || !product.externalId} onClick={() => checkLive(product.externalId)}
            className={cn('inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
              hasResult && !isFetching
                ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300'
                : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300')}>
            <RefreshCw className={cn('h-3 w-3', isFetching ? 'animate-spin' : '')} />
            {isFetching ? 'Checking...' : hasResult ? 'Refresh' : 'Check Live'}
          </button>
          {isError && <p className="text-[10px] font-medium text-red-500">Failed to fetch</p>}
          {data && (
            <div className="min-w-27.5 rounded-xl border border-violet-200/60 bg-[linear-gradient(135deg,rgba(139,92,246,0.06),rgba(99,102,241,0.04))] px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400">ZQ Live</p>
              <p className={cn('mt-0.5 text-base font-bold leading-none',
                data.available === 0 ? 'text-red-600' : data.available <= 5 ? 'text-orange-600' : 'text-emerald-700')}>
                {data.available.toLocaleString()}
              </p>
              {data.variant_count ? <p className="mt-0.5 text-[10px] text-slate-400">{data.variant_count} variants</p> : null}
              {(typeof data.locked === 'number' || typeof data.on_transit === 'number') && (
                <p className="mt-1 text-[10px] text-slate-400">Locked {(data.locked ?? 0).toLocaleString()} · Transit {(data.on_transit ?? 0).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
          isPublished ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', isPublished ? 'bg-emerald-500' : 'bg-slate-400')} />
          {isPublished ? 'Published' : (product.status ?? 'Draft')}
        </span>
      </td>
      <td className="px-6 py-4">
        {product.syncedAt ? (
          <div>
            <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{new Date(product.syncedAt).toLocaleDateString('en-CA')}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{new Date(product.syncedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
          </div>
        ) : <span className="text-[12px] text-slate-300">—</span>}
      </td>
    </tr>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */

export default function SupplierInventoryPage() {
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [stockModal, setModal]    = useState<StockModalState | null>(null)
  const [qtyOverrides, setOverrides] = useState<Record<number, number>>({})
  const perPage = 25

  const { data: session, status } = useSession()
  const supplierId    = Number(session?.user?.supplierId ?? 0)
  const supplierName  = session?.user?.supplierName || session?.user?.name || 'Supplier'

  const { data: suppliersData } = useGetSuppliersQuery(undefined, { skip: status !== 'authenticated' })
  const { data: brandsData }    = useGetPublicProductBrandsQuery()

  const supplier = useMemo(() => (suppliersData?.suppliers ?? []).find(s => s.id === supplierId), [supplierId, suppliersData?.suppliers])

  const zqBrandId = useMemo(() => {
    const b = (brandsData?.brands ?? []).find(b => {
      const k = String(b.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      return k === 'zq' || k === 'globalsupplier' || k === 'zqdropshipping'
    })
    return b?.id ? Number(b.id) : 0
  }, [brandsData?.brands])

  const brandType = useMemo(() => {
    const brands = brandsData?.brands ?? []
    if (!brands.length) return 0
    const cands = [supplierName, supplier?.company, supplier?.name]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map(v => v.toLowerCase().replace(/[^a-z0-9]/g, ''))
    if (!cands.length) return 0
    const exact = brands.find(b => {
      const k = String(b.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      return k && cands.includes(k)
    })
    if (exact?.id) return Number(exact.id)
    let bestId = 0, bestScore = 0, bestLen = 0
    brands.forEach(b => {
      const k = String(b.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!k) return
      cands.forEach(c => {
        let s = 0
        if (c === k) s = 3; else if (c.includes(k)) s = 2; else if (k.includes(c)) s = 1
        if (s > 0 && (s > bestScore || (s === bestScore && k.length > bestLen))) { bestScore = s; bestLen = k.length; bestId = Number(b.id ?? 0) }
      })
    })
    return bestId
  }, [brandsData?.brands, supplier?.company, supplier?.name, supplierName])

  const scrollRef  = useRef<HTMLDivElement>(null)
  const dragState  = useRef({ isDragging: false, startX: 0, scrollLeft: 0 })
  const [isDrag, setIsDrag] = useState(false)

  // Detect the AF Home Global / ZQ supplier by name (consistent with ProductsPageMain),
  // falling back to brand-id matching. The hardcoded brand-name keys alone miss
  // "AF HOME GLOBAL SUPPLIER", so name detection is the primary signal.
  const isZqSupplier = useMemo(() => {
    const normName = String(supplierName ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const byName = normName.includes('zqsupplier')
      || normName.includes('afhomeglobalsupplier')
      || normName.includes('globalsupplier')
      || normName.includes('afhomeglobal')
    return byName || (zqBrandId > 0 && brandType === zqBrandId)
  }, [supplierName, zqBrandId, brandType])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button,input,a,[role="button"]')) return
    const el = scrollRef.current; if (!el) return
    dragState.current = { isDragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
    setIsDrag(true)
  }, [])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.isDragging) return
    e.preventDefault()
    const el = scrollRef.current; if (!el) return
    el.scrollLeft = dragState.current.scrollLeft - (e.pageX - el.offsetLeft - dragState.current.startX) * 1.2
  }, [])
  const stopDrag = useCallback(() => { dragState.current.isDragging = false; setIsDrag(false) }, [])

  const { data: zqData, isLoading: zqLoad, isFetching: zqFetch, refetch: zqRefetch } = useGetZqCachedProductsQuery(
    { page, perPage, search: search || undefined }, { skip: !isZqSupplier })
  const { data: spData, isLoading: spLoad, isFetching: spFetch, refetch: spRefetch } = useGetProductsQuery(
    { supplierId, page, perPage, search: search || undefined }, { skip: isZqSupplier || supplierId <= 0 })

  const isLoading  = isZqSupplier ? zqLoad : spLoad
  const isFetching = isZqSupplier ? zqFetch : spFetch
  const refetch    = isZqSupplier ? zqRefetch : spRefetch

  const zqProducts  = useMemo(() => zqData?.products ?? [], [zqData])
  const spProducts  = useMemo(() => spData?.products ?? [], [spData])
  const products    = isZqSupplier ? zqProducts : spProducts
  const meta        = isZqSupplier ? zqData?.meta : spData?.meta

  /* effective qty with local overrides */
  const eqty = (p: Product) => qtyOverrides[p.id] ?? Number(p.qty ?? 0)

  /* ── Real sparklines from sorted product data ── */
  const sorted = useMemo(() => [...spProducts].sort((a, b) => a.id - b.id), [spProducts])

  const sparklines = useMemo(() => ({
    total:    buildSparkline(sorted, s => s.length),
    inStock:  buildSparkline(sorted, s => s.filter(p => eqty(p) > 5).length),
    lowStock: buildSparkline(sorted, s => s.filter(p => eqty(p) > 0 && eqty(p) <= 5).length),
    outStock: buildSparkline(sorted, s => s.filter(p => eqty(p) === 0).length),
    value:    buildSparkline(sorted, s => s.reduce((sum, p) => sum + eqty(p) * Number(p.priceSrp ?? 0), 0)),
  }), [sorted, qtyOverrides])   // eslint-disable-line react-hooks/exhaustive-deps

  /* current totals */
  const totalProducts = meta?.total ?? spProducts.length
  const inStockCount  = spProducts.filter(p => eqty(p) > 5).length
  const lowStockCount = spProducts.filter(p => eqty(p) > 0 && eqty(p) <= 5).length
  const outStockCount = spProducts.filter(p => eqty(p) === 0).length
  const totalValue    = spProducts.reduce((s, p) => s + eqty(p) * Number(p.priceSrp ?? 0), 0)

  const fmtVal = (n: number) =>
    n >= 1_000_000 ? `₱${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `₱${(n / 1_000).toFixed(1)}k`
    : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

  const statCards: StatDef[] = isZqSupplier ? [] : [
    {
      key: 'total', label: 'Total Products', displayValue: String(totalProducts),
      points: sparklines.total,
      strokeColor: '#6366f1', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600',
      icon: <Boxes className="h-4 w-4" />, positiveIsGood: true,
    },
    {
      key: 'instock', label: 'In Stock', displayValue: String(inStockCount),
      points: sparklines.inStock,
      strokeColor: '#10b981', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
      icon: <PackageCheck className="h-4 w-4" />, positiveIsGood: true,
    },
    {
      key: 'lowstock', label: 'Low Stock', displayValue: String(lowStockCount),
      points: sparklines.lowStock,
      strokeColor: '#f97316', iconBg: 'bg-orange-50', iconColor: 'text-orange-600',
      icon: <PackageMinus className="h-4 w-4" />, positiveIsGood: false,
    },
    {
      key: 'outstock', label: 'Out of Stock', displayValue: String(outStockCount),
      points: sparklines.outStock,
      strokeColor: '#f43f5e', iconBg: 'bg-rose-50', iconColor: 'text-rose-600',
      icon: <PackageX className="h-4 w-4" />, positiveIsGood: false,
    },
    {
      key: 'value', label: 'Total Value', displayValue: fmtVal(totalValue),
      points: sparklines.value,
      strokeColor: '#3b82f6', iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
      icon: <TrendingUp className="h-4 w-4" />, positiveIsGood: true,
    },
  ]

  const localCols = ['Product', 'Quantity', 'Stock Level', 'Movement', 'Price SRP', 'Stock Value', 'Status', 'Action']
  const zqCols    = ['Product', 'Category', 'Cached Stock', 'Live Check', 'Status', 'Last Synced']
  const cols      = isZqSupplier ? zqCols : localCols

  return (
    <>
      <div className="space-y-6 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={cn('text-[10px] font-bold uppercase tracking-[0.22em]',
              isZqSupplier ? 'text-violet-600 dark:text-violet-400' : 'text-indigo-600 dark:text-indigo-400')}>
              {supplierName}
            </p>
            <h1 className="mt-1 text-[1.75rem] font-bold text-slate-900 dark:text-white">
              {isZqSupplier ? 'ZQ Inventory' : 'Product Inventory'}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isZqSupplier
                ? 'Live warehouse stock from Global Supplier (ZQ) — check per product on demand.'
                : 'View and manage your product inventory levels. Click Add Stock on any row to update quantities.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search products..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="h-10 w-52 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
            </div>
            <button type="button" onClick={() => refetch()} disabled={isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <RefreshCw className={cn('h-4 w-4', isFetching ? 'animate-spin' : '')} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        {!isZqSupplier && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {statCards.map(stat => <StatCard key={stat.key} stat={stat} />)}
          </div>
        )}

        {/* ZQ stat cards (simple, no sparklines) */}
        {isZqSupplier && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Products', value: meta?.total ?? 0, icon: <Boxes className="h-4 w-4" />, iconBg: 'bg-slate-100', iconColor: 'text-slate-500' },
              { label: 'In Stock',  value: (zqProducts as ZqCachedProduct[]).filter(p => p.totalStock > 5).length, icon: <PackageCheck className="h-4 w-4" />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
              { label: 'Low Stock', value: (zqProducts as ZqCachedProduct[]).filter(p => p.totalStock > 0 && p.totalStock <= 5).length, icon: <PackageMinus className="h-4 w-4" />, iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
              { label: 'Out of Stock', value: (zqProducts as ZqCachedProduct[]).filter(p => p.totalStock === 0).length, icon: <PackageX className="h-4 w-4" />, iconBg: 'bg-red-50', iconColor: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{s.value.toLocaleString()}</p>
                  </div>
                  <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', s.iconBg, s.iconColor)}>{s.icon}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Alert banners ── */}
        {!isZqSupplier && (
          <>
            {lowStockCount > 0 && (
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-5 py-3.5 text-left transition hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/8">
                <PackageMinus className="h-5 w-5 shrink-0 text-orange-500" />
                <p className="flex-1 text-sm font-semibold text-orange-700 dark:text-orange-300">
                  {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} with low stock — consider restocking soon.
                </p>
                <ChevronRight className="h-4 w-4 shrink-0 text-orange-400" />
              </button>
            )}
            {outStockCount > 0 && (
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-3.5 text-left transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/8">
                <PackageX className="h-5 w-5 shrink-0 text-red-500" />
                <p className="flex-1 text-sm font-semibold text-red-700 dark:text-red-300">
                  {outStockCount} product{outStockCount !== 1 ? 's are' : ' is'} out of stock — restock immediately.
                </p>
                <ChevronRight className="h-4 w-4 shrink-0 text-red-400" />
              </button>
            )}
          </>
        )}

        {/* ── Table ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isFetching && (
            <div className="h-0.5 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <div className="h-full animate-[shimmer_1.4s_ease-in-out_infinite] bg-linear-to-r from-indigo-400 via-sky-400 to-indigo-400 bg-size-[200%_100%]" />
            </div>
          )}

          <div ref={scrollRef} className={cn('overflow-x-auto', isDrag ? 'cursor-grabbing select-none' : 'cursor-grab')}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={stopDrag} onMouseLeave={stopDrag}>
            <table className="w-full min-w-225 border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40">
                  {cols.map(col => (
                    <th key={col} className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/4 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                            <div className="h-2.5 w-1/3 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: cols.length - 1 }).map((_, c) => (
                        <td key={c} className="px-6 py-4">
                          <div className="h-5 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={cols.length} className="py-20 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                        <Warehouse className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">No products found</p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {search ? 'Try a different search term.' : isZqSupplier ? 'Sync products from Global Supplier first.' : 'Add products to your inventory.'}
                      </p>
                    </td>
                  </tr>
                ) : isZqSupplier ? (
                  (products as ZqCachedProduct[]).map((p, i) => <InventoryRow key={p.id} product={p} index={i} />)
                ) : (
                  (products as Product[]).map(p => (
                    <ProductInventoryRow
                      key={p.id}
                      product={p}
                      localQtyOverride={qtyOverrides[p.id]}
                      onAddStock={prod => setModal({ product: prod, mode: 'add' })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-800/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {meta
                  ? <>{(meta.from ?? 0).toLocaleString()}–{(meta.to ?? 0).toLocaleString()} of <span className="font-semibold text-slate-700 dark:text-slate-200">{meta.total.toLocaleString()}</span> products</>
                  : 'Loading…'}
              </p>
              {meta && meta.last_page > 1 && (
                <div className="flex items-center gap-2">
                  <button type="button" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    ← Prev
                  </button>
                  <span className="min-w-18 text-center text-sm font-medium text-slate-500">{page} / {meta.last_page}</span>
                  <button type="button" disabled={page === meta.last_page} onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Stock Modal */}
      {stockModal && (
        <AddStockModal
          state={stockModal}
          onClose={() => setModal(null)}
          onSaved={(id, qty) => { setOverrides(p => ({ ...p, [id]: qty })); setModal(null) }}
        />
      )}
    </>
  )
}
