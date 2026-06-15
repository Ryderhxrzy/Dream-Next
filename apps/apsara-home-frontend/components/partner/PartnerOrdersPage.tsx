"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import {
  ShoppingBag,
  BarChart2,
  AlignLeft,
  Tag,
  RotateCcw,
  Filter,
  ChevronDown,
} from "lucide-react"
import { getPartnerStorefrontConfig } from "@/libs/partnerStorefront"
import { useGetAdminMeQuery } from "@/store/api/authApi"
import { useGetPartnerStorefrontOrdersQuery } from "@/store/api/adminOrdersApi"
import { useGetAdminWebPageItemsQuery } from "@/store/api/webPagesApi"
import { useGetCategoriesQuery } from "@/store/api/categoriesApi"

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
})

const dateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

const statusClass = (status?: string | null) => {
  const normalized = String(status ?? "").toLowerCase()
  if (normalized === "delivered")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
  if (normalized === "cancelled" || normalized === "rejected")
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
  if (normalized === "pending" || normalized === "pending_approval")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
}

const extractErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== "object") return "Unknown error."
  const e = error as {
    status?: number | string
    data?: { message?: string; error?: string }
    error?: string
  }
  const message = e.data?.message || e.data?.error || e.error
  if (message && String(message).trim() !== "") {
    return e.status !== undefined
      ? `${e.status}: ${String(message)}`
      : String(message)
  }
  return e.status !== undefined
    ? `${e.status}: Request failed.`
    : "Request failed."
}

function EmptyOrdersIllustration() {
  return (
    <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
      {/* sparkle dots */}
      <span className="absolute left-0 top-4 text-teal-300 text-lg select-none">
        +
      </span>
      <span className="absolute right-1 top-2 text-teal-200 text-sm select-none">
        +
      </span>
      <span className="absolute left-3 bottom-2 text-teal-200 text-xs select-none">
        ✦
      </span>
      <span className="absolute right-2 bottom-4 text-teal-300 text-xs select-none">
        ✦
      </span>
      {/* circle bg */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 shadow-inner">
        {/* document + search SVG */}
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          {/* document */}
          <rect
            x="6"
            y="4"
            width="28"
            height="36"
            rx="4"
            fill="#ccfbf1"
            stroke="#5eead4"
            strokeWidth="1.5"
          />
          <line
            x1="13"
            y1="14"
            x2="27"
            y2="14"
            stroke="#14b8a6"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="13"
            y1="20"
            x2="27"
            y2="20"
            stroke="#14b8a6"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="13"
            y1="26"
            x2="21"
            y2="26"
            stroke="#14b8a6"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* magnifying glass */}
          <circle
            cx="36"
            cy="36"
            r="10"
            fill="white"
            stroke="#5eead4"
            strokeWidth="1.5"
          />
          <circle cx="35" cy="35" r="5.5" stroke="#0d9488" strokeWidth="2" />
          <line
            x1="39"
            y1="39"
            x2="44"
            y2="44"
            stroke="#0d9488"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

export default function PartnerOrdersPage() {
  const { data: me, isLoading: isMeLoading } = useGetAdminMeQuery()

  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const storefrontIds = useMemo(
    () => me?.storefront_ids ?? [],
    [me?.storefront_ids]
  )

  const { data: storefrontItems, isLoading: isStorefrontLoading } =
    useGetAdminWebPageItemsQuery(
      { type: "partner-storefront", page: 1, perPage: 100, status: "all" },
      { skip: storefrontIds.length === 0 }
    )
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
    error,
  } = useGetPartnerStorefrontOrdersQuery({
    filter: "all",
    page: 1,
    perPage: 25,
  })

  const storefrontNameBySlug = useMemo(() => {
    const entries = (storefrontItems?.items ?? [])
      .filter((item) => storefrontIds.includes(item.id))
      .map((item) => {
        const config = getPartnerStorefrontConfig(item)
        if (!config) return null
        return [config.slug, config.displayName] as const
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry))
    return Object.fromEntries(entries)
  }, [storefrontIds, storefrontItems?.items])

  const allowedCategoryIds = useMemo(() => {
    const allowed = new Set<number>()
    if (!storefrontItems?.items || storefrontIds.length === 0) return []
    for (const item of storefrontItems.items) {
      if (!storefrontIds.includes(item.id)) continue
      const config = getPartnerStorefrontConfig(item)
      for (const catId of config?.allowedCategoryIds ?? []) {
        if (Number.isFinite(catId) && catId > 0) allowed.add(catId)
      }
    }
    return Array.from(allowed.values()).sort((a, b) => a - b)
  }, [storefrontIds, storefrontItems?.items])

  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useGetCategoriesQuery(
      { page: 1, per_page: 500, used_only: true },
      { skip: allowedCategoryIds.length === 0 }
    )

  const allowedCategories = useMemo(() => {
    const all = categoriesData?.categories ?? []
    const allowed = new Set(allowedCategoryIds)
    return all.filter((c) => allowed.has(c.id))
  }, [categoriesData?.categories, allowedCategoryIds])

  const partnerOrders = useMemo(() => {
    return (ordersData?.orders ?? []).filter((order) => {
      if (statusFilter !== "all") {
        const fulfillmentStatus = String(order.fulfillment_status ?? "")
          .trim()
          .toLowerCase()
        if (fulfillmentStatus !== statusFilter.trim().toLowerCase())
          return false
      }
      if (categoryFilter !== "all") {
        const selectedCategoryId = Number(categoryFilter)
        const orderCategoryId = Number(order.product_category_id ?? 0)
        if (!Number.isFinite(selectedCategoryId) || selectedCategoryId <= 0)
          return false
        if (!Number.isFinite(orderCategoryId) || orderCategoryId <= 0)
          return false
        if (selectedCategoryId !== orderCategoryId) return false
      }
      return true
    })
  }, [ordersData?.orders, statusFilter, categoryFilter])

  const loading =
    isMeLoading || isStorefrontLoading || isOrdersLoading || isCategoriesLoading
  const ordersErrorMessage = useMemo(() => extractErrorMessage(error), [error])

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      { value: "pending", label: "Pending" },
      { value: "processing", label: "Processing" },
      { value: "packed", label: "Packed" },
      { value: "shipped", label: "Shipped" },
      { value: "out_for_delivery", label: "Out for delivery" },
      { value: "delivered", label: "Delivered" },
      { value: "cancelled", label: "Cancelled" },
      { value: "refunded", label: "Refunded" },
    ],
    []
  )

  const categoryOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [
      { value: "all", label: "All categories" },
    ]
    for (const c of allowedCategories)
      options.push({ value: String(c.id), label: c.name })
    return options
  }, [allowedCategories])

  const resetFilters = () => {
    setStatusFilter("all")
    setCategoryFilter("all")
  }
  const filtersActive = statusFilter !== "all" || categoryFilter !== "all"

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="space-y-4">
      {/* ── Header card ── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute inset-0 bg-linear-to-br from-teal-50 via-emerald-50/40 to-indigo-50/60 dark:from-teal-900/20 dark:via-emerald-900/10 dark:to-indigo-900/20" />
        <div className="relative flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-100/80 shadow-sm dark:bg-teal-900/40">
              <ShoppingBag className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Partner Orders
              </h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Orders placed from your assigned storefronts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:self-auto">
            <BarChart2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isOrdersFetching && !loading ? "…" : partnerOrders.length} shown
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter card ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
          {/* Status */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Status
            </label>
            <div className="relative">
              <AlignLeft className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Category
            </label>
            <div className="relative">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                disabled={loading || allowedCategoryIds.length === 0}
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Reset */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={resetFilters}
              disabled={loading && !filtersActive}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-teal-500 to-emerald-500 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-200/60 transition hover:from-teal-600 hover:to-emerald-600 disabled:opacity-60 dark:shadow-teal-900/30"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
              Use dropdowns to refine results
            </p>
          </div>
        </div>
      </div>

      {/* ── Orders panel ── */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 p-8 text-sm text-slate-500 dark:text-slate-400">
            <svg
              className="h-4 w-4 animate-spin text-teal-500"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Loading orders…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="space-y-1 p-8 text-sm text-rose-600 dark:text-rose-300">
            <p className="font-semibold">Failed to load orders.</p>
            <p className="text-xs opacity-80">{ordersErrorMessage}</p>
          </div>
        )}

        {/* No storefront */}
        {!loading && !error && storefrontIds.length === 0 && (
          <div className="py-16 text-center">
            <EmptyOrdersIllustration />
            <p className="mt-5 text-base font-bold text-slate-800 dark:text-slate-100">
              No storefront assigned.
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Contact your admin to get a storefront assigned to your account.
            </p>
          </div>
        )}

        {/* No matching orders */}
        {!loading &&
          !error &&
          storefrontIds.length > 0 &&
          partnerOrders.length === 0 && (
            <div className="py-16 text-center">
              <EmptyOrdersIllustration />
              <p className="mt-5 text-base font-bold text-slate-800 dark:text-slate-100">
                No orders match your current filters.
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try adjusting your filters or reset to see more results.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-teal-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-800 dark:text-teal-400"
              >
                <Filter className="h-3.5 w-3.5" />
                Clear all filters
              </button>
            </div>
          )}

        {/* Table */}
        {!loading && !error && partnerOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  {[
                    "Order",
                    "Storefront",
                    "Customer",
                    "Product",
                    "Amount",
                    "Payment",
                    "Status",
                    "Date",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {partnerOrders.map((order) => {
                  const sourceSlug = String(order.source_slug ?? "")
                    .trim()
                    .toLowerCase()
                  const storefrontName =
                    storefrontNameBySlug[sourceSlug] ||
                    order.source_label ||
                    sourceSlug ||
                    "-"
                  return (
                    <tr
                      key={order.id}
                      className="align-top transition hover:bg-teal-50/30 dark:hover:bg-teal-900/10"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          #{order.id}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {order.checkout_id}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {storefrontName}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {order.customer_name || "-"}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex max-w-xs gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                            {order.product_image ? (
                              <Image
                                src={order.product_image}
                                alt={order.product_name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                N/A
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                              {order.product_name}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {order.product_sku && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  SKU: {order.product_sku}
                                </span>
                              )}
                              {order.selected_type && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {order.selected_type}
                                </span>
                              )}
                              {order.selected_color && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {order.selected_color}
                                </span>
                              )}
                              {order.selected_size && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {order.selected_size}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                              Qty: {order.quantity} · Unit:{" "}
                              {money.format(
                                Number(order.amount ?? 0) /
                                  Math.max(1, Number(order.quantity ?? 1))
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {money.format(Number(order.amount ?? 0))}
                      </td>

                      <td className="px-4 py-3">
                        {order.payment_method ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {String(order.payment_method).replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(order.fulfillment_status)}`}
                        >
                          {String(order.fulfillment_status ?? "-").replace(
                            /_/g,
                            " "
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {order.created_at
                          ? dateTime.format(new Date(order.created_at))
                          : "-"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
