"use client"

import { useMemo, useState } from "react"
import {
  useCreateAffiliateVoucherMutation,
  useGetWalletOverviewQuery,
  WalletTypeFilter,
} from "@/store/api/encashmentApi"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  Gift,
  Network,
  Sparkles,
  TicketPercent,
  Zap,
} from "lucide-react"

import DownlineActivityTab from "./DownlineActivityTab"
import NetworkEarningsTab from "./NetworkEarningsTab"
import PerformanceTab from "./PerformanceTab"
import PvWalletTab from "./PvWalletTab"
import RewardsWalletTab from "./RewardsWalletTab"

const peso = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value || 0)

const numberFmt = (value: number) =>
  new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(
    value || 0
  )

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Human-friendly labels for the raw `wl_source_type` values stored in the DB.
const LEDGER_SOURCE_LABELS: Record<string, string> = {
  order: "Order Purchase",
  checkout_egc: "AF-GC Used at Checkout",
  referral_earning: "Referral Earning",
  group_purchase_bonus: "Group Purchase Bonus",
  direct_affiliate_performance_bonus: "Affiliate Performance Bonus",
  yearly_global_purchase_bonus: "Yearly Global Purchase Bonus",
  performance_milestone: "Performance Milestone",
  profile_completion_reward: "Profile Completion Reward",
  personal_cashback_voucher: "Cashback Reserved for Voucher",
  personal_cashback_checkout: "Personal Cashback Used at Checkout",
  encashment: "Encashment (Withdrawal)",
}

const formatLedgerSource = (sourceType?: string | null) => {
  const raw = (sourceType ?? "").trim()
  if (!raw) return "-"
  // Fall back to a title-cased version so future source types still read cleanly.
  return (
    LEDGER_SOURCE_LABELS[raw] ??
    raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

// Tidy up references. PayMongo checkout-session ids (cs_...) are long and opaque,
// so we show a short uppercase transaction code; readable refs (ENC-, PERF-MS-,
// PROFILE-COMPLETE-) are kept as-is. The full value stays in the hover tooltip.
const formatLedgerReference = (
  referenceNo?: string | null,
  notes?: string | null
) => {
  const raw = (referenceNo ?? "").trim()
  if (!raw) return (notes ?? "").trim() || "-"
  if (/^cs_/i.test(raw)) {
    return `TXN-${raw.replace(/^cs_/i, "").slice(-8).toUpperCase()}`
  }
  return raw
}

// "Cash" tab removed — "All Wallets" is now the unified cash overview + ledger
type WalletViewType =
  | WalletTypeFilter
  | "network"
  | "downline"
  | "performance"
  | "egc"

const walletOptions: Array<{
  key: WalletViewType
  label: string
  Icon: typeof BarChart3
  iconClass: string
}> = [
  {
    key: "network",
    label: "Network Earnings",
    Icon: Network,
    iconClass: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "downline",
    label: "Downline Activity",
    Icon: Activity,
    iconClass: "text-teal-600 dark:text-teal-400",
  },
  {
    key: "all",
    label: "Overview",
    Icon: BarChart3,
    iconClass: "text-indigo-600 dark:text-indigo-400",
  },
  {
    key: "rewards",
    label: "Rewards",
    Icon: Sparkles,
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "egc",
    label: "AF-GC",
    Icon: Gift,
    iconClass: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    key: "pv",
    label: "AF-Voucher",
    Icon: TicketPercent,
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "performance",
    label: "Performance",
    Icon: Zap,
    iconClass: "text-orange-500 dark:text-orange-400",
  },
]

const walletOptionOrder: WalletViewType[] = [
  "all",
  "rewards",
  "pv",
  "egc",
  "network",
  "downline",
  "performance",
]
const orderedWalletOptions = [...walletOptions].sort(
  (a, b) => walletOptionOrder.indexOf(a.key) - walletOptionOrder.indexOf(b.key)
)

const walletMeta = {
  all: {
    title: "Wallet Overview",
    subtitle: "All your balances at a glance — cash, vouchers, and rewards.",
    gradient: "from-violet-600 via-indigo-600 to-blue-600",
    glow: "shadow-indigo-500/20",
  },
  pv: {
    title: "AF-Voucher",
    subtitle:
      "Monitor your AF Home voucher balances, referral metrics, and approved voucher history.",
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    glow: "shadow-blue-500/20",
  },
  network: {
    title: "Network Earnings",
    subtitle:
      "See each Group Purchase Bonus source, delivered PV, rate, and computation.",
    gradient: "from-sky-500 via-cyan-500 to-emerald-500",
    glow: "shadow-sky-500/20",
  },
  downline: {
    title: "Downline Activity",
    subtitle:
      "Monitor orders, PV, status, and bonus movement from your referral network.",
    gradient: "from-teal-500 via-cyan-500 to-sky-500",
    glow: "shadow-teal-500/20",
  },
  performance: {
    title: "Performance",
    subtitle:
      "Track your referral performance and PV progress toward your goals.",
    gradient: "from-green-500 via-emerald-500 to-teal-500",
    glow: "shadow-green-500/20",
  },
  rewards: {
    title: "Rewards Center",
    subtitle:
      "Track your AF-Voucher, cashback, and available digital reward balances.",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    glow: "shadow-amber-500/20",
  },
  egc: {
    title: "AF-GC",
    subtitle:
      "View electronic gift credits from referral rewards and store-credit programs.",
    gradient: "from-fuchsia-500 via-pink-500 to-amber-500",
    glow: "shadow-fuchsia-500/20",
  },
}

type WalletTabProps = {
  isVerified?: boolean
  initialWalletType?: WalletTypeFilter
}

export default function WalletTab({
  initialWalletType = "all",
}: WalletTabProps) {
  // Treat the now-removed 'cash' type as 'all' if it arrives via prop/URL
  const resolvedInitial: WalletViewType =
    initialWalletType === "cash" ? "all" : initialWalletType
  const [walletType, setWalletType] = useState<WalletViewType>(resolvedInitial)
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [createAffiliateVoucher, { isLoading: isCreatingVoucher }] =
    useCreateAffiliateVoucherMutation()
  const contentWalletType: WalletViewType = walletType
  const queryWalletType: WalletTypeFilter =
    contentWalletType === "network" ||
    contentWalletType === "downline" ||
    contentWalletType === "performance" ||
    contentWalletType === "egc"
      ? "all"
      : contentWalletType
  const { data, isLoading, isFetching, isError, refetch } =
    useGetWalletOverviewQuery({
      page,
      perPage: 15,
      walletType: queryWalletType,
      refreshKey,
    })

  const summary = data?.summary
  const ledger = data?.ledger ?? []
  const meta = data?.meta
  const currentWalletMeta =
    walletMeta[contentWalletType as keyof typeof walletMeta] ?? walletMeta.all

  const utilizationPct = useMemo(() => {
    if (!summary) return 0
    const total = summary.encashment_locked + summary.encashment_available
    if (total <= 0) return 0
    return Math.min(100, Math.max(0, (summary.encashment_locked / total) * 100))
  }, [summary])

  const progressRows = useMemo(() => {
    if (!summary) return []
    return [
      {
        label: "Cash Credits",
        value: summary.cash_credits,
        total: Math.max(summary.cash_credits + summary.cash_debits, 1),
        color: "from-emerald-400 to-emerald-500",
        isPv: false,
      },
      {
        label: "Cash Debits",
        value: summary.cash_debits,
        total: Math.max(summary.cash_credits + summary.cash_debits, 1),
        color: "from-rose-400 to-rose-500",
        isPv: false,
      },
      {
        label: "PV Credits",
        value: summary.pv_credits,
        total: Math.max(summary.pv_credits + summary.pv_debits, 1),
        color: "from-blue-400 to-indigo-500",
        isPv: true,
      },
      {
        label: "PV Debits",
        value: summary.pv_debits,
        total: Math.max(summary.pv_credits + summary.pv_debits, 1),
        color: "from-sky-400 to-blue-400",
        isPv: true,
      },
    ].map((item) => ({
      ...item,
      pct: Math.min(100, Math.max(0, (item.value / item.total) * 100)),
    }))
  }, [summary])

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-gray-900">
        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${currentWalletMeta.gradient}`}
        />

        <div className="p-5 pt-6 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${currentWalletMeta.gradient} shadow-lg`}
              >
                <span className="text-base font-bold text-white">W</span>
              </div>
              <div>
                <h3 className="text-base leading-tight font-bold text-slate-900 sm:text-lg dark:text-white">
                  {currentWalletMeta.title}
                </h3>
                <p className="mt-0.5 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                  {currentWalletMeta.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRefreshKey(Date.now())
                refetch()
              }}
              disabled={isFetching}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                isFetching
                  ? "border-slate-200 text-slate-400 dark:border-slate-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <svg
                className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* Tabs */}
          <div className="wallet-tabs-scroll mt-5 flex max-w-full flex-nowrap gap-1.5 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
            {orderedWalletOptions.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setWalletType(item.key)
                  setPage(1)
                }}
                className={`relative shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  walletType === item.key
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-700 dark:text-white dark:ring-slate-600/80"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <item.Icon
                    className={`h-3.5 w-3.5 ${item.iconClass}`}
                    strokeWidth={2.4}
                  />
                  {item.label}
                </span>
                {walletType === item.key && (
                  <motion.div
                    layoutId="wallet-tab-indicator"
                    className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-gradient-to-r ${currentWalletMeta.gradient}`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </button>
            ))}
          </div>
          <style jsx>{`
            .wallet-tabs-scroll {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }

            .wallet-tabs-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>

        {/* Tab Content */}
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={walletType}
              initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {contentWalletType === "pv" ? (
                isLoading ? (
                  <SkeletonCards />
                ) : isError ? (
                  <ErrorBanner msg="Failed to load AF-Voucher data." />
                ) : (
                  <RewardsWalletTab
                    afVoucherBalance={Number(summary?.af_voucher_balance ?? 0)}
                    afVoucherSourceBalance={Number(
                      summary?.af_voucher_source_balance ?? 0
                    )}
                    personalCashbackBalance={Number(
                      summary?.personal_cashback_balance ??
                        summary?.cashback_balance ??
                        0
                    )}
                    personalCashbackSourceBalance={Number(
                      summary?.personal_cashback_source_balance ??
                        summary?.cashback_source_balance ??
                        0
                    )}
                    personalCashbackReservedBalance={Number(
                      summary?.personal_cashback_reserved_balance ??
                        summary?.cashback_reserved_balance ??
                        0
                    )}
                    cashbackRate={Number(summary?.cashback_rate ?? 0)}
                    vouchers={data?.affiliate_vouchers ?? []}
                    isCreatingVoucher={isCreatingVoucher}
                    onCreateVoucher={async (payload) => {
                      await createAffiliateVoucher(payload).unwrap()
                    }}
                  />
                )
              ) : contentWalletType === "performance" ? (
                <PerformanceTab />
              ) : contentWalletType === "network" ? (
                isLoading ? (
                  <SkeletonCards />
                ) : isError ? (
                  <ErrorBanner msg="Failed to load Network Earnings data." />
                ) : (
                  <NetworkEarningsTab
                    awards={data?.unilevel_awards ?? []}
                    monthlyActivation={summary?.monthly_activation}
                  />
                )
              ) : contentWalletType === "downline" ? (
                <DownlineActivityTab />
              ) : contentWalletType === "egc" ? (
                isLoading ? (
                  <SkeletonCards />
                ) : isError ? (
                  <ErrorBanner msg="Failed to load AF-GC data." />
                ) : (
                  <EgcWalletPanel
                    availableEgcBalance={Number(
                      summary?.available_egc_balance ?? 0
                    )}
                    pendingReferralEarnings={Number(
                      summary?.pending_referral_earnings ?? 0
                    )}
                  />
                )
              ) : contentWalletType === "rewards" ? (
                isLoading ? (
                  <SkeletonCards />
                ) : isError ? (
                  <ErrorBanner msg="Failed to load rewards wallet data." />
                ) : (
                  <PvWalletTab
                    currentPv={Number(
                      summary?.cashback_balance ??
                        summary?.affiliate_retail_profit ??
                        summary?.current_pv ??
                        0
                    )}
                    pendingPv={Number(summary?.pending_pv ?? 0)}
                    lifetimePv={Number(
                      summary?.affiliate_performance_bonus ??
                        summary?.lifetime_pv ??
                        0
                    )}
                    lifetimePersonalPerformanceValue={Number(
                      summary?.lifetime_pv ?? 0
                    )}
                    personalPurchasePv={Number(
                      summary?.global_purchase_bonus ??
                        summary?.personal_purchase_pv ??
                        0
                    )}
                    groupPv={Number(
                      summary?.group_purchase_bonus ?? summary?.group_pv ?? 0
                    )}
                    currentMonthGroupPv={Number(
                      summary?.monthly_purchase_points ??
                        summary?.current_month_group_pv ??
                        0
                    )}
                    currentCv={Number(
                      summary?.total_bonus ?? summary?.current_cv ?? 0
                    )}
                    yearlyPurchasePv={Number(summary?.yearly_purchase_pv ?? 0)}
                    pendingReferralEarnings={Number(
                      summary?.pending_referral_earnings ?? 0
                    )}
                    monthlyActivation={summary?.monthly_activation}
                  />
                )
              ) : isLoading ? (
                <SkeletonCards />
              ) : isError ? (
                <ErrorBanner msg="Failed to load wallet overview." />
              ) : (
                /* ── All Wallets / Overview ── */
                <div className="space-y-5 pt-1">
                  {/* ── Section 1: Cash Wallet ── */}
                  <div>
                    <SectionLabel
                      icon="₱"
                      label="Cash Wallet"
                      color="text-emerald-600 dark:text-emerald-400"
                    />
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <BalanceCard
                        label="Cash Balance"
                        value={peso(summary?.cash_balance ?? 0)}
                        sub="Available for encashment"
                        gradient="from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20"
                        border="border-emerald-200/60 dark:border-emerald-700/40"
                        iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        valueColor="text-emerald-700 dark:text-emerald-300"
                        subColor="text-emerald-500"
                        icon="₱"
                        large
                      />
                      <BalanceCard
                        label="Locked Encashment"
                        value={peso(summary?.encashment_locked ?? 0)}
                        sub="Pending / ready-for-release"
                        gradient="from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20"
                        border="border-sky-200/60 dark:border-sky-700/40"
                        iconBg="bg-sky-100 dark:bg-sky-900/40"
                        iconColor="text-sky-600 dark:text-sky-400"
                        valueColor="text-sky-700 dark:text-sky-300"
                        subColor="text-sky-500"
                        icon="🔒"
                      />
                      <BalanceCard
                        label="Available to Encash"
                        value={peso(summary?.encashment_available ?? 0)}
                        sub="Can be requested now"
                        gradient="from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20"
                        border="border-violet-200/60 dark:border-violet-700/40"
                        iconBg="bg-violet-100 dark:bg-violet-900/40"
                        iconColor="text-violet-600 dark:text-violet-400"
                        valueColor="text-violet-700 dark:text-violet-300"
                        subColor="text-violet-500"
                        icon="✓"
                      />
                    </div>

                    {/* Encashment capacity bar — inside cash section */}
                    <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 dark:border-slate-700/60 dark:bg-slate-800/60">
                      <div className="mb-2.5 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Encashment Capacity
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            utilizationPct > 70
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                              : utilizationPct > 40
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                          }`}
                        >
                          {utilizationPct.toFixed(0)}% locked
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${utilizationPct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        <span>
                          Locked:{" "}
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            {peso(summary?.encashment_locked ?? 0)}
                          </span>
                        </span>
                        <span>
                          Available:{" "}
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {peso(summary?.encashment_available ?? 0)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 2: Performance Value (PV) ── */}
                  <div>
                    <SectionLabel
                      icon="◆"
                      label="Performance Value (PV)"
                      color="text-blue-600 dark:text-blue-400"
                    />
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <BalanceCard
                        label="PV Balance"
                        value={`${numberFmt(summary?.pv_balance ?? 0)} PV`}
                        sub="Credits after order delivery"
                        gradient="from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
                        border="border-blue-200/60 dark:border-blue-700/40"
                        iconBg="bg-blue-100 dark:bg-blue-900/40"
                        iconColor="text-blue-600 dark:text-blue-400"
                        valueColor="text-blue-700 dark:text-blue-300"
                        subColor="text-blue-500"
                        icon="◆"
                        large
                      />
                      <BalanceCard
                        label="Pending PV"
                        value={`${numberFmt(summary?.pending_pv ?? 0)} PV`}
                        sub="Awaiting order confirmation"
                        gradient="from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20"
                        border="border-indigo-200/60 dark:border-indigo-700/40"
                        iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                        iconColor="text-indigo-600 dark:text-indigo-400"
                        valueColor="text-indigo-700 dark:text-indigo-300"
                        subColor="text-indigo-500"
                        icon="⏳"
                      />
                    </div>
                  </div>

                  {/* ── Section 3: Rewards ── */}
                  <div>
                    <SectionLabel
                      icon="✦"
                      label="Rewards"
                      color="text-amber-600 dark:text-amber-400"
                    />
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <BalanceCard
                        label="AF-Voucher Balance"
                        value={peso(summary?.af_voucher_balance ?? 0)}
                        sub="Redeemable on checkout"
                        gradient="from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
                        border="border-amber-200/60 dark:border-amber-700/40"
                        iconBg="bg-amber-100 dark:bg-amber-900/40"
                        iconColor="text-amber-600 dark:text-amber-400"
                        valueColor="text-amber-700 dark:text-amber-300"
                        subColor="text-amber-500"
                        icon="🎟"
                      />
                      <BalanceCard
                        label="Cashback Balance"
                        value={peso(summary?.cashback_balance ?? 0)}
                        sub={`${Number(summary?.cashback_rate ?? 0)}% cashback rate`}
                        gradient="from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20"
                        border="border-rose-200/60 dark:border-rose-700/40"
                        iconBg="bg-rose-100 dark:bg-rose-900/40"
                        iconColor="text-rose-600 dark:text-rose-400"
                        valueColor="text-rose-700 dark:text-rose-300"
                        subColor="text-rose-500"
                        icon="💸"
                      />
                      <BalanceCard
                        label="AF-GC Balance"
                        value={peso(summary?.available_egc_balance ?? 0)}
                        sub="Electronic gift credit"
                        gradient="from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20"
                        border="border-fuchsia-200/60 dark:border-fuchsia-700/40"
                        iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/40"
                        iconColor="text-fuchsia-600 dark:text-fuchsia-400"
                        valueColor="text-fuchsia-700 dark:text-fuchsia-300"
                        subColor="text-fuchsia-500"
                        icon="🎁"
                      />
                    </div>
                  </div>

                  {/* ── Wallet Flow Breakdown ── */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-800/60">
                    <div className="mb-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Wallet Flow Breakdown
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        Total credits and debits across all wallets
                      </p>
                    </div>
                    <div className="space-y-3">
                      {progressRows.map((row) => (
                        <div key={row.label}>
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              {row.label}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {row.isPv
                                ? `${numberFmt(row.value)} PV`
                                : peso(row.value)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <motion.div
                              className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${row.pct}%` }}
                              transition={{ duration: 0.7, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Ledger — only on the Overview tab (all wallets) */}
      {walletType === "all" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 md:px-6 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Wallet Ledger
              </h3>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Full transaction history across all wallet types.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isFetching && (
                <span className="flex animate-pulse items-center gap-1 text-[11px] font-medium text-slate-400">
                  <svg
                    className="h-3 w-3 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refreshing
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {meta?.total ?? 0} entries
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                  {[
                    "Date",
                    "Wallet",
                    "Type",
                    "Source",
                    "Reference",
                    "Amount",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-left text-[10px] font-bold tracking-widest text-slate-400 uppercase first:pl-5 last:pr-5 md:first:pl-6 md:last:pr-6 dark:text-slate-500 ${h === "Amount" ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl dark:bg-slate-800">
                          ◈
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          No transactions yet
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Transactions will appear here once activity is
                          recorded.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  ledger.map((row) => {
                    const isCredit = row.entry_type === "credit"
                    const amountLabel =
                      row.wallet_type === "pv"
                        ? `${isCredit ? "+" : "-"}${numberFmt(row.amount)} PV`
                        : `${isCredit ? "+" : "-"}${peso(row.amount)}`
                    return (
                      <tr
                        key={row.id}
                        className="group transition-colors duration-150 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3.5 text-xs whitespace-nowrap text-slate-500 first:pl-5 md:first:pl-6 dark:text-slate-400">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              row.wallet_type === "cash"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${row.wallet_type === "cash" ? "bg-emerald-500" : "bg-blue-500"}`}
                            />
                            {row.wallet_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${isCredit ? "bg-emerald-500" : "bg-rose-500"}`}
                            />
                            {isCredit ? "Credit" : "Debit"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {formatLedgerSource(row.source_type)}
                        </td>
                        <td className="max-w-[180px] px-4 py-3.5">
                          <p
                            className="truncate font-mono text-xs text-slate-600 dark:text-slate-300"
                            title={row.reference_no || row.notes || ""}
                          >
                            {formatLedgerReference(row.reference_no, row.notes)}
                          </p>
                        </td>
                        <td
                          className={`px-4 py-3.5 text-right text-sm font-bold tabular-nums last:pr-5 md:last:pr-6 ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                        >
                          {amountLabel}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 md:px-6 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {meta?.from ?? 0}–{meta?.to ?? 0}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {meta?.total ?? 0}
              </span>
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!meta || page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Prev
              </button>
              <div className="min-w-[60px] rounded-lg bg-slate-50 px-3 py-1.5 text-center text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {page} / {meta?.last_page ?? 1}
              </div>
              <button
                type="button"
                onClick={() =>
                  setPage((prev) =>
                    meta && prev < meta.last_page ? prev + 1 : prev
                  )
                }
                disabled={!meta || page >= (meta?.last_page ?? 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Next
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Small reusable components ── */

function SectionLabel({
  icon,
  label,
  color,
}: {
  icon: string
  label: string
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm leading-none ${color}`}>{icon}</span>
      <p className={`text-xs font-black tracking-widest uppercase ${color}`}>
        {label}
      </p>
      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

type BalanceCardProps = {
  label: string
  value: string
  sub: string
  gradient: string
  border: string
  iconBg: string
  iconColor: string
  valueColor: string
  subColor: string
  icon: string
  large?: boolean
}

function BalanceCard({
  label,
  value,
  sub,
  gradient,
  border,
  iconBg,
  iconColor,
  valueColor,
  subColor,
  icon,
  large,
}: BalanceCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${gradient} ${border} p-4 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {label}
        </p>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${iconBg} ${iconColor} shrink-0 font-bold`}
        >
          {icon}
        </span>
      </div>
      <p
        className={`mt-3 leading-tight font-black ${large ? "text-xl" : "text-lg"} ${valueColor}`}
      >
        {value}
      </p>
      <p className={`mt-1 text-[11px] font-medium ${subColor}`}>{sub}</p>
    </div>
  )
}

function EgcWalletPanel({
  availableEgcBalance,
  pendingReferralEarnings,
}: {
  availableEgcBalance: number
  pendingReferralEarnings: number
}) {
  return (
    <div className="space-y-5 pt-1">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BalanceCard
          label="AF-GC Balance"
          value={peso(availableEgcBalance)}
          sub="Store credit from non-cash rewards"
          gradient="from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20"
          border="border-fuchsia-200/60 dark:border-fuchsia-700/40"
          iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/40"
          iconColor="text-fuchsia-600 dark:text-fuchsia-400"
          valueColor="text-fuchsia-700 dark:text-fuchsia-300"
          subColor="text-fuchsia-500"
          icon="G"
          large
        />
        <BalanceCard
          label="Pending Referral Rewards"
          value={peso(pendingReferralEarnings)}
          sub="Awaiting order delivery/release"
          gradient="from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
          border="border-amber-200/60 dark:border-amber-700/40"
          iconBg="bg-amber-100 dark:bg-amber-900/40"
          iconColor="text-amber-600 dark:text-amber-400"
          valueColor="text-amber-700 dark:text-amber-300"
          subColor="text-amber-500"
          icon="P"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          AF-GC Source
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
          AF-GC is the store-credit share of direct referral rewards. In the
          backend, direct referral commission is split between cash and AF-GC,
          so this balance is kept separate from encashment.
        </p>
      </div>
    </div>
  )
}

function SkeletonCards() {
  return (
    <div className="animate-pulse space-y-5 pt-1">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
        <div className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-40 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-800 dark:bg-rose-900/20">
      <span className="text-base text-rose-500">⚠</span>
      <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
        {msg}
      </p>
    </div>
  )
}
