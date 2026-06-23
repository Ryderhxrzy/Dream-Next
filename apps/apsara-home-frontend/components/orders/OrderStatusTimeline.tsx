"use client"

import type { ReactNode } from "react"

/* ─── status chips (shared across admin + supplier order views) ─── */

export function PaymentChip({
  status,
  label,
}: {
  status?: string | null
  label?: string
}) {
  const v = (status ?? "").toLowerCase()
  const paid = v.includes("paid") || v.includes("success")
  const failed = v.includes("fail") || v.includes("cancel") || v.includes("refund")
  const s = paid
    ? { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-500/30" }
    : failed
      ? { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-300", ring: "ring-rose-200 dark:ring-rose-500/30" }
      : { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-500/30" }
  const text =
    label ??
    (status
      ? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Unpaid")
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      {text}
    </span>
  )
}

export function ApprovalChip({ status }: { status?: string | null }) {
  const v = (status ?? "").toLowerCase()
  const map: Record<string, { bg: string; text: string; ring: string; label: string }> = {
    approved: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-500/30", label: "Approved" },
    rejected: { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-300", ring: "ring-rose-200 dark:ring-rose-500/30", label: "Rejected" },
  }
  const s =
    map[v] ?? { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-500/30", label: "Pending" }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      {s.label}
    </span>
  )
}

export function FulfillmentChip({ status }: { status?: string | null }) {
  const v = (status ?? "").toLowerCase()
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
  const s = map[v] ?? map.pending
  const label = (status ?? "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  )
}

/* ─── lifecycle progress ───────────────────────────────────── */

const LIFECYCLE_STEPS: Array<{ key: string; label: string }> = [
  { key: "placed", label: "Placed" },
  { key: "paid", label: "Paid" },
  { key: "approved", label: "Approved" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
]

const FULFILL_SEQUENCE = [
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
]

function getOrderProgress({
  paymentStatus,
  approvalStatus,
  fulfillmentStatus,
}: {
  paymentStatus?: string | null
  approvalStatus?: string | null
  fulfillmentStatus?: string | null
}) {
  const approval = (approvalStatus ?? "").toLowerCase()
  const fulfillment = (fulfillmentStatus ?? "").toLowerCase()
  const payment = (paymentStatus ?? "").toLowerCase()
  const isPaid = payment.includes("paid") || payment.includes("success")

  const exception =
    approval === "rejected"
      ? { label: "Order Rejected", tone: "rose" as const }
      : fulfillment === "cancelled" ||
          payment.includes("cancel") ||
          payment.includes("fail")
        ? { label: "Order Cancelled", tone: "rose" as const }
        : fulfillment === "returned"
          ? { label: "Returned / Refunded", tone: "amber" as const }
          : null

  let step = 0 // placed
  if (isPaid) step = Math.max(step, 1)
  if (approval === "approved") step = Math.max(step, 2)
  const fIdx = FULFILL_SEQUENCE.indexOf(fulfillment)
  if (fIdx >= 0) step = Math.max(step, 3 + fIdx)

  return { step, exception }
}

export interface OrderStatusTimelineProps {
  paymentStatus?: string | null
  /** Optional override for the payment chip text (e.g. "Abandoned · Unpaid"). */
  paymentLabel?: string
  approvalStatus?: string | null
  fulfillmentStatus?: string | null
  shipmentStatus?: string | null
  /** Extra breakdown cell(s) appended after Shipment (e.g. recovery info). */
  extra?: ReactNode
}

export function OrderStatusTimeline({
  paymentStatus,
  paymentLabel,
  approvalStatus,
  fulfillmentStatus,
  shipmentStatus,
  extra,
}: OrderStatusTimelineProps) {
  const { step, exception } = getOrderProgress({
    paymentStatus,
    approvalStatus,
    fulfillmentStatus,
  })

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
          Order Status
        </p>
        {exception ? (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
              exception.tone === "rose"
                ? "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30"
                : "bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30"
            }`}
          >
            {exception.label}
          </span>
        ) : null}
      </div>

      {/* Stepper */}
      <div className="mt-5 flex items-start overflow-x-auto pb-1">
        {LIFECYCLE_STEPS.map((s, i) => {
          const done = !exception && i < step
          const current = !exception && i === step
          const reached = done || current
          return (
            <div
              key={s.key}
              className="flex min-w-[64px] flex-1 flex-col items-center"
            >
              <div className="flex w-full items-center">
                <div
                  className={`h-0.5 flex-1 ${
                    i === 0
                      ? "opacity-0"
                      : reached
                        ? "bg-emerald-400 dark:bg-emerald-500"
                        : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition ${
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : current
                        ? "border-indigo-500 bg-indigo-500 text-white ring-4 ring-indigo-100 dark:ring-indigo-500/20"
                        : "border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600"
                  }`}
                >
                  {done ? (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <div
                  className={`h-0.5 flex-1 ${
                    i === LIFECYCLE_STEPS.length - 1
                      ? "opacity-0"
                      : i < step
                        ? "bg-emerald-400 dark:bg-emerald-500"
                        : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              </div>
              <span
                className={`mt-2 text-center text-[10px] leading-tight font-semibold ${
                  current
                    ? "text-indigo-600 dark:text-indigo-400"
                    : reached
                      ? "text-slate-700 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Status dimensions */}
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-slate-800">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Payment</p>
          <div className="mt-1.5"><PaymentChip status={paymentStatus} label={paymentLabel} /></div>
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Approval</p>
          <div className="mt-1.5"><ApprovalChip status={approvalStatus ?? "pending_approval"} /></div>
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Fulfillment</p>
          <div className="mt-1.5"><FulfillmentChip status={fulfillmentStatus ?? "pending"} /></div>
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Shipment</p>
          <div className="mt-1.5">
            {shipmentStatus ? (
              <FulfillmentChip status={shipmentStatus} />
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                Not shipped
              </span>
            )}
          </div>
        </div>
        {extra}
      </div>
    </div>
  )
}
