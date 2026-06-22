"use client"

import { useState } from "react"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import {
  useApproveAdminOrderMutation,
  useGetAdminOrdersQuery,
  useRejectAdminOrderMutation,
  useTrackAdminOrderCourierMutation,
  type AdminCourier,
} from "@/store/api/adminOrdersApi"
import { useSession } from "next-auth/react"
import Link from "next/link"

import {
  fulfillmentStatusTone,
  paymentStatusTone,
  ShippingAddressCard,
  StatusPill,
} from "./orderUi"

/* ─── helpers ──────────────────────────────────────────────── */

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value || 0)

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A"
  const trimmed = value.trim()
  if (!trimmed) return "N/A"
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T")
  const hasTimeZone = /([zZ]|[+-]\d{2}:\d{2})$/.test(normalized)
  const parsed = new Date(hasTimeZone ? normalized : `${normalized}+08:00`)
  if (Number.isNaN(parsed.getTime())) return "N/A"
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

const formatCourierLabel = (courier?: string | null) => {
  const normalized = String(courier ?? "")
    .trim()
    .toLowerCase()
  if (normalized === "afhome") return "AF Home"
  if (normalized === "jnt") return "J&T Express"
  if (normalized === "xde") return "XDE"
  if (normalized === "zq") return "Global Supplier"
  return courier || "—"
}

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { data?: { message?: string; error?: string } })?.data
  return data?.error || data?.message || fallback
}

function BackLink() {
  return (
    <Link
      href="/admin/orders"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      Orders
    </Link>
  )
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-bold text-slate-800 dark:text-white">
        {value}
      </p>
    </div>
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

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  )
}

/* ─── main ─────────────────────────────────────────────────── */

export default function AdminOrderDetailView({ orderId }: { orderId: string }) {
  const { data: session } = useSession()
  const { data, isLoading, isError, isFetching } = useGetAdminOrdersQuery({
    filter: "all",
    search: orderId,
    page: 1,
    perPage: 20,
  })
  const [approveOrder] = useApproveAdminOrderMutation()
  const [rejectOrder] = useRejectAdminOrderMutation()
  const [trackCourier] = useTrackAdminOrderCourierMutation()
  const [busy, setBusy] = useState<null | "approve" | "reject" | "track">(null)

  const order =
    data?.orders?.find((entry) => entry.checkout_id === orderId) ?? null

  if (isLoading) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-3xl bg-slate-100 lg:col-span-2 dark:bg-slate-800" />
          <div className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/60">
            <svg
              className="h-7 w-7 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">
            Order {orderId} not found
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            It may have been removed, or the link is incorrect.
          </p>
        </div>
      </div>
    )
  }

  /* ── permissions (mirrors the orders list) ── */
  const role = (session?.user?.role ?? "").toLowerCase()
  const userLevelId = Number(
    (session?.user as { userLevelId?: number } | undefined)?.userLevelId ?? 0
  )
  const canApprove =
    role === "super_admin" ||
    role === "admin" ||
    role === "merchant_admin" ||
    userLevelId === 1 ||
    userLevelId === 2 ||
    userLevelId === 7
  const canTrack = canApprove || role === "csr" || userLevelId === 3

  const isPendingApproval = order.approval_status === "pending_approval"
  const courierForTrack: AdminCourier =
    (order.courier ?? "").toLowerCase() === "xde" ? "xde" : "jnt"
  const hasCourier = Boolean(order.courier)

  /* ── abandoned / unpaid checkout ── */
  const isUnpaid =
    !order.paid_at &&
    !["paid", "succeeded", "success", "failed", "cancelled", "expired"].includes(
      (order.payment_status ?? "").toLowerCase()
    )
  const reminderCount = Number(order.reminder_count ?? 0)
  const resumeUrl = (order.checkout_url ?? "").trim()

  /* ── tracking logs (defensive — payload shape varies by courier) ── */
  const rawPayload = order.shipment_payload as unknown
  const trackingLogs: Array<Record<string, unknown>> = Array.isArray(rawPayload)
    ? (rawPayload as Array<Record<string, unknown>>)
    : Array.isArray((rawPayload as { data?: unknown } | null)?.data)
      ? (rawPayload as { data: Array<Record<string, unknown>> }).data
      : []

  /* ── activity timeline (from timestamps we already have) ── */
  const activity = [
    order.created_at ? { label: "Order placed", at: order.created_at } : null,
    order.paid_at ? { label: "Payment received", at: order.paid_at } : null,
    order.approval_status === "approved" && order.approved_at
      ? { label: "Approved", at: order.approved_at }
      : null,
    order.approval_status === "rejected" && order.approved_at
      ? { label: "Rejected", at: order.approved_at }
      : null,
    order.shipped_at ? { label: "Shipped", at: order.shipped_at } : null,
  ].filter((entry): entry is { label: string; at: string } => entry !== null)

  const hasVariant =
    order.selected_color || order.selected_size || order.selected_type
  const earnedPv = Number(order.earned_pv ?? 0)
  const productPv = Number(order.product_pv ?? 0)
  const totalPv = earnedPv > 0 ? earnedPv : productPv

  /* ── actions ── */
  const handleApprove = async () => {
    setBusy("approve")
    try {
      await approveOrder({ id: order.id }).unwrap()
      showSuccessToast("Order approved successfully.")
    } catch (err) {
      showErrorToast(extractApiError(err, "Failed to approve order."))
    } finally {
      setBusy(null)
    }
  }

  const handleReject = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Reject this order? The customer will be notified.")
    ) {
      return
    }
    setBusy("reject")
    try {
      await rejectOrder({ id: order.id }).unwrap()
      showSuccessToast("Order rejected.")
    } catch (err) {
      showErrorToast(extractApiError(err, "Failed to reject order."))
    } finally {
      setBusy(null)
    }
  }

  const handleTrack = async () => {
    setBusy("track")
    try {
      const result = await trackCourier({
        id: order.id,
        courier: courierForTrack,
      }).unwrap()
      showSuccessToast(
        result.shipment_status
          ? `Latest status: ${result.shipment_status.replace(/_/g, " ")}`
          : "Tracking refreshed."
      )
    } catch (err) {
      showErrorToast(extractApiError(err, "Failed to refresh tracking."))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <BackLink />

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-sky-500 uppercase">
            Order Details
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
              {order.checkout_id}
            </h1>
            <StatusPill
              label={order.payment_status}
              tone={paymentStatusTone(order.payment_status)}
              dot
            />
            <StatusPill
              label={order.fulfillment_status.replace(/_/g, " ")}
              tone={fulfillmentStatusTone(order.fulfillment_status)}
            />
            {isUnpaid ? (
              <StatusPill
                label="Abandoned / Unpaid"
                tone={paymentStatusTone("unpaid")}
                dot
              />
            ) : null}
            {reminderCount > 0 ? (
              <span
                title={
                  order.last_reminder_at
                    ? `Last reminder: ${formatDateTime(order.last_reminder_at)}`
                    : undefined
                }
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Reminded {reminderCount}×
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Placed {formatDateTime(order.created_at)}
            {order.source_label ? ` · via ${order.source_label}` : ""}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isUnpaid && resumeUrl ? (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
              Resume payment
            </a>
          ) : null}

          {canTrack && hasCourier ? (
            <button
              type="button"
              onClick={handleTrack}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {busy === "track" ? "Refreshing…" : "Refresh tracking"}
            </button>
          ) : null}

          {canApprove && isPendingApproval ? (
            <>
              <button
                type="button"
                onClick={handleReject}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === "approve" ? "Approving…" : "Approve order"}
              </button>
            </>
          ) : (
            <StatusPill
              label={order.approval_status.replace(/_/g, " ")}
              tone={
                order.approval_status === "approved"
                  ? fulfillmentStatusTone("delivered")
                  : order.approval_status === "rejected"
                    ? paymentStatusTone("failed")
                    : paymentStatusTone("pending")
              }
            />
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Order total" value={formatMoney(order.amount)} />
        <StatCard
          label="Items"
          value={`${order.quantity} ${order.quantity > 1 ? "items" : "item"}`}
        />
        <StatCard label="Payment" value={order.payment_method || "—"} />
        <StatCard
          label="Fulfillment"
          value={
            <span className="capitalize">
              {order.fulfillment_status.replace(/_/g, " ")}
            </span>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Left column ── */}
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Items">
            <div className="flex gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {order.product_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={order.product_image}
                    alt={order.product_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {order.product_name}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {order.product_sku || "No SKU"}
                </p>
                {hasVariant ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {order.selected_color ? (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Color: {order.selected_color}
                      </span>
                    ) : null}
                    {order.selected_size ? (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Size: {order.selected_size}
                      </span>
                    ) : null}
                    {order.selected_type ? (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Type: {order.selected_type}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">
                    Qty {order.quantity}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {formatMoney(order.amount)}
                  </span>
                </div>
                {totalPv > 0 ? (
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span>Earned PV</span>
                    <span className="font-semibold">
                      {totalPv.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Tracking"
            action={
              canTrack && hasCourier ? (
                <button
                  type="button"
                  onClick={handleTrack}
                  disabled={busy !== null}
                  className="text-xs font-semibold text-sky-600 hover:underline disabled:opacity-50 dark:text-sky-400"
                >
                  {busy === "track" ? "Refreshing…" : "Refresh"}
                </button>
              ) : null
            }
          >
            <DetailRow
              label="Courier"
              value={formatCourierLabel(order.courier)}
            />
            <DetailRow
              label="Tracking no."
              value={
                order.tracking_no ? (
                  <span className="font-mono">{order.tracking_no}</span>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow
              label="Shipment status"
              value={
                order.shipment_status ? (
                  <span className="capitalize">
                    {order.shipment_status.replace(/_/g, " ")}
                  </span>
                ) : (
                  "Not shipped yet"
                )
              }
            />

            {trackingLogs.length > 0 ? (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                {trackingLogs.map((log, index) => {
                  const status = String(
                    log.status ?? log.code ?? log.scan_type ?? ""
                  )
                    .replace(/_/g, " ")
                    .trim()
                  const at = String(
                    log.created_at ?? log.timestamp ?? log.scan_time ?? ""
                  )
                  const remark = String(
                    log.remark ?? log.description ?? log.message ?? ""
                  ).trim()
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="mt-1 flex flex-col items-center">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                        {index < trackingLogs.length - 1 ? (
                          <span className="mt-1 h-full w-px flex-1 bg-slate-200 dark:bg-slate-700" />
                        ) : null}
                      </div>
                      <div className="pb-1">
                        <p className="text-sm font-semibold text-slate-700 capitalize dark:text-slate-200">
                          {status || "Update"}
                        </p>
                        {remark ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {remark}
                          </p>
                        ) : null}
                        {at ? (
                          <p className="text-[11px] text-slate-400">
                            {formatDateTime(at)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </SectionCard>

          {activity.length > 0 ? (
            <SectionCard title="Timeline">
              <div className="space-y-3">
                {activity.map((entry, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {index < activity.length - 1 ? (
                        <span className="mt-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
                      ) : null}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {entry.label}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatDateTime(entry.at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          <SectionCard title="Customer">
            <p className="font-bold text-slate-900 dark:text-white">
              {order.customer_name || "N/A"}
            </p>
            <a
              href={
                order.customer_email
                  ? `mailto:${order.customer_email}`
                  : undefined
              }
              className="block text-sm text-sky-600 hover:underline dark:text-sky-400"
            >
              {order.customer_email || "No email"}
            </a>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {order.customer_phone || "No phone"}
            </p>
          </SectionCard>

          <ShippingAddressCard
            name={order.customer_name}
            phone={order.customer_phone}
            address={order.customer_address}
          />

          <SectionCard title="Workflow">
            <DetailRow
              label="Approval"
              value={
                <span className="capitalize">
                  {order.approval_status.replace(/_/g, " ")}
                </span>
              }
            />
            <DetailRow
              label="Fulfillment mode"
              value={
                <span className="capitalize">
                  {(order.fulfillment_mode ?? "manual").replace(/_/g, " ")}
                </span>
              }
            />
            <DetailRow
              label="Placed"
              value={formatDateTime(order.created_at)}
            />
            <DetailRow label="Paid" value={formatDateTime(order.paid_at)} />
          </SectionCard>
        </div>
      </div>

      {isFetching ? (
        <p className="text-center text-xs font-medium text-slate-400">
          Refreshing…
        </p>
      ) : null}
    </div>
  )
}
