"use client"

import { useState } from "react"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import {
  useGetAbandonedCheckoutsQuery,
  useRemindAbandonedCheckoutMutation,
  type AbandonedCheckout,
  type RecoveryStatus,
} from "@/store/api/adminOrdersApi"
import Link from "next/link"

/* ─── helpers ──────────────────────────────────────────────── */

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value || 0)

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const trimmed = value.trim()
  if (!trimmed) return "—"
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T")
  const hasTimeZone = /([zZ]|[+-]\d{2}:\d{2})$/.test(normalized)
  const parsed = new Date(hasTimeZone ? normalized : `${normalized}+08:00`)
  if (Number.isNaN(parsed.getTime())) return "—"
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

const extractApiError = (err: unknown, fallback: string) => {
  const data = (err as { data?: { message?: string; error?: string } })?.data
  return data?.error || data?.message || fallback
}

const RECOVERY_FILTERS: Array<{ value: "all" | RecoveryStatus; label: string }> =
  [
    { value: "all", label: "All" },
    { value: "not_recovered", label: "Not recovered" },
    { value: "recovered", label: "Recovered" },
  ]

function RecoveryPill({ status }: { status: RecoveryStatus }) {
  const recovered = status === "recovered"
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
        recovered
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
      }`}
    >
      {recovered ? "Recovered" : "Not recovered"}
    </span>
  )
}

function ProductThumb({
  src,
  alt,
  onHover,
  onLeave,
}: {
  src?: string | null
  alt: string
  onHover: (rect: DOMRect, src: string, alt: string) => void
  onLeave: () => void
}) {
  return (
    <div
      className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition hover:ring-2 hover:ring-sky-300 dark:border-slate-700 dark:bg-slate-800"
      onMouseEnter={(e) => {
        if (!src) return
        onHover(e.currentTarget.getBoundingClientRect(), src, alt)
      }}
      onMouseLeave={onLeave}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <svg
            className="h-4 w-4 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  )
}

/* ─── main ─────────────────────────────────────────────────── */

export default function AbandonedCheckoutsView() {
  const [page, setPage] = useState(1)
  const [recovery, setRecovery] = useState<"all" | RecoveryStatus>("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [thumbPreview, setThumbPreview] = useState<{
    src: string
    alt: string
    top: number
    left: number
  } | null>(null)
  const [reminderTarget, setReminderTarget] = useState<AbandonedCheckout | null>(
    null
  )
  const [note, setNote] = useState("")

  const { data, isLoading, isFetching, isError } =
    useGetAbandonedCheckoutsQuery({
      q: search || undefined,
      recovery,
      page,
      perPage: 50,
    })
  const [remind, { isLoading: isReminding }] =
    useRemindAbandonedCheckoutMutation()

  const checkouts = data?.checkouts ?? []
  const meta = data?.meta

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const onFilterChange = (value: "all" | RecoveryStatus) => {
    setRecovery(value)
    setPage(1)
  }

  const openReminder = (checkout: AbandonedCheckout) => {
    setReminderTarget(checkout)
    setNote("")
  }

  const sendReminder = async () => {
    if (!reminderTarget) return
    try {
      const result = await remind({
        checkoutId: reminderTarget.checkout_id,
        note: note.trim() || undefined,
      }).unwrap()
      showSuccessToast(
        result.channels?.length
          ? `Reminder sent via ${result.channels.join(", ")}.`
          : "Reminder sent to the customer."
      )
      setReminderTarget(null)
      setNote("")
    } catch (err) {
      showErrorToast(extractApiError(err, "Couldn't send the reminder."))
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-sky-500 uppercase">
            Orders
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Abandoned checkouts
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Carts that reached checkout but were never paid
            {typeof meta?.total === "number" ? ` · ${meta.total} total` : ""}
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          All orders
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="relative min-w-55 flex-1">
          <svg
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search checkout, name, email or phone…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </form>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {RECOVERY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterChange(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                recovery === f.value
                  ? "bg-sky-500 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-230 text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase dark:border-slate-800">
                <th className="w-14 px-4 py-3" />
                <th className="px-4 py-3">Checkout</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Customer name</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Recovery status</th>
                <th className="px-4 py-3 text-right">Total price</th>
                <th className="w-px px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 dark:border-slate-800/60"
                  >
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-red-500"
                  >
                    Failed to load abandoned checkouts.
                  </td>
                </tr>
              ) : checkouts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    No abandoned checkouts{search ? ` for “${search}”` : ""}.
                  </td>
                </tr>
              ) : (
                checkouts.map((c) => (
                  <tr
                    key={c.checkout_id}
                    className="group border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <ProductThumb
                        src={c.image}
                        alt={c.product_name || "Product"}
                        onHover={(rect, src, alt) =>
                          setThumbPreview({
                            src,
                            alt,
                            top: rect.top + rect.height / 2,
                            left: rect.left,
                          })
                        }
                        onLeave={() => setThumbPreview(null)}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sky-600 dark:text-sky-400">
                      <Link
                        href={`/admin/orders/view/${encodeURIComponent(c.checkout_id)}`}
                        className="hover:underline"
                      >
                        #{c.checkout_id}
                      </Link>
                      {c.item_count && c.item_count > 1 ? (
                        <span className="ml-2 font-sans text-[11px] text-slate-400">
                          {c.item_count} items
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {formatDateTime(c.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {c.customer_name || "Guest"}
                      {c.reminder_count ? (
                        <span className="ml-2 text-[11px] font-medium text-slate-400">
                          · reminded {c.reminder_count}×
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {c.region || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <RecoveryPill status={c.recovery_status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-slate-800 dark:text-slate-100">
                      {formatMoney(c.total_price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.recovery_status === "not_recovered" ? (
                        <button
                          type="button"
                          onClick={() => openReminder(c)}
                          title="Send a payment reminder to this customer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          Send reminder
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.total > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-400">
              {meta.from ?? 0}–{meta.to ?? 0} of {meta.total}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={meta.current_page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page || isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Instant hover preview — pops to the left of the hovered thumbnail */}
      {thumbPreview ? (
        <div
          className="pointer-events-none fixed z-100 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          style={{
            top: thumbPreview.top,
            left: thumbPreview.left,
            transform: "translate(calc(-100% - 10px), -50%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbPreview.src}
            alt={thumbPreview.alt}
            className="h-44 w-44 rounded-xl bg-slate-50 object-contain dark:bg-slate-800"
          />
        </div>
      ) : null}

      {/* Send-reminder modal */}
      {reminderTarget ? (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/50 p-4">
          <div
            className="absolute inset-0"
            onClick={() => !isReminding && setReminderTarget(null)}
          />
          <div className="relative z-111 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-bold tracking-[0.2em] text-sky-500 uppercase">
              Recovery
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              Send payment reminder
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Emails{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {reminderTarget.customer_email || reminderTarget.customer_name || "the customer"}
              </span>{" "}
              a link to finish paying for{" "}
              <span className="font-mono text-xs">{reminderTarget.checkout_id}</span>.
            </p>

            <label className="mt-4 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Note to customer <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="e.g. Your items are still reserved — complete your payment today to secure them."
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">
              {note.length}/500
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isReminding}
                onClick={() => setReminderTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReminding}
                onClick={sendReminder}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
              >
                {isReminding ? "Sending…" : "Send reminder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
