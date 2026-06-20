"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useGetMyBrandProductsQuery } from "@/store/api/brandRequestsApi"
import { buildStorefrontProductPath } from "@/libs/storefrontRouting"

export default function SupplierBrandProductsPage({
  brandId,
}: {
  brandId: number
}) {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState("")
  const { data, isLoading, isFetching, error } = useGetMyBrandProductsQuery({
    id: brandId,
    page,
    q: q.trim() || undefined,
  })

  const brand = data?.brand
  const products = data?.products ?? []
  const meta = data?.meta
  const forbidden = (error as { status?: number } | undefined)?.status === 403

  const peso = (n?: number | null) =>
    n != null ? `₱${n.toLocaleString()}` : "—"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/supplier/brands"
          className="hover:text-slate-700 dark:hover:text-slate-200"
        >
          My Brands
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {brand?.name ?? "…"}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {brand?.name ?? "Brand"} — Your Products
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {meta
              ? `${meta.total} of your product${meta.total === 1 ? "" : "s"} under this brand`
              : "Loading…"}
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          placeholder="Search products…"
          className="w-full max-w-xs rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {forbidden ? (
          <p className="p-6 text-sm text-rose-500">
            This brand isn&apos;t part of your account.
          </p>
        ) : isLoading ? (
          <p className="p-6 text-sm text-slate-400">Loading…</p>
        ) : products.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            You have no products{q ? ` matching “${q}”` : ""} under this brand
            yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.map((p) => (
              <li key={p.id}>
                <a
                  href={buildStorefrontProductPath(p.name, p.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-slate-400">
                        No Img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                      {p.name}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {peso(p.price)}
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-sky-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M14 5h5v5m0-5L10 14M9 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-3"
                    />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {meta && meta.last_page > 1 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <button
            type="button"
            disabled={page >= meta.last_page || isFetching}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
