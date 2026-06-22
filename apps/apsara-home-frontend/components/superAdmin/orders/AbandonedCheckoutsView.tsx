"use client"

import { useState } from "react"
import {
  useGetAbandonedCheckoutsQuery,
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

/* ─── main ─────────────────────────────────────────────────── */

export default function AbandonedCheckoutsView() {
  const [page, setPage] = useState(1)
  const [recovery, setRecovery] = useState<"all" | RecoveryStatus>("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  const { data, isLoading, isFetching, isError } =
    useGetAbandonedCheckoutsQuery({
      q: search || undefined,
      recovery,
      page,
      perPage: 50,
    })

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
        <form onSubmit={submitSearch} className="relative flex-1 min-w-[220px]">
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
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase dark:border-slate-800">
                <th className="px-4 py-3">Checkout</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Customer name</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Recovery status</th>
                <th className="px-4 py-3 text-right">Total price</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 dark:border-slate-800/60"
                  >
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-red-500"
                  >
                    Failed to load abandoned checkouts.
                  </td>
                </tr>
              ) : checkouts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                    <td className="px-4 py-3 font-mono text-sky-600 dark:text-sky-400">
                      <Link
                        href={`/admin/orders/view/${encodeURIComponent(c.checkout_id)}`}
                        className="hover:underline"
                      >
                        #{c.checkout_id}
                      </Link>
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
    </div>
  )
}
