'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { showErrorToast, showSuccessToast } from '@/libs/toast'
import {
  type SupplierFulfillmentStatus,
  type SupplierOrdersResponse,
  useApproveSupplierOrderMutation,
  useGetSupplierOrdersQuery,
  usePushSupplierOrderToZqMutation,
  useUpdateSupplierOrderFulfillmentMutation,
} from '@/store/api/supplierOrdersApi'
import { useGetSupplierCategoriesQuery } from '@/store/api/suppliersApi'


/* ─── Sparkline paths (decorative, 7-point normalised to 60×28 viewBox) ─── */
const SPARKLINES: Record<string, string> = {
  total:     'M0,22 L10,18 L20,14 L30,16 L40,8  L50,10 L60,4',
  toPay:     'M0,18 L10,20 L20,14 L30,16 L40,12 L50,18 L60,10',
  toShip:    'M0,20 L10,16 L20,18 L30,10 L40,14 L50,6  L60,4',
  toReceive: 'M0,16 L10,20 L20,18 L30,22 L40,14 L50,18 L60,12',
  completed: 'M0,22 L10,20 L20,22 L30,18 L40,16 L50,12 L60,8',
  cancelled: 'M0,14 L10,18 L20,12 L30,20 L40,10 L50,16 L60,14',
  return:    'M0,18 L10,14 L20,18 L30,12 L40,16 L50,10 L60,14',
}

const STAT_CONFIG = [
  {
    key: 'total',     filterVal: 'all',        label: 'Total Orders',
    iconBg: 'bg-indigo-50',    iconColor: 'text-indigo-500',
    lineColor: '#818cf8',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    key: 'toPay',     filterVal: 'to_pay',     label: 'To Pay',
    iconBg: 'bg-orange-50',    iconColor: 'text-orange-500',
    lineColor: '#fb923c',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: 'toShip',    filterVal: 'to_ship',    label: 'To Ship',
    iconBg: 'bg-sky-50',       iconColor: 'text-sky-500',
    lineColor: '#38bdf8',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    key: 'toReceive', filterVal: 'to_receive', label: 'To Receive',
    iconBg: 'bg-teal-50',      iconColor: 'text-teal-500',
    lineColor: '#2dd4bf',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
  {
    key: 'completed', filterVal: 'completed',  label: 'Completed',
    iconBg: 'bg-emerald-50',   iconColor: 'text-emerald-500',
    lineColor: '#34d399',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'cancelled', filterVal: 'cancelled',  label: 'Cancelled',
    iconBg: 'bg-red-50',       iconColor: 'text-red-500',
    lineColor: '#f87171',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'return',    filterVal: 'return',     label: 'Returns',
    iconBg: 'bg-amber-50',     iconColor: 'text-amber-500',
    lineColor: '#fbbf24',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
  },
]

const ORDER_FILTER_OPTIONS = [
  { value: 'all',        label: 'All Orders' },
  { value: 'to_pay',     label: 'To Pay' },
  { value: 'to_ship',    label: 'To Ship' },
  { value: 'to_receive', label: 'To Receive' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
  { value: 'return',     label: 'Return' },
]

const INQUIRY_FILTER_OPTIONS = [
  { value: 'all',        label: 'All Inquiries' },
  { value: 'to_pay',     label: 'Pending' },
  { value: 'to_ship',    label: 'In Progress' },
  { value: 'to_receive', label: 'Awaiting' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
  { value: 'return',     label: 'Rejected' },
]

const FULFILLMENT_OPTIONS: Array<{ value: SupplierFulfillmentStatus; label: string }> = [
  { value: 'processing',       label: 'Processing' },
  { value: 'packed',           label: 'Packed' },
  { value: 'shipped',          label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered',        label: 'Delivered' },
  { value: 'cancelled',        label: 'Cancelled' },
  { value: 'returned',         label: 'Returned' },
]

const INQUIRY_FULFILLMENT_OPTIONS: Array<{ value: SupplierFulfillmentStatus; label: string }> = [
  { value: 'processing',       label: 'Reviewing' },
  { value: 'packed',           label: 'Confirmed' },
  { value: 'shipped',          label: 'Ongoing' },
  { value: 'out_for_delivery', label: 'Completing' },
  { value: 'delivered',        label: 'Completed' },
  { value: 'cancelled',        label: 'Cancelled' },
  { value: 'returned',         label: 'Rejected' },
]

const SERVICES_STAT_LABELS = ['Total Inquiries', 'Total New', 'In Progress', 'Awaiting', 'Completed', 'Cancelled', 'Rejected']
const SERVICES_VISIBLE_KEYS = ['total', 'toPay', 'completed']

/* avatar gradient colours cycling by index */
const AVATAR_GRADIENTS = [
  'from-violet-500 to-indigo-500',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-amber-500',
  'from-pink-400 to-rose-500',
]

function formatMoney(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v || 0)
}
function parseDate(v?: string | null) {
  if (!v) return null
  const s = v.trim().replace(' ', 'T')
  const d = new Date(/([zZ]|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+08:00`)
  return Number.isNaN(d.getTime()) ? null : d
}
function fmtDate(v?: string | null) {
  const d = parseDate(v)
  return d ? d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}
function fmtTime(v?: string | null) {
  const d = parseDate(v)
  return d ? d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }) : ''
}
function getInitials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}
function isNew(v?: string | null) {
  const d = parseDate(v)
  return d ? Date.now() - d.getTime() < 86_400_000 : false
}
function getApiError(err: unknown, fallback: string) {
  return (err as { data?: { message?: string } })?.data?.message || fallback
}

/* ── Sparkline SVG ── */
function Sparkline({ path, color }: { path: string; color: string }) {
  return (
    <svg viewBox="0 0 60 28" className="h-10 w-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L60,28 L0,28 Z`}
        fill={`url(#sg-${color.replace('#', '')})`}
      />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Percentage change pill ── */
function ChangePill({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-500">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        {value}%
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
      <span className="text-sm leading-none">—</span>
      0%
    </span>
  )
}

/* ── Status chips matching the screenshot ── */
function ApprovalChip({ status, isServicesView = false }: { status: string; isServicesView?: boolean }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-200">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {isServicesView ? 'Accepted' : 'Approved'}
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {isServicesView ? 'Declined' : 'Rejected'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-200">
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {isServicesView ? 'Pending Review' : 'Pending'}
    </span>
  )
}

const INQUIRY_FULFILLMENT_LABELS: Record<string, string> = {
  pending:          'New',
  processing:       'Reviewing',
  packed:           'Confirmed',
  shipped:          'Ongoing',
  out_for_delivery: 'Completing',
  delivered:        'Completed',
  cancelled:        'Cancelled',
  returned:         'Rejected',
}

function FulfillmentChip({ status, isServicesView = false }: { status: string; isServicesView?: boolean }) {
  const map: Record<string, { dot: string; text: string; bg: string; ring: string }> = {
    pending:          { dot: 'bg-slate-400',   text: 'text-slate-500',   bg: 'bg-slate-50',   ring: 'ring-slate-200' },
    processing:       { dot: 'bg-blue-500',    text: 'text-blue-600',    bg: 'bg-blue-50',    ring: 'ring-blue-200' },
    packed:           { dot: 'bg-violet-500',  text: 'text-violet-600',  bg: 'bg-violet-50',  ring: 'ring-violet-200' },
    shipped:          { dot: 'bg-sky-500',     text: 'text-sky-600',     bg: 'bg-sky-50',     ring: 'ring-sky-200' },
    out_for_delivery: { dot: 'bg-amber-500',   text: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200' },
    delivered:        { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
    cancelled:        { dot: 'bg-rose-500',    text: 'text-rose-600',    bg: 'bg-rose-50',    ring: 'ring-rose-200' },
    returned:         { dot: 'bg-orange-500',  text: 'text-orange-600',  bg: 'bg-orange-50',  ring: 'ring-orange-200' },
  }
  const s = map[status] ?? map.pending
  const label = isServicesView
    ? (INQUIRY_FULFILLMENT_LABELS[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    : status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function SupplierOrdersPage({ initialData }: { initialData?: SupplierOrdersResponse }) {
  const { data: session } = useSession()
  const supplierId = Number(session?.user?.supplierId ?? 0)
  const { data: supplierCategoriesData } = useGetSupplierCategoriesQuery(supplierId, {
    skip: !session || supplierId <= 0,
  })
  const isServicesView = useMemo(
    () => (supplierCategoriesData?.categories ?? []).some((c) => c.name.toLowerCase() === 'services'),
    [supplierCategoriesData?.categories],
  )

  const activeFilterOptions  = isServicesView ? INQUIRY_FILTER_OPTIONS  : ORDER_FILTER_OPTIONS
  const activeFulfillOptions = isServicesView ? INQUIRY_FULFILLMENT_OPTIONS : FULFILLMENT_OPTIONS

  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [filter, setFilter]           = useState('all')
  const [busyId, setBusyId]           = useState<number | null>(null)
  const [fulfillDrafts, setFulfillDrafts] = useState<Record<number, SupplierFulfillmentStatus>>({})
  const [expandedId, setExpandedId]   = useState<number | null>(null)
  const [filterOpen, setFilterOpen]   = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isError } = useGetSupplierOrdersQuery(
    { filter, search: debouncedSearch || undefined, page: 1, perPage: 20 },
  )

  const [updateFulfillment] = useUpdateSupplierOrderFulfillmentMutation()
  const [approveOrder]      = useApproveSupplierOrderMutation()
  const [pushToZq]          = usePushSupplierOrderToZqMutation()

  const effectiveData = data ?? initialData ?? null
  const orders = useMemo(() => effectiveData?.orders ?? [], [effectiveData])

  useEffect(() => {
    if (!orders.length) return
    setFulfillDrafts(cur => {
      const next = { ...cur }
      for (const o of orders) next[o.id] = (o.fulfillment_status as SupplierFulfillmentStatus) || 'processing'
      return next
    })
  }, [orders])

  const counts = useMemo(() => ({
    total:     effectiveData?.counts?.total      ?? orders.length,
    toPay:     effectiveData?.counts?.to_pay     ?? 0,
    toShip:    effectiveData?.counts?.to_ship    ?? 0,
    toReceive: effectiveData?.counts?.to_receive ?? 0,
    completed: effectiveData?.counts?.completed  ?? 0,
    cancelled: effectiveData?.counts?.cancelled  ?? 0,
    return:    effectiveData?.counts?.return      ?? 0,
  }), [effectiveData, orders.length])

  async function handleApprove(id: number) {
    setBusyId(id)
    try {
      const r = await approveOrder({ id }).unwrap()
      showSuccessToast(r.message || 'Order approved.')
    } catch (e) { showErrorToast(getApiError(e, 'Failed to approve order.')) }
    finally { setBusyId(null) }
  }

  async function handlePushToZq(id: number) {
    setBusyId(id)
    try {
      const r = await pushToZq({ id }).unwrap()
      showSuccessToast(r.message || 'Order pushed to ZQ.')
    } catch (e) { showErrorToast(getApiError(e, 'Failed to push to ZQ.')) }
    finally { setBusyId(null) }
  }

  async function saveFulfillment(id: number) {
    const fulfillment_status = fulfillDrafts[id]
    if (!fulfillment_status) return
    setBusyId(id)
    try {
      const r = await updateFulfillment({ id, fulfillment_status }).unwrap()
      showSuccessToast(r.message || 'Fulfillment updated.')
    } catch (e) { showErrorToast(getApiError(e, 'Failed to update fulfillment.')) }
    finally { setBusyId(null) }
  }

  const activeLabel = activeFilterOptions.find(o => o.value === filter)?.label ?? (isServicesView ? 'All Inquiries' : 'All Orders')

  return (
    <div className="space-y-5 pb-10">

      {/* ── Stat Cards ── */}
      {isServicesView ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STAT_CONFIG.filter(stat => SERVICES_VISIBLE_KEYS.includes(stat.key)).map((stat) => {
            const count  = counts[stat.key as keyof typeof counts]
            const active = filter === stat.filterVal
            const idx    = STAT_CONFIG.findIndex(s => s.key === stat.key)
            const label  = SERVICES_STAT_LABELS[idx]
            return (
              <button
                key={stat.key}
                type="button"
                onClick={() => setFilter(stat.filterVal)}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 text-left shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  active ? 'ring-2 ring-indigo-400 shadow-md -translate-y-0.5' : 'ring-slate-100 hover:ring-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor} mb-3`}>
                      {stat.icon}
                    </div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-0.5 text-3xl font-bold text-slate-900">{count}</p>
                  </div>
                  <Sparkline path={SPARKLINES[stat.key]} color={stat.lineColor} />
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  <ChangePill value={count > 0 ? 100 : 0} />
                  <span className="text-[11px] text-slate-400">vs yesterday</span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STAT_CONFIG.slice(0, 4).map((stat) => {
              const count  = counts[stat.key as keyof typeof counts]
              const active = filter === stat.filterVal
              return (
                <button
                  key={stat.key}
                  type="button"
                  onClick={() => setFilter(stat.filterVal)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 text-left shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    active ? 'ring-2 ring-indigo-400 shadow-md -translate-y-0.5' : 'ring-slate-100 hover:ring-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor} mb-3`}>
                        {stat.icon}
                      </div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <p className="mt-0.5 text-3xl font-bold text-slate-900">{count}</p>
                    </div>
                    <Sparkline path={SPARKLINES[stat.key]} color={stat.lineColor} />
                  </div>
                  <div className="mt-4 flex items-center gap-1.5">
                    <ChangePill value={count > 0 ? 100 : 0} />
                    <span className="text-[11px] text-slate-400">vs yesterday</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STAT_CONFIG.slice(4).map((stat) => {
              const count  = counts[stat.key as keyof typeof counts]
              const active = filter === stat.filterVal
              return (
                <button
                  key={stat.key}
                  type="button"
                  onClick={() => setFilter(stat.filterVal)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 text-left shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    active ? 'ring-2 ring-indigo-400 shadow-md -translate-y-0.5' : 'ring-slate-100 hover:ring-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor} mb-3`}>
                        {stat.icon}
                      </div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <p className="mt-0.5 text-3xl font-bold text-slate-900">{count}</p>
                    </div>
                    <Sparkline path={SPARKLINES[stat.key]} color={stat.lineColor} />
                  </div>
                  <div className="mt-4 flex items-center gap-1.5">
                    <ChangePill value={0} />
                    <span className="text-[11px] text-slate-400">vs yesterday</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* ── Order Fulfillment Panel ── */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">

        {/* Panel header */}
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{isServicesView ? 'Inquiry Management' : 'Order Fulfillment'}</h2>
            <p className="text-sm text-slate-400">{isServicesView ? 'Manage and respond to service inquiries' : 'Manage and track supplier orders'}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isServicesView ? 'Search inquiries…' : 'Search orders...'}
                className="h-10 w-48 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Filter dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen(o => !o)}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                {activeLabel}
                <svg className={`h-4 w-4 text-slate-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-12 z-20 min-w-[160px] overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                  {activeFilterOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setFilter(opt.value); setFilterOpen(false) }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        filter === opt.value ? 'font-semibold text-indigo-600' : 'text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading && !initialData ? (
          <div className="flex items-center justify-center gap-2.5 py-20 text-slate-400">
            <Spinner />
            <span className="text-sm">{isServicesView ? 'Loading inquiries…' : 'Loading orders…'}</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
              <svg className="h-6 w-6 text-rose-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l7.5-13c.866-1.5 3.032-1.5 3.898 0l7.206 12.374zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">{isServicesView ? 'Failed to load inquiries' : 'Failed to load orders'}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-slate-100 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">{isServicesView ? 'No inquiries found' : 'No orders found'}</p>
              <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search or filter.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/60">
                  {(isServicesView
                    ? ['Inquiry', 'Date', 'Client', 'Amount', 'Status', 'Actions']
                    : ['Order', 'Date', 'Supplier', 'Amount', 'Status', 'Actions']
                  ).map(col => (
                    <th key={col} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order, idx) => {
                  const busy           = busyId === order.id
                  const canManage      = order.approval_status === 'approved'
                  const approvalStatus = order.approval_status ?? 'pending_approval'
                  const fulfillStatus  = order.fulfillment_status ?? 'pending'
                  const newOrder       = isNew(order.created_at)
                  const isExpanded     = expandedId === order.id
                  const gradient       = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]

                  return (
                    <>
                      <tr
                        key={order.id}
                        className="group transition-colors hover:bg-slate-50/60"
                      >
                        {/* Order / Product */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              {order.product_image ? (
                                <img src={order.product_image} alt={order.product_name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              {newOrder && (
                                <div className="absolute inset-0 flex items-start justify-start">
                                  <span className="rounded-br-lg rounded-tl-xl bg-indigo-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                    NEW
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-[13px] font-semibold text-slate-900">
                                {order.product_name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {isServicesView ? (
                                  order.checkout_id && <span>Ref #{order.checkout_id.slice(-8)}</span>
                                ) : (
                                  <>
                                    Qty {order.quantity}
                                    {order.checkout_id && <span className="ml-1.5">• #{order.checkout_id.slice(-8)}</span>}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-1.5">
                            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <p className="whitespace-nowrap text-[12px] font-medium text-slate-700">{fmtDate(order.created_at)}</p>
                              <p className="text-[11px] text-slate-400">{fmtTime(order.created_at)}</p>
                            </div>
                          </div>
                        </td>

                        {/* Supplier / Customer */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-[11px] font-bold text-white shadow-sm`}>
                              {getInitials(order.customer_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-[13px] font-semibold text-slate-800">
                                {order.customer_name || '—'}
                              </p>
                              <p className="line-clamp-1 text-[11px] text-slate-400">{order.customer_email || '—'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4">
                          <p className="text-[14px] font-bold text-slate-900">{formatMoney(order.amount)}</p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <ApprovalChip status={approvalStatus} isServicesView={isServicesView} />
                            <FulfillmentChip status={fulfillStatus} isServicesView={isServicesView} />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {approvalStatus !== 'approved' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleApprove(order.id)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-4 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busy ? <Spinner /> : (
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                {isServicesView ? 'Accept' : 'Approve'}
                              </button>
                            )}

                            {!isServicesView && approvalStatus === 'approved' && !order.zq_platform_order_id && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handlePushToZq(order.id)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-500/25 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busy ? <Spinner /> : (
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                )}
                                Push to ZQ
                              </button>
                            )}

                            {/* Expand chevron */}
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : order.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
                            >
                              <svg className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`}>
                          <td colSpan={6} className="border-t border-slate-100 bg-slate-50/70 px-6 py-5">
                            <div className="grid gap-6 sm:grid-cols-3">

                              {/* Inquiry / Order details */}
                              <div>
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{isServicesView ? 'Inquiry Details' : 'Order Details'}</p>
                                <dl className="space-y-2">
                                  {((): Array<[string, string]> => {
                                    const rows: Array<[string, string]> = [
                                      [isServicesView ? 'Reference' : 'Checkout ID', order.checkout_id || `#${order.id}`],
                                      ['Date', `${fmtDate(order.created_at)} ${fmtTime(order.created_at)}`],
                                      ['Amount', formatMoney(order.amount)],
                                    ]
                                    if (order.payment_method) rows.push(['Payment', order.payment_method])
                                    return rows
                                  })().map(([label, value]) => (
                                    <div key={label} className="flex justify-between gap-4">
                                      <dt className="text-[11px] text-slate-400">{label}</dt>
                                      <dd className="text-[11px] font-semibold text-slate-700 text-right">{value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>

                              {/* Client / Customer info */}
                              <div>
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{isServicesView ? 'Client' : 'Customer'}</p>
                                <div className="flex items-center gap-2.5">
                                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${AVATAR_GRADIENTS[0]} text-sm font-bold text-white shadow-sm`}>
                                    {getInitials(order.customer_name)}
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-semibold text-slate-800">{order.customer_name || '—'}</p>
                                    <p className="text-[11px] text-slate-400">{order.customer_email || '—'}</p>
                                    {order.customer_phone && <p className="text-[11px] text-slate-400">{order.customer_phone}</p>}
                                  </div>
                                </div>
                                {order.customer_address && (
                                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200">
                                    {order.customer_address}
                                  </p>
                                )}
                              </div>

                              {/* Status Update / Fulfillment */}
                              <div>
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{isServicesView ? 'Status Update' : 'Fulfillment'}</p>
                                {canManage ? (
                                  <div className="space-y-2.5">
                                    <div className="relative">
                                      <select
                                        value={fulfillDrafts[order.id] ?? 'processing'}
                                        disabled={busy}
                                        onChange={e => setFulfillDrafts(cur => ({ ...cur, [order.id]: e.target.value as SupplierFulfillmentStatus }))}
                                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                                      >
                                        {activeFulfillOptions.map(o => (
                                          <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                      </select>
                                      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => saveFulfillment(order.id)}
                                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                      {busy ? <Spinner /> : null}
                                      {isServicesView ? 'Update Status' : 'Save Status'}
                                    </button>
                                    {!isServicesView && order.tracking_no && (
                                      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tracking</p>
                                        <p className="mt-1 font-mono text-[12px] font-semibold text-slate-800">{order.tracking_no}</p>
                                        {order.courier && <p className="text-[11px] capitalize text-slate-400">{order.courier}</p>}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
                                    <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                    <p className="text-[11px] font-medium text-amber-700">{isServicesView ? 'Accept the inquiry first to update its status.' : 'Approve the order first to manage fulfillment.'}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
