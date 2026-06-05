'use client'

import { useMemo } from 'react'
import { RefreshCcw, ReceiptText, AlertTriangle, CreditCard, CheckCircle2, Wallet, ChevronDown, Filter, Calendar } from 'lucide-react'
import { getPartnerStorefrontConfig } from '@/libs/partnerStorefront'
import { useGetAdminWebPageItemsQuery } from '@/store/api/webPagesApi'
import { useGetPartnerWebstoreRequestsQuery, type AdminWebstoreRequest } from '@/store/api/adminInquiriesApi'

const money = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

const dateTime = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateOnly = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
})

const formatMoney = (value: number | string | null | undefined) => money.format(Number(value ?? 0) || 0)

const normalizeStatus = (status?: string | null) => String(status ?? '').trim().toLowerCase()

const getStatusClass = (status?: string | null) => {
  const normalized = normalizeStatus(status)
  if (normalized === 'approved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  if (normalized === 'rejected') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
  if (normalized === 'pending_review') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

const getPaymentMethodLabel = (method?: string | null) => {
  const normalized = normalizeStatus(method)
  if (!normalized) return '-'
  return normalized.replace(/_/g, ' ')
}

const getPlanLabel = (plan?: string | null) => {
  const normalized = normalizeStatus(plan)
  if (normalized === 'test') return 'Test'
  if (normalized === 'quarterly') return 'Quarterly'
  if (normalized === 'semi_annual') return 'Semi-Annual'
  if (normalized === 'annual') return 'Annual'
  return '-'
}

const isLiveSubscriptionRow = (request: AdminWebstoreRequest) => normalizeStatus(request.plan) !== 'test'

type SubscriptionTransactionRow = AdminWebstoreRequest & {
  row_label?: string | null
  latest_receipt_status?: 'pending_review' | 'approved' | 'rejected' | null
  latest_receipt_submitted_at?: string | null
  latest_receipt_urls?: string[] | null
  reviewed_at?: string | null
  total_paid_amount?: number | null
  remaining_balance?: number | null
}

const getTermLabel = (request: AdminWebstoreRequest) => {
  if (request.plan_term) return request.plan_term
  const months = Number(request.plan_term_months ?? 0)
  if (months === 3) return '3 months'
  if (months === 6) return '6 months'
  if (months === 12) return '1 year'
  if (normalizeStatus(request.plan) === 'test') return '2 days'
  return '-'
}

const getHistoricalPaymentAmount = (request: AdminWebstoreRequest) => {
  const subscriptionFee = Number(request.subscription_fee ?? 0)
  const effectiveMonthly = Number(request.effective_monthly ?? 0)
  if (request.billing_option === 'monthly') {
    return Number.isFinite(effectiveMonthly) && effectiveMonthly > 0 ? effectiveMonthly : subscriptionFee
  }
  return Number.isFinite(subscriptionFee) && subscriptionFee > 0 ? subscriptionFee : effectiveMonthly
}

const getSubscriptionEndDate = (tx: {
  plan?: string | null
  plan_term?: string | null
  plan_term_months?: number | null
  reviewed_at?: string | null
  created_at?: string | null
}) => {
  const startStr = (tx.reviewed_at?.trim() || tx.created_at?.trim()) ?? ''
  if (!startStr) return null
  const date = new Date(startStr)
  if (Number.isNaN(date.getTime())) return null

  const plan = normalizeStatus(tx.plan)
  const planTerm = normalizeStatus(tx.plan_term)
  const planTermMonths = Number(tx.plan_term_months ?? 0)

  if (plan === 'test' || planTerm.includes('day')) {
    const days = planTerm.match(/(\d+)\s*day/)?.[1]
    date.setDate(date.getDate() + (days ? Number.parseInt(days, 10) : 2))
  } else if (plan === 'quarterly' || planTermMonths === 3) {
    date.setMonth(date.getMonth() + 3)
  } else if (plan === 'semi_annual' || planTermMonths === 6) {
    date.setMonth(date.getMonth() + 6)
  } else if (plan === 'annual' || planTermMonths === 12) {
    date.setFullYear(date.getFullYear() + 1)
  } else if (planTermMonths > 0) {
    date.setMonth(date.getMonth() + planTermMonths)
  } else {
    return null
  }

  return date
}

const getWebstoreHistoryRows = (requests: Array<AdminWebstoreRequest | null | undefined>) => {
  const rows: SubscriptionTransactionRow[] = []
  const seenRequestKeys = new Set<string>()
  const seenRowKeys = new Set<string>()

  for (const request of requests) {
    if (!request) continue

    const requestSignature = [
      request.reference_no,
      request.status,
      request.created_at,
      request.reviewed_at,
      request.checkout_id || request.base_checkout_id || '',
      request.payment_reference || request.base_payment_reference || '',
      request.payment_intent_id || request.base_payment_intent_id || '',
    ].map((value) => String(value ?? '').trim()).join('|')

    if (seenRequestKeys.has(requestSignature)) continue
    seenRequestKeys.add(requestSignature)

    const receiptItems = request.receipt_items?.length ? request.receipt_items : null
    const paymentAmount = getHistoricalPaymentAmount(request)
    const subscriptionFee = Number(request.subscription_fee ?? 0)

    if (!receiptItems) {
      rows.push({
        ...request,
        row_label: 'Request',
        total_paid_amount: request.status === 'pending_review' ? paymentAmount : Number(request.total_paid_amount ?? paymentAmount),
        remaining_balance: request.status === 'pending_review'
          ? subscriptionFee
          : Number(request.remaining_balance ?? Math.max(0, subscriptionFee - Number(request.total_paid_amount ?? paymentAmount))),
      })
      continue
    }

    let runningPaid = 0
    let runningRemaining = subscriptionFee

    receiptItems.forEach((item, index) => {
      const itemApproval = normalizeStatus(item.approval_status)
      const rowStatus = index === 0
        ? request.status
        : (itemApproval === 'approved' || itemApproval === 'rejected' ? itemApproval : 'pending_review')

      const receiptUrl = String(item.receipt_urls?.[0] ?? '').trim()
      const rowSignature = [
        request.reference_no,
        request.status,
        rowStatus,
        item.checkout_id || request.checkout_id || '',
        item.payment_reference || request.payment_reference || '',
        item.payment_intent_id || request.payment_intent_id || '',
        item.submitted_at || request.created_at || '',
        receiptUrl,
      ].map((value) => String(value ?? '').trim()).join('|')

      if (seenRowKeys.has(rowSignature)) return
      seenRowKeys.add(rowSignature)

      if (rowStatus === 'approved') {
        runningPaid = Math.min(subscriptionFee || (runningPaid + paymentAmount), runningPaid + paymentAmount)
        runningRemaining = Math.max(0, subscriptionFee - runningPaid)
      }

      rows.push({
        ...request,
        id: item.id ?? request.id,
        status: rowStatus as SubscriptionTransactionRow['status'],
        billing_option: item.billing_option ?? request.billing_option ?? null,
        payment_method: item.payment_method ?? request.payment_method ?? null,
        payment_reference: item.payment_reference || request.payment_reference || null,
        checkout_id: item.checkout_id || request.checkout_id || null,
        payment_intent_id: item.payment_intent_id || request.payment_intent_id || null,
        receipt_urls: item.receipt_urls ?? request.receipt_urls ?? null,
        latest_receipt_status: rowStatus as SubscriptionTransactionRow['latest_receipt_status'],
        latest_receipt_submitted_at: item.submitted_at ?? request.latest_receipt_submitted_at ?? request.created_at ?? null,
        latest_receipt_urls: item.receipt_urls ?? null,
        created_at: item.submitted_at ?? request.created_at ?? null,
        reviewed_at: item.approved_at ?? request.reviewed_at ?? null,
        total_paid_amount: paymentAmount,
        remaining_balance: runningRemaining,
        row_label: item.label ?? `Receipt ${index + 1}`,
      })
    })
  }

  const dedupedRows: SubscriptionTransactionRow[] = []
  const seenFinalKeys = new Set<string>()

  for (const row of rows) {
    const finalKey = [
      row.reference_no,
      row.row_label ?? '',
      row.created_at ?? '',
      row.reviewed_at ?? '',
      row.payment_reference ?? '',
      row.checkout_id ?? '',
      row.payment_intent_id ?? '',
      row.status ?? '',
      row.total_paid_amount ?? '',
      row.remaining_balance ?? '',
      ...(row.latest_receipt_urls ?? row.receipt_urls ?? []),
    ].map((value) => String(value ?? '').trim()).join('|')

    if (seenFinalKeys.has(finalKey)) continue
    seenFinalKeys.add(finalKey)
    dedupedRows.push(row)
  }

  return dedupedRows.sort((a, b) => {
    const aTime = new Date(a.latest_receipt_submitted_at ?? a.reviewed_at ?? a.created_at ?? 0).getTime()
    const bTime = new Date(b.latest_receipt_submitted_at ?? b.reviewed_at ?? b.created_at ?? 0).getTime()
    return bTime - aTime
  })
}

const getTransactionDate = (tx: SubscriptionTransactionRow) => {
  const value = [tx.latest_receipt_submitted_at, tx.reviewed_at, tx.created_at]
    .map((item) => String(item ?? '').trim())
    .find(Boolean)
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function LoadingBlock() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <svg className="h-4 w-4 animate-spin text-sky-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      Loading subscription transactions...
    </div>
  )
}

export default function PartnerSubscriptionsPage() {
  const { data: storefrontData, isLoading: isStorefrontLoading } = useGetAdminWebPageItemsQuery(
    { type: 'partner-storefront', page: 1, perPage: 100, status: 'all' },
  )
  const { data: historyData, isLoading: isHistoryLoading, isFetching: isHistoryFetching, error, refetch } = useGetPartnerWebstoreRequestsQuery()

  const storefrontItem = storefrontData?.items?.[0]
  const storefrontConfig = useMemo(() => getPartnerStorefrontConfig(storefrontItem), [storefrontItem])
  const storefrontName = storefrontConfig?.displayName ?? storefrontItem?.title ?? 'Partner Storefront'
  const storefrontSlug = storefrontConfig?.slug ?? storefrontItem?.key ?? ''

  const filteredRequests = useMemo(() => {
    const requests = historyData?.requests ?? []
    if (!storefrontSlug) return requests
    const normalizedSlug = storefrontSlug.trim().toLowerCase()
    const bySlug = requests.filter((request) => normalizeStatus(request.slug_name) === normalizedSlug && isLiveSubscriptionRow(request))
    if (bySlug.length > 0) return bySlug

    const normalizedName = storefrontName.trim().toLowerCase()
    const byName = requests.filter((request) => normalizeStatus(request.display_name) === normalizedName && isLiveSubscriptionRow(request))
    return byName
  }, [historyData?.requests, storefrontName, storefrontSlug])

  const transactions = useMemo(() => getWebstoreHistoryRows(filteredRequests), [filteredRequests])
  const activeRequest = transactions[0] ?? null
  const summary = useMemo(() => {
    const totals = transactions.reduce(
      (acc, tx) => {
        const status = normalizeStatus(tx.status)
        acc.count += 1
        acc.totalPaid += Number(tx.total_paid_amount ?? 0)
        if (status === 'approved') acc.approved += 1
        else if (status === 'pending_review') acc.pending += 1
        else if (status === 'rejected') acc.rejected += 1
        return acc
      },
      { count: 0, approved: 0, pending: 0, rejected: 0, totalPaid: 0 },
    )

    return totals
  }, [transactions])

  const loading = isStorefrontLoading || isHistoryLoading

  return (
    <section className="space-y-4">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-linear-to-br from-sky-50 via-indigo-50/30 to-slate-50 shadow-sm dark:border-sky-900/30 dark:from-sky-900/20 dark:via-indigo-900/10 dark:to-slate-900">
        {/* Decorative illustration */}
        <div className="pointer-events-none absolute right-24 top-1/2 hidden -translate-y-1/2 opacity-20 sm:block">
          <svg width="140" height="110" viewBox="0 0 140 110" fill="none">
            <circle cx="70" cy="38" r="30" fill="#6366f1" opacity="0.5"/>
            <text x="70" y="46" textAnchor="middle" fontSize="22" fill="white" fontWeight="bold">$</text>
            <rect x="20" y="60" width="80" height="10" rx="4" fill="#94a3b8" opacity="0.5"/>
            <rect x="20" y="76" width="60" height="8" rx="4" fill="#cbd5e1" opacity="0.4"/>
            <rect x="20" y="90" width="70" height="8" rx="4" fill="#cbd5e1" opacity="0.4"/>
          </svg>
        </div>

        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100/80 shadow-sm dark:bg-indigo-900/40">
              <ReceiptText className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">
                Subscription Transactions
              </p>
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {storefrontName}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Review the payment history for this partner storefront subscription.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RefreshCcw className={`h-4 w-4 ${isHistoryFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Transactions */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <CreditCard className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Transactions</p>
              <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{summary.count}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Total transactions</p>
            </div>
          </div>
        </div>
        {/* Approved */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Approved</p>
              <p className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400">{summary.approved}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Successful payments</p>
            </div>
          </div>
        </div>
        {/* Pending */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <svg className="h-5 w-5 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Pending</p>
              <p className="mt-1 text-3xl font-black text-amber-600 dark:text-amber-400">{summary.pending}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Awaiting approval</p>
            </div>
          </div>
        </div>
        {/* Total Paid */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
              <Wallet className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Total Paid</p>
              <p className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatMoney(summary.totalPaid)}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Total amount paid</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Transaction history ── */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Transaction History</h2>
            {storefrontSlug ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Storefront slug:{' '}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{storefrontSlug}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Current partner storefront</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5" /> All Time <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Filter className="h-3.5 w-3.5" /> Filter <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </div>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        {loading ? (
          <div className="p-5"><LoadingBlock /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/20">
              <AlertTriangle className="h-7 w-7 text-rose-500" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">Failed to load transactions</p>
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">Unable to fetch subscription history. Please check your connection and try again.</p>
            <button type="button" onClick={() => void refetch()}
              className="mt-1 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50">
              <RefreshCcw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            {/* Illustration */}
            <div className="relative">
              <span className="absolute -left-6 -top-3 text-lg text-indigo-200 select-none">+</span>
              <span className="absolute -right-4 top-0 text-sm text-indigo-200 select-none">✦</span>
              <span className="absolute -left-2 bottom-0 text-xs text-indigo-100 select-none">+</span>
              <span className="absolute -right-6 bottom-2 text-base text-indigo-200 select-none">+</span>
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 shadow-inner dark:bg-indigo-900/20">
                <svg width="40" height="44" viewBox="0 0 40 44" fill="none">
                  <rect x="2" y="2" width="28" height="36" rx="4" fill="#e0e7ff" stroke="#a5b4fc" strokeWidth="1.5"/>
                  <line x1="8" y1="11" x2="22" y2="11" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="8" y1="17" x2="22" y2="17" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="8" y1="23" x2="16" y2="23" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md dark:bg-slate-800">
                  <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 7v5l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">No transactions yet</p>
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Subscription payments and receipts for this storefront will appear here once they are submitted or approved.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  {['Reference', 'Plan', 'Amount', 'Balance', 'Payment Method', 'Status', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx) => {
                  const status = normalizeStatus(tx.status)
                  const expiry = getSubscriptionEndDate(tx)
                  const transactionDate = getTransactionDate(tx)
                  return (
                    <tr key={`${tx.reference_no}-${tx.id}-${tx.row_label ?? ''}`} className="align-top transition hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10">
                      <td className="px-4 py-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{tx.reference_no || '-'}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{tx.row_label ?? 'Subscription request'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{getPlanLabel(tx.plan)}</p>
                        <p className="text-xs text-slate-400">{getTermLabel(tx)}</p>
                        {expiry && <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">Ends {dateOnly.format(expiry)}</p>}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(tx.total_paid_amount ?? getHistoricalPaymentAmount(tx))}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {tx.remaining_balance != null ? formatMoney(tx.remaining_balance) : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400 capitalize">
                        {getPaymentMethodLabel(tx.payment_method)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClass(tx.status)}`}>
                          {status.replace(/_/g, ' ') || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {transactionDate ? dateTime.format(transactionDate) : '-'}
                        {tx.payment_reference && <p className="mt-0.5 text-[11px] text-slate-400">Ref: {tx.payment_reference}</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </section>
  )
}
