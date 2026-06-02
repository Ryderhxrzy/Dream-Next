'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FileDown, Calendar, Search, ChevronDown, X,
  ShoppingCart, DollarSign, TrendingUp, Package,
  AlertCircle, Clock, Truck, CheckCircle,
  RotateCcw, XCircle, Filter,
} from 'lucide-react'
import { useGetSupplierOrdersQuery } from '@/store/api/supplierOrdersApi'

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface ReportRow {
  id: string
  customer: string
  customerEmail: string
  product: string
  quantity: number
  selectedColor: string
  selectedSize: string
  selectedType: string
  amount: number
  date: string
  time: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  trackingNo: string
  rawDate: string
}

/* ─── Status helpers ──────────────────────────────────────────────────────── */

const getStatusLabel = (order: {
  payment_status?: string | null
  fulfillment_status?: string | null
}) => {
  const pay = String(order.payment_status ?? '').toLowerCase()
  const ful = String(order.fulfillment_status ?? '').toLowerCase()
  if (['pending', 'unpaid', 'failed'].includes(pay)) return 'To Pay'
  if (['processing', 'packed'].includes(ful)) return 'To Ship'
  if (['shipped', 'out_for_delivery'].includes(ful)) return 'To Receive'
  if (['delivered'].includes(ful)) return 'Delivered'
  if (['cancelled', 'refunded'].includes(ful)) return 'Cancelled'
  if (['returned_refunded', 'return', 'returned'].includes(ful)) return 'Return'
  return 'Processing'
}

interface StatusStyle {
  bg: string; text: string; ring: string; dot: string; icon: React.ReactNode
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  'To Pay': {
    bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500',
    icon: <Clock className="h-3 w-3" />,
  },
  'To Ship': {
    bg: 'bg-sky-50',     text: 'text-sky-700',     ring: 'ring-sky-200',     dot: 'bg-sky-500',
    icon: <Package className="h-3 w-3" />,
  },
  'To Receive': {
    bg: 'bg-violet-50',  text: 'text-violet-700',  ring: 'ring-violet-200',  dot: 'bg-violet-500',
    icon: <Truck className="h-3 w-3" />,
  },
  'Delivered': {
    bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  'Cancelled': {
    bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    dot: 'bg-rose-500',
    icon: <XCircle className="h-3 w-3" />,
  },
  'Return': {
    bg: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200',  dot: 'bg-orange-500',
    icon: <RotateCcw className="h-3 w-3" />,
  },
  'Processing': {
    bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200',    dot: 'bg-blue-500',
    icon: <AlertCircle className="h-3 w-3" />,
  },
}

const STATUS_OPTIONS = ['All Status', 'To Pay', 'To Ship', 'To Receive', 'Delivered', 'Processing', 'Cancelled', 'Return']

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES['Processing']
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      {s.icon}
      {status}
    </span>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n)
}

function getInitials(name: string) {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'
}

const AVATAR_COLORS = [
  'from-violet-500 to-indigo-500',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-amber-500',
  'from-pink-400 to-rose-500',
]

/* ─── Stat card ───────────────────────────────────────────────────────────── */

function StatCard({
  label, value, sub, icon, iconBg, iconColor, accent,
}: {
  label: string; value: string; sub?: string
  icon: React.ReactNode; iconBg: string; iconColor: string; accent: string
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
        </div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          {icon}
        </span>
      </div>
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────────────────────── */

export default function SupplierOrderReportsPage({
  title,
  filter = 'all',
}: {
  title: string
  filter?: string
}) {
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [statusOpen,   setStatusOpen]   = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!statusOpen) return
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen])

  const { data, isLoading, isError } = useGetSupplierOrdersQuery({ filter, page: 1, perPage: 100 })

  /* map raw orders → ReportRow */
  const rows = useMemo<ReportRow[]>(() => (data?.orders ?? []).map((order) => {
    const rawDate = order.created_at || order.paid_at || ''
    const d = rawDate ? new Date(rawDate) : null
    return {
      id:              order.checkout_id || `#${order.id}`,
      customer:        order.customer_name ?? 'Customer',
      customerEmail:   order.customer_email ?? '',
      product:         order.product_name ?? 'Order Item',
      quantity:        Number(order.quantity ?? 1),
      selectedColor:   order.selected_color ?? '',
      selectedSize:    order.selected_size ?? '',
      selectedType:    order.selected_type ?? '',
      amount:          Number(order.amount ?? 0),
      date:            d ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
      time:            d ? d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '',
      status:          getStatusLabel(order),
      paymentStatus:   order.payment_status ?? '',
      fulfillmentStatus: order.fulfillment_status ?? '',
      trackingNo:      order.tracking_no ?? '—',
      rawDate,
    }
  }), [data?.orders])

  /* apply all filters */
  const filteredRows = useMemo(() => {
    let result = rows

    /* page-level filter (completed / all) */
    if (filter === 'completed') {
      result = result.filter(r => ['delivered', 'completed'].includes(r.status.toLowerCase()))
    }

    /* date range */
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null
      const to   = dateTo   ? new Date(dateTo)   : null
      result = result.filter(r => {
        if (!r.rawDate) return false
        const d = new Date(r.rawDate)
        if (from && d < from) return false
        if (to) { const end = new Date(to); end.setHours(23, 59, 59, 999); if (d > end) return false }
        return true
      })
    }

    /* status */
    if (statusFilter !== 'All Status') {
      result = result.filter(r => r.status === statusFilter)
    }

    /* search */
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(r =>
        r.customer.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q)  ||
        r.id.toLowerCase().includes(q)       ||
        r.trackingNo.toLowerCase().includes(q),
      )
    }

    return result
  }, [rows, dateFrom, dateTo, statusFilter, search, filter])

  /* totals */
  const totals = useMemo(() => ({
    orders:   filteredRows.length,
    amount:   filteredRows.reduce((s, r) => s + r.amount, 0),
    avgOrder: filteredRows.length ? filteredRows.reduce((s, r) => s + r.amount, 0) / filteredRows.length : 0,
    statusBreakdown: STATUS_OPTIONS.slice(1).reduce<Record<string, number>>((acc, s) => {
      acc[s] = filteredRows.filter(r => r.status === s).length
      return acc
    }, {}),
  }), [filteredRows])

  /* active filters count */
  const activeFilters = [dateFrom, dateTo, statusFilter !== 'All Status' ? statusFilter : '', search].filter(Boolean).length

  /* CSV download */
  const handleDownload = () => {
    if (isDownloading) return
    setIsDownloading(true)
    setTimeout(() => setIsDownloading(false), 900)
    const headers = ['Customer', 'Email', 'Product', 'Qty', 'Color', 'Size', 'Type', 'Amount', 'Date', 'Order No.', 'Tracking No.', 'Status']
    const esc = (v: string | number) => {
      const s = String(v ?? '')
      return (s.includes('"') || s.includes(',') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [
      headers.map(esc).join(','),
      ...filteredRows.map(r => [r.customer, r.customerEmail, r.product, r.quantity, r.selectedColor, r.selectedSize, r.selectedType, r.amount, r.date, r.id, r.trackingNo, r.status].map(esc).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `order-report_${dateFrom || 'all'}_to_${dateTo || 'all'}.csv`,
    })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('All Status'); setSearch('') }

  return (
    <div className="space-y-5 pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Track and export your supplier order data.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading || filteredRows.length === 0}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDownloading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : <FileDown className="h-4 w-4" />}
          {isDownloading ? 'Preparing…' : 'Export CSV'}
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Orders"    value={String(totals.orders)}
          icon={<ShoppingCart className="h-5 w-5" />}
          iconBg="bg-indigo-50"   iconColor="text-indigo-600"
          accent="border-indigo-100"
          sub={activeFilters > 0 ? 'filtered' : 'all time'}
        />
        <StatCard
          label="Total Revenue"   value={fmtMoney(totals.amount)}
          icon={<DollarSign className="h-5 w-5" />}
          iconBg="bg-emerald-50"  iconColor="text-emerald-600"
          accent="border-emerald-100"
        />
        <StatCard
          label="Avg. Order Value" value={fmtMoney(totals.avgOrder)}
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-sky-50"      iconColor="text-sky-600"
          accent="border-sky-100"
        />
        <StatCard
          label="Delivered"       value={String(totals.statusBreakdown['Delivered'] ?? 0)}
          icon={<CheckCircle className="h-5 w-5" />}
          iconBg="bg-teal-50"     iconColor="text-teal-600"
          accent="border-teal-100"
          sub={`of ${totals.orders} total`}
        />
      </div>

      {/* ── Filters ── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filters</span>
          {activeFilters > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
              {activeFilters}
            </span>
          )}
          {activeFilters > 0 && (
            <button type="button" onClick={clearFilters}
              className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <X className="h-3.5 w-3.5" /> Clear all
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          {/* Search */}
          <div className="flex-1 min-w-45">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Customer, product, order #..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Date From */}
          <div className="min-w-37.5">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Date From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Date To */}
          <div className="min-w-37.5">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Date To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Status filter dropdown */}
          <div className="min-w-40">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</label>
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => setStatusOpen(o => !o)}
                className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <span className="flex items-center gap-1.5">
                  {statusFilter !== 'All Status' && (
                    <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[statusFilter]?.dot ?? 'bg-slate-400'}`} />
                  )}
                  {statusFilter}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
              </button>

              {statusOpen && (
                <div className="absolute left-0 top-12 z-50 min-w-full overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { setStatusFilter(opt); setStatusOpen(false) }}
                      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        statusFilter === opt ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {opt !== 'All Status' && (
                        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_STYLES[opt]?.dot ?? 'bg-slate-400'}`} />
                      )}
                      <span className="flex-1">{opt}</span>
                      {opt !== 'All Status' && (
                        <span className="text-[11px] font-bold text-slate-400">
                          {rows.filter(r => r.status === opt).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Status bar chips ── */}
      {!isLoading && rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.slice(1).map(s => {
            const count = rows.filter(r => r.status === s).length
            if (count === 0) return null
            const st = STATUS_STYLES[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(statusFilter === s ? 'All Status' : s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 transition hover:scale-105 ${
                  statusFilter === s
                    ? `${st.bg} ${st.text} ${st.ring} scale-105`
                    : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-700 dark:text-slate-400'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === s ? st.dot : 'bg-slate-400'}`} />
                {s}
                <span className={`ml-0.5 rounded-full px-1.5 py-px text-[10px] font-bold ${statusFilter === s ? `${st.bg} ${st.text}` : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Table header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Order Records</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {filteredRows.length} order{filteredRows.length !== 1 ? 's' : ''}
              {activeFilters > 0 ? ' matching filters' : ' total'}
            </p>
          </div>
          {filteredRows.length > 0 && (
            <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {fmtMoney(totals.amount)} total
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-225 border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40">
                {['Customer', 'Product', 'Amount', 'Date', 'Order No.', 'Tracking', 'Status'].map(col => (
                  <th key={col} className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                        <div className="h-3 w-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </td>
                    {[1,2,3,4,5,6].map(c => (
                      <td key={c} className="px-6 py-4">
                        <div className="h-3 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
                      <AlertCircle className="h-6 w-6 text-rose-500" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Failed to load report</p>
                    <p className="mt-1 text-xs text-slate-400">Please refresh the page and try again.</p>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                      <ShoppingCart className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No orders found</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {activeFilters > 0 ? 'Try adjusting your filters.' : 'Orders will appear here once customers place them.'}
                    </p>
                    {activeFilters > 0 && (
                      <button type="button" onClick={clearFilters}
                        className="mt-3 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id} className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/20">
                    {/* Customer */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-[10px] font-bold text-white`}>
                          {getInitials(row.customer)}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{row.customer}</p>
                          {row.customerEmail && (
                            <p className="line-clamp-1 text-[11px] text-slate-400">{row.customerEmail}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-6 py-4">
                      <p className="line-clamp-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{row.product}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Qty {row.quantity}
                        {row.selectedColor ? ` · ${row.selectedColor}` : ''}
                        {row.selectedSize  ? ` · ${row.selectedSize}`  : ''}
                        {row.selectedType  ? ` · ${row.selectedType}`  : ''}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4">
                      <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                        {fmtMoney(row.amount)}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{row.date}</p>
                      {row.time && <p className="mt-0.5 text-[11px] text-slate-400">{row.time}</p>}
                    </td>

                    {/* Order no */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {row.id}
                      </span>
                    </td>

                    {/* Tracking */}
                    <td className="px-6 py-4">
                      {row.trackingNo && row.trackingNo !== '—' ? (
                        <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                          {row.trackingNo}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusChip status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filteredRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-800/20">
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredRows.length}</span> order{filteredRows.length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-400"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export {filteredRows.length} rows
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
