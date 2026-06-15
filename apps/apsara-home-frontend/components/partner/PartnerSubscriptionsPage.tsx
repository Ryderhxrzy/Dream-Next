"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSearchParams } from "next/navigation"
import {
  RefreshCcw,
  AlertTriangle,
  ZoomIn,
  Trash2,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Wallet,
} from "lucide-react"
import { getPartnerStorefrontConfig } from "@/libs/partnerStorefront"
import { useGetAdminWebPageItemsQuery } from "@/store/api/webPagesApi"
import {
  useGetPartnerWebstoreRequestsQuery,
  useDeletePartnerWebstoreReceiptItemMutation,
  type AdminWebstoreRequest,
} from "@/store/api/adminInquiriesApi"

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

const dateTime = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
})

const dateOnly = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const formatMoney = (value: number | string | null | undefined) =>
  money.format(Number(value ?? 0) || 0)
const normalizeStatus = (status?: string | null) =>
  String(status ?? "")
    .trim()
    .toLowerCase()

const getPaymentMethodLabel = (method?: string | null) => {
  const m = normalizeStatus(method)
  if (!m) return "—"
  if (m === "gcash") return "Gcash"
  if (m === "grab_pay") return "GrabPay"
  if (m === "maya") return "Maya"
  if (m === "card") return "Card"
  return m.replace(/_/g, " ")
}

const getPlanLabel = (plan?: string | null) => {
  const p = normalizeStatus(plan)
  if (p === "test") return "Test"
  if (p === "quarterly") return "Quarterly"
  if (p === "semi_annual") return "Semi-Annual"
  if (p === "annual") return "Annual"
  return plan ?? "—"
}

const getTermLabel = (request: AdminWebstoreRequest) => {
  if (request.plan_term) return request.plan_term
  const months = Number(request.plan_term_months ?? 0)
  if (months === 3) return "3 months"
  if (months === 6) return "6 months"
  if (months === 12) return "1 year"
  if (normalizeStatus(request.plan) === "test") return "2 days"
  return "—"
}

const getHistoricalPaymentAmount = (request: AdminWebstoreRequest) => {
  const subscriptionFee = Number(request.subscription_fee ?? 0)
  const effectiveMonthly = Number(request.effective_monthly ?? 0)
  if (request.billing_option === "monthly")
    return Number.isFinite(effectiveMonthly) && effectiveMonthly > 0
      ? effectiveMonthly
      : subscriptionFee
  return Number.isFinite(subscriptionFee) && subscriptionFee > 0
    ? subscriptionFee
    : effectiveMonthly
}

const getSubscriptionEndDate = (tx: {
  plan?: string | null
  plan_term?: string | null
  plan_term_months?: number | null
  reviewed_at?: string | null
  created_at?: string | null
}) => {
  const startStr = tx.reviewed_at?.trim() || tx.created_at?.trim() || ""
  if (!startStr) return null
  const date = new Date(startStr)
  if (Number.isNaN(date.getTime())) return null
  const plan = normalizeStatus(tx.plan)
  const planTerm = normalizeStatus(tx.plan_term)
  const planTermMonths = Number(tx.plan_term_months ?? 0)
  if (plan === "test" || planTerm.includes("day")) {
    const days = planTerm.match(/(\d+)\s*day/)?.[1]
    date.setDate(date.getDate() + (days ? Number.parseInt(days, 10) : 2))
  } else if (plan === "quarterly" || planTermMonths === 3) {
    date.setMonth(date.getMonth() + 3)
  } else if (plan === "semi_annual" || planTermMonths === 6) {
    date.setMonth(date.getMonth() + 6)
  } else if (plan === "annual" || planTermMonths === 12) {
    date.setFullYear(date.getFullYear() + 1)
  } else if (planTermMonths > 0) {
    date.setMonth(date.getMonth() + planTermMonths)
  } else {
    return null
  }
  return date
}

type SubscriptionTransactionRow = AdminWebstoreRequest & {
  row_label?: string | null
  detail_id?: number | null
  latest_receipt_status?: "pending_review" | "approved" | "rejected" | null
  latest_receipt_submitted_at?: string | null
  latest_receipt_urls?: string[] | null
  reviewed_at?: string | null
  total_paid_amount?: number | null
  remaining_balance?: number | null
}

const getWebstoreHistoryRows = (
  requests: Array<AdminWebstoreRequest | null | undefined>
) => {
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
      request.checkout_id || request.base_checkout_id || "",
      request.payment_reference || request.base_payment_reference || "",
      request.payment_intent_id || request.base_payment_intent_id || "",
    ]
      .map((value) => String(value ?? "").trim())
      .join("|")

    if (seenRequestKeys.has(requestSignature)) continue
    seenRequestKeys.add(requestSignature)

    const receiptItems = request.receipt_items?.length
      ? request.receipt_items
      : null
    const paymentAmount = getHistoricalPaymentAmount(request)
    const subscriptionFee = Number(request.subscription_fee ?? 0)

    if (!receiptItems) {
      rows.push({
        ...request,
        row_label: "Request",
        latest_receipt_status:
          (request.latest_receipt_status as SubscriptionTransactionRow["latest_receipt_status"]) ??
          null,
        total_paid_amount:
          request.status === "pending_review"
            ? paymentAmount
            : Number(request.total_paid_amount ?? paymentAmount),
        remaining_balance:
          request.status === "pending_review"
            ? subscriptionFee
            : Number(
                request.remaining_balance ??
                  Math.max(
                    0,
                    subscriptionFee -
                      Number(request.total_paid_amount ?? paymentAmount)
                  )
              ),
      })
      continue
    }

    let runningPaid = 0
    let runningRemaining = subscriptionFee

    receiptItems.forEach((item, index) => {
      const itemApproval = normalizeStatus(item.approval_status)
      const rowStatus =
        index === 0
          ? request.status
          : itemApproval === "approved" || itemApproval === "rejected"
            ? itemApproval
            : "pending_review"

      const receiptUrl = String(item.receipt_urls?.[0] ?? "").trim()
      const rowSignature = [
        request.reference_no,
        request.status,
        rowStatus,
        item.checkout_id || request.checkout_id || "",
        item.payment_reference || request.payment_reference || "",
        item.payment_intent_id || request.payment_intent_id || "",
        item.submitted_at || request.created_at || "",
        receiptUrl,
      ]
        .map((value) => String(value ?? "").trim())
        .join("|")

      if (seenRowKeys.has(rowSignature)) return
      seenRowKeys.add(rowSignature)

      if (rowStatus === "approved") {
        runningPaid = Math.min(
          subscriptionFee || runningPaid + paymentAmount,
          runningPaid + paymentAmount
        )
        runningRemaining = Math.max(0, subscriptionFee - runningPaid)
      }

      rows.push({
        ...request,
        id: item.id ?? request.id,
        detail_id: item.id ?? null,
        status: rowStatus as SubscriptionTransactionRow["status"],
        billing_option: item.billing_option ?? request.billing_option ?? null,
        payment_method: item.payment_method ?? request.payment_method ?? null,
        payment_reference:
          item.payment_reference || request.payment_reference || null,
        checkout_id: item.checkout_id || request.checkout_id || null,
        payment_intent_id:
          item.payment_intent_id || request.payment_intent_id || null,
        receipt_urls: item.receipt_urls ?? request.receipt_urls ?? null,
        latest_receipt_status:
          rowStatus as SubscriptionTransactionRow["latest_receipt_status"],
        latest_receipt_submitted_at:
          item.submitted_at ??
          request.latest_receipt_submitted_at ??
          request.created_at ??
          null,
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
      row.row_label ?? "",
      row.created_at ?? "",
      row.reviewed_at ?? "",
      row.payment_reference ?? "",
      row.checkout_id ?? "",
      row.payment_intent_id ?? "",
      row.status ?? "",
      row.total_paid_amount ?? "",
      row.remaining_balance ?? "",
      ...(row.latest_receipt_urls ?? row.receipt_urls ?? []),
    ]
      .map((value) => String(value ?? "").trim())
      .join("|")

    if (seenFinalKeys.has(finalKey)) continue
    seenFinalKeys.add(finalKey)
    dedupedRows.push(row)
  }

  return dedupedRows.sort((a, b) => {
    const aTime = new Date(
      a.latest_receipt_submitted_at ?? a.reviewed_at ?? a.created_at ?? 0
    ).getTime()
    const bTime = new Date(
      b.latest_receipt_submitted_at ?? b.reviewed_at ?? b.created_at ?? 0
    ).getTime()
    return bTime - aTime
  })
}

const getTransactionDate = (tx: SubscriptionTransactionRow) => {
  const value = [tx.latest_receipt_submitted_at, tx.reviewed_at, tx.created_at]
    .map((item) => String(item ?? "").trim())
    .find(Boolean)
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = normalizeStatus(status)
  if (s === "approved") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-600">
        Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-0.5 text-xs font-semibold text-rose-600">
      Rejected
    </span>
  )
}

function ReceiptThumb({
  urls,
  onZoom,
}: {
  urls?: string[] | null
  onZoom: (urls: string[]) => void
}) {
  const url = urls?.[0] ?? null
  return (
    <div className="relative inline-block h-13 w-10 overflow-hidden rounded-md border border-slate-200 bg-slate-50 shadow-sm">
      {url ? (
        <img src={url} alt="receipt" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <FileText className="h-5 w-5 text-slate-300" />
        </div>
      )}
      <button
        type="button"
        onClick={() => onZoom((urls?.filter(Boolean) as string[]) ?? [])}
        className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
      >
        <ZoomIn className="h-2.5 w-2.5 text-slate-600" />
      </button>
    </div>
  )
}

function ReceiptPreviewModal({
  urls,
  onClose,
}: {
  urls: string[]
  onClose: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const url = urls[idx] ?? null
  const hasMultiple = urls.length > 1

  const prev = useCallback(() => {
    setDirection(-1)
    setIdx((i) => (i - 1 + urls.length) % urls.length)
  }, [urls.length])

  const next = useCallback(() => {
    setDirection(1)
    setIdx((i) => (i + 1) % urls.length)
  }, [urls.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev()
      else if (e.key === "ArrowRight") next()
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [prev, next, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">
            Receipt Preview
            {hasMultiple && (
              <span className="ml-2 text-xs font-normal text-slate-400">
                {idx + 1} / {urls.length}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Image area */}
        <div className="relative flex max-h-[70vh] items-center justify-center overflow-hidden bg-slate-50">
          <AnimatePresence mode="wait" custom={direction}>
            {url ? (
              <motion.div
                key={idx}
                custom={direction}
                variants={{
                  enter: (d: number) => ({
                    x: d > 0 ? "100%" : "-100%",
                    opacity: 0,
                  }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({
                    x: d > 0 ? "-100%" : "100%",
                    opacity: 0,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="flex max-h-[70vh] w-full items-center justify-center p-6"
              >
                <img
                  src={url}
                  alt={`Receipt ${idx + 1}`}
                  className="max-h-[65vh] w-auto rounded-lg object-contain shadow"
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-48 items-center justify-center"
              >
                <p className="text-sm text-slate-400">
                  No receipt image available.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white hover:shadow-lg"
                aria-label="Previous receipt"
              >
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white hover:shadow-lg"
                aria-label="Next receipt"
              >
                <ChevronRight className="h-5 w-5 text-slate-700" />
              </button>
            </>
          )}
        </div>

        {/* Dot navigation */}
        {hasMultiple && (
          <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDirection(i > idx ? 1 : -1)
                  setIdx(i)
                }}
                className={`h-2 w-2 rounded-full transition ${i === idx ? "bg-indigo-500 w-4" : "bg-slate-300 hover:bg-slate-400"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DeleteConfirmModal({
  reference,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  reference: string | null
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
          <Trash2 className="h-6 w-6 text-rose-500" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">
          Delete this record?
        </h3>
        <p className="mt-1.5 text-sm text-slate-500">
          This will permanently delete the entire subscription record and all
          its receipts from the database. This action cannot be undone.
        </p>
        {reference && (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
            Ref: {reference}
          </p>
        )}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" /> Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
      <svg
        className="h-4 w-4 animate-spin text-sky-500"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      Loading subscription transactions...
    </div>
  )
}

export default function PartnerSubscriptionsPage() {
  const searchParams = useSearchParams()
  const { data: storefrontData, isLoading: isStorefrontLoading } =
    useGetAdminWebPageItemsQuery({
      type: "partner-storefront",
      page: 1,
      perPage: 100,
      status: "all",
    })
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    error,
    refetch,
  } = useGetPartnerWebstoreRequestsQuery()
  const [deleteReceiptItem, { isLoading: isDeleting }] =
    useDeletePartnerWebstoreReceiptItemMutation()

  const [previewUrls, setPreviewUrls] = useState<string[] | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    detailId: number
    reference: string | null
  } | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteReceiptItem({ id: deleteTarget.detailId }).unwrap()
      setDeleteTarget(null)
    } catch {
      // error is surfaced by RTK Query — modal stays open so user can retry
    }
  }

  const storefrontSelector =
    searchParams.get("storefront")?.trim().toLowerCase() ?? ""
  const storefrontItem = useMemo(() => {
    const items = storefrontData?.items ?? []
    if (items.length === 0) return undefined
    if (!storefrontSelector) return items[0]

    const byId = items.find((item) => String(item.id) === storefrontSelector)
    if (byId) return byId

    const bySlug = items.find(
      (item) => getPartnerStorefrontConfig(item)?.slug === storefrontSelector
    )
    if (bySlug) return bySlug

    const byKey = items.find(
      (item) =>
        String(item.key ?? "")
          .trim()
          .toLowerCase() === storefrontSelector
    )
    if (byKey) return byKey

    return items[0]
  }, [storefrontData?.items, storefrontSelector])
  const storefrontConfig = useMemo(
    () => getPartnerStorefrontConfig(storefrontItem),
    [storefrontItem]
  )
  const storefrontName =
    storefrontConfig?.displayName ??
    storefrontItem?.title ??
    "Partner Storefront"
  const storefrontSlug = storefrontConfig?.slug ?? storefrontItem?.key ?? ""

  const filteredRequests = useMemo(() => {
    const requests = historyData?.requests ?? []
    if (!storefrontSlug) return requests
    const normalizedSlug = storefrontSlug.trim().toLowerCase()
    const bySlug = requests.filter(
      (request) => normalizeStatus(request.slug_name) === normalizedSlug
    )
    if (bySlug.length > 0) return bySlug
    const normalizedName = storefrontName.trim().toLowerCase()
    return requests.filter(
      (request) => normalizeStatus(request.display_name) === normalizedName
    )
  }, [historyData?.requests, storefrontName, storefrontSlug])

  const transactions = useMemo(
    () => getWebstoreHistoryRows(filteredRequests),
    [filteredRequests]
  )

  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = useMemo(
    () =>
      transactions.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [currentPage, transactions]
  )

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const s = normalizeStatus(tx.status)
        acc.count += 1
        acc.totalPaid += Number(tx.total_paid_amount ?? 0)
        if (s === "approved") acc.approved += 1
        else acc.rejected += 1
        return acc
      },
      { count: 0, approved: 0, rejected: 0, totalPaid: 0 }
    )
  }, [transactions])

  const loading = isStorefrontLoading || isHistoryLoading

  const COLS = [
    "NO.",
    "PLAN",
    "AMOUNT",
    "BALANCE",
    "PAYMENT METHOD",
    "STATUS",
    "DATE",
    "RECEIPT",
    "ACTION",
  ]

  return (
    <section className="space-y-4">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
              <Receipt className="h-7 w-7 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
                Subscription Transactions
              </p>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900">
                {storefrontName}
              </h1>
              {storefrontSlug && (
                <p className="mt-0.5 text-xs text-slate-400">
                  Slug:{" "}
                  <span className="font-semibold text-indigo-600">
                    {storefrontSlug}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="relative z-10 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isHistoryFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
        {/* Decorative right-side wave */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-56 overflow-hidden rounded-r-2xl opacity-40">
          <svg
            viewBox="0 0 220 100"
            className="h-full w-full"
            preserveAspectRatio="xMaxYMid slice"
          >
            <path
              d="M80,0 C110,15 75,35 105,55 C135,75 100,100 220,100 L220,0 Z"
              fill="#818cf8"
              opacity="0.35"
            />
            <path
              d="M120,0 C150,20 115,45 145,65 C175,85 150,100 220,100 L220,0 Z"
              fill="#6366f1"
              opacity="0.25"
            />
            <circle cx="175" cy="18" r="3" fill="#a5b4fc" opacity="0.6" />
            <circle cx="192" cy="32" r="2" fill="#a5b4fc" opacity="0.5" />
            <circle cx="160" cy="38" r="1.5" fill="#c7d2fe" opacity="0.7" />
            <circle cx="185" cy="52" r="2.5" fill="#a5b4fc" opacity="0.4" />
            <circle cx="200" cy="22" r="1.5" fill="#c7d2fe" opacity="0.6" />
            <circle cx="168" cy="62" r="2" fill="#a5b4fc" opacity="0.5" />
            <circle cx="210" cy="44" r="1" fill="#c7d2fe" opacity="0.7" />
          </svg>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Total */}
        <div className="overflow-hidden rounded-2xl border-l-4 border-l-violet-400 bg-white shadow-sm">
          <div className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <ClipboardList className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Total
              </p>
              <p className="mt-0.5 text-3xl font-black text-slate-900">
                {summary.count}
              </p>
            </div>
          </div>
          <svg
            viewBox="0 0 200 45"
            className="w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sg-violet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,30 C15,28 25,22 40,25 C55,28 65,18 80,20 C95,22 105,32 120,28 C135,24 145,16 160,18 C175,20 185,26 200,22 L200,45 L0,45 Z"
              fill="url(#sg-violet)"
            />
            <path
              d="M0,30 C15,28 25,22 40,25 C55,28 65,18 80,20 C95,22 105,32 120,28 C135,24 145,16 160,18 C175,20 185,26 200,22"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Approved */}
        <div className="overflow-hidden rounded-2xl border-l-4 border-l-emerald-400 bg-white shadow-sm">
          <div className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Approved
              </p>
              <p className="mt-0.5 text-3xl font-black text-emerald-600">
                {summary.approved}
              </p>
            </div>
          </div>
          <svg
            viewBox="0 0 200 45"
            className="w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sg-green" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,28 C20,24 30,32 50,26 C70,20 85,14 100,18 C115,22 130,30 150,24 C165,18 180,22 200,18 L200,45 L0,45 Z"
              fill="url(#sg-green)"
            />
            <path
              d="M0,28 C20,24 30,32 50,26 C70,20 85,14 100,18 C115,22 130,30 150,24 C165,18 180,22 200,18"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Rejected */}
        <div className="overflow-hidden rounded-2xl border-l-4 border-l-rose-400 bg-white shadow-sm">
          <div className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100">
              <XCircle className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Rejected
              </p>
              <p className="mt-0.5 text-3xl font-black text-rose-500">
                {summary.rejected}
              </p>
            </div>
          </div>
          <svg
            viewBox="0 0 200 45"
            className="w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sg-rose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,32 C15,30 25,18 45,22 C65,26 75,34 95,28 C115,22 125,14 145,18 C165,22 185,28 200,24 L200,45 L0,45 Z"
              fill="url(#sg-rose)"
            />
            <path
              d="M0,32 C15,30 25,18 45,22 C65,26 75,34 95,28 C115,22 125,14 145,18 C165,22 185,28 200,24"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Total Paid */}
        <div className="overflow-hidden rounded-2xl border-l-4 border-l-indigo-600 bg-white shadow-sm">
          <div className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <Wallet className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Total Paid
              </p>
              <p className="mt-0.5 text-2xl font-black text-indigo-700">
                {formatMoney(summary.totalPaid)}
              </p>
            </div>
          </div>
          <svg
            viewBox="0 0 200 45"
            className="w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sg-indigo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,26 C25,22 40,28 60,22 C80,16 95,24 115,20 C135,16 155,22 175,18 C185,16 195,20 200,18 L200,45 L0,45 Z"
              fill="url(#sg-indigo)"
            />
            <path
              d="M0,26 C25,22 40,28 60,22 C80,16 95,24 115,20 C135,16 155,22 175,18 C185,16 195,20 200,18"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* ── Transaction table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-5">
            <LoadingBlock />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
              <AlertTriangle className="h-7 w-7 text-rose-400" />
            </div>
            <p className="text-base font-bold text-slate-800">
              Failed to load transactions
            </p>
            <p className="max-w-xs text-sm text-slate-500">
              Unable to fetch subscription history. Check your connection and
              try again.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-1 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm hover:bg-rose-50"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
              <FileText className="h-8 w-8 text-indigo-300" />
            </div>
            <p className="text-base font-bold text-slate-800">
              No transactions yet
            </p>
            <p className="max-w-xs text-sm text-slate-500">
              Subscription payments and receipts for this storefront will appear
              here once they are submitted or approved.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {COLS.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((tx, index) => {
                  const globalIndex = (page - 1) * PAGE_SIZE + index
                  const endDate = getSubscriptionEndDate(tx)
                  const txDate = getTransactionDate(tx)
                  const receiptUrls = (
                    tx.receipt_urls ??
                    tx.latest_receipt_urls ??
                    []
                  ).filter(Boolean) as string[]

                  return (
                    <tr
                      key={`${tx.reference_no ?? ""}-${tx.id}-${tx.row_label ?? ""}-${globalIndex}`}
                      className="border-b border-slate-50 align-middle transition-colors last:border-0 hover:bg-slate-50/60"
                    >
                      {/* NO. */}
                      <td className="px-4 py-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm">
                          {globalIndex + 1}
                        </span>
                      </td>

                      {/* PLAN */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-900">
                          {getPlanLabel(tx.plan)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {getTermLabel(tx)}
                        </p>
                        {endDate && (
                          <p className="mt-0.5 text-[11px] font-semibold text-indigo-500">
                            Ends {dateOnly.format(endDate)}
                          </p>
                        )}
                      </td>

                      {/* AMOUNT */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-900">
                          {formatMoney(
                            tx.total_paid_amount ??
                              getHistoricalPaymentAmount(tx)
                          )}
                        </p>
                      </td>

                      {/* BALANCE */}
                      <td className="px-4 py-3">
                        <p
                          className={`text-sm font-bold ${Number(tx.remaining_balance ?? 0) <= 0 ? "text-emerald-600" : "text-rose-500"}`}
                        >
                          {formatMoney(tx.remaining_balance ?? 0)}
                        </p>
                      </td>

                      {/* PAYMENT METHOD */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">
                          {getPaymentMethodLabel(tx.payment_method)}
                        </p>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3">
                        <StatusBadge status={tx.status} />
                      </td>

                      {/* DATE */}
                      <td className="px-4 py-3">
                        {txDate ? (
                          <>
                            <p className="text-sm text-slate-700">
                              {dateTime.format(txDate)}
                            </p>
                            {tx.payment_reference && (
                              <p className="mt-0.5 max-w-50 truncate text-[11px] text-slate-400">
                                Ref: {tx.payment_reference}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* RECEIPT */}
                      <td className="px-4 py-3">
                        <ReceiptThumb
                          urls={receiptUrls.length > 0 ? receiptUrls : null}
                          onZoom={(urls) =>
                            urls.length > 0 && setPreviewUrls(urls)
                          }
                        />
                      </td>

                      {/* ACTION */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            const detailId = tx.detail_id ?? tx.id
                            setDeleteTarget({
                              detailId,
                              reference:
                                tx.payment_reference ?? tx.reference_no ?? null,
                            })
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-400 transition hover:bg-rose-100 hover:text-rose-600"
                          title="Delete record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-400">
                  Showing{" "}
                  <span className="font-semibold text-slate-600">
                    {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, transactions.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-600">
                    {transactions.length}
                  </span>{" "}
                  entries
                </p>

                <div className="flex items-center gap-1">
                  {/* Prev */}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Page chips */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                    )
                    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                        acc.push("…")
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="flex h-8 w-8 items-center justify-center text-xs text-slate-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold shadow-sm transition ${
                            p === currentPage
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                  {/* Next */}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Receipt preview modal ── */}
      {previewUrls && (
        <ReceiptPreviewModal
          urls={previewUrls}
          onClose={() => setPreviewUrls(null)}
        />
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <DeleteConfirmModal
          reference={deleteTarget.reference}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  )
}
