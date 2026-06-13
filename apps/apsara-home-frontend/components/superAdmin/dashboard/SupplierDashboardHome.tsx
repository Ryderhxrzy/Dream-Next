'use client'

import type { ElementType } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Box,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Layers3,
  MessageSquare,
  Settings,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  TrendingUp,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useGetProductsQuery, type Product } from '@/store/api/productsApi'
import { useGetPublicProductBrandsQuery } from '@/store/api/productBrandsApi'
import { useGetSupplierCategoriesQuery, useGetSupplierUsersQuery, useGetSuppliersQuery } from '@/store/api/suppliersApi'
import { useGetSupplierOrdersQuery } from '@/store/api/supplierOrdersApi'
import { useGetSupplierServiceInquiriesQuery } from '@/store/api/serviceInquiriesApi'

/* ── Formatters ─────────────────────────────────────────────────── */

const fmtDate = (value: string | null) => {
  if (!value) return 'N/A'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const fmtMoney = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)

const fmtK = (v: number) => (v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`)

const lastNDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })

/* ── Shared tooltip style ───────────────────────────────────────── */

const ttStyle: React.CSSProperties = {
  borderRadius: '12px',
  border: '1px solid rgba(51,65,85,0.10)',
  fontSize: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  backgroundColor: '#fff',
  color: '#1e293b',
  padding: '10px 14px',
}

/* ═══════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════ */

export default function SupplierDashboardHome() {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const supplierId = Number(session?.user?.supplierId ?? 0)
  const supplierName = session?.user?.supplierName || session?.user?.name || 'Supplier'
  const isMainSupplier = Boolean(session?.user?.isMainSupplier)

  /* ── Supplier / brand resolution ────────────────────────────── */

  const { data: suppliersData } = useGetSuppliersQuery(undefined, { skip: status !== 'authenticated' })
  const fallbackSupplier = useMemo(() => (suppliersData?.suppliers ?? [])[0], [suppliersData?.suppliers])
  const effectiveSupplierId = supplierId > 0 ? supplierId : Number(fallbackSupplier?.id ?? 0)
  const skip = status !== 'authenticated' || effectiveSupplierId <= 0

  const supplier = useMemo(
    () => (suppliersData?.suppliers ?? []).find((s) => s.id === effectiveSupplierId),
    [effectiveSupplierId, suppliersData?.suppliers],
  )

  const { data: brandsData } = useGetPublicProductBrandsQuery()
  const brandType = useMemo(() => {
    const brands = brandsData?.brands ?? []
    if (!brands.length) return 0
    const candidates = [supplierName, supplier?.company, supplier?.name]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ''))
    if (!candidates.length) return 0
    const exact = brands.find((b) => {
      const k = String(b.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      return k && candidates.some((c) => c === k)
    })
    if (exact?.id) return Number(exact.id)
    let bestId = 0, bestScore = 0, bestLen = 0
    brands.forEach((b) => {
      const k = String(b.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!k) return
      candidates.forEach((c) => {
        const score = c === k ? 3 : c.includes(k) ? 2 : k.includes(c) ? 1 : 0
        if (score > 0) {
          const len = k.length
          if (score > bestScore || (score === bestScore && len > bestLen)) {
            bestScore = score; bestLen = len; bestId = Number(b.id ?? 0)
          }
        }
      })
    })
    return bestId
  }, [brandsData?.brands, supplier?.company, supplier?.name, supplierName])

  /* ── Product queries ─────────────────────────────────────────── */

  const productQueryBase = useMemo(
    () => ({ supplierId: effectiveSupplierId, ...(brandType > 0 ? { brandType } : {}) }),
    [brandType, effectiveSupplierId],
  )

  // perPage:100 serves both the recent-6 display and the full inventory list — one query instead of two.
  const { data: productsData } = useGetProductsQuery({ ...productQueryBase, perPage: 100 }, { skip, refetchOnMountOrArgChange: true })
  const { data: activeProductsData } = useGetProductsQuery({ ...productQueryBase, perPage: 1, status: '1' }, { skip, refetchOnMountOrArgChange: true })
  const { data: inactiveProductsData } = useGetProductsQuery({ ...productQueryBase, perPage: 1, status: '0' }, { skip, refetchOnMountOrArgChange: true })

  const brandOnlySkip = skip || brandType <= 0
  const { data: brandProductsData } = useGetProductsQuery({ brandType, perPage: 100 }, { skip: brandOnlySkip, refetchOnMountOrArgChange: true })
  const { data: brandActiveProductsData } = useGetProductsQuery({ brandType, perPage: 1, status: '1' }, { skip: brandOnlySkip, refetchOnMountOrArgChange: true })
  const { data: brandInactiveProductsData } = useGetProductsQuery({ brandType, perPage: 1, status: '0' }, { skip: brandOnlySkip, refetchOnMountOrArgChange: true })

  const { data: supplierCategoriesData } = useGetSupplierCategoriesQuery(effectiveSupplierId, { skip })
  const { data: supplierUsersData } = useGetSupplierUsersQuery(effectiveSupplierId, { skip })

  const isServicesView = useMemo(
    () => (supplierCategoriesData?.categories ?? []).some((c) => c.name.toLowerCase() === 'services'),
    [supplierCategoriesData?.categories],
  )

  /* ── Service inquiry queries (services view only) ───────────── */

  const categoriesKnown = supplierCategoriesData !== undefined
  const { data: inquiryData, isLoading: inquiryLoading } = useGetSupplierServiceInquiriesQuery(
    { per_page: 100 },
    { skip: status !== 'authenticated' || (categoriesKnown && !isServicesView), refetchOnMountOrArgChange: true },
  )

  const allInquiries = useMemo(() => inquiryData?.inquiries ?? [], [inquiryData?.inquiries])

  const inqIsToday = (dateStr?: string | null) => {
    if (!dateStr) return false
    const d = new Date(dateStr), now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }

  const inquiryNewCount      = useMemo(() => allInquiries.filter(i => i.status === 'new' && inqIsToday(i.created_at)).length, [allInquiries])
  const inquiryPendingCount  = useMemo(() => allInquiries.filter(i => i.status === 'new' && !inqIsToday(i.created_at)).length, [allInquiries])
  const inquiryCompleteCount = useMemo(() => allInquiries.filter(i => i.status === 'responded' || i.status === 'closed').length, [allInquiries])
  const inquiryTotalCount    = inquiryData?.counts?.total ?? allInquiries.length
  const recentInquiries      = useMemo(() => allInquiries.slice(0, 6), [allInquiries])

  const inquiryTrendData = useMemo(() => {
    const days = lastNDays(14)
    const cnts: Record<string, number> = {}
    days.forEach(d => { cnts[d] = 0 })
    for (const i of allInquiries) {
      const day = (i.created_at ?? '').slice(0, 10)
      if (day in cnts) cnts[day]++
    }
    return days.map(day => ({
      date: new Date(`${day}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      Inquiries: cnts[day],
    }))
  }, [allInquiries])

  const inquiryStatusTrendData = useMemo(() => {
    const days = lastNDays(14)
    type Row = { New: number; Pending: number; Complete: number }
    const map: Record<string, Row> = {}
    days.forEach(d => { map[d] = { New: 0, Pending: 0, Complete: 0 } })
    for (const i of allInquiries) {
      const day = (i.created_at ?? '').slice(0, 10)
      if (!(day in map)) continue
      if (i.status === 'new' && inqIsToday(i.created_at))       map[day].New++
      else if (i.status === 'new' && !inqIsToday(i.created_at)) map[day].Pending++
      else if (i.status === 'responded' || i.status === 'closed') map[day].Complete++
    }
    return days.map(day => ({
      date: new Date(`${day}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      ...map[day],
    }))
  }, [allInquiries])

  const inquiryDonutData = useMemo(() => [
    { name: 'New',      value: inquiryNewCount,     fill: '#3b82f6' },
    { name: 'Pending',  value: inquiryPendingCount, fill: '#f59e0b' },
    { name: 'Complete', value: inquiryCompleteCount, fill: '#10b981' },
  ].filter(d => d.value > 0), [inquiryNewCount, inquiryPendingCount, inquiryCompleteCount])

  /* ── Orders queries ──────────────────────────────────────────── */

  // perPage:100 carries both counts (aggregate, not page-size-dependent) and enough
  // orders for trend charts; slice(0,6) replaces the separate perPage:6 query.
  const { data: trendOrdersData, isLoading: ordersLoading } = useGetSupplierOrdersQuery(
    { perPage: 100 },
    { skip: status !== 'authenticated', refetchOnMountOrArgChange: true },
  )
  const trendLoading = ordersLoading
  const ordersData = trendOrdersData

  /* ── Brand fallback ──────────────────────────────────────────── */

  const useBrandFallback = useMemo(() => brandType > 0 && (productsData?.meta?.total ?? 0) <= 0, [brandType, productsData?.meta?.total])

  const effectiveProductsData         = useBrandFallback ? brandProductsData         : productsData
  const effectiveActiveProductsData   = useBrandFallback ? brandActiveProductsData   : activeProductsData
  const effectiveInactiveProductsData = useBrandFallback ? brandInactiveProductsData : inactiveProductsData
  // inventoryData was a duplicate perPage:100 query — productsData now serves both roles.
  const effectiveInventoryData        = effectiveProductsData

  /* ── Derived counts ──────────────────────────────────────────── */

  const recentProducts = useMemo(() => (effectiveProductsData?.products ?? []).slice(0, 6), [effectiveProductsData?.products])

  const lowStockCount = useMemo(
    () => (effectiveInventoryData?.products ?? []).filter((p) => Number(p.qty ?? 0) > 0 && Number(p.qty ?? 0) <= 5).length,
    [effectiveInventoryData?.products],
  )

  const mainSupplierUser = useMemo(
    () => (supplierUsersData?.users ?? []).find((u) => u.is_main_supplier),
    [supplierUsersData?.users],
  )
  const subSupplierCount = useMemo(
    () => (supplierUsersData?.users ?? []).filter((u) => !u.is_main_supplier).length,
    [supplierUsersData?.users],
  )

  const orderCounts  = ordersData?.counts
  const recentOrders = (ordersData?.orders ?? []).slice(0, 6)
  const totalOrders  = orderCounts?.total ?? 0

  /* ── Chart data: order trend (area) ─────────────────────────── */

  const orderTrendData = useMemo(() => {
    const days = lastNDays(14)
    const counts: Record<string, number> = {}
    const revenue: Record<string, number> = {}
    days.forEach((d) => { counts[d] = 0; revenue[d] = 0 })
    for (const o of trendOrdersData?.orders ?? []) {
      const day = (o.created_at ?? '').slice(0, 10)
      if (day in counts) { counts[day]++; revenue[day] += Number(o.amount ?? 0) }
    }
    return days.map((day) => ({
      date: new Date(`${day}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      Orders: counts[day],
      Revenue: revenue[day],
    }))
  }, [trendOrdersData?.orders])

  /* ── Chart data: per-status trend (line, multi-series) ──────── */

  const statusTrendData = useMemo(() => {
    const days = lastNDays(14)
    type Row = { Processing: number; Shipped: number; Delivered: number; Cancelled: number }
    const map: Record<string, Row> = {}
    days.forEach((d) => { map[d] = { Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 } })
    for (const o of trendOrdersData?.orders ?? []) {
      const day = (o.created_at ?? '').slice(0, 10)
      if (!(day in map)) continue
      const fs = o.fulfillment_status
      if (fs === 'processing' || fs === 'packed') map[day].Processing++
      else if (fs === 'shipped' || fs === 'out_for_delivery') map[day].Shipped++
      else if (fs === 'delivered') map[day].Delivered++
      else if (fs === 'cancelled' || fs === 'returned') map[day].Cancelled++
    }
    return days.map((day) => ({
      date: new Date(`${day}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      ...map[day],
    }))
  }, [trendOrdersData?.orders])

  const statusTrendEmpty = useMemo(
    () => statusTrendData.every((d) => d.Processing === 0 && d.Shipped === 0 && d.Delivered === 0 && d.Cancelled === 0),
    [statusTrendData],
  )

  /* ── Chart data: product analytics (line) ───────────────────── */

  const productLineData = useMemo(() => [
    { name: 'Total',     value: effectiveProductsData?.meta?.total ?? 0 },
    { name: 'Active',    value: effectiveActiveProductsData?.meta?.total ?? 0 },
    { name: 'Inactive',  value: effectiveInactiveProductsData?.meta?.total ?? 0 },
    { name: 'Low Stock', value: lowStockCount },
  ], [effectiveProductsData, effectiveActiveProductsData, effectiveInactiveProductsData, lowStockCount])

  /* ── Chart data: order status donut ─────────────────────────── */

  const donutData = useMemo(() => [
    { name: 'Pending',    value: orderCounts?.to_pay     ?? 0, fill: '#f59e0b' },
    { name: 'To Ship',   value: orderCounts?.to_ship    ?? 0, fill: '#3b82f6' },
    { name: 'To Receive',value: orderCounts?.to_receive ?? 0, fill: '#8b5cf6' },
    { name: 'Completed', value: orderCounts?.completed  ?? 0, fill: '#10b981' },
    { name: 'Cancelled', value: orderCounts?.cancelled  ?? 0, fill: '#ef4444' },
    { name: 'Returns',   value: orderCounts?.return     ?? 0, fill: '#f97316' },
  ].filter((d) => d.value > 0), [orderCounts])

  /* ── Greeting ────────────────────────────────────────────────── */

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const dateLabel = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="space-y-7">

      {/* ════════════════════════════════════════════════════════
          Welcome banner
      ════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-sky-500 via-cyan-500 to-teal-500 p-6 text-white shadow-lg shadow-sky-200/60 dark:shadow-sky-900/30">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">{dateLabel}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{greeting}, {supplierName.split(' ')[0]} 👋</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm">
                <BadgeCheck className="h-3.5 w-3.5" />
                {isMainSupplier ? 'Main Supplier' : 'Sub Supplier'}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${supplier?.status === 1 ? 'bg-emerald-400/30 text-white' : 'bg-white/15 text-white/80'}`}>
                {supplier?.status === 1 ? '● Active' : '○ Inactive'}
              </span>
            </div>

            {/* Quick stat pills */}
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { label: isServicesView ? 'Total Bookings' : 'Total Orders', value: (isServicesView ? inquiryLoading : ordersLoading) ? '…' : String(isServicesView ? inquiryTotalCount : totalOrders) },
                { label: isServicesView ? 'Services' : 'Products', value: String(effectiveProductsData?.meta?.total ?? 0) },
                { label: 'Categories', value: String(supplierCategoriesData?.categories?.length ?? 0) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-lg font-bold leading-none">{s.value}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-white/75">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {(isServicesView ? [
              { label: 'Manage Bookings', href: '/supplier/orders', icon: CalendarDays },
              { label: 'My Services', href: '/supplier/products', icon: MessageSquare },
              { label: 'Reports', href: '/supplier/reports/orders', icon: TrendingUp },
              { label: 'Company', href: '/supplier/company', icon: Building2 },
            ] : [
              { label: 'Manage Orders', href: '/supplier/orders', icon: ShoppingCart },
              { label: 'View Products', href: '/supplier/products', icon: Package },
              { label: 'Reports', href: '/supplier/reports/orders', icon: TrendingUp },
              { label: 'Company', href: '/supplier/company', icon: Building2 },
            ]).map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Icon className="h-3.5 w-3.5 opacity-80" />
                {label}
                <ArrowUpRight className="ml-auto h-3 w-3 opacity-60 transition group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          Order KPI cards
      ════════════════════════════════════════════════════════ */}
      <div>
        <SectionLabel icon={isServicesView ? CalendarDays : ShoppingCart} color="text-blue-500">
          {isServicesView ? 'Booking Analytics' : 'Order Analytics'}
        </SectionLabel>
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${isServicesView ? 'xl:grid-cols-4' : 'xl:grid-cols-6'}`}>
          <StatCard label={isServicesView ? 'Total Inquiries' : 'Total Orders'}    value={(isServicesView ? inquiryLoading : ordersLoading) ? '—' : String(isServicesView ? inquiryTotalCount    : totalOrders)}                  icon={isServicesView ? CalendarDays : ShoppingCart} gradient="from-blue-500 to-indigo-500"   href="/supplier/orders" />
          <StatCard label={isServicesView ? 'New'            : 'Pending Payment'} value={(isServicesView ? inquiryLoading : ordersLoading) ? '—' : String(isServicesView ? inquiryNewCount     : (orderCounts?.to_pay     ?? 0))} icon={isServicesView ? MessageSquare : Clock3}       gradient="from-amber-400 to-orange-500"  href="/supplier/orders?filter=to_pay"     alert={isServicesView ? inquiryNewCount > 0 : (orderCounts?.to_pay ?? 0) > 0} />
          <StatCard label={isServicesView ? 'Pending'        : 'To Ship'}         value={(isServicesView ? inquiryLoading : ordersLoading) ? '—' : String(isServicesView ? inquiryPendingCount : (orderCounts?.to_ship    ?? 0))} icon={isServicesView ? Settings : Package}           gradient="from-sky-400 to-cyan-500"      href="/supplier/orders?filter=to_ship" />
          {!isServicesView && <StatCard label="To Receive"   value={ordersLoading ? '—' : String(orderCounts?.to_receive ?? 0)} icon={Truck}       gradient="from-violet-500 to-purple-600" href="/supplier/orders?filter=to_receive" />}
          <StatCard label={isServicesView ? 'Complete' : 'Completed'}              value={(isServicesView ? inquiryLoading : ordersLoading) ? '—' : String(isServicesView ? inquiryCompleteCount : (orderCounts?.completed  ?? 0))} icon={CheckCircle2}                                  gradient="from-emerald-400 to-teal-500"  href="/supplier/orders?filter=completed" />
          {!isServicesView && <StatCard label="Cancelled"    value={ordersLoading ? '—' : String(orderCounts?.cancelled  ?? 0)} icon={XCircle}     gradient="from-rose-400 to-red-500"      href="/supplier/orders?filter=cancelled" />}
        </div>

      {/* ════════════════════════════════════════════════════════
          Charts row 1 — Order Trend (area) + Status Trend (multi-line)
      ════════════════════════════════════════════════════════ */}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">

        {/* Order/Booking trend — area chart */}
        {isServicesView ? (
          <ChartCard
            title="Inquiry Trend"
            subtitle="Daily inquiries received — last 14 days"
            loading={!mounted || inquiryLoading}
            empty={inquiryTrendData.every(d => d.Inquiries === 0)}
            emptyMessage="No inquiry history yet"
            action={{ href: '/supplier/orders', label: 'All inquiries' }}
          >
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={inquiryTrendData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInquiries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#6366f1" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#64748b' }} />
                <Area type="monotone" dataKey="Inquiries" stroke="#6366f1" strokeWidth={2.5} fill="url(#gInquiries)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#6366f1' }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartCard
            title="Order Trend"
            subtitle="Daily orders & revenue — last 14 days"
            loading={!mounted || trendLoading}
            empty={orderTrendData.every((d) => d.Orders === 0 && d.Revenue === 0)}
            emptyMessage="No order history yet"
            action={{ href: '/supplier/orders', label: 'All orders' }}
          >
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={orderTrendData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#0ea5e9" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip contentStyle={ttStyle} formatter={(v, n) => n === 'Revenue' ? [fmtMoney(Number(v)), 'Revenue'] : [v, 'Orders']} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#64748b' }} />
                <Area yAxisId="l" type="monotone" dataKey="Orders" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#gOrders)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#0ea5e9' }} />
                <Area yAxisId="r" type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gRevenue)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Status trend */}
        {isServicesView ? (
          <ChartCard
            title="Inquiry Status Trend"
            subtitle="New / Pending / Complete — last 14 days"
            loading={!mounted || inquiryLoading}
            empty={inquiryStatusTrendData.every(d => d.New === 0 && d.Pending === 0 && d.Complete === 0)}
            emptyMessage="No inquiry status data yet"
            action={{ href: '/supplier/orders', label: 'View inquiries' }}
          >
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={inquiryStatusTrendData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#64748b' }} />
                <Line type="monotone" dataKey="New"      stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Pending"  stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Complete" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartCard
            title="Order Status Trend"
            subtitle="Fulfillment stages over last 14 days"
            loading={!mounted || trendLoading}
            empty={statusTrendEmpty}
            emptyMessage="No order status data yet"
            action={{ href: '/supplier/orders', label: 'View orders' }}
          >
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={statusTrendData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#64748b' }} />
                <Line type="monotone" dataKey="Processing"  stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Shipped"     stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Delivered"   stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Cancelled"   stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          Product KPI cards
      ════════════════════════════════════════════════════════ */}
      <div>
        <SectionLabel icon={isServicesView ? MessageSquare : Package} color="text-sky-500">
          {isServicesView ? 'Services Overview' : 'Product Overview'}
        </SectionLabel>
        {!isServicesView && (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Total Products" value={String(effectiveProductsData?.meta?.total ?? 0)}         icon={Layers3}    gradient="from-sky-400 to-blue-500"      href="/supplier/products"  description="All catalog items" />
            <StatCard label="Active"         value={String(effectiveActiveProductsData?.meta?.total ?? 0)}   icon={TrendingUp} gradient="from-emerald-400 to-teal-500"  href="/supplier/products"  description="Live in catalog" />
            <StatCard label="Inactive"       value={String(effectiveInactiveProductsData?.meta?.total ?? 0)} icon={Clock3}     gradient="from-slate-400 to-slate-500"    href="/supplier/products"  description="Needs attention" alert={(effectiveInactiveProductsData?.meta?.total ?? 0) > 0} />
            <StatCard label="Low Stock"      value={String(lowStockCount)}                                   icon={Box}        gradient="from-amber-400 to-orange-500"  href="/supplier/inventory" description="Qty 1–5 remaining" alert={lowStockCount > 0} />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          Charts row 2 — Product line + Donut
      ════════════════════════════════════════════════════════ */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">

        {/* Product/Services analytics — line chart */}
        <ChartCard
          title={isServicesView ? 'Services Analytics' : 'Product Analytics'}
          subtitle={isServicesView ? 'Current snapshot across your services' : 'Current snapshot across your catalog'}
          loading={!mounted}
          empty={productLineData.every((d) => d.value === 0)}
          emptyMessage={isServicesView ? 'No services added yet' : 'No products added yet'}
          action={{ href: '/supplier/products', label: 'Manage' }}
        >
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={productLineData} margin={{ top: 8, right: 24, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={ttStyle} formatter={(v) => [v, 'Products']} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0ea5e9"
                strokeWidth={2.5}
                dot={{ fill: '#0ea5e9', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 2, stroke: '#0ea5e9', fill: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
          {/* Metric strip */}
          <div className="mt-4 grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 pt-4 dark:divide-slate-800 dark:border-slate-800">
            {[
              { label: 'Total',                                      value: effectiveProductsData?.meta?.total ?? 0,         color: '#0ea5e9' },
              { label: 'Active',                                     value: effectiveActiveProductsData?.meta?.total ?? 0,   color: '#10b981' },
              { label: 'Inactive',                                   value: effectiveInactiveProductsData?.meta?.total ?? 0, color: '#94a3b8' },
              { label: isServicesView ? 'Needs Update' : 'Low Stock', value: lowStockCount,                                  color: '#f59e0b' },
            ].map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-1 px-2">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{m.value}</span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{m.label}</span>
                <span className="h-0.5 w-8 rounded-full" style={{ backgroundColor: m.color }} />
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Distribution donut */}
        {isServicesView ? (
          <ChartCard
            title="Inquiry Distribution"
            subtitle="Current inquiries by status"
            loading={!mounted || inquiryLoading}
            empty={inquiryDonutData.length === 0}
            emptyMessage="No inquiries to display"
            action={{ href: '/supplier/orders', label: 'View all' }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <PieChart width={160} height={160}>
                  <Pie data={inquiryDonutData} cx={76} cy={76} innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value" />
                  <Tooltip contentStyle={ttStyle} />
                </PieChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{inquiryTotalCount}</span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">total</span>
                </div>
              </div>
              <div className="w-full space-y-1.5">
                {inquiryDonutData.map(item => (
                  <div key={item.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="flex-1 text-[11.5px] text-slate-600 dark:text-slate-300">{item.name}</span>
                    <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100">{item.value}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {inquiryTotalCount > 0 ? `${Math.round((item.value / inquiryTotalCount) * 100)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        ) : (
          <ChartCard
            title="Order Distribution"
            subtitle="Current orders by status"
            loading={!mounted || ordersLoading}
            empty={donutData.length === 0}
            emptyMessage="No orders to display"
            action={{ href: '/supplier/orders', label: 'View all' }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <PieChart width={160} height={160}>
                  <Pie data={donutData} cx={76} cy={76} innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value" />
                  <Tooltip contentStyle={ttStyle} />
                </PieChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalOrders}</span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">total</span>
                </div>
              </div>
              <div className="w-full space-y-1.5">
                {donutData.map(item => (
                  <div key={item.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="flex-1 text-[11.5px] text-slate-600 dark:text-slate-300">{item.name}</span>
                    <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100">{item.value}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {totalOrders > 0 ? `${Math.round((item.value / totalOrders) * 100)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          Recent Orders
      ════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
              <ShoppingCart className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{isServicesView ? 'Recent Bookings' : 'Recent Orders'}</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{isServicesView ? 'Latest booking requests from your clients' : 'Latest incoming from your storefront'}</p>
            </div>
          </div>
          <Link href="/supplier/orders" className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:from-sky-600 hover:to-blue-700">
            {isServicesView ? 'View all bookings' : 'View all orders'} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div>
          {isServicesView ? (
            inquiryLoading ? (
              <div className="space-y-2.5 p-5">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : recentInquiries.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={CalendarDays} message="No inquiries yet" sub="Inquiry requests from clients will appear here" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
                      {['ID', 'Inquirer', 'Service', 'Contact', 'Status', 'Date', 'Actions'].map(h => (
                        <th key={h} className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 ${h === 'Actions' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentInquiries.map(inq => {
                      const isToday = inqIsToday(inq.created_at)
                      const dispStatus = (inq.status === 'responded' || inq.status === 'closed') ? 'Complete' : isToday ? 'New' : 'Pending'
                      const statusStyle = dispStatus === 'New' ? 'border-blue-200/80 bg-blue-50 text-blue-700' : dispStatus === 'Pending' ? 'border-amber-200/80 bg-amber-50 text-amber-700' : 'border-emerald-200/80 bg-emerald-50 text-emerald-700'
                      const dotColor   = dispStatus === 'New' ? 'bg-blue-500' : dispStatus === 'Pending' ? 'bg-amber-500' : 'bg-emerald-500'
                      return (
                        <tr key={inq.id} className="group transition hover:bg-sky-50/50 dark:hover:bg-sky-500/5">
                          <td className="px-4 py-3.5 text-[13px] font-bold text-indigo-500 dark:text-indigo-400">#{inq.id}</td>
                          <td className="px-4 py-3.5">
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{inq.fullname}</p>
                            <p className="text-[11px] text-slate-400">{inq.email}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[12px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                              {inq.product?.pd_name ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[13px] text-slate-600 dark:text-slate-300">{inq.contact || '—'}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                              {dispStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[13px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(inq.created_at ?? null)}</td>
                          <td className="px-4 py-3.5 text-center">
                            <Link href="/supplier/orders" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-sky-100 hover:text-sky-600 dark:hover:bg-sky-500/10 dark:hover:text-sky-400">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            ordersLoading ? (
              <div className="space-y-2.5 p-5">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={ShoppingCart} message="No orders yet" sub="Orders from your storefront will appear here" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
                      {['Order ID', 'Product', 'Customer', 'Date', 'Status', 'Amount', 'Actions'].map((h) => (
                        <th key={h} className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 ${h === 'Amount' ? 'text-right' : h === 'Actions' ? 'text-center' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="group transition hover:bg-sky-50/50 dark:hover:bg-sky-500/5">
                        <td className="px-4 py-3.5 text-[13px] font-bold text-sky-600 dark:text-sky-400">#{order.id}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {order.product_image ? (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                <Image src={order.product_image} alt={order.product_name} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/10">
                                <Package className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="max-w-[200px] truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{order.product_name}</p>
                              {order.product_description ? <p className="max-w-[200px] truncate text-[11px] text-slate-400 dark:text-slate-500">{order.product_description}</p> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{order.customer_name ?? 'Customer'}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">Qty {order.quantity}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(order.created_at ?? null)}</td>
                        <td className="px-4 py-3.5"><FulfillmentBadge status={order.fulfillment_status} /></td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtMoney(Number(order.amount))}</td>
                        <td className="px-4 py-3.5 text-center">
                          <Link href="/supplier/orders" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-sky-100 hover:text-sky-600 dark:hover:bg-sky-500/10 dark:hover:text-sky-400">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {(orderCounts?.return ?? 0) > 0 && (
            <div className="m-5 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-500/20 dark:bg-orange-500/10">
              <RefreshCw className="h-4 w-4 shrink-0 text-orange-500 dark:text-orange-400" />
              <p className="flex-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
                {orderCounts?.return} return{(orderCounts?.return ?? 0) !== 1 ? 's' : ''} need attention
              </p>
              <Link href="/supplier/orders?filter=return" className="text-xs font-bold text-orange-600 hover:underline dark:text-orange-400">
                Review →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          Inventory + Team
      ════════════════════════════════════════════════════════ */}
      <div className="grid gap-5 xl:grid-cols-2">

        {/* Inventory Attention / Services Status */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isServicesView ? 'bg-teal-50 text-teal-500 dark:bg-teal-500/10 dark:text-teal-400' : 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                {isServicesView ? <MessageSquare className="h-4.5 w-4.5" /> : <Box className="h-4.5 w-4.5" />}
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{isServicesView ? 'Services Status' : 'Inventory Attention'}</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{isServicesView ? 'Overview of your service listings' : 'Products that may need review'}</p>
              </div>
            </div>
            <Link href={isServicesView ? '/supplier/products' : '/supplier/inventory'} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-amber-400">
              Review
            </Link>
          </div>
          <div className="space-y-3 p-5">
            <InventoryBar label={isServicesView ? 'Active Services'   : 'Active Products'}   value={effectiveActiveProductsData?.meta?.total ?? 0}   total={effectiveProductsData?.meta?.total ?? 0} tone="sky"     note={isServicesView ? 'Currently bookable' : 'Currently live'} />
            <InventoryBar label={isServicesView ? 'Inactive Services' : 'Inactive Products'} value={effectiveInactiveProductsData?.meta?.total ?? 0} total={effectiveProductsData?.meta?.total ?? 0} tone={(effectiveInactiveProductsData?.meta?.total ?? 0) > 0 ? 'rose' : 'emerald'} note={(effectiveInactiveProductsData?.meta?.total ?? 0) > 0 ? (isServicesView ? 'Not currently bookable' : 'Not currently live') : (isServicesView ? 'All services active' : 'All products active')} />
            {isServicesView ? (
              <InventoryBar label="Needs Update" value={lowStockCount} total={effectiveProductsData?.meta?.total ?? 0} tone="amber" note={lowStockCount > 0 ? 'Flagged for review' : 'All listings up to date'} />
            ) : (
              <InventoryBar label="Low Stock"    value={lowStockCount} total={effectiveProductsData?.meta?.total ?? 0} tone="amber" note={lowStockCount > 0 ? 'Needs restock' : 'No low stock alerts'} />
            )}
          </div>
        </div>

        {/* Team Access */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-400">
                <Users className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Team Access</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Who owns and uses this workspace</p>
              </div>
            </div>
            <Link href="/supplier/users" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-sky-400">
              Manage
            </Link>
          </div>
          <div className="space-y-3 p-5">
            <TeamRow icon={UserRound} label="Main Supplier" value={mainSupplierUser?.fullname || mainSupplierUser?.username || supplierName} badge="Owner" tone="sky" />
            <TeamRow icon={Users}     label="Sub Suppliers" value={`${subSupplierCount} sub-supplier${subSupplierCount !== 1 ? 's' : ''}`}              badge={subSupplierCount > 0 ? 'Active' : 'None'} tone={subSupplierCount > 0 ? 'emerald' : 'slate'} />
            <TeamRow icon={ShieldCheck} label="Your Role"   value={isMainSupplier ? 'Can manage supplier users' : 'Product & company access only'} badge={isMainSupplier ? 'Main' : 'Sub'} tone={isMainSupplier ? 'sky' : 'slate'} />
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/15">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
              </span>
              <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                {isMainSupplier ? 'Invite sub-supplier users from the Users page to give your team separate logins.' : 'Contact the main supplier to request user management or category changes.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          Recent Products + Categories
      ════════════════════════════════════════════════════════ */}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">

        {/* Recent Products / My Services */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isServicesView ? 'bg-teal-50 text-teal-500 dark:bg-teal-500/10 dark:text-teal-400' : 'bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-400'}`}>
                {isServicesView ? <MessageSquare className="h-4.5 w-4.5" /> : <Package className="h-4.5 w-4.5" />}
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{isServicesView ? 'My Services' : 'Recent Products'}</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{isServicesView ? 'Your listed services available for booking' : 'Latest from your supplier catalog'}</p>
              </div>
            </div>
            <Link href="/supplier/products" className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${isServicesView ? 'bg-linear-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700' : 'bg-linear-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700'}`}>
              <Settings className="h-3.5 w-3.5" /> {isServicesView ? 'Manage Services' : 'Manage Products'}
            </Link>
          </div>
          <div>
            {recentProducts.length === 0 ? (
              <div className="p-5">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-500/10">
                  <span className="mt-0.5 text-amber-500">⚠</span>
                  <p className="text-sm text-amber-700 dark:text-amber-300">{isServicesView ? 'No services yet. Start by adding your first service listing.' : 'No products yet. Start by adding your first supplier product.'}</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
                      {[isServicesView ? 'Service' : 'Product', 'SKU', isServicesView ? 'Slots' : 'Quantity', 'Status', 'Updated', 'Actions'].map((h) => (
                        <th key={h} className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 ${h === 'Actions' || h === 'Quantity' || h === 'Slots' ? 'text-center' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentProducts.map((product) => <ProductRow key={product.id} product={product} isServicesView={isServicesView} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Categories */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400">
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Assigned Categories</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{isServicesView ? 'For service listings' : 'For product posting'}</p>
              </div>
            </div>
            <Link href="/supplier/categories" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-violet-400">
              View all
            </Link>
          </div>
          <div className="p-5">
            {(supplierCategoriesData?.categories?.length ?? 0) === 0 ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-500/10">
                <span className="mt-0.5 text-amber-500">⚠</span>
                <p className="text-sm text-amber-700 dark:text-amber-300">{isServicesView ? 'No categories assigned yet. Ask the admin team.' : 'No categories assigned yet. Ask the admin team.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(supplierCategoriesData?.categories ?? []).slice(0, 10).map((c, i) => {
                    const colors = [
                      'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300',
                      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300',
                      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
                      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
                      'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-300',
                      'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300',
                    ]
                    return (
                      <span key={c.id} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition hover:shadow-sm ${colors[i % colors.length]}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                        {c.name}
                      </span>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
                      <ShieldCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </span>
                    <span className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">
                      {supplierCategoriesData?.categories?.length ?? 0} categories assigned
                    </span>
                  </div>
                  <Link href="/supplier/categories" className="text-[11px] font-bold text-sky-600 hover:text-sky-500 dark:text-sky-400">
                    View all →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          Supplier Snapshot
      ════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Building2 className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Supplier Snapshot</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Core company details and workspace ownership</p>
            </div>
          </div>
          <Link href="/supplier/company" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-indigo-400">
            Edit profile
          </Link>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <SnapCard label="Company"       value={supplier?.company || supplier?.name || 'Not linked'}                       icon={Building2}  accent="indigo" />
          <SnapCard label="Contact"       value={supplier?.contact || 'Not provided'}                                       icon={UserRound}  accent="sky" />
          <SnapCard label="Email"         value={supplier?.email || 'Not provided'}                                         icon={BadgeCheck} accent="teal" />
          <SnapCard label="Status"        value={supplier?.status === 1 ? 'Active' : 'Inactive'}                            icon={ShieldCheck} accent={supplier?.status === 1 ? 'emerald' : 'slate'} />
          <SnapCard label="Main Supplier" value={mainSupplierUser?.fullname || mainSupplierUser?.username || 'Not assigned'} icon={UserRound}  accent="violet" />
          <SnapCard label="Sub Suppliers" value={`${subSupplierCount} sub-supplier${subSupplierCount !== 1 ? 's' : ''}`}    icon={Users}      accent="amber" />
        </div>
      </div>

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════ */

function SectionLabel({ children, icon: Icon, color }: { children: React.ReactNode; icon: ElementType; color: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{children}</span>
      <div className="flex-1 border-t border-slate-200/80 dark:border-slate-700/50" />
    </div>
  )
}

function StatCard({ label, value, icon: Icon, gradient, href, alert, description }: {
  label: string; value: string; icon: ElementType; gradient: string
  href: string; alert?: boolean; description?: string
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-900"
    >
      {alert && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" />}
      {/* Gradient icon blob */}
      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${gradient} text-white shadow-sm`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      {description && <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{description}</p>}
      {/* bottom accent line */}
      <div className={`absolute bottom-0 left-0 h-0.5 w-full bg-linear-to-r ${gradient} opacity-0 transition-opacity duration-200 group-hover:opacity-100`} />
    </Link>
  )
}

function ChartCard({ title, subtitle, loading, empty, emptyMessage, action, children }: {
  title: string; subtitle: string; loading: boolean; empty: boolean; emptyMessage: string
  action?: { href: string; label: string }; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</p>
        </div>
        {action && (
          <Link href={action.href} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-sky-300">
            {action.label} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="p-5">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          </div>
        ) : empty ? (
          <EmptyState icon={ShoppingCart} message={emptyMessage} />
        ) : children}
      </div>
    </div>
  )
}

function FulfillmentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    processing:       { label: 'Processing',       cls: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' },
    packed:           { label: 'Packed',            cls: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20' },
    shipped:          { label: 'Shipped',           cls: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20' },
    out_for_delivery: { label: 'Out for Delivery',  cls: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' },
    delivered:        { label: 'Delivered',         cls: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20' },
    cancelled:        { label: 'Cancelled',         cls: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' },
    returned:         { label: 'Returned',          cls: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' }
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>
}

function InventoryBar({ label, value, total, tone, note }: { label: string; value: number; total: number; tone: 'amber' | 'rose' | 'emerald' | 'sky'; note: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  const s = {
    sky:     { border: 'border-l-sky-400',     numBg: 'bg-sky-100 dark:bg-sky-500/15',     num: 'text-sky-600 dark:text-sky-300',     bar: 'bg-linear-to-r from-sky-400 to-cyan-400',     track: 'bg-sky-100 dark:bg-sky-900/30' },
    amber:   { border: 'border-l-amber-400',   numBg: 'bg-amber-100 dark:bg-amber-500/15', num: 'text-amber-600 dark:text-amber-300', bar: 'bg-linear-to-r from-amber-400 to-orange-400', track: 'bg-amber-100 dark:bg-amber-900/30' },
    rose:    { border: 'border-l-rose-400',    numBg: 'bg-rose-100 dark:bg-rose-500/15',   num: 'text-rose-600 dark:text-rose-300',   bar: 'bg-linear-to-r from-rose-400 to-pink-400',   track: 'bg-rose-100 dark:bg-rose-900/30' },
    emerald: { border: 'border-l-emerald-400', numBg: 'bg-emerald-100 dark:bg-emerald-500/15', num: 'text-emerald-600 dark:text-emerald-300', bar: 'bg-linear-to-r from-emerald-400 to-teal-400', track: 'bg-emerald-100 dark:bg-emerald-900/30' },
  }[tone]
  return (
    <div className={`flex items-center gap-4 rounded-2xl border border-slate-200/50 border-l-4 ${s.border} bg-white px-4 py-4 shadow-sm transition hover:shadow-md dark:border-slate-700/40 dark:bg-slate-800/60`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.numBg}`}>
        <span className={`text-xl font-bold tabular-nums ${s.num}`}>{value}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>
          <span className={`text-xs font-bold tabular-nums ${s.num}`}>{pct}%</span>
        </div>
        <div className={`h-2 overflow-hidden rounded-full ${s.track}`}>
          <div className={`h-full rounded-full ${s.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[10.5px] text-slate-400 dark:text-slate-500">{note}</p>
      </div>
    </div>
  )
}


function TeamRow({ icon: Icon, label, value, badge, tone }: { icon: ElementType; label: string; value: string; badge: string; tone: 'sky' | 'emerald' | 'slate' }) {
  const iconCls = {
    sky:     'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    slate:   'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  }[tone]
  const badgeCls = {
    sky:     'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    slate:   'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-sm transition hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/60">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
      <span className={`inline-flex shrink-0 rounded-xl px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeCls}`}>{badge}</span>
    </div>
  )
}

function SnapCard({ label, value, icon: Icon, accent = 'sky' }: { label: string; value: string; icon: ElementType; accent?: string }) {
  const iconCls: Record<string, string> = {
    sky:     'bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-400',
    indigo:  'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400',
    teal:    'bg-teal-50 text-teal-500 dark:bg-teal-500/10 dark:text-teal-400',
    emerald: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400',
    violet:  'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400',
    amber:   'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400',
    slate:   'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400',
  }
  const cls = iconCls[accent] ?? iconCls.sky
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/60">
      <div className="mb-3 flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{label}</p>
      </div>
      <p className="truncate text-[14px] font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <div className="pointer-events-none absolute -bottom-5 -right-5 h-16 w-16 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(148,163,184,0.15), transparent)' }} />
    </div>
  )
}

function ProductRow({ product, isServicesView = false }: { product: Product; isServicesView?: boolean }) {
  const active = Number(product.status) === 1 || Number(product.status) === 2
  return (
    <tr className="group transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          {product.image ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700">
              <Image src={product.image} alt={product.name} fill className="object-cover" />
            </div>
          ) : (
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isServicesView ? 'bg-linear-to-br from-teal-100 to-cyan-100 dark:from-teal-500/15 dark:to-cyan-500/10' : 'bg-linear-to-br from-sky-100 to-cyan-100 dark:from-sky-500/15 dark:to-cyan-500/10'}`}>
              {isServicesView ? <MessageSquare className="h-5 w-5 text-teal-600 dark:text-teal-400" /> : <Package className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
            </div>
          )}
          <div className="min-w-0">
            <p className="max-w-55 truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{product.name}</p>
            {product.description ? (
              <p className="max-w-55 truncate text-[11px] text-slate-400 dark:text-slate-500">{product.description}</p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {product.sku || 'No SKU'}
        </span>
      </td>
      <td className="px-4 py-3.5 text-center text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        {isServicesView ? (Number(product.qty ?? 0) > 0 ? Number(product.qty) : '—') : Number(product.qty ?? 0)}
      </td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-slate-500 dark:text-slate-400">
        {fmtDate(product.updatedAt ?? null)}
      </td>
      <td className="px-4 py-3.5 text-center">
        <Link
          href="/supplier/products"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition ${isServicesView ? 'hover:bg-teal-100 hover:text-teal-600 dark:hover:bg-teal-500/10 dark:hover:text-teal-400' : 'hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400'}`}
        >
          <Eye className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  )
}

function EmptyState({ icon: Icon, message, sub }: { icon: ElementType; message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Icon className="h-7 w-7 text-slate-400 dark:text-slate-500" />
      </span>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{message}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  )
}
