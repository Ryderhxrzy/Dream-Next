"use client"

import { showErrorToast, showSuccessToast } from "@/libs/toast"

/* ─── status pills ─────────────────────────────────────────── */

export const paymentStatusTone = (status?: string | null) => {
  const s = (status ?? "").toLowerCase()
  if (s.includes("paid") || s.includes("success"))
    return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
  if (s.includes("pending") || s.includes("await") || s.includes("unpaid"))
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
  if (s.includes("fail") || s.includes("cancel") || s.includes("refund"))
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
  return "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
}

export const fulfillmentStatusTone = (status?: string | null) => {
  const s = (status ?? "").toLowerCase()
  if (s.includes("deliver") || s.includes("complete"))
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
  if (
    s.includes("ship") ||
    s.includes("transit") ||
    s.includes("pack") ||
    s.includes("process") ||
    s.includes("out_for")
  )
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
  if (
    s.includes("cancel") ||
    s.includes("refund") ||
    s.includes("fail") ||
    s.includes("return")
  )
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
}

export function StatusPill({
  label,
  tone,
  dot = false,
}: {
  label?: string | null
  tone: string
  dot?: boolean
}) {
  const text = (label ?? "").trim()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap capitalize ${tone}`}
    >
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      ) : null}
      {text || "—"}
    </span>
  )
}

/* ─── shipping address (Shopify-style) ─────────────────────── */

const copyText = async (value: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard is not available in this browser.")
  }
  await navigator.clipboard.writeText(value)
}

export function ShippingAddressCard({
  name,
  phone,
  address,
}: {
  name?: string | null
  phone?: string | null
  address?: string | null
}) {
  const lines = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  const hasAddress = lines.length > 0
  const mapQuery = encodeURIComponent((address ?? "").trim())

  const handleCopy = async () => {
    try {
      await copyText([name, ...lines, phone].filter(Boolean).join("\n"))
      showSuccessToast("Shipping address copied.")
    } catch {
      showErrorToast("Couldn't copy the address.")
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          Shipping Address
        </p>
        {hasAddress ? (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy
          </button>
        ) : null}
      </div>

      {hasAddress ? (
        <div className="mt-2 space-y-0.5 text-sm">
          {name ? (
            <p className="font-semibold text-slate-900 dark:text-white">
              {name}
            </p>
          ) : null}
          {lines.map((line, index) => (
            <p key={index} className="text-slate-600 dark:text-slate-300">
              {line}
            </p>
          ))}
          {phone ? (
            <p className="pt-0.5 text-slate-500 dark:text-slate-400">{phone}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-400 italic dark:text-slate-500">
          No address provided
        </p>
      )}

      {hasAddress ? (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          View map
        </a>
      ) : null}
    </div>
  )
}
