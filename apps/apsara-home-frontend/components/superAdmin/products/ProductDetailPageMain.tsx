"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { colorNameToHex, hexToColorName } from "@/libs/colorUtils"
import { showErrorToast } from "@/libs/toast"
import {
  useGetAdminProductQuery,
  usePatchProductFieldsMutation,
  useUpdateProductVariantMutation,
} from "@/store/api/productsApi"
import Link from "next/link"

import RichTextEditor from "@/components/ui/RichTextEditor"

/* ─── helpers ──────────────────────────────────────────────── */

const peso = (value?: number | null) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0))

const toStr = (value: unknown) =>
  value === null || value === undefined ? "" : String(value)

const numOrNull = (value: string) => {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

const variantTitle = (v: { name?: string; size?: string; color?: string; style?: string }) => {
  if (v.name && v.name.trim()) return v.name.trim()
  const parts = [v.size, v.color, v.style].map((x) => (x ?? "").trim()).filter(Boolean)
  return parts.length ? parts.join(" / ") : "Untitled variant"
}

/* ─── SKU generation (clean prefix + unique, unambiguous suffix) ── */

const SKU_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I
const randomSkuSuffix = (len = 4) => {
  let out = ""
  for (let i = 0; i < len; i++) {
    out += SKU_ALPHABET[Math.floor(Math.random() * SKU_ALPHABET.length)]
  }
  return out
}
const skuPrefixFromName = (name: string) => {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "")
  if (!letters) return "PROD"
  const vowels = new Set(["A", "E", "I", "O", "U"])
  const cons = letters.split("").filter((c) => !vowels.has(c))
  const vws = letters.split("").filter((c) => vowels.has(c))
  return [
    cons[0] ?? letters[0] ?? "P",
    cons[1] ?? letters[1] ?? "R",
    cons[2] ?? letters[2] ?? "D",
    vws[0] ?? letters[3] ?? "X",
  ].join("")
}
const generateProductSku = (name: string) =>
  `${skuPrefixFromName(name)}-${randomSkuSuffix(4)}`
const skuSegment = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6)
const generateVariantSku = (
  parentSku: string,
  v: { color?: string; size?: string; style?: string }
) => {
  const base = parentSku.trim().toUpperCase() || "VAR"
  const seg = [v.size, v.color, v.style]
    .map((x) => skuSegment(String(x ?? "")))
    .filter(Boolean)
    .join("-")
  return `${base}-${seg || randomSkuSuffix(3)}`
}
const DEFAULT_HEX = "#94a3b8"
const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value)

/* ─── status (matches the admin-wide convention: 1/2 = Active, 3 = Pending, else Inactive) ── */

type StatusMeta = { label: string; dot: string; badge: string }

const statusMeta = (raw: string | number | null | undefined): StatusMeta => {
  const v = Number(raw)
  if (v === 1 || v === 2)
    return {
      label: "Active",
      dot: "bg-emerald-500",
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    }
  if (v === 3)
    return {
      label: "Pending",
      dot: "bg-amber-500",
      badge:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    }
  return {
    label: "Inactive",
    dot: "bg-slate-400",
    badge:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  }
}

const STATUS_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "3", label: "Pending" },
  { value: "0", label: "Inactive" },
]

type Scope = { kind: "product" } | { kind: "variant"; id: number }
type SaveState = "idle" | "saving" | "saved" | "error"

/* ─── icons ────────────────────────────────────────────────── */

const ICON_PATHS: Record<string, string> = {
  box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  cash: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  truck:
    "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
  clipboard:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  sparkles:
    "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  swatch:
    "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  chevron: "M19 9l-7 7-7-7",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  photo:
    "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
}

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={ICON_PATHS[name] ?? ICON_PATHS.box}
      />
    </svg>
  )
}

/* ─── small UI ─────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600"

function FieldShell({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>
      ) : null}
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  icon?: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800/80">
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <Icon name={icon} className="h-4.5 w-4.5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          {subtitle ? (
            <p className="truncate text-xs text-slate-400">{subtitle}</p>
          ) : null}
        </div>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  )
}

function StatusBadge({ value }: { value: string | number | null | undefined }) {
  const m = statusMeta(value)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${m.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

const STAT_META: Record<string, { iconPath: string; bg: string; text: string }> = {
  srp: {
    iconPath: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  dealer: {
    iconPath: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
  },
  member: {
    iconPath: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
  },
  pv: {
    iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    text: "text-orange-500 dark:text-orange-400",
  },
  stock: {
    iconPath: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    bg: "bg-teal-50 dark:bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
  },
}

function Stat({
  label,
  value,
  statType,
}: {
  label: string
  value: string
  accent?: boolean
  statType?: keyof typeof STAT_META
}) {
  const meta = statType ? STAT_META[statType] : null
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      {meta ? (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.text}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={meta.iconPath} />
          </svg>
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          {label}
        </p>
        <p className={`mt-0.5 truncate text-base font-bold ${meta ? meta.text : "text-slate-800 dark:text-slate-100"}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "idle") return null
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-teal-500" />
        Saving…
      </span>
    )
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Saved
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
      <Icon name="info" className="h-3.5 w-3.5" />
      Save failed
    </span>
  )
}

function MetaChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: string
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          accent
            ? "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p
          className={`truncate text-sm font-semibold ${
            accent
              ? "text-teal-600 dark:text-teal-400"
              : "text-slate-700 dark:text-slate-200"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

/* ─── collapsible read-only description (see more / see less) ─── */

function CollapsibleHtml({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const COLLAPSED = 260

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflowing(el.scrollHeight > COLLAPSED + 8)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [html])

  const clamp = overflowing && !expanded

  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          className="prose prose-sm max-w-none text-slate-700 dark:prose-invert dark:text-slate-300"
          style={
            clamp
              ? { maxHeight: COLLAPSED, overflow: "hidden" }
              : undefined
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {clamp ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-white to-transparent dark:from-slate-900" />
        ) : null}
      </div>
      {overflowing ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 transition hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
        >
          {expanded ? "See less" : "See more"}
          <svg
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS.chevron} />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

/* ─── image gallery (read-only main preview + thumbnails) ───── */

function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0)
  if (!images.length) return null
  const safe = Math.min(active, images.length - 1)
  const goPrev = () => setActive((p) => Math.max(0, p - 1))
  const goNext = () => setActive((p) => Math.min(images.length - 1, p + 1))
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex min-h-65 sm:min-h-75">
        {/* Main image with prev/next arrows */}
        <div className="relative flex flex-1 items-center justify-center border-r border-slate-100 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-800/20">
          {images.length > 1 ? (
            <button
              type="button"
              onClick={goPrev}
              disabled={safe === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[safe]} alt={alt} className="max-h-60 max-w-full object-contain sm:max-h-68" />
          {images.length > 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={safe === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : null}
        </div>
        {/* 3-column thumbnail grid */}
        {images.length > 1 ? (
          <div className="w-40 shrink-0 overflow-y-auto p-2 sm:w-48">
            <div className="grid grid-cols-3 gap-1.5">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`aspect-square overflow-hidden rounded-lg border-2 transition ${
                    i === safe
                      ? "border-teal-500"
                      : "border-transparent ring-1 ring-slate-200 hover:ring-slate-300 dark:ring-slate-700 dark:hover:ring-slate-600"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ─── skeleton ─────────────────────────────────────────────── */

function SkBar({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-100 dark:bg-slate-800 ${className}`}
    />
  )
}

function SkField() {
  return (
    <div className="space-y-1.5">
      <SkBar className="h-3 w-20" />
      <SkBar className="h-10 w-full rounded-xl" />
    </div>
  )
}

function SkSection({ rows = 2 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800/80">
        <SkBar className="h-9 w-9 rounded-lg" />
        <SkBar className="h-3 w-24" />
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <SkField key={i} />
        ))}
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <SkBar className="h-4 w-20" />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <SkBar className="h-20 w-20 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkBar className="h-6 w-64 max-w-full" />
          <SkBar className="h-3 w-40" />
        </div>
        <SkBar className="h-10 w-24 rounded-xl" />
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkBar key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>

      {/* Two-pane grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <SkBar className="h-16 w-full rounded-2xl" />
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
            <div className="border-b border-slate-100 p-2 dark:border-slate-800">
              <SkBar className="h-9 w-full rounded-lg" />
            </div>
            <div className="space-y-3 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <SkBar className="h-4 w-3/4" />
                  <SkBar className="h-3 w-2/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <SkSection rows={2} />
          <SkSection rows={2} />
          <SkSection rows={1} />
        </div>
      </div>
    </div>
  )
}

/* ─── main ─────────────────────────────────────────────────── */

export default function ProductDetailPageMain({
  productId,
}: {
  productId: number
}) {
  const { data: product, isLoading, isError } = useGetAdminProductQuery(productId, {
    refetchOnMountOrArgChange: true,
  })
  const [patchProduct] = usePatchProductFieldsMutation()
  const [patchVariant] = useUpdateProductVariantMutation()

  const [scope, setScope] = useState<Scope>({ kind: "product" })
  const [search, setSearch] = useState("")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [editMode, setEditMode] = useState(false)

  // Editable drafts (string/boolean values keyed by pd_*/pv_* names).
  const [productDraft, setProductDraft] = useState<Record<string, string | boolean>>({})
  const [variantDrafts, setVariantDrafts] = useState<
    Record<number, Record<string, string | boolean>>
  >({})
  // Last-committed values, to skip no-op saves and recover from errors.
  const savedRef = useRef<{
    product: Record<string, string | boolean>
    variants: Record<number, Record<string, string | boolean>>
  }>({ product: {}, variants: {} })

  useEffect(() => {
    if (!product) return
    const p: Record<string, string | boolean> = {
      pd_name: toStr(product.name),
      pd_parent_sku: toStr(product.sku),
      pd_status: String(product.status ?? 1),
      pd_price_srp: toStr(product.priceSrp),
      pd_price_dp: toStr(product.priceDp),
      pd_price_member: toStr(product.priceMember),
      pd_prodpv: toStr(product.prodpv),
      pd_qty: toStr(product.qty),
      pd_weight: toStr(product.weight),
      pd_pswidth: toStr(product.pswidth),
      pd_pslenght: toStr(product.pslenght),
      pd_psheight: toStr(product.psheight),
      pd_psweight: toStr(product.psweight),
      pd_material: toStr(product.material),
      pd_warranty: toStr(product.warranty),
      pd_description: toStr(product.description),
      pd_musthave: Boolean(product.musthave),
      pd_bestseller: Boolean(product.bestseller),
      pd_salespromo: Boolean(product.salespromo),
    }
    const vmap: Record<number, Record<string, string | boolean>> = {}
    for (const v of product.variants ?? []) {
      if (v.id == null) continue
      vmap[v.id] = {
        pv_name: toStr(v.name),
        pv_sku: toStr(v.sku),
        pv_color: toStr(v.color),
        pv_color_hex: toStr(v.colorHex),
        pv_size: toStr(v.size),
        pv_style: toStr(v.style),
        pv_price_srp: toStr(v.priceSrp),
        pv_price_dp: toStr(v.priceDp),
        pv_price_member: toStr(v.priceMember),
        pv_prodpv: toStr(v.prodpv),
        pv_qty: toStr(v.qty),
        pv_status: String(v.status ?? 1),
      }
    }
    setProductDraft(p)
    setVariantDrafts(vmap)
    savedRef.current = {
      product: { ...p },
      variants: Object.fromEntries(Object.entries(vmap).map(([k, val]) => [k, { ...val }])),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  const variants = product?.variants ?? []
  const filteredVariants = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return variants
    return variants.filter((v) => {
      const d = v.id != null ? variantDrafts[v.id] : undefined
      const title = variantTitle({
        name: toStr(d?.pv_name ?? v.name),
        size: toStr(d?.pv_size ?? v.size),
        color: toStr(d?.pv_color ?? v.color),
        style: toStr(d?.pv_style ?? v.style),
      })
      return (
        title.toLowerCase().includes(q) ||
        toStr(d?.pv_sku ?? v.sku).toLowerCase().includes(q)
      )
    })
  }, [search, variants, variantDrafts])

  /* ── draft accessors (scope-aware) ── */
  const getVal = (key: string): string | boolean => {
    if (scope.kind === "product") return productDraft[key] ?? ""
    return variantDrafts[scope.id]?.[key] ?? ""
  }
  const setVal = (key: string, value: string | boolean) => {
    if (scope.kind === "product") {
      setProductDraft((prev) => ({ ...prev, [key]: value }))
    } else {
      const vid = scope.id
      setVariantDrafts((prev) => ({
        ...prev,
        [vid]: { ...(prev[vid] ?? {}), [key]: value },
      }))
    }
  }

  /* ── save one field for the current scope ── */
  const save = async (key: string, rawValue: string | boolean, isNumeric: boolean) => {
    const scopeKey =
      scope.kind === "product" ? "product" : `variant:${scope.id}`
    const lastStore =
      scope.kind === "product"
        ? savedRef.current.product
        : (savedRef.current.variants[scope.id] ??= {})

    // Skip when unchanged from the last committed value.
    if (toStr(lastStore[key]) === toStr(rawValue)) return

    const payloadValue =
      typeof rawValue === "boolean"
        ? rawValue
        : isNumeric
          ? numOrNull(rawValue)
          : rawValue
    // status fields are integers
    const finalValue =
      key === "pd_status" || key === "pv_status"
        ? Number(rawValue)
        : payloadValue

    setSaveState("saving")
    try {
      if (scope.kind === "product") {
        await patchProduct({
          id: productId,
          data: { [key]: finalValue },
        }).unwrap()
      } else {
        await patchVariant({
          id: productId,
          variantId: scope.id,
          data: { [key]: finalValue },
        }).unwrap()
      }
      lastStore[key] = rawValue
      setSaveState("saved")
      window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500)
    } catch (err) {
      setSaveState("error")
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        "Couldn't save that change."
      showErrorToast(`${scopeKey}: ${message}`)
    }
  }

  // Description editing — mirrors the controlled editor in AddProductModal:
  // onChange keeps the draft (`value`) in sync with what's typed; the save is
  // debounced; leaving edit mode flushes any pending save.
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commitDescription = (html: string) => {
    if (toStr(savedRef.current.product.pd_description) === toStr(html)) return
    setSaveState("saving")
    patchProduct({ id: productId, data: { pd_description: html } })
      .unwrap()
      .then(() => {
        savedRef.current.product.pd_description = html
        setSaveState("saved")
        window.setTimeout(
          () => setSaveState((s) => (s === "saved" ? "idle" : s)),
          1500
        )
      })
      .catch((err) => {
        setSaveState("error")
        showErrorToast(
          (err as { data?: { message?: string } })?.data?.message ??
            "Couldn't save the description."
        )
      })
  }
  const onDescriptionChange = (html: string) => {
    setProductDraft((prev) => ({ ...prev, pd_description: html }))
    if (descTimer.current) clearTimeout(descTimer.current)
    descTimer.current = setTimeout(() => commitDescription(html), 700)
  }
  const toggleEditMode = () => {
    if (editMode) {
      if (descTimer.current) {
        clearTimeout(descTimer.current)
        descTimer.current = null
      }
      commitDescription(String(productDraft.pd_description ?? ""))
    }
    setEditMode((prev) => !prev)
  }

  /* ── field renderers ── */
  const textField = (label: string, key: string, opts?: { textarea?: boolean }) => (
    <FieldShell label={label}>
      {!editMode ? (
        <p
          className={`text-sm ${opts?.textarea ? "whitespace-pre-line" : ""} ${
            String(getVal(key)).trim()
              ? "font-medium text-slate-800 dark:text-slate-100"
              : "text-slate-400"
          }`}
        >
          {String(getVal(key)).trim() || "—"}
        </p>
      ) : opts?.textarea ? (
        <textarea
          rows={4}
          value={String(getVal(key))}
          onChange={(e) => setVal(key, e.target.value)}
          onBlur={() => save(key, getVal(key), false)}
          className={inputCls}
        />
      ) : (
        <input
          type="text"
          value={String(getVal(key))}
          onChange={(e) => setVal(key, e.target.value)}
          onBlur={() => save(key, getVal(key), false)}
          className={inputCls}
        />
      )}
    </FieldShell>
  )

  const numberField = (label: string, key: string, prefix?: string) => {
    const raw = String(getVal(key))
    return (
      <FieldShell label={label}>
        {!editMode ? (
          <p
            className={`text-sm font-semibold ${
              raw.trim() ? "text-slate-800 dark:text-slate-100" : "text-slate-400"
            }`}
          >
            {raw.trim() === "" ? "—" : prefix === "₱" ? peso(Number(raw)) : raw}
          </p>
        ) : (
          <div className="relative">
            {prefix ? (
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-medium text-slate-400">
                {prefix}
              </span>
            ) : null}
            <input
              type="number"
              step="0.01"
              min="0"
              value={raw}
              onChange={(e) => setVal(key, e.target.value)}
              onBlur={() => save(key, getVal(key), true)}
              className={`${inputCls} ${prefix ? "pl-8" : ""}`}
            />
          </div>
        )}
      </FieldShell>
    )
  }

  const toggleField = (label: string, key: string) => {
    const checked = Boolean(getVal(key))
    if (!editMode) {
      return (
        <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/40">
          <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              checked
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                checked ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {checked ? "Yes" : "No"}
          </span>
        </div>
      )
    }
    return (
      <button
        type="button"
        onClick={() => {
          const next = !checked
          setVal(key, next)
          save(key, next, false)
        }}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-teal-300 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-500/40"
      >
        <span>{label}</span>
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
            checked ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
              checked ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>
    )
  }

  const statusField = (key: string) => {
    const value = String(getVal(key) || "1")
    return (
      <FieldShell label="Status">
        {!editMode ? (
          <StatusBadge value={value} />
        ) : (
          <div className="inline-flex w-full items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/60">
            {STATUS_OPTIONS.map((opt) => {
              const active = value === opt.value
              const m = statusMeta(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setVal(key, opt.value)
                    save(key, opt.value, false)
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-950 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}
      </FieldShell>
    )
  }

  const skuField = (label: string, key: string, onRegenerate: () => void) => (
    <FieldShell label={label}>
      {!editMode ? (
        <p className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {String(getVal(key)).trim() || "—"}
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={String(getVal(key))}
            onChange={(e) => setVal(key, e.target.value.toUpperCase())}
            onBlur={() => save(key, getVal(key), false)}
            className={`${inputCls} font-mono`}
          />
          <button
            type="button"
            onClick={onRegenerate}
            title="Generate a new SKU"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-teal-500/40 dark:hover:text-teal-300"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Regenerate
          </button>
        </div>
      )}
    </FieldShell>
  )

  const colorField = () => {
    const name = String(getVal("pv_color"))
    const hexRaw = String(getVal("pv_color_hex"))
    const hex = isHex(hexRaw) ? hexRaw : DEFAULT_HEX
    if (!editMode) {
      return (
        <FieldShell label="Color">
          <div className="flex items-center gap-2">
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-slate-300 dark:border-slate-600"
              style={{ backgroundColor: name || isHex(hexRaw) ? hex : "transparent" }}
            />
            <span
              className={`text-sm ${name ? "font-medium text-slate-800 dark:text-slate-100" : "text-slate-400"}`}
            >
              {name || "—"}
            </span>
          </div>
        </FieldShell>
      )
    }
    return (
      <FieldShell label="Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hex}
            onChange={(e) => setVal("pv_color_hex", e.target.value)}
            onBlur={() => {
              save("pv_color_hex", getVal("pv_color_hex"), false)
              if (!String(getVal("pv_color")).trim()) {
                const auto = hexToColorName(String(getVal("pv_color_hex")) || DEFAULT_HEX)
                setVal("pv_color", auto)
                save("pv_color", auto, false)
              }
            }}
            className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setVal("pv_color", e.target.value)}
            onBlur={() => {
              save("pv_color", getVal("pv_color"), false)
              const mapped = colorNameToHex(String(getVal("pv_color")))
              if (mapped) {
                setVal("pv_color_hex", mapped)
                save("pv_color_hex", mapped, false)
              }
            }}
            placeholder="e.g. White"
            className={inputCls}
          />
        </div>
      </FieldShell>
    )
  }

  if (isLoading) return <DetailSkeleton />

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
        >
          ← Products
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Product not found.
        </div>
      </div>
    )
  }

  const hasVariants = variants.length > 0
  const selectedVariant =
    scope.kind === "variant" ? variants.find((v) => v.id === scope.id) : undefined
  const cleanImages = (arr?: string[] | null) =>
    (arr ?? []).filter((src): src is string => typeof src === "string" && src.trim() !== "")
  const productImages = (() => {
    const imgs = cleanImages(product.images)
    if (imgs.length) return imgs
    return product.image ? [product.image] : []
  })()
  // Only a variant's own photos are shown when a variant is selected — no
  // fallback to the product gallery.
  const variantImages = cleanImages(selectedVariant?.images)
  const liveStatus = String(productDraft.pd_status ?? product.status ?? 1)
  const totalStock = hasVariants
    ? variants.reduce((sum, v) => {
        const d = v.id != null ? variantDrafts[v.id] : undefined
        return sum + (numOrNull(toStr(d?.pv_qty ?? v.qty)) ?? 0)
      }, 0)
    : numOrNull(String(productDraft.pd_qty ?? "")) ?? 0

  const productCreatedAt = String(
    (product as Record<string, unknown>).createdAt ?? ""
  )
  const productUpdatedAt = String(
    (product as Record<string, unknown>).updatedAt ?? ""
  )
  const fmtDate = (raw: string) => {
    if (!raw) return "—"
    const d = new Date(raw)
    return isNaN(d.getTime())
      ? raw
      : d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
  }

  return (
    <div className="space-y-5">
      {/* ── Top nav bar ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Products
        </Link>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} />
          <button
            type="button"
            onClick={toggleEditMode}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
              editMode
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-500/40"
            }`}
          >
            {editMode ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Done
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Product
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Edit-mode helper bar ── */}
      {editMode ? (
        <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-2.5 text-xs font-medium text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
          <Icon name="info" className="h-4 w-4 shrink-0" />
          Editing is on — each field saves automatically when you finish typing or switch fields.
        </div>
      ) : null}

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Retail (SRP)" value={peso(Number(productDraft.pd_price_srp ?? 0))} statType="srp" />
        <Stat label="Dealer Price" value={peso(Number(productDraft.pd_price_dp ?? 0))} statType="dealer" />
        <Stat label="Member Price" value={peso(Number(productDraft.pd_price_member ?? 0))} statType="member" />
        <Stat label="Product PV" value={String(productDraft.pd_prodpv ?? "0") || "0"} statType="pv" />
        <Stat label="In Stock" value={`${totalStock} units`} statType="stock" />
      </div>

      {/* ── Image gallery ── */}
      {productImages.length > 0 ? (
        <ImageGallery
          key="product"
          images={productImages}
          alt={String(productDraft.pd_name ?? product.name)}
        />
      ) : null}

      {/* ── Product name + badges ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {String(productDraft.pd_name ?? product.name)}
        </h1>
        <StatusBadge value={liveStatus} />
        {hasVariants ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            {variants.length} variant{variants.length !== 1 ? "s" : ""}
          </span>
        ) : null}
        {product.sku ? (
          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {product.sku}
          </span>
        ) : null}
      </div>

      {/* ── Main 2-column grid ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-5">
          <SectionCard
            title="Product Information"
            subtitle="Name, identifier, status and description"
            icon="clipboard"
          >
            {textField("Product name", "pd_name")}
            <div className="grid gap-4 sm:grid-cols-2">
              {skuField("Parent SKU", "pd_parent_sku", () => {
                const sku = generateProductSku(
                  String(getVal("pd_name")) || product.name
                )
                setVal("pd_parent_sku", sku)
                save("pd_parent_sku", sku, false)
              })}
              {statusField("pd_status")}
            </div>
            <FieldShell label="Description">
              {editMode ? (
                <RichTextEditor
                  value={String(productDraft.pd_description ?? "")}
                  onChange={onDescriptionChange}
                  placeholder="Describe this product — features, materials, warranty…"
                />
              ) : String(productDraft.pd_description ?? "").trim() ? (
                <CollapsibleHtml html={String(productDraft.pd_description ?? "")} />
              ) : (
                <p className="text-sm text-slate-400">No description</p>
              )}
            </FieldShell>
          </SectionCard>

          <SectionCard title="Details" subtitle="Material and warranty" icon="clipboard">
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("Material", "pd_material")}
              {textField("Warranty", "pd_warranty")}
            </div>
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <SectionCard title="Pricing" subtitle="Retail, dealer, member and PV" icon="cash">
            {editMode ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {numberField("Retail price (SRP)", "pd_price_srp", "₱")}
                {numberField("Dealer price", "pd_price_dp", "₱")}
                {numberField("Member price", "pd_price_member", "₱")}
                {numberField("Product PV", "pd_prodpv")}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    { label: "Retail Price (SRP)", key: "pd_price_srp", prefix: "₱", accent: true },
                    { label: "Dealer Price", key: "pd_price_dp", prefix: "₱", accent: true },
                    { label: "Member Price", key: "pd_price_member", prefix: "₱", accent: true },
                    { label: "Product PV", key: "pd_prodpv", prefix: "", accent: false },
                  ] as const
                ).map(({ label, key, prefix, accent }) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-slate-400">{label}</p>
                    <p className={`mt-0.5 text-xl font-bold ${accent ? "text-teal-600 dark:text-teal-400" : "text-slate-700 dark:text-slate-200"}`}>
                      {prefix}{prefix ? Number(productDraft[key] ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 }) : String(productDraft[key] ?? "0")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Shipping" subtitle="Weight and package dimensions" icon="truck">
            <div className="grid gap-4 sm:grid-cols-2">
              {numberField("Weight (kg)", "pd_weight")}
              {numberField("Package weight (kg)", "pd_psweight")}
              {numberField("Width (cm)", "pd_pswidth")}
              {numberField("Length (cm)", "pd_pslenght")}
              {numberField("Height (cm)", "pd_psheight")}
            </div>
          </SectionCard>

          {!hasVariants ? (
            <SectionCard title="Inventory" subtitle="Stock on hand" icon="box">
              {numberField("Stock quantity", "pd_qty")}
            </SectionCard>
          ) : null}

          <SectionCard title="Merchandising" subtitle="Storefront highlights" icon="sparkles">
            <div className="grid gap-2 sm:grid-cols-3">
              {toggleField("Must-have", "pd_musthave")}
              {toggleField("Bestseller", "pd_bestseller")}
              {toggleField("On sale", "pd_salespromo")}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Product Metadata ── */}
      <SectionCard title="Product Metadata" subtitle="Stock and timestamps" icon="box">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetaChip icon="box" label="In Stock" value={`${totalStock} units`} accent />
          <MetaChip icon="calendar" label="Created" value={fmtDate(productCreatedAt)} />
          <MetaChip icon="clock" label="Last Updated" value={fmtDate(productUpdatedAt)} />
        </div>
      </SectionCard>

      {/* ── Variants section ── */}
      {hasVariants ? (
        <SectionCard
          title={`Variants (${variants.length})`}
          subtitle="Select a variant to view or edit"
          icon="swatch"
        >
          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search variants…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Variant rows */}
          <div className="space-y-1">
            {filteredVariants.map((v) => {
              const d = v.id != null ? variantDrafts[v.id] : undefined
              const title = variantTitle({
                name: toStr(d?.pv_name ?? v.name),
                size: toStr(d?.pv_size ?? v.size),
                color: toStr(d?.pv_color ?? v.color),
                style: toStr(d?.pv_style ?? v.style),
              })
              const isActive = scope.kind === "variant" && scope.id === v.id
              const price = numOrNull(toStr(d?.pv_price_srp ?? v.priceSrp))
              const qty = numOrNull(toStr(d?.pv_qty ?? v.qty)) ?? 0
              const hexRaw = toStr(d?.pv_color_hex ?? v.colorHex)
              const swatch = isHex(hexRaw) ? hexRaw : null
              const thumb = v.images?.find(
                (src) => typeof src === "string" && src.trim() !== ""
              )
              return (
                <div key={v.id}>
                  <button
                    type="button"
                    onClick={() =>
                      v.id != null &&
                      setScope(
                        isActive
                          ? { kind: "product" }
                          : { kind: "variant", id: v.id }
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      isActive
                        ? "bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-500/10 dark:ring-teal-500/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                      style={{ backgroundColor: thumb ? undefined : swatch ?? "transparent" }}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : swatch ? null : (
                        <Icon name="swatch" className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {title}
                      </p>
                      <p className="truncate font-mono text-[11px] text-slate-400">
                        {toStr(d?.pv_sku ?? v.sku) || "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {peso(price)}
                      </p>
                      <span
                        className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          qty > 0
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-300"
                        }`}
                      >
                        {qty > 0 ? `${qty} in stock` : "Out of stock"}
                      </span>
                    </div>
                    <svg
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isActive ? "rotate-180 text-teal-500" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS.chevron} />
                    </svg>
                  </button>

                  {/* Inline variant editor */}
                  {isActive ? (
                    <div className="mt-1 space-y-4 rounded-xl border border-teal-100 bg-teal-50/30 p-4 dark:border-teal-500/20 dark:bg-teal-500/5">
                      {variantImages.length > 0 ? (
                        <ImageGallery
                          key={`variant-${scope.kind === "variant" ? scope.id : "x"}`}
                          images={variantImages}
                          alt={title}
                        />
                      ) : null}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-4">
                          {textField("Variant name", "pv_name")}
                          {skuField("SKU", "pv_sku", () => {
                            const parent =
                              String(productDraft.pd_parent_sku ?? "") ||
                              String(product.sku ?? "")
                            const sku = generateVariantSku(parent, {
                              color: String(getVal("pv_color")),
                              size: String(getVal("pv_size")),
                              style: String(getVal("pv_style")),
                            })
                            setVal("pv_sku", sku)
                            save("pv_sku", sku, false)
                          })}
                          {statusField("pv_status")}
                          <div className="grid gap-3 sm:grid-cols-3">
                            {colorField()}
                            {textField("Size", "pv_size")}
                            {textField("Style", "pv_style")}
                          </div>
                        </div>
                        <div className="space-y-4">
                          {numberField("Retail price (SRP)", "pv_price_srp", "₱")}
                          {numberField("Dealer price", "pv_price_dp", "₱")}
                          {numberField("Member price", "pv_price_member", "₱")}
                          {numberField("PV", "pv_prodpv")}
                          {numberField("Stock quantity", "pv_qty")}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {filteredVariants.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                No variants match &ldquo;{search}&rdquo;.
              </p>
            ) : null}
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}

