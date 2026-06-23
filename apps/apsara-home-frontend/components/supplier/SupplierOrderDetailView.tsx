"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import DOMPurify from "isomorphic-dompurify"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline"
import {
  type SupplierFulfillmentStatus,
  useApproveSupplierOrderMutation,
  useGetSupplierOrdersQuery,
  usePushSupplierOrderToZqMutation,
  useUpdateSupplierOrderFulfillmentMutation,
} from "@/store/api/supplierOrdersApi"

/* ─── constants ────────────────────────────────────────────── */

const FULFILLMENT_OPTIONS: Array<{
  value: SupplierFulfillmentStatus
  label: string
}> = [
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
]

/* ─── helpers ──────────────────────────────────────────────── */

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value || 0)

const parseDate = (value?: string | null) => {
  if (!value) return null
  const s = value.trim().replace(" ", "T")
  const d = new Date(/([zZ]|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+08:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const fmtDateTime = (value?: string | null) => {
  const d = parseDate(value)
  return d
    ? d.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—"
}

const getInitials = (name?: string | null) => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

const getApiError = (err: unknown, fallback: string) =>
  (err as { data?: { message?: string } })?.data?.message || fallback

const formatCourierLabel = (courier?: string | null) => {
  const c = String(courier ?? "").trim().toLowerCase()
  if (c === "afhome") return "AF Home"
  if (c === "jnt") return "J&T Express"
  if (c === "xde") return "XDE"
  if (c === "zq") return "Global Supplier"
  return courier || "—"
}

/* ─── small UI ─────────────────────────────────────────────── */

function ApprovalChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; ring: string; label: string }> = {
    approved: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-500/30", label: "Approved" },
    rejected: { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-300", ring: "ring-rose-200 dark:ring-rose-500/30", label: "Rejected" },
  }
  const s = map[status] ?? { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-500/30", label: "Pending" }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      {s.label}
    </span>
  )
}

function FulfillmentChip({ status }: { status: string }) {
  const map: Record<string, { dot: string; text: string; bg: string; ring: string }> = {
    pending: { dot: "bg-slate-400", text: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800", ring: "ring-slate-200 dark:ring-slate-700" },
    processing: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/10", ring: "ring-blue-200 dark:ring-blue-500/30" },
    packed: { dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-500/10", ring: "ring-violet-200 dark:ring-violet-500/30" },
    shipped: { dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-300", bg: "bg-sky-50 dark:bg-sky-500/10", ring: "ring-sky-200 dark:ring-sky-500/30" },
    out_for_delivery: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/10", ring: "ring-amber-200 dark:ring-amber-500/30" },
    delivered: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10", ring: "ring-emerald-200 dark:ring-emerald-500/30" },
    cancelled: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-500/10", ring: "ring-rose-200 dark:ring-rose-500/30" },
    returned: { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-300", bg: "bg-orange-50 dark:bg-orange-500/10", ring: "ring-orange-200 dark:ring-orange-500/30" },
  }
  const s = map[status] ?? map.pending
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  )
}

function PaymentChip({ status }: { status?: string | null }) {
  const v = (status ?? "").toLowerCase()
  const paid = v.includes("paid") || v.includes("success")
  const failed = v.includes("fail") || v.includes("cancel") || v.includes("refund")
  const s = paid
    ? { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-500/30" }
    : failed
      ? { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-300", ring: "ring-rose-200 dark:ring-rose-500/30" }
      : { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-500/30" }
  const label = status
    ? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Unpaid"
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      {label}
    </span>
  )
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
          {title}
        </p>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="text-right text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </dd>
    </div>
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

function BackLink() {
  return (
    <Link
      href="/supplier/orders"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Orders
    </Link>
  )
}

/* ─── main ─────────────────────────────────────────────────── */

export default function SupplierOrderDetailView({
  orderId,
}: {
  orderId: string
}) {
  const { data, isLoading, isError } = useGetSupplierOrdersQuery({
    filter: "all",
    search: orderId,
    page: 1,
    perPage: 20,
  })

  const order = useMemo(() => {
    const list = data?.orders ?? []
    return (
      list.find((o) => o.checkout_id === orderId) ??
      list.find((o) => String(o.id) === orderId) ??
      null
    )
  }, [data, orderId])

  const [busy, setBusy] = useState(false)
  const [fulfillDraft, setFulfillDraft] = useState<SupplierFulfillmentStatus>("processing")
  const [draftOrderId, setDraftOrderId] = useState<number | null>(null)

  const [approveOrder] = useApproveSupplierOrderMutation()
  const [updateFulfillment] = useUpdateSupplierOrderFulfillmentMutation()
  const [pushToZq] = usePushSupplierOrderToZqMutation()

  // Seed the fulfillment draft when a different order loads — done during render
  // (React "adjust state on prop change" pattern) to avoid a cascading effect.
  if (order && draftOrderId !== order.id) {
    setDraftOrderId(order.id)
    setFulfillDraft(
      (order.fulfillment_status as SupplierFulfillmentStatus) || "processing"
    )
  }

  const handleApprove = async () => {
    if (!order) return
    setBusy(true)
    try {
      const r = await approveOrder({ id: order.id }).unwrap()
      showSuccessToast(r.message || "Order approved.")
    } catch (e) {
      showErrorToast(getApiError(e, "Failed to approve order."))
    } finally {
      setBusy(false)
    }
  }

  const handleSaveFulfillment = async () => {
    if (!order) return
    setBusy(true)
    try {
      const r = await updateFulfillment({
        id: order.id,
        fulfillment_status: fulfillDraft,
      }).unwrap()
      showSuccessToast(r.message || "Fulfillment updated.")
    } catch (e) {
      showErrorToast(getApiError(e, "Failed to update fulfillment."))
    } finally {
      setBusy(false)
    }
  }

  const handlePushToZq = async () => {
    if (!order) return
    setBusy(true)
    try {
      const r = await pushToZq({ id: order.id }).unwrap()
      showSuccessToast(r.message || "Order pushed to ZQ.")
    } catch (e) {
      showErrorToast(getApiError(e, "Failed to push to ZQ."))
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-32 text-slate-400">
        <Spinner />
        <span className="text-sm">Loading order…</span>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white py-20 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Order not found
          </p>
          <p className="text-xs text-slate-400">
            We couldn&apos;t find an order matching{" "}
            <span className="font-mono">{orderId}</span>.
          </p>
        </div>
      </div>
    )
  }

  const itemLabel = order.quantity > 1 ? "items" : "item"
  const descriptionHtml = order.product_description
    ? DOMPurify.sanitize(order.product_description)
    : ""

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <BackLink />
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-xl font-bold text-slate-900 dark:text-white">
              {order.checkout_id}
            </h1>
            <PaymentChip status={order.payment_status} />
            <ApprovalChip status={order.approval_status ?? "pending_approval"} />
            <FulfillmentChip status={order.fulfillment_status ?? "pending"} />
          </div>
          <p className="text-sm text-slate-400">
            Placed {fmtDateTime(order.created_at)}
          </p>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Order Total", value: formatMoney(order.amount) },
          { label: "Quantity", value: `${order.quantity} ${itemLabel}` },
          { label: "Payment", value: order.payment_method || "—" },
          { label: "Payment Status", value: order.payment_status || "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {s.label}
            </p>
            <p className="mt-1.5 truncate text-lg font-bold text-slate-800 capitalize dark:text-white">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Order status timeline ── */}
      <OrderStatusTimeline
        paymentStatus={order.payment_status}
        approvalStatus={order.approval_status}
        fulfillmentStatus={order.fulfillment_status}
        shipmentStatus={order.shipment_status}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Left: product + customer ── */}
        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="Product">
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                {order.product_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={order.product_image}
                    alt={order.product_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg className="h-7 w-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {order.product_name}
                </p>
                {descriptionHtml ? (
                  <div
                    className="rich-content prose prose-sm dark:prose-invert mt-2 max-w-none text-sm text-slate-600 dark:text-slate-300"
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    order.selected_color && `Color: ${order.selected_color}`,
                    order.selected_size && `Size: ${order.selected_size}`,
                    order.selected_type && `Type: ${order.selected_type}`,
                  ]
                    .filter(Boolean)
                    .map((tag) => (
                      <span
                        key={tag as string}
                        className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="text-slate-400">
                    Qty{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {order.quantity}
                    </span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatMoney(order.amount)}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Customer">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white">
                {getInitials(order.customer_name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {order.customer_name || "—"}
                </p>
                <p className="truncate text-[12px] text-slate-400">
                  {order.customer_email || "—"}
                </p>
                {order.customer_phone ? (
                  <p className="text-[12px] text-slate-400">
                    {order.customer_phone}
                  </p>
                ) : null}
              </div>
            </div>
            {order.customer_address ? (
              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Shipping Address
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {order.customer_address}
                </p>
              </div>
            ) : null}
          </SectionCard>
        </div>

        {/* ── Right: order info + actions ── */}
        <div className="space-y-5">
          <SectionCard title="Order Info">
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <DetailRow label="Checkout ID" value={<span className="font-mono">{order.checkout_id}</span>} />
              <DetailRow label="Placed" value={fmtDateTime(order.created_at)} />
              {order.paid_at ? <DetailRow label="Paid" value={fmtDateTime(order.paid_at)} /> : null}
              <DetailRow label="Payment" value={order.payment_method || "—"} />
              <DetailRow label="Courier" value={formatCourierLabel(order.courier)} />
              {order.tracking_no ? (
                <DetailRow
                  label="Tracking"
                  value={<span className="font-mono">{order.tracking_no}</span>}
                />
              ) : null}
              {order.shipment_status ? (
                <DetailRow
                  label="Shipment"
                  value={order.shipment_status.replace(/_/g, " ")}
                />
              ) : null}
              {order.zq_platform_order_id ? (
                <DetailRow
                  label="ZQ Order"
                  value={<span className="font-mono">{order.zq_platform_order_id}</span>}
                />
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Manage Order">
            {order.approval_status !== "approved" ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleApprove}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <Spinner /> : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Approve Order
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <select
                    value={fulfillDraft}
                    disabled={busy}
                    onChange={(e) =>
                      setFulfillDraft(e.target.value as SupplierFulfillmentStatus)
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {FULFILLMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSaveFulfillment}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-60"
                >
                  {busy ? <Spinner /> : null}
                  Save Status
                </button>
                {!order.zq_platform_order_id ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handlePushToZq}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                  >
                    {busy ? <Spinner /> : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                    Push to ZQ
                  </button>
                ) : null}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
