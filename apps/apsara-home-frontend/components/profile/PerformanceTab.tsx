"use client"

import { useMemo, useState } from "react"
import {
  useGetWalletOverviewQuery,
  WalletTypeFilter,
} from "@/store/api/encashmentApi"
import { RefreshCw, UserCheck, Users, Zap } from "lucide-react"

type PvHistoryItem = {
  id: number
  description: string
  source: string
  amount: number
  status: "pending" | "approved" | "cancelled"
  created_at: string
}

const fmt = (n: number) => n.toLocaleString("en-PH")

const MILESTONES = [0, 25, 50, 75, 100]

/* ─── Smooth progress bar with glow ─── */
function PvProgressBar({ pct }: { pct: number }) {
  return (
    <div className="relative">
      {/* Track */}
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-linear-to-r from-sky-400 via-cyan-400 to-teal-400 transition-[width] duration-700 ease-out dark:from-sky-500 dark:via-cyan-400 dark:to-teal-400"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 12px 2px rgba(34,211,238,0.45)",
          }}
        />
      </div>
      {/* Milestone ticks */}
      <div className="relative mt-2.5 flex justify-between px-0.5">
        {MILESTONES.map((m) => (
          <div key={m} className="flex flex-col items-center gap-0.5">
            <div className="h-1.5 w-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="text-[10px] font-semibold text-slate-400 tabular-nums dark:text-slate-500">
              {m === 0
                ? "0"
                : m === 100
                  ? "50k"
                  : `${(50000 * m) / 100 / 1000}k`}
            </span>
          </div>
        ))}
      </div>
      {/* Thumb label */}
      {pct > 2 && (
        <div
          className="absolute -top-7 -translate-x-1/2"
          style={{ left: `${Math.min(pct, 96)}%` }}
        >
          <span className="rounded-md bg-sky-500 px-2 py-0.5 text-[10px] font-black text-white shadow">
            {pct.toFixed(1)}%
          </span>
          <div className="mx-auto mt-0.5 h-1.5 w-0.5 bg-sky-500" />
        </div>
      )}
    </div>
  )
}

/* ─── Status badge ─── */
function StatusBadge({ status }: { status: PvHistoryItem["status"] }) {
  const map = {
    approved:
      "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
    pending:
      "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
    cancelled:
      "bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/30",
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${map[status] ?? map.pending}`}
    >
      {status}
    </span>
  )
}

/* ─── Skeleton ─── */
function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-52 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

/* ═══════════════════════════════════════════ */

const PerformanceTab = () => {
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError, refetch } =
    useGetWalletOverviewQuery({
      page,
      perPage: 15,
      walletType: "pv" as WalletTypeFilter,
    })

  const summary = data?.summary
  const ledger = data?.ledger
  const milestone = summary?.performance_milestone
  const pvPerMilestone = Number(milestone?.pv_per_milestone ?? 50000)
  const cashPerMilestone = Number(milestone?.cash_per_milestone ?? 5000)
  const milestonesReached = Number(milestone?.milestones_reached ?? 0)
  const creditedMilestones = Number(
    milestone?.credited_milestones ?? milestonesReached
  )
  const lockedMilestones = Number(milestone?.locked_milestones ?? 0)
  const cashEarned = Number(milestone?.cash_earned ?? 0)
  const isQualified = milestone?.is_qualified ?? true
  const current = Number(summary?.direct_referral_total_pv ?? 0)
  // Progress is measured inside the current 50,000 PV monthly tranche.
  const goalPv = Number(milestone?.next_milestone_pv ?? pvPerMilestone)
  const moduloTranchePv = current % pvPerMilestone
  const rawTranchePv =
    current > 0 && Math.abs(moduloTranchePv) < 0.01
      ? pvPerMilestone
      : moduloTranchePv
  const tranchePv = Number(milestone?.current_cycle_pv ?? rawTranchePv)
  const progress = Math.min(
    100,
    Math.max(0, (tranchePv / pvPerMilestone) * 100)
  )
  const remaining = Number(
    milestone?.pv_to_next ?? Math.max(0, pvPerMilestone - tranchePv)
  )
  const activationRemainingPv = Number(
    milestone?.activation_remaining_pv ??
      summary?.monthly_activation?.remaining_pv ??
      0
  )
  const activationRequiredPv = Number(
    milestone?.activation_required_pv ??
      summary?.monthly_activation?.threshold_pv ??
      0
  )

  const totalReferrals = Number(summary?.referrals?.total ?? 0)
  const verifiedReferrals = Number(summary?.referrals?.verified ?? 0)
  const activeReferrals = Number(summary?.referrals?.active ?? 0)

  const pvHistory = useMemo<PvHistoryItem[]>(
    () =>
      (ledger ?? [])
        .filter((r) => r.wallet_type === "pv")
        .map((r) => ({
          id: r.id,
          description: r.notes || r.reference_no || "PV wallet entry",
          source: r.source_type || "wallet",
          amount: Math.abs(Number(r.amount ?? 0)),
          status: (r.entry_type === "debit"
            ? "cancelled"
            : "approved") as PvHistoryItem["status"],
          created_at: r.created_at || new Date().toISOString(),
        })),
    [ledger]
  )

  if (isLoading) return <Skeleton />

  if (isError)
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800/40 dark:bg-rose-950/20">
        <p className="font-bold text-rose-700 dark:text-rose-400">
          Failed to load performance data.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    )

  return (
    <div className="space-y-4">
      {/* ── Hero: PV Progress ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-linear-to-r from-sky-400 via-cyan-400 to-teal-400" />

        {/* Glow blob – dark mode only */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-cyan-400/5 blur-3xl dark:bg-cyan-400/10" />

        <div className="relative p-6">
          {/* Label */}
          <p className="flex items-center gap-2 text-sm font-black tracking-[0.18em] text-sky-500 uppercase dark:text-sky-400">
            <span className="text-xl">⚡</span> Direct Affiliate Performance
            Bonus
          </p>

          {/* Numbers row */}
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-4xl leading-none font-black text-slate-900 tabular-nums dark:text-white">
                {fmt(tranchePv)}
                <span className="ml-2 text-lg font-semibold text-slate-400 dark:text-slate-500">
                  / {fmt(goalPv)} PV
                </span>
              </p>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Tracks delivered PV from your Level 1/direct referrals only.
                Repeat purchases count; personal and Level 2 purchases do not.
              </p>
            </div>

            {/* Progress badge */}
            <div className="flex flex-col items-center rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 dark:border-sky-500/20 dark:bg-sky-500/5">
              <span className="text-[9px] font-black tracking-widest text-sky-500 uppercase dark:text-sky-400">
                Progress
              </span>
              <span className="mt-0.5 text-3xl font-black text-sky-600 tabular-nums dark:text-sky-300">
                {progress.toFixed(1)}%
              </span>
              <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                {fmt(remaining)} PV left
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <PvProgressBar pct={progress} />
          </div>
        </div>
        {!isQualified && (
          <div className="relative mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
            Activation required: reach {fmt(activationRequiredPv)} personal PV
            this month before Direct Affiliate Performance Bonus cash can be
            credited.
          </div>
        )}
      </div>

      {/* ── Milestone Reward ── */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50/50 p-5 shadow-sm dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-teal-950/30">
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-400/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
              <span className="text-lg">🏆</span>
            </div>
            <div>
              <p className="text-[11px] font-black tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                Direct Affiliate Performance Bonus
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Every{" "}
                <span className="font-bold">{fmt(pvPerMilestone)} PV</span>{" "}
                earns{" "}
                <span className="font-bold">₱{fmt(cashPerMilestone)} cash</span>{" "}
                once your monthly personal PV qualification is active.
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {!isQualified && lockedMilestones > 0
                  ? `${fmt(lockedMilestones)} reward milestone${lockedMilestones > 1 ? "s" : ""} locked. Add ${fmt(activationRemainingPv)} personal PV to unlock.`
                  : remaining > 0
                    ? `${fmt(remaining)} PV more to reach the next ₱${fmt(cashPerMilestone)} reward.`
                    : "Next reward unlocks as soon as more direct affiliate PV posts."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-3">
            <div className="rounded-xl border border-emerald-200/70 bg-white/70 px-4 py-3 text-center backdrop-blur-sm dark:border-emerald-800/40 dark:bg-white/5">
              <p className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                Milestones
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums dark:text-white">
                {fmt(creditedMilestones)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200/70 bg-white/70 px-4 py-3 text-center backdrop-blur-sm dark:border-emerald-800/40 dark:bg-white/5">
              <p className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                Cash Earned
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-600 tabular-nums dark:text-emerald-300">
                ₱{fmt(cashEarned)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            {
              label: "Total Referrals",
              value: totalReferrals,
              Icon: Users,
              iconBg: "bg-sky-100 dark:bg-sky-500/15",
              iconColor: "text-sky-600 dark:text-sky-400",
              card: "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700/50",
              num: "text-sky-600 dark:text-sky-300",
              blob: "bg-sky-400",
            },
            {
              label: "Verified Referrals",
              value: verifiedReferrals,
              Icon: UserCheck,
              iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
              iconColor: "text-emerald-600 dark:text-emerald-400",
              card: "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700/50",
              num: "text-emerald-600 dark:text-emerald-300",
              blob: "bg-emerald-400",
            },
            {
              label: "Active Referrals",
              value: activeReferrals,
              Icon: Zap,
              iconBg: "bg-violet-100 dark:bg-violet-500/15",
              iconColor: "text-violet-600 dark:text-violet-400",
              card: "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700/50",
              num: "text-violet-600 dark:text-violet-300",
              blob: "bg-violet-400",
            },
          ] as const
        ).map((card) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${card.card}`}
          >
            {/* Decorative blob */}
            <div
              className={`pointer-events-none absolute -right-5 -bottom-5 h-20 w-20 rounded-full opacity-[0.07] ${card.blob}`}
            />
            {/* Icon + Label row */}
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
              >
                <card.Icon
                  className={`h-4.5 w-4.5 ${card.iconColor}`}
                  strokeWidth={2}
                />
              </div>
              <p className="text-[11px] leading-tight font-black tracking-widest text-slate-500 uppercase dark:text-slate-400">
                {card.label}
              </p>
            </div>
            {/* Value */}
            <p
              className={`mt-4 text-4xl leading-none font-black tabular-nums ${card.num}`}
            >
              {fmt(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* ── PV Transaction History ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-700/50 dark:bg-slate-800/50">
          <div>
            <p className="text-[10px] font-black tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
              ◆ Transaction History
            </p>
            <p className="mt-0.5 text-base font-bold text-slate-800 dark:text-white">
              Direct Affiliate Performance Bonus Log
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500/50 dark:hover:text-sky-400"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              strokeWidth={2.5}
            />
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Table / Empty */}
        {pvHistory.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-2xl dark:border-slate-700 dark:bg-slate-800">
              📊
            </div>
            <p className="mt-3 font-bold text-slate-700 dark:text-slate-300">
              No PV transactions yet
            </p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Delivered purchases and PV credits will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/60">
                  {["Description", "Source", "Date", "Status", "PV Amount"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-slate-500 ${i === 4 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {pvHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="max-w-44 truncate px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {item.description}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {item.source}
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-sky-600 tabular-nums dark:text-sky-400">
                      +{fmt(item.amount)}
                      <span className="ml-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        PV
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.meta && data.meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              ← Prev
            </button>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Page {data.meta.current_page} / {data.meta.last_page}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((p) => Math.min(data.meta.last_page, p + 1))
              }
              disabled={page >= data.meta.last_page}
              className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PerformanceTab
