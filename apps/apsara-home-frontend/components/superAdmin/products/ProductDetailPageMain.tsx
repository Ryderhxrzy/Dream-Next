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

type Scope = { kind: "product" } | { kind: "variant"; id: number }
type SaveState = "idle" | "saving" | "saved" | "error"

/* ─── small UI ─────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"

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
      <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
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
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="mb-4 text-xs font-bold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
        {title}
      </p>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "idle") return null
  const map: Record<Exclude<SaveState, "idle">, { text: string; cls: string }> = {
    saving: { text: "Saving…", cls: "text-slate-400" },
    saved: {
      text: "✓ Saved",
      cls: "text-emerald-600 dark:text-emerald-400",
    },
    error: { text: "Save failed", cls: "text-red-500" },
  }
  const m = map[state]
  return <span className={`text-xs font-semibold ${m.cls}`}>{m.text}</span>
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
      <SkBar className="h-9 w-full rounded-lg" />
    </div>
  )
}

function SkSection({ rows = 2 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <SkBar className="mb-4 h-3 w-24" />
      <div className="grid gap-4 sm:grid-cols-2">
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
      {/* Back link */}
      <SkBar className="h-4 w-20" />

      {/* Header (image · title/meta · edit button) */}
      <div className="flex flex-wrap items-center gap-4">
        <SkBar className="h-16 w-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkBar className="h-6 w-64 max-w-full" />
          <SkBar className="h-3 w-40" />
        </div>
        <SkBar className="h-9 w-24 rounded-xl" />
      </div>

      {/* Two-pane grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: product entry + variant list */}
        <div className="space-y-3 lg:col-span-1">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <SkBar className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <SkBar className="h-4 w-28" />
              <SkBar className="h-3 w-36" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
            <div className="border-b border-slate-100 p-2 dark:border-slate-800">
              <SkBar className="h-8 w-full rounded-lg" />
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

        {/* Right: editor section cards */}
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
              ? "text-slate-800 dark:text-slate-100"
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
            className={`text-sm font-medium ${
              raw.trim() ? "text-slate-800 dark:text-slate-100" : "text-slate-400"
            }`}
          >
            {raw.trim() === "" ? "—" : prefix === "₱" ? peso(Number(raw)) : raw}
          </p>
        ) : (
          <div className="relative">
            {prefix ? (
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400">
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
              className={`${inputCls} ${prefix ? "pl-7" : ""}`}
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
        <div className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
          <span className="text-slate-700 dark:text-slate-200">{label}</span>
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              checked
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
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
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
      >
        <span>{label}</span>
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
            checked ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
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
          <span
            className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
              value === "1"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {value === "1" ? "Active" : "Draft"}
          </span>
        ) : (
          <select
            value={value}
            onChange={(e) => {
              setVal(key, e.target.value)
              save(key, e.target.value, false)
            }}
            className={inputCls}
          >
            <option value="1">Active</option>
            <option value="0">Draft</option>
          </select>
        )}
      </FieldShell>
    )
  }

  const skuField = (label: string, key: string, onRegenerate: () => void) => (
    <FieldShell label={label}>
      {!editMode ? (
        <p className="font-mono text-sm text-slate-800 dark:text-slate-100">
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
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-teal-500/40 dark:hover:text-teal-300"
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
              className={`text-sm ${name ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}`}
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
            className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950"
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

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Products
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">
            {String(productDraft.pd_name ?? product.name)}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold ${
                String(productDraft.pd_status ?? product.status) === "1"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {String(productDraft.pd_status ?? product.status) === "1" ? "Active" : "Draft"}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 dark:text-slate-400">
              {hasVariants ? `${variants.length} variants` : "No variants"}
            </span>
            {product.sku ? (
              <>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">{product.sku}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} />
          <button
            type="button"
            onClick={toggleEditMode}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              editMode
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {editMode ? (
              <>
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Done
              </>
            ) : (
              <>
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Two-pane */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: product + variant list */}
        <div className="space-y-3 lg:col-span-1">
          <button
            type="button"
            onClick={() => setScope({ kind: "product" })}
            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
              scope.kind === "product"
                ? "border-teal-300 bg-teal-50/60 dark:border-teal-500/40 dark:bg-teal-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"
            }`}
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                Product details
              </p>
              <p className="truncate text-xs text-slate-400">
                Name, pricing, description
              </p>
            </div>
          </button>

          {hasVariants ? (
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
              <div className="border-b border-slate-100 p-2 dark:border-slate-800">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search variants…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:border-teal-300 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-1.5">
                <p className="px-2 py-1 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                  {variants.length} variants
                </p>
                {filteredVariants.map((v) => {
                  const d = v.id != null ? variantDrafts[v.id] : undefined
                  const title = variantTitle({
                    name: toStr(d?.pv_name ?? v.name),
                    size: toStr(d?.pv_size ?? v.size),
                    color: toStr(d?.pv_color ?? v.color),
                    style: toStr(d?.pv_style ?? v.style),
                  })
                  const active = scope.kind === "variant" && scope.id === v.id
                  const price = numOrNull(toStr(d?.pv_price_srp ?? v.priceSrp))
                  const qty = numOrNull(toStr(d?.pv_qty ?? v.qty))
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => v.id != null && setScope({ kind: "variant", id: v.id })}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                        active
                          ? "bg-teal-50 dark:bg-teal-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {title}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {peso(price)} · {qty ?? 0} in stock
                        </p>
                      </div>
                    </button>
                  )
                })}
                {filteredVariants.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-slate-400">
                    No variants match “{search}”.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: editor */}
        <div className="space-y-4 lg:col-span-2">
          {scope.kind === "product" ? (
            <>
              <SectionCard title="Product">
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
                    <div
                      className="prose prose-sm max-w-none text-slate-700 dark:prose-invert dark:text-slate-300"
                      dangerouslySetInnerHTML={{
                        __html: String(productDraft.pd_description ?? ""),
                      }}
                    />
                  ) : (
                    <p className="text-sm text-slate-400">No description</p>
                  )}
                </FieldShell>
              </SectionCard>

              <SectionCard title="Pricing">
                <div className="grid gap-4 sm:grid-cols-2">
                  {numberField("Retail price (SRP)", "pd_price_srp", "₱")}
                  {numberField("Dealer price", "pd_price_dp", "₱")}
                  {numberField("Member price", "pd_price_member", "₱")}
                  {numberField("Product PV", "pd_prodpv")}
                </div>
              </SectionCard>

              {!hasVariants ? (
                <SectionCard title="Inventory">
                  {numberField("Stock quantity", "pd_qty")}
                </SectionCard>
              ) : null}

              <SectionCard title="Shipping">
                <div className="grid gap-4 sm:grid-cols-2">
                  {numberField("Weight (kg)", "pd_weight")}
                  {numberField("Package weight (kg)", "pd_psweight")}
                  {numberField("Width (cm)", "pd_pswidth")}
                  {numberField("Length (cm)", "pd_pslenght")}
                  {numberField("Height (cm)", "pd_psheight")}
                </div>
              </SectionCard>

              <SectionCard title="Details">
                <div className="grid gap-4 sm:grid-cols-2">
                  {textField("Material", "pd_material")}
                  {textField("Warranty", "pd_warranty")}
                </div>
              </SectionCard>

              <SectionCard title="Merchandising">
                <div className="grid gap-2 sm:grid-cols-3">
                  {toggleField("Must-have", "pd_musthave")}
                  {toggleField("Bestseller", "pd_bestseller")}
                  {toggleField("On sale", "pd_salespromo")}
                </div>
              </SectionCard>
            </>
          ) : selectedVariant ? (
            <>
              <SectionCard title={`Variant · ${variantTitle({
                name: toStr(getVal("pv_name")),
                size: toStr(getVal("pv_size")),
                color: toStr(getVal("pv_color")),
                style: toStr(getVal("pv_style")),
              })}`}>
                {textField("Variant name", "pv_name")}
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {colorField()}
                  {textField("Size", "pv_size")}
                  {textField("Style", "pv_style")}
                </div>
              </SectionCard>

              <SectionCard title="Pricing">
                <div className="grid gap-4 sm:grid-cols-2">
                  {numberField("Retail price (SRP)", "pv_price_srp", "₱")}
                  {numberField("Dealer price", "pv_price_dp", "₱")}
                  {numberField("Member price", "pv_price_member", "₱")}
                  {numberField("PV", "pv_prodpv")}
                </div>
              </SectionCard>

              <SectionCard title="Inventory">
                {numberField("Stock quantity", "pv_qty")}
              </SectionCard>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Select a variant to edit.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
