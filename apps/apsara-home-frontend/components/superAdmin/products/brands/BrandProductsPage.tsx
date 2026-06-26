"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Package,
  PackageSearch,
  Search,
  X,
  ZoomIn,
} from "lucide-react"
import {
  useGetBrandProductsQuery,
  type BrandProduct,
} from "@/store/api/productBrandsApi"
import { buildStorefrontProductPath } from "@/libs/storefrontRouting"

const peso = (n?: number | null) =>
  n != null ? `₱${n.toLocaleString("en-PH")}` : "—"

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?"

// Product status: 1/2 = Active, 3 = Pending, otherwise Inactive (see ProductsTable).
const productStatus = (status: number) => {
  if (status === 1 || status === 2)
    return {
      label: "Active",
      badge:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
      dot: "bg-emerald-500",
    }
  if (status === 3)
    return {
      label: "Pending",
      badge:
        "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
      dot: "bg-amber-500",
    }
  return {
    label: "Inactive",
    badge:
      "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
    dot: "bg-slate-400",
  }
}

type Preview = { src: string; name: string; top: number; left: number }
const PREVIEW_W = 256
const PREVIEW_H = 300

function ProductSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export default function BrandProductsPage({ brandId }: { brandId: number }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  // Dismiss the floating preview while the page scrolls.
  useEffect(() => {
    if (!preview) return
    const hide = () => setPreview(null)
    window.addEventListener("scroll", hide, true)
    return () => window.removeEventListener("scroll", hide, true)
  }, [preview])

  const { data, isLoading, isFetching } = useGetBrandProductsQuery({
    id: brandId,
    page,
    q: q || undefined,
  })

  const brand = data?.brand
  const products = data?.products ?? []
  const meta = data?.meta

  const rangeFrom = meta ? (meta.current_page - 1) * meta.per_page + 1 : 0
  const rangeTo = meta
    ? Math.min(meta.current_page * meta.per_page, meta.total)
    : 0
  const busy = isFetching && !isLoading

  // Anchor the hover preview to the thumbnail, flipping/clamping to stay on screen.
  const showPreview = (
    e: React.MouseEvent<HTMLElement>,
    product: BrandProduct
  ) => {
    if (!product.image) return
    const r = e.currentTarget.getBoundingClientRect()
    const m = 12
    let left = r.right + m
    if (left + PREVIEW_W + m > window.innerWidth) left = r.left - PREVIEW_W - m
    left = Math.max(m, left)
    let top = r.top + r.height / 2 - PREVIEW_H / 2
    top = Math.max(m, Math.min(top, window.innerHeight - PREVIEW_H - m))
    setPreview({ src: product.image, name: product.name, top, left })
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/admin/products/brands"
          className="inline-flex items-center gap-1 rounded-md transition hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Brands
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="truncate font-medium text-slate-700 dark:text-slate-200">
          {brand?.name ?? "…"}
        </span>
      </nav>

      {/* ── Header card ── */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-teal-500/10 via-sky-500/10 to-emerald-500/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {brand ? (
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-teal-500 to-emerald-500 text-lg font-bold text-white shadow-sm ring-1 ring-black/5"
                aria-hidden
              >
                {initials(brand.name)}
              </span>
            ) : (
              <span className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {brand?.name ?? "Brand"}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {meta
                  ? `${meta.total.toLocaleString()} product${meta.total === 1 ? "" : "s"} under this brand`
                  : isLoading
                    ? "Loading products…"
                    : "Products under this brand"}
              </p>
            </div>
          </div>

          {/* ── Search ── */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-9 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <div className="absolute top-1/2 right-2.5 -translate-y-1/2">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* ── Product list ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <PackageSearch className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {q ? "No matching products" : "No products yet"}
            </p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              {q
                ? `Nothing matched “${q}”. Try a different search term.`
                : "There are no products under this brand."}
            </p>
            {q ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <ul
            aria-busy={busy}
            className={`divide-y divide-slate-100 transition-opacity dark:divide-slate-800 ${
              busy ? "opacity-60" : "opacity-100"
            }`}
          >
            {products.map((p) => {
              const status = productStatus(p.status)
              return (
                <li key={p.id}>
                  <a
                    href={buildStorefrontProductPath(p.name, p.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 p-4 transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/40 dark:focus-visible:bg-slate-800/40"
                  >
                    {/* Thumbnail with instant hover preview */}
                    <div
                      onMouseEnter={(e) => showPreview(e, p)}
                      onMouseLeave={() => setPreview(null)}
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 transition dark:bg-slate-800 dark:ring-slate-700 ${
                        p.image
                          ? "cursor-zoom-in group-hover:ring-teal-300"
                          : ""
                      }`}
                    >
                      {p.image ? (
                        <>
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                            <ZoomIn className="h-4 w-4" />
                          </span>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 transition group-hover:text-teal-600 dark:text-slate-100 dark:group-hover:text-teal-400">
                        {p.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {p.supplier_name ?? "—"}
                      </p>
                    </div>

                    <span
                      className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:inline-flex ${status.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>

                    <div className="shrink-0 text-right text-sm font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                      {peso(p.price)}
                    </div>

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition group-hover:bg-teal-50 group-hover:text-teal-500 dark:group-hover:bg-teal-500/10">
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Pagination ── */}
      {meta && meta.last_page > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {rangeFrom}–{rangeTo}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {meta.total.toLocaleString()}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 tabular-nums dark:bg-slate-800 dark:text-slate-300">
              {meta.current_page} / {meta.last_page}
            </span>
            <button
              type="button"
              disabled={page >= meta.last_page || isFetching}
              onClick={() => setPage((prev) => prev + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Floating hover image preview (portaled, never clipped) ── */}
      {preview
        ? createPortal(
            <div
              aria-hidden
              style={{ top: preview.top, left: preview.left, width: PREVIEW_W }}
              className="pointer-events-none fixed z-[999] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                <Image
                  src={preview.src}
                  alt={preview.name}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
              <p className="mt-2 truncate px-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                {preview.name}
              </p>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
