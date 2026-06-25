"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Lock,
  Package,
  PackageSearch,
  Search,
  X,
} from "lucide-react"
import { useGetMyBrandProductsQuery } from "@/store/api/brandRequestsApi"
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

function ProductSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export default function SupplierBrandProductsPage({
  brandId,
}: {
  brandId: number
}) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isFetching, error } = useGetMyBrandProductsQuery({
    id: brandId,
    page,
    q: q || undefined,
  })

  const brand = data?.brand
  const products = data?.products ?? []
  const meta = data?.meta
  const forbidden = (error as { status?: number } | undefined)?.status === 403

  const rangeFrom = meta ? (meta.current_page - 1) * meta.per_page + 1 : 0
  const rangeTo = meta
    ? Math.min(meta.current_page * meta.per_page, meta.total)
    : 0

  // Subtle dim while paginating/searching (but not on first load — skeleton covers that).
  const busy = isFetching && !isLoading

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/supplier/brands"
          className="inline-flex items-center gap-1 rounded-md transition hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My Brands
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="truncate font-medium text-slate-700 dark:text-slate-200">
          {brand?.name ?? "…"}
        </span>
      </nav>

      {/* ── Header card ── */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-br from-white to-sky-50/60 p-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
        <div className="absolute -top-10 -right-10 hidden h-40 w-40 rounded-full bg-sky-500/10 blur-2xl sm:block" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {brand ? (
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-indigo-500 text-lg font-bold text-white shadow-sm ring-1 ring-black/5"
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
                  ? `${meta.total} of your product${meta.total === 1 ? "" : "s"} under this brand`
                  : isLoading
                    ? "Loading products…"
                    : "Your products under this brand"}
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
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-9 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
        {forbidden ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10">
              <Lock className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Access denied
            </p>
            <p className="mt-1 text-xs text-slate-400">
              This brand isn&apos;t part of your account.
            </p>
            <Link
              href="/supplier/brands"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to My Brands
            </Link>
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 6 }).map((_, i) => (
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
                : "You don't have any products under this brand yet."}
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
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 transition group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                        {p.name}
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.badge}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                        />
                        {status.label}
                      </span>
                    </div>

                    <div className="shrink-0 text-right text-sm font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                      {peso(p.price)}
                    </div>

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition group-hover:bg-sky-50 group-hover:text-sky-500 dark:group-hover:bg-sky-500/10">
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
              {meta.total}
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
    </div>
  )
}
