"use client"

import { useState } from "react"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import {
  useApproveAdminOrderMutation,
  useBookAdminOrderCourierMutation,
  useCancelAdminOrderCourierMutation,
  useFetchAdminOrderZqDetailMutation,
  useGetAdminOrderCourierEpodMutation,
  useGetAdminOrderCourierWaybillMutation,
  useGetAdminOrdersQuery,
  usePushAdminOrderToZqMutation,
  useRejectAdminOrderMutation,
  useSyncAdminOrderZqTrackingMutation,
  useTrackAdminOrderCourierMutation,
  useUpdateAdminOrderFulfillmentModeMutation,
  useUpdateAdminOrderShipmentStatusMutation,
  type AdminCourier,
  type AdminOrdersResponse,
  type AdminShipmentStatus,
} from "@/store/api/adminOrdersApi"
import { useGetAdminGeneralSettingsQuery } from "@/store/api/adminSettingsApi"
import { Button } from "@heroui/react/button"
import { ListBox } from "@heroui/react/list-box"
import { ListBoxItem } from "@heroui/react/list-box-item"
import { Select } from "@heroui/react/select"
import { useSession } from "next-auth/react"
import Link from "next/link"

import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline"
import AdminCustomerChatDrawer from "@/components/superAdmin/chat/AdminCustomerChatDrawer"

import { ShippingAddressCard } from "./orderUi"

type AdminOrderItem = AdminOrdersResponse["orders"][number]
type FulfillmentMode = "manual" | "local_courier" | "zq"
type BusyAction =
  | "approve"
  | "reject"
  | "track"
  | "mode"
  | "status"
  | "book"
  | "cancel"
  | "waybill"
  | "epod"
  | "push_zq"
  | "zq_detail"
  | "zq_sync"

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

const copyText = async (value: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard is not available in this browser.")
  }
  await navigator.clipboard.writeText(value)
}

const isLocalCourier = (courier?: string | null) => {
  const normalized = String(courier ?? "")
    .trim()
    .toLowerCase()
  return normalized === "jnt" || normalized === "xde"
}

const hasZqSourceMetadata = (order: AdminOrderItem) => {
  const payload = order.zq_payload ?? {}
  return (
    String(payload.source_type ?? "")
      .trim()
      .toLowerCase() === "zq" ||
    String(payload.zq_external_id ?? "").trim() !== "" ||
    String(payload.zq_product_id ?? "").trim() !== "" ||
    String(payload.zq_offer_id ?? "").trim() !== ""
  )
}

const extractCourierStatus = (
  payload: Record<string, unknown> | Array<unknown> | null | undefined
): string | null => {
  if (!payload) return null

  if (Array.isArray(payload)) {
    const latestEntry = [...payload]
      .filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === "object" && entry !== null && !Array.isArray(entry)
      )
      .sort((a, b) =>
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
      )[0]

    const listStatus = latestEntry?.status
    return typeof listStatus === "string" && listStatus.trim() !== ""
      ? listStatus.trim()
      : null
  }

  const candidates = [
    payload.status,
    payload.code,
    payload.shipment_status,
    payload.message,
    (payload.data as Record<string, unknown> | undefined)?.status,
    (payload.data as Record<string, unknown> | undefined)?.shipment_status,
    (payload.result as Record<string, unknown> | undefined)?.status,
    (payload.result as Record<string, unknown> | undefined)?.shipment_status,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate.trim()
    }
  }

  return null
}

const FULFILLMENT_MODE_OPTIONS: Array<{ value: FulfillmentMode; label: string }> =
  [
    { value: "manual", label: "Manual" },
    { value: "local_courier", label: "Local Courier" },
    { value: "zq", label: "AF HOME GLOBAL SUPPLIER" },
  ]

const SHIPMENT_STATUS_OPTIONS: Array<{
  value: AdminShipmentStatus
  label: string
}> = [
  { value: "for_pickup", label: "For Pickup" },
  { value: "picked_up", label: "Picked Up" },
  { value: "in_transit", label: "In Transit" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "failed_delivery", label: "Failed Delivery" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned_to_sender", label: "Returned to Sender" },
]

const COURIER_OPTIONS: Array<{ value: AdminCourier; label: string }> = [
  { value: "jnt", label: "J&T Express" },
  { value: "xde", label: "XDE" },
]

const ZQ_STATUS_STYLES: Record<string, string> = {
  submitted:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  processing:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  unfulfilled:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/40",
  paid: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  success:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  close:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
}

/* ─── fulfillment selects (mirrors the orders queue detailed mode) ─ */

function AdminOrderSelect({
  ariaLabel,
  value,
  options,
  isDisabled,
  selectedTone = "default",
  onChange,
}: {
  ariaLabel: string
  value: string
  options: Array<{ value: string; label: string }>
  isDisabled?: boolean
  selectedTone?: "default" | "shipment"
  onChange: (value: string) => void
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ??
    options[0]?.label ??
    "Select"
  const triggerClassName =
    selectedTone === "shipment"
      ? "flex min-h-10 w-full items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-3 text-left text-xs font-semibold text-teal-700 transition-all duration-200 hover:bg-teal-100 focus:border-teal-300 focus:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/15 dark:focus:bg-slate-800 dark:disabled:border-white/10 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
      : "flex min-h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-xs text-slate-700 transition-all duration-200 hover:bg-white focus:border-teal-300 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"

  return (
    <Select
      aria-label={ariaLabel}
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key == null) return
        const nextValue = String(key)
        if (nextValue === value) return
        onChange(nextValue)
      }}
      isDisabled={isDisabled}
      className="w-full"
    >
      <Select.Trigger className={triggerClassName}>
        <span className="truncate">{selectedLabel}</span>
        <Select.Indicator className="h-4 w-4 text-slate-400" />
      </Select.Trigger>
      <Select.Popover className="min-w-[var(--trigger-width)] dark:border-slate-700 dark:bg-slate-900">
        <ListBox className="p-1">
          {options.map((option) => (
            <ListBoxItem
              id={option.value}
              key={option.value}
              className={
                option.value === value
                  ? "rounded-lg border border-teal-200 bg-teal-50 text-teal-700 opacity-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300"
                  : "rounded-lg text-slate-700 dark:text-slate-200"
              }
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

function AdminOrderStaticValue({
  label,
  tone = "default",
}: {
  label: string
  tone?: "default" | "shipment"
}) {
  const className =
    tone === "shipment"
      ? "flex min-h-10 w-full items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-3 text-left text-xs font-semibold text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300"
      : "flex min-h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"

  return (
    <div className={className}>
      <span className="truncate">{label}</span>
      <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">
        Locked
      </span>
    </div>
  )
}

function PayloadPreviewModal({
  checkoutId,
  payload,
  onClose,
}: {
  checkoutId: string
  payload: Record<string, unknown> | Array<unknown> | null
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Raw payload
            </p>
            <p className="font-mono text-sm font-semibold break-all text-slate-800 dark:text-slate-100">
              {checkoutId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <pre className="overflow-auto px-5 py-4 text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
          {JSON.stringify(payload ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  )
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

/* ─── loading skeleton (mirrors the loaded layout) ────────── */

function SkeletonBar({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-100 dark:bg-slate-800 ${className}`}
    />
  )
}

function SkeletonDetailRows({ labels }: { labels: string[] }) {
  return (
    <div>
      {labels.map((label) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 py-1.5"
        >
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {label}
          </span>
          <SkeletonBar className="h-3.5 w-24" />
        </div>
      ))}
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-sky-500 uppercase">
            Order Details
          </p>
          <SkeletonBar className="h-7 w-72 max-w-full" />
          <SkeletonBar className="h-4 w-48" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonBar className="h-9 w-24 rounded-xl" />
          <SkeletonBar className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Status strip */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
        {["Payment", "Fulfillment", "Approval"].map((label) => (
          <div key={label} className="flex min-w-30 flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {label}
            </span>
            <SkeletonBar className="h-7 w-28 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["Order total", "Items", "Payment", "Fulfillment"].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {label}
            </p>
            <SkeletonBar className="mt-2.5 h-5 w-24" />
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Items">
            <div className="flex gap-4">
              <SkeletonBar className="h-24 w-24 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <SkeletonBar className="h-5 w-1/2" />
                <SkeletonBar className="h-4 w-24" />
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <SkeletonBar className="h-4 w-12" />
                  <SkeletonBar className="h-4 w-20" />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Tracking">
            <SkeletonDetailRows
              labels={["Courier", "Tracking no.", "Shipment status"]}
            />
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <SectionCard title="Customer">
            <div className="space-y-2">
              <SkeletonBar className="h-4 w-32" />
              <SkeletonBar className="h-4 w-40" />
              <SkeletonBar className="h-4 w-28" />
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Shipping Address
            </p>
            <div className="mt-2 space-y-1.5">
              <SkeletonBar className="h-4 w-32" />
              <SkeletonBar className="h-4 w-full" />
              <SkeletonBar className="h-4 w-3/4" />
              <SkeletonBar className="h-4 w-1/2" />
            </div>
          </div>

          <SectionCard title="Workflow">
            <SkeletonDetailRows
              labels={["Approval", "Fulfillment mode", "Placed", "Paid"]}
            />
          </SectionCard>
        </div>
      </div>
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
  const { data: adminGeneralSettingsData } = useGetAdminGeneralSettingsQuery()
  const [approveOrder] = useApproveAdminOrderMutation()
  const [rejectOrder] = useRejectAdminOrderMutation()
  const [trackCourier] = useTrackAdminOrderCourierMutation()
  const [bookCourier] = useBookAdminOrderCourierMutation()
  const [cancelCourier] = useCancelAdminOrderCourierMutation()
  const [getCourierWaybill] = useGetAdminOrderCourierWaybillMutation()
  const [getCourierEpod] = useGetAdminOrderCourierEpodMutation()
  const [updateFulfillmentMode] = useUpdateAdminOrderFulfillmentModeMutation()
  const [updateShipmentStatus] = useUpdateAdminOrderShipmentStatusMutation()
  const [pushToZq] = usePushAdminOrderToZqMutation()
  const [fetchZqDetail] = useFetchAdminOrderZqDetailMutation()
  const [syncZqTracking] = useSyncAdminOrderZqTrackingMutation()
  const [busy, setBusy] = useState<BusyAction | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedCourier, setSelectedCourier] = useState<AdminCourier | null>(
    null
  )
  const [selectedMode, setSelectedMode] = useState<FulfillmentMode | null>(null)
  const [payloadPreview, setPayloadPreview] = useState<{
    checkoutId: string
    payload: Record<string, unknown> | Array<unknown> | null
  } | null>(null)

  const order =
    data?.orders?.find((entry) => entry.checkout_id === orderId) ?? null

  if (isLoading) {
    return <OrderDetailSkeleton />
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
  const hasCourier = Boolean(order.courier)

  /* ── fulfillment flow (mirrors the orders queue detailed mode) ── */
  const isBusy = busy !== null
  const isDelivered = order.fulfillment_status === "delivered"
  const isCancelled = order.fulfillment_status === "cancelled"
  const isRefunded = order.fulfillment_status === "refunded"
  const canTrackThisOrder =
    canTrack &&
    order.approval_status === "approved" &&
    !isDelivered &&
    !isCancelled &&
    !isRefunded
  const courierSelection: AdminCourier =
    selectedCourier ??
    ((order.courier ?? "").toLowerCase() === "xde" ? "xde" : "jnt")
  const isCourierBooked = Boolean(order.courier && order.tracking_no)
  const rawCourierStatus = extractCourierStatus(order.shipment_payload)
  const zqStatusKey = String(order.zq_status ?? "")
    .trim()
    .toLowerCase()
  const zqBadgeClass =
    ZQ_STATUS_STYLES[zqStatusKey] ??
    "bg-slate-50 text-slate-600 border-slate-200"
  const hasZqOrder = Boolean(
    order.zq_platform_order_id || order.zq_order_id || zqStatusKey
  )
  const canUseGlobalSupplierFlow = hasZqSourceMetadata(order) || hasZqOrder
  const manualCheckoutModeEnabled = Boolean(
    adminGeneralSettingsData?.settings?.enable_manual_checkout_mode
  )
  const baseFulfillmentModeOptions = manualCheckoutModeEnabled
    ? FULFILLMENT_MODE_OPTIONS.filter((option) => option.value === "manual")
    : FULFILLMENT_MODE_OPTIONS
  const availableFulfillmentModeOptions = canUseGlobalSupplierFlow
    ? baseFulfillmentModeOptions
    : baseFulfillmentModeOptions.filter((option) => option.value !== "zq")
  const selectedFulfillmentMode =
    selectedMode ??
    (order.fulfillment_mode as FulfillmentMode | undefined) ??
    (hasZqOrder ? "zq" : "manual")
  const effectiveFulfillmentMode =
    selectedFulfillmentMode === "zq" && !canUseGlobalSupplierFlow
      ? "manual"
      : selectedFulfillmentMode
  const isManualMode = effectiveFulfillmentMode === "manual"
  const isLocalCourierMode = effectiveFulfillmentMode === "local_courier"
  const isZqMode = effectiveFulfillmentMode === "zq"
  const fulfillmentModeLabel =
    FULFILLMENT_MODE_OPTIONS.find(
      (option) => option.value === effectiveFulfillmentMode
    )?.label ?? "Manual"
  const isFulfillmentModeLocked =
    order.fulfillment_status === "shipped" ||
    order.fulfillment_status === "out_for_delivery" ||
    order.fulfillment_status === "delivered"
  const canPushZq =
    canTrackThisOrder && isZqMode && canUseGlobalSupplierFlow && !hasZqOrder
  const canUseZqLookup = canTrackThisOrder && isZqMode && hasZqOrder
  const canUseCourierFlow =
    canTrackThisOrder && isLocalCourierMode && !hasZqOrder
  const canUseManualFlow = canTrackThisOrder && isManualMode && !hasZqOrder
  const isCourierCancelled =
    order.shipment_status === "cancelled" ||
    rawCourierStatus === "package_cancelled" ||
    rawCourierStatus === "package cancelled"
  const showFulfillmentSection =
    canTrack && !isRefunded && order.approval_status !== "rejected"

  /* ── abandoned / unpaid checkout ── */
  const isUnpaid =
    !order.paid_at &&
    !["paid", "succeeded", "success", "failed", "cancelled", "expired"].includes(
      (order.payment_status ?? "").toLowerCase()
    )
  const reminderCount = Number(order.reminder_count ?? 0)
  const resumeUrl = (order.checkout_url ?? "").trim()

  /* ── friendly payment label for the status card ── */
  const paymentLower = (order.payment_status ?? "").toLowerCase()
  const paymentLabel = isUnpaid
    ? order.abandoned_at
      ? "Abandoned · Unpaid"
      : "Unpaid"
    : ["paid", "succeeded", "success"].includes(paymentLower)
      ? "Paid"
      : order.payment_status || "—"

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
        courier: courierSelection,
      }).unwrap()
      if (result.payload && !result.shipment_status) {
        setPayloadPreview({
          checkoutId: order.checkout_id,
          payload: result.payload,
        })
      }
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

  const handleFulfillmentModeChange = async (mode: FulfillmentMode) => {
    setBusy("mode")
    try {
      await updateFulfillmentMode({ id: order.id, mode }).unwrap()
      setSelectedMode(mode)
      showSuccessToast(`Fulfillment mode locked to ${mode.replace(/_/g, " ")}.`)
    } catch (err) {
      showErrorToast(extractApiError(err, "Failed to update fulfillment mode."))
    } finally {
      setBusy(null)
    }
  }

  const handleShipmentStatusChange = async (
    shipmentStatus: AdminShipmentStatus,
    options?: { courier?: AdminCourier; clearCourier?: boolean }
  ) => {
    setBusy("status")
    try {
      await updateShipmentStatus({
        id: order.id,
        shipment_status: shipmentStatus,
        courier: options?.courier,
        clear_courier: options?.clearCourier,
      }).unwrap()
      showSuccessToast(
        `Shipment status updated to ${shipmentStatus.replace(/_/g, " ")}.`
      )
    } catch (err) {
      showErrorToast(extractApiError(err, "Failed to update shipment status."))
    } finally {
      setBusy(null)
    }
  }

  const handleBookCourier = async () => {
    setBusy("book")
    try {
      const result = await bookCourier({
        id: order.id,
        courier: courierSelection,
      }).unwrap()
      if (result.payload && !result.tracking_no) {
        setPayloadPreview({
          checkoutId: order.checkout_id,
          payload: result.payload,
        })
      }
      showSuccessToast(
        result.tracking_no
          ? result.message || `${courierSelection.toUpperCase()} shipment booked.`
          : `${courierSelection.toUpperCase()} booking returned no tracking number yet.`
      )
    } catch (err) {
      showErrorToast(extractApiError(err, "Failed to book courier shipment."))
    } finally {
      setBusy(null)
    }
  }

  const handleOpenWaybill = async () => {
    setBusy("waybill")
    try {
      const blob = await getCourierWaybill({
        id: order.id,
        courier: courierSelection,
      }).unwrap()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, "_blank", "noopener,noreferrer")
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
      showSuccessToast(
        `${courierSelection.toUpperCase()} waybill opened in a new tab.`
      )
    } catch (err) {
      showErrorToast(extractApiError(err, "Failed to open courier waybill."))
    } finally {
      setBusy(null)
    }
  }

  const handleCancelCourier = async () => {
    setBusy("cancel")
    try {
      const result = await cancelCourier({
        id: order.id,
        courier: courierSelection,
      }).unwrap()
      if (result.payload) {
        setPayloadPreview({
          checkoutId: order.checkout_id,
          payload: result.payload,
        })
      }
      showSuccessToast(
        result.message ||
          `${courierSelection.toUpperCase()} shipment cancellation submitted.`
      )
    } catch (err) {
      showErrorToast(extractApiError(err, "Failed to cancel courier shipment."))
    } finally {
      setBusy(null)
    }
  }

  const handleOpenEpod = async () => {
    if (order.shipment_status !== "delivered") {
      showErrorToast("EPOD is only available after successful delivery.")
      return
    }
    setBusy("epod")
    try {
      const blob = await getCourierEpod({
        id: order.id,
        courier: courierSelection,
      }).unwrap()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, "_blank", "noopener,noreferrer")
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
      showSuccessToast(
        `${courierSelection.toUpperCase()} EPOD opened in a new tab.`
      )
    } catch (err) {
      showErrorToast(extractApiError(err, "Failed to open courier EPOD."))
    } finally {
      setBusy(null)
    }
  }

  const handlePushToZq = async () => {
    setBusy("push_zq")
    try {
      const result = await pushToZq({ id: order.id }).unwrap()
      if (result.zq) {
        setPayloadPreview({ checkoutId: order.checkout_id, payload: result.zq })
      }
      showSuccessToast(
        result.message || "Order pushed to Global Supplier successfully."
      )
    } catch (err) {
      showErrorToast(
        extractApiError(err, "Failed to push order to Global Supplier.")
      )
    } finally {
      setBusy(null)
    }
  }

  const handleFetchZqDetail = async () => {
    setBusy("zq_detail")
    try {
      const result = await fetchZqDetail({ id: order.id }).unwrap()
      if (result.zq) {
        setPayloadPreview({ checkoutId: order.checkout_id, payload: result.zq })
      }
      showSuccessToast(
        result.message || "Global Supplier order detail fetched successfully."
      )
    } catch (err) {
      showErrorToast(
        extractApiError(err, "Failed to fetch Global Supplier detail.")
      )
    } finally {
      setBusy(null)
    }
  }

  const handleSyncZqTracking = async () => {
    setBusy("zq_sync")
    try {
      const result = await syncZqTracking({ id: order.id }).unwrap()
      if (result.zq) {
        setPayloadPreview({ checkoutId: order.checkout_id, payload: result.zq })
      }
      showSuccessToast(
        result.message || "Global Supplier tracking synced successfully."
      )
    } catch (err) {
      showErrorToast(
        extractApiError(err, "Failed to sync Global Supplier tracking.")
      )
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
          <h1 className="mt-1 font-mono text-2xl font-bold break-all text-slate-900 dark:text-white">
            {order.checkout_id}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Placed {formatDateTime(order.created_at)}
            {order.source_label ? ` · via ${order.source_label}` : ""}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {order.customer_id > 0 ? (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat customer
            </button>
          ) : null}
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
          ) : null}
        </div>
      </div>

      {/* ── Order status timeline ── */}
      <OrderStatusTimeline
        paymentStatus={order.payment_status}
        paymentLabel={paymentLabel}
        approvalStatus={order.approval_status}
        fulfillmentStatus={order.fulfillment_status}
        shipmentStatus={order.shipment_status}
        extra={
          reminderCount > 0 ? (
            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Recovery
              </p>
              <div className="mt-1.5">
                <span
                  className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  title={
                    order.last_reminder_at
                      ? `Last: ${formatDateTime(order.last_reminder_at)}`
                      : undefined
                  }
                >
                  Reminded {reminderCount}×
                </span>
              </div>
            </div>
          ) : null
        }
      />

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

          {showFulfillmentSection ? (
            <SectionCard title="Fulfillment">
              <div className="space-y-3">
                {/* Fulfillment mode */}
                {isFulfillmentModeLocked ? (
                  <AdminOrderStaticValue label={fulfillmentModeLabel} />
                ) : (
                  <AdminOrderSelect
                    ariaLabel={`Fulfillment mode for order ${order.checkout_id}`}
                    value={effectiveFulfillmentMode}
                    options={availableFulfillmentModeOptions}
                    isDisabled={
                      isBusy ||
                      order.approval_status !== "approved" ||
                      hasZqOrder
                    }
                    onChange={(value) =>
                      handleFulfillmentModeChange(value as FulfillmentMode)
                    }
                  />
                )}

                {isZqMode ? (
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold tracking-wide text-violet-700 uppercase">
                        Global Supplier Flow
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${zqBadgeClass}`}
                      >
                        {order.zq_status ?? "Not sent"}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-violet-700">
                      {hasZqOrder
                        ? "Global Supplier handoff is active for this order. Use Global Supplier detail and tracking below."
                        : order.approval_status === "approved"
                          ? "Push this order to Global Supplier first to unlock detail and tracking."
                          : "Approve the order first before pushing it to Global Supplier."}
                    </p>
                    {order.zq_platform_order_id ? (
                      <p className="mt-2 text-[11px] font-semibold break-all text-slate-800 dark:text-slate-100">
                        Platform ID: {order.zq_platform_order_id}
                      </p>
                    ) : null}
                    {order.zq_order_id ? (
                      <p className="mt-1 text-[11px] break-all text-slate-600 dark:text-slate-300">
                        Global Supplier Order: {order.zq_order_id}
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-1.5">
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={isBusy || !canPushZq}
                        onPress={handlePushToZq}
                        className={`w-full border px-3 py-1.5 text-xs font-semibold transition ${canPushZq ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" : "border-slate-200 bg-slate-50 text-slate-400"}`}
                      >
                        {busy === "push_zq"
                          ? "Pushing…"
                          : hasZqOrder
                            ? "Global Supplier Pushed"
                            : "Push Global Supplier"}
                      </Button>
                      <div className="grid grid-cols-2 gap-1">
                        <Button
                          size="sm"
                          variant="tertiary"
                          isDisabled={isBusy || !canUseZqLookup}
                          onPress={handleFetchZqDetail}
                          className={`border px-2 py-1.5 text-[11px] font-semibold transition ${canUseZqLookup ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"}`}
                        >
                          {busy === "zq_detail"
                            ? "Fetching…"
                            : "Global Supplier Detail"}
                        </Button>
                        <Button
                          size="sm"
                          variant="tertiary"
                          isDisabled={isBusy || !canUseZqLookup}
                          onPress={handleSyncZqTracking}
                          className={`border px-2 py-1.5 text-[11px] font-semibold transition ${canUseZqLookup ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100" : "border-slate-200 bg-slate-50 text-slate-400"}`}
                        >
                          {busy === "zq_sync"
                            ? "Syncing…"
                            : "Global Supplier Track"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : isManualMode ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[#31405f] dark:bg-[#1b2640]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                        Manual Flow
                      </p>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-[#3a4b6d] dark:bg-[#121a2b] dark:text-slate-300">
                        Internal
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      This order is managed manually. No courier booking or
                      Global Supplier handoff will be used.
                    </p>
                    <div className="mt-2">
                      <AdminOrderSelect
                        ariaLabel={`Manual shipment status for order ${order.checkout_id}`}
                        value={
                          (order.shipment_status as
                            | AdminShipmentStatus
                            | undefined) ?? "for_pickup"
                        }
                        options={SHIPMENT_STATUS_OPTIONS}
                        selectedTone="shipment"
                        isDisabled={isBusy || !canUseManualFlow}
                        onChange={(value) =>
                          handleShipmentStatusChange(
                            value as AdminShipmentStatus,
                            { clearCourier: true }
                          )
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <AdminOrderSelect
                      ariaLabel={`Courier for order ${order.checkout_id}`}
                      value={courierSelection}
                      options={COURIER_OPTIONS}
                      isDisabled={isBusy || !canUseCourierFlow}
                      onChange={(value) =>
                        setSelectedCourier(value as AdminCourier)
                      }
                    />
                    <AdminOrderSelect
                      ariaLabel={`Shipment status for order ${order.checkout_id}`}
                      value={
                        (order.shipment_status as
                          | AdminShipmentStatus
                          | undefined) ?? "for_pickup"
                      }
                      options={SHIPMENT_STATUS_OPTIONS}
                      selectedTone="shipment"
                      isDisabled={
                        isBusy || !canUseCourierFlow || isCourierBooked
                      }
                      onChange={(value) =>
                        handleShipmentStatusChange(
                          value as AdminShipmentStatus,
                          { courier: courierSelection }
                        )
                      }
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={
                          isBusy || !canUseCourierFlow || isCourierCancelled
                        }
                        onPress={handleBookCourier}
                        className="border border-teal-200 bg-teal-50 px-2 py-1.5 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100"
                      >
                        {busy === "book" ? "Booking…" : "Book"}
                      </Button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={
                          isBusy ||
                          !canUseCourierFlow ||
                          !order.tracking_no ||
                          isCourierCancelled
                        }
                        onPress={handleTrack}
                        className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#31405f] dark:bg-[#1b2640] dark:text-slate-200 dark:hover:bg-[#22304b]"
                      >
                        {busy === "track" ? "Tracking…" : "Track"}
                      </Button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={
                          isBusy ||
                          !canUseCourierFlow ||
                          courierSelection !== "xde" ||
                          !order.tracking_no ||
                          isCourierCancelled
                        }
                        onPress={handleOpenWaybill}
                        className="border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        {busy === "waybill" ? "Opening…" : "Waybill"}
                      </Button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={
                          isBusy ||
                          !canUseCourierFlow ||
                          courierSelection !== "xde" ||
                          !order.tracking_no ||
                          order.shipment_status !== "delivered"
                        }
                        onPress={handleOpenEpod}
                        className="border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                      >
                        {busy === "epod" ? "Opening…" : "EPOD"}
                      </Button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={
                          isBusy ||
                          !canUseCourierFlow ||
                          courierSelection !== "xde" ||
                          !order.tracking_no ||
                          isCourierCancelled
                        }
                        onPress={handleCancelCourier}
                        className="col-span-2 border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        {busy === "cancel" ? "Cancelling…" : "Cancel"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-teal-600">
                      Local courier mode is active. Use J&T/XDE booking and
                      tracking controls here.
                    </p>
                  </>
                )}

                {isDelivered || isCancelled || isRefunded ? (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {isDelivered
                      ? "Delivered orders are locked."
                      : "Tracking is disabled for this status."}
                  </p>
                ) : null}

                {order.courier ||
                order.tracking_no ||
                order.shipment_status ? (
                  <div className="space-y-2 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-300">
                    {order.courier ? (
                      <p className="tracking-wide uppercase dark:text-slate-400">
                        Courier: {formatCourierLabel(order.courier)}
                      </p>
                    ) : null}
                    {rawCourierStatus ? (
                      <p className="capitalize dark:text-slate-400">
                        Courier Status: {rawCourierStatus.replace(/_/g, " ")}
                      </p>
                    ) : null}
                    {order.tracking_no ? (
                      <div className="rounded-xl border border-teal-200 bg-teal-50 p-2 dark:border-teal-500/25 dark:bg-[#1b2640]">
                        <p className="text-[10px] font-bold tracking-wide text-teal-700 uppercase">
                          Tracking Number
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="min-w-0 flex-1 text-sm font-bold break-all text-slate-900 dark:text-white">
                            {order.tracking_no}
                          </p>
                          <Button
                            size="sm"
                            variant="tertiary"
                            onPress={async () => {
                              try {
                                await copyText(order.tracking_no as string)
                                showSuccessToast("Tracking number copied.")
                              } catch (error) {
                                showErrorToast(
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to copy tracking number."
                                )
                              }
                            }}
                            className="shrink-0 border border-teal-200 bg-white px-2 py-1 text-[10px] font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-500/25 dark:bg-[#121a2b] dark:text-teal-300 dark:hover:bg-[#22304b]"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {order.shipment_payload ? (
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() =>
                          setPayloadPreview({
                            checkoutId: order.checkout_id,
                            payload: order.shipment_payload ?? null,
                          })
                        }
                        className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#31405f] dark:bg-[#1b2640] dark:text-slate-200 dark:hover:bg-[#22304b]"
                      >
                        View Payload
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300 dark:text-slate-400">
                    {order.approval_status === "approved"
                      ? "No shipment info yet"
                      : "Awaiting approval"}
                  </p>
                )}
              </div>
            </SectionCard>
          ) : null}

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

      <AdminCustomerChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        customerId={order.customer_id}
        customerName={order.customer_name}
        subject={`Order ${order.checkout_id}`}
      />

      {payloadPreview ? (
        <PayloadPreviewModal
          checkoutId={payloadPreview.checkoutId}
          payload={payloadPreview.payload}
          onClose={() => setPayloadPreview(null)}
        />
      ) : null}
    </div>
  )
}
