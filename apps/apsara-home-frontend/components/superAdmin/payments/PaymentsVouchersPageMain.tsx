"use client"

import { useMemo, useState } from "react"
import {
  useGetAdminPaymentsOverviewQuery,
  useGetAdminVoucherProductRulesQuery,
  useGetSupplierVoucherProductRulesQuery,
  useUpdateAdminVoucherProductRulesMutation,
  useUpdateSupplierVoucherProductRulesMutation,
} from "@/store/api/adminPaymentsApi"
import { useGetAdminAffiliateVouchersQuery } from "@/store/api/encashmentApi"
import { useGetProductsQuery } from "@/store/api/productsApi"
import { AnimatePresence, motion } from "framer-motion"
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
  Settings2,
  TicketPercent,
  Users,
} from "lucide-react"

import { notify } from "@/components/ui/DynamicNotify/DynamicNotify"

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value || 0)

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "N/A"
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

const getStatusStyles = (status: string) => {
  const normalized = String(status).toLowerCase()
  if (normalized === "active")
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-400",
    }
  if (normalized === "redeemed")
    return { badge: "border-sky-200 bg-sky-50 text-sky-700", dot: "bg-sky-400" }
  if (normalized === "expired")
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      dot: "bg-amber-400",
    }
  return {
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
  }
}

const colorGradients = [
  "from-orange-400 to-orange-600",
  "from-emerald-400 to-emerald-600",
  "from-red-400 to-red-600",
  "from-purple-500 to-purple-700",
  "from-blue-500 to-blue-700",
  "from-teal-400 to-teal-600",
]

const getGradientColor = (id: number | string) => {
  const index = String(id).charCodeAt(0) % colorGradients.length
  return colorGradients[index]
}

type VoucherAdminView = "vouchers" | "rules"
type VoucherStatusFilter = "all" | "active" | "redeemed" | "expired"

export default function PaymentsVouchersPageMain({
  scope = "admin",
}: {
  scope?: "admin" | "supplier"
}) {
  const isSupplierScope = scope === "supplier"
  const [activeView, setActiveView] = useState<VoucherAdminView>(
    isSupplierScope ? "rules" : "vouchers"
  )
  const [search, setSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<VoucherStatusFilter>("all")
  const [page, setPage] = useState(1)
  const [rulesPage, setRulesPage] = useState(1)
  const [draftRules, setDraftRules] = useState<
    Record<number, { enabled: boolean; maxDiscount: string; minSpend: string }>
  >({})

  const {
    data: vouchersData,
    isLoading: vouchersLoading,
    isFetching: vouchersFetching,
    isError: vouchersError,
  } = useGetAdminAffiliateVouchersQuery(
    {
      page,
      per_page: 12,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.trim() || undefined,
    },
    {
      skip: isSupplierScope,
    }
  )

  const {
    data: productsData,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError: productsError,
  } = useGetProductsQuery(
    {
      page: rulesPage,
      perPage: 10,
      search: productSearch.trim() || undefined,
      status: "1",
      sort: "id_desc",
    },
    {
      skip: activeView !== "rules",
      refetchOnMountOrArgChange: true,
    }
  )
  const { data: adminRulesData } = useGetAdminVoucherProductRulesQuery(
    undefined,
    { skip: isSupplierScope }
  )
  const { data: supplierRulesData } = useGetSupplierVoucherProductRulesQuery(
    undefined,
    { skip: !isSupplierScope }
  )
  const savedRulesData = isSupplierScope ? supplierRulesData : adminRulesData
  const [updateVoucherProductRules, { isLoading: savingRules }] =
    useUpdateAdminVoucherProductRulesMutation()
  const [
    updateSupplierVoucherProductRules,
    { isLoading: savingSupplierRules },
  ] = useUpdateSupplierVoucherProductRulesMutation()
  const isSavingRules = isSupplierScope ? savingSupplierRules : savingRules

  // Keep existing query (payments overview) for parity if it is used elsewhere.
  // But this page only renders vouchers, so we don't depend on paymentsData.
  const {
    isLoading: paymentsLoading,
    isFetching: paymentsFetching,
    isError: paymentsError,
  } = useGetAdminPaymentsOverviewQuery(undefined, { skip: isSupplierScope })

  const isLoading =
    activeView === "vouchers"
      ? !isSupplierScope && (paymentsLoading || vouchersLoading)
      : productsLoading
  const isFetching =
    activeView === "vouchers"
      ? !isSupplierScope && (paymentsFetching || vouchersFetching)
      : productsFetching
  const isError =
    activeView === "vouchers"
      ? !isSupplierScope && (paymentsError || vouchersError)
      : productsError
  const hasDraftRuleChanges = Object.keys(draftRules).length > 0
  const visibleVouchers = vouchersData?.data ?? []
  const voucherTotal = vouchersData?.meta?.total ?? 0
  const activeVoucherCount = visibleVouchers.filter(
    (voucher) => voucher.status === "active"
  ).length
  const redeemedVoucherCount = visibleVouchers.filter(
    (voucher) => voucher.status === "redeemed"
  ).length
  const visibleVoucherValue = visibleVouchers.reduce(
    (total, voucher) => total + Number(voucher.amount ?? 0),
    0
  )
  const savedRulesMap = useMemo(
    () =>
      (savedRulesData?.rules ?? []).reduce<
        Record<
          number,
          { enabled: boolean; maxDiscount: string; minSpend: string }
        >
      >((acc, rule) => {
        acc[rule.product_id] = {
          enabled: Boolean(rule.enabled),
          maxDiscount:
            rule.max_discount != null ? String(rule.max_discount) : "",
          minSpend: rule.min_spend != null ? String(rule.min_spend) : "",
        }
        return acc
      }, {}),
    [savedRulesData?.rules]
  )
  const visibleProductCount = productsData?.meta?.total ?? 0
  const savedRuleCount = savedRulesData?.rules?.length ?? 0
  const enabledRuleCount = (savedRulesData?.rules ?? []).filter(
    (rule) => rule.enabled
  ).length
  const headerStats = isSupplierScope
    ? [
        {
          label: "Products",
          value: visibleProductCount.toLocaleString("en-PH"),
          Icon: ClipboardList,
          tone: "text-sky-600 bg-sky-50 border-sky-100 dark:bg-sky-950/30 dark:border-sky-900/50 dark:text-sky-300",
        },
        {
          label: "Allowed",
          value: enabledRuleCount.toLocaleString("en-PH"),
          Icon: CheckCircle2,
          tone: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300",
        },
        {
          label: "Saved Rules",
          value: savedRuleCount.toLocaleString("en-PH"),
          Icon: Settings2,
          tone: "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-300",
        },
        {
          label: "Mode",
          value: "Supplier",
          Icon: TicketPercent,
          tone: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300",
        },
      ]
    : [
        {
          label: "Total",
          value: voucherTotal.toLocaleString("en-PH"),
          Icon: ClipboardList,
          tone: "text-sky-600 bg-sky-50 border-sky-100 dark:bg-sky-950/30 dark:border-sky-900/50 dark:text-sky-300",
        },
        {
          label: "Active",
          value: activeVoucherCount.toLocaleString("en-PH"),
          Icon: CheckCircle2,
          tone: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300",
        },
        {
          label: "Redeemed",
          value: redeemedVoucherCount.toLocaleString("en-PH"),
          Icon: Users,
          tone: "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-300",
        },
        {
          label: "Visible Value",
          value: formatMoney(visibleVoucherValue),
          Icon: TicketPercent,
          tone: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300",
        },
      ]

  const updateDraftRule = (
    productId: number,
    patch: Partial<{ enabled: boolean; maxDiscount: string; minSpend: string }>
  ) => {
    setDraftRules((prev) => {
      const current = prev[productId] ??
        savedRulesMap[productId] ?? {
          enabled: false,
          maxDiscount: "",
          minSpend: "",
        }
      return { ...prev, [productId]: { ...current, ...patch } }
    })
  }

  const saveDraftRules = async () => {
    const rules = Object.entries(draftRules).map(([productId, rule]) => ({
      product_id: Number(productId),
      enabled: rule.enabled,
      max_discount:
        rule.maxDiscount.trim() === "" ? null : Number(rule.maxDiscount),
      min_spend: rule.minSpend.trim() === "" ? null : Number(rule.minSpend),
    }))

    try {
      const response = await (isSupplierScope
        ? updateSupplierVoucherProductRules({ rules }).unwrap()
        : updateVoucherProductRules({ rules }).unwrap())
      setDraftRules({})
      notify.success(response.message || "Voucher product rules saved.")
    } catch (error) {
      const apiError = error as { data?: { message?: string } }
      notify.error("Failed to save voucher product rules.", {
        description: apiError?.data?.message || "Please try again.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-sky-500" />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-bold tracking-wider text-sky-700 uppercase dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
                <TicketPercent className="h-3.5 w-3.5" />
                {isSupplierScope ? "Supplier / Vouchers" : "Admin / Vouchers"}
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {isSupplierScope ? "Voucher Eligibility" : "Voucher Management"}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {isSupplierScope
                  ? "Set which of your products can accept affiliate-created voucher and E-GC discounts at checkout."
                  : "Review member-created voucher codes, monitor usage, and control product eligibility for checkout discounts."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[560px]">
              {headerStats.map(({ label, value, Icon, tone }) => (
                <div
                  key={label}
                  className={`rounded-xl border px-3 py-2.5 ${tone}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">
                      {label}
                    </span>
                    <Icon className="h-4 w-4 shrink-0" />
                  </div>
                  <p className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {isFetching ? <div className="google-loading-bar" /> : null}

      {!isSupplierScope ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveView("vouchers")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeView === "vouchers"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <TicketPercent className="h-4 w-4" />
              Created Vouchers
            </button>
            <button
              type="button"
              onClick={() => setActiveView("rules")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeView === "rules"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <Settings2 className="h-4 w-4" />
              Product Eligibility
            </button>
          </div>
        </div>
      ) : null}

      {activeView === "rules" ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="rounded-2xl border border-gray-200/70 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Product Voucher Rules
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {isSupplierScope
                    ? "Manage voucher eligibility for products assigned to your supplier account."
                    : "Draft list ng products kung saan puwedeng gamitin ang affiliate-created voucher."}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row md:max-w-xl">
                <div className="relative flex-1">
                  <svg
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
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
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      setRulesPage(1)
                    }}
                    placeholder="Search product..."
                    className="w-full rounded-lg border border-gray-200/80 bg-gray-50/80 py-2.5 pr-4 pl-10 text-sm text-gray-800 placeholder-gray-400 transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/30 focus:outline-none dark:border-gray-800 dark:bg-gray-800/70 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-sky-400/50 dark:focus:ring-sky-400/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveDraftRules}
                  disabled={isSavingRules || !hasDraftRuleChanges}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold shadow-sm transition ${
                    hasDraftRuleChanges
                      ? "bg-sky-500 text-white hover:bg-sky-600"
                      : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {isSavingRules ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    "Save Rules"
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200/70 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[minmax(280px,1.4fr)_120px_180px_180px] gap-4 border-b border-gray-200/70 bg-gray-50 px-5 py-3 text-[11px] font-bold tracking-wide text-gray-500 uppercase dark:border-gray-800 dark:bg-gray-800/70 dark:text-gray-400">
                <div>Product</div>
                <div className="text-center">Allow</div>
                <div>Max Discount</div>
                <div>Min Spend</div>
              </div>

              {isError ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    Failed to load products
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Please refresh or try another search.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="divide-y divide-gray-200/70 dark:divide-gray-800">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(280px,1.4fr)_120px_180px_180px] gap-4 px-5 py-4"
                    >
                      <div className="space-y-2">
                        <div className="h-4 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-3 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                      </div>
                      <div className="mx-auto h-8 w-14 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                      <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                      <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                    </div>
                  ))}
                </div>
              ) : productsData?.products && productsData.products.length > 0 ? (
                <div className="divide-y divide-gray-200/70 dark:divide-gray-800">
                  {productsData.products.map((product) => {
                    const rule = draftRules[product.id] ??
                      savedRulesMap[product.id] ?? {
                        enabled: false,
                        maxDiscount: "",
                        minSpend: "",
                      }
                    const srp = Number(product.priceSrp ?? 0)
                    const dealer = Number(product.priceDp ?? 0)
                    const margin = Math.max(0, srp - dealer)

                    return (
                      <div
                        key={product.id}
                        className="grid grid-cols-[minmax(280px,1.4fr)_120px_180px_180px] gap-4 px-5 py-4 transition hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            SRP {formatMoney(srp)} | Dealer{" "}
                            {formatMoney(dealer)} | Margin {formatMoney(margin)}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                            SKU: {product.sku || "N/A"}
                          </p>
                        </div>

                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateDraftRule(product.id, {
                                enabled: !rule.enabled,
                              })
                            }
                            className={`relative h-8 w-14 rounded-full transition ${
                              rule.enabled
                                ? "bg-emerald-500"
                                : "bg-gray-300 dark:bg-gray-700"
                            }`}
                            aria-pressed={rule.enabled}
                          >
                            <span
                              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                                rule.enabled ? "left-7" : "left-1"
                              }`}
                            />
                          </button>
                        </div>

                        <div>
                          <input
                            type="number"
                            min="0"
                            max={margin || undefined}
                            value={rule.maxDiscount}
                            onChange={(e) =>
                              updateDraftRule(product.id, {
                                maxDiscount: e.target.value,
                              })
                            }
                            disabled={!rule.enabled}
                            placeholder={
                              margin > 0 ? String(margin.toFixed(2)) : "0.00"
                            }
                            className="w-full rounded-lg border border-gray-200/80 bg-gray-50/80 px-3 py-2.5 text-sm text-gray-800 transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45 dark:border-gray-800 dark:bg-gray-800/70 dark:text-gray-100"
                          />
                          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                            Cap per order
                          </p>
                        </div>

                        <div>
                          <input
                            type="number"
                            min="0"
                            value={rule.minSpend}
                            onChange={(e) =>
                              updateDraftRule(product.id, {
                                minSpend: e.target.value,
                              })
                            }
                            disabled={!rule.enabled}
                            placeholder={
                              srp > 0 ? String(srp.toFixed(2)) : "0.00"
                            }
                            className="w-full rounded-lg border border-gray-200/80 bg-gray-50/80 px-3 py-2.5 text-sm text-gray-800 transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45 dark:border-gray-800 dark:bg-gray-800/70 dark:text-gray-100"
                          />
                          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                            Optional checkout floor
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    No products found
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Try another product search.
                  </p>
                </div>
              )}
            </div>
          </div>

          {productsData?.meta && productsData.meta.last_page > 1 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <span>Page</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {productsData.meta.current_page}
                </span>
                <span>of</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {productsData.meta.last_page}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRulesPage((current) => Math.max(1, current - 1))
                  }
                  disabled={rulesPage <= 1}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setRulesPage((current) => current + 1)}
                  disabled={rulesPage >= productsData.meta.last_page}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          Failed to load vouchers.
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                {/* Search */}
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search code, username, or email..."
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 py-2.5 pr-4 pl-10 text-sm text-slate-800 placeholder-slate-400 transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/25 focus:outline-none dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400/50"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as VoucherStatusFilter)
                      setPage(1)
                    }}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/25 focus:outline-none dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100 dark:focus:border-sky-400/50"
                  >
                    <option value="all">All Vouchers</option>
                    <option value="active">Active</option>
                    <option value="redeemed">Redeemed</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <ClipboardList className="h-3.5 w-3.5" />
                <span>
                  Showing{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {vouchersData?.data?.length ?? 0}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {voucherTotal}
                  </span>
                </span>
              </div>
            </div>
          </motion.div>

          {/* Voucher cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-56 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
                  <div className="h-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
                </div>
              ))}
            </div>
          ) : vouchersData?.data && vouchersData.data.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AnimatePresence>
                {vouchersData.data.map((voucher) => {
                  const statusStyles = getStatusStyles(voucher.status)
                  const gradient = getGradientColor(voucher.id)

                  return (
                    <motion.div
                      key={voucher.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group"
                    >
                      {/* Card */}
                      <div
                        className={`relative bg-gradient-to-br ${gradient} overflow-hidden rounded-2xl p-4 text-white shadow-lg transition-shadow hover:shadow-xl`}
                        style={{
                          clipPath:
                            "polygon(0 0, 100% 0, 100% calc(100% - 10px), 98% calc(100% - 5px), 96% calc(100% - 10px), 94% calc(100% - 5px), 92% calc(100% - 10px), 90% calc(100% - 5px), 88% calc(100% - 10px), 86% calc(100% - 5px), 84% calc(100% - 10px), 82% calc(100% - 5px), 80% calc(100% - 10px), 78% calc(100% - 5px), 76% calc(100% - 10px), 74% calc(100% - 5px), 72% calc(100% - 10px), 70% calc(100% - 5px), 68% calc(100% - 10px), 66% calc(100% - 5px), 64% calc(100% - 10px), 62% calc(100% - 5px), 60% calc(100% - 10px), 58% calc(100% - 5px), 56% calc(100% - 10px), 54% calc(100% - 5px), 52% calc(100% - 10px), 50% calc(100% - 5px), 48% calc(100% - 10px), 46% calc(100% - 5px), 44% calc(100% - 10px), 42% calc(100% - 5px), 40% calc(100% - 10px), 38% calc(100% - 5px), 36% calc(100% - 10px), 34% calc(100% - 5px), 32% calc(100% - 10px), 30% calc(100% - 5px), 28% calc(100% - 10px), 26% calc(100% - 5px), 24% calc(100% - 10px), 22% calc(100% - 5px), 20% calc(100% - 10px), 18% calc(100% - 5px), 16% calc(100% - 10px), 14% calc(100% - 5px), 12% calc(100% - 10px), 10% calc(100% - 5px), 8% calc(100% - 10px), 6% calc(100% - 5px), 4% calc(100% - 10px), 2% calc(100% - 5px), 0 calc(100% - 10px))",
                        }}
                      >
                        {/* Header */}
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase opacity-90">
                              <TicketPercent className="h-3.5 w-3.5" />
                              Voucher
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold capitalize backdrop-blur-sm`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`}
                            />
                            {voucher.status}
                          </span>
                        </div>

                        {/* Amount Display */}
                        <div className="mb-3 flex items-baseline gap-1">
                          <span className="text-3xl font-black sm:text-4xl">
                            PHP{" "}
                            {(voucher.amount || 0).toLocaleString("en-PH", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          <span className="text-sm font-bold opacity-90">
                            OFF
                          </span>
                        </div>

                        {/* Code */}
                        <div className="mb-3 font-mono text-xs font-bold tracking-wider opacity-95">
                          {voucher.code}
                        </div>

                        {/* Bottom info */}
                        <div className="flex items-end justify-between border-t border-white/20 pt-2">
                          <div>
                            <p className="text-[8px] font-semibold uppercase opacity-75">
                              Uses
                            </p>
                            <p className="text-xs font-bold">
                              {voucher.max_uses
                                ? `${voucher.used_count ?? 0} / ${voucher.max_uses}`
                                : "Unlimited"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Creator Info Below Card */}
                      <div className="mt-3 rounded-xl border border-gray-200/70 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Left: Creator Info */}
                          <div>
                            <p className="mb-1 text-[10px] font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                              Creator
                            </p>
                            <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                              {voucher.customer.name}
                            </p>
                            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                              @{voucher.customer.username}
                            </p>
                            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                              {voucher.customer.email}
                            </p>
                          </div>

                          {/* Right: Dates */}
                          <div>
                            <p className="mb-1 text-[10px] font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                              Dates
                            </p>
                            <div className="space-y-1 text-[10px] text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <CalendarClock className="h-3 w-3" />
                                <span>
                                  {formatDateTime(voucher.created_at)}
                                </span>
                              </div>
                              {voucher.expires_at ? (
                                <div className="flex items-center gap-1">
                                  <CalendarClock className="h-3 w-3" />
                                  <span>
                                    {formatDateTime(voucher.expires_at)}
                                  </span>
                                </div>
                              ) : null}
                              {voucher.redeemed_at ? (
                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>
                                    {formatDateTime(voucher.redeemed_at)}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200/70 bg-gray-50/80 p-10 text-center sm:p-14 dark:border-gray-800 dark:bg-gray-900">
              <TicketPercent className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                No vouchers found
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter
              </p>
            </div>
          )}

          {/* Pagination */}
          {vouchersData?.meta && vouchersData.meta.last_page > 1 ? (
            <div className="mt-6 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <span>Page</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {vouchersData.meta.current_page}
                  </span>
                  <span>of</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {vouchersData.meta.last_page}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= vouchersData.meta.last_page}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
