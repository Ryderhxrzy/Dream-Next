"use client"

import type { ReactNode } from "react"
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Gem,
  Gift,
  Globe2,
  Network,
  Trophy,
  TrendingUp,
} from "lucide-react"
import PvStatCard from "./PvStatCard"

type MonthlyActivation = {
  status: "active" | "inactive"
  threshold_pv: number
  current_month_pv: number
  qualifying_pv: number
  remaining_pv: number
  deadline_day: number
  deadline_at?: string | null
  window_open: boolean
  month_label: string
}

interface PvWalletTabProps {
  currentPv: number
  pendingPv: number
  lifetimePv: number
  lifetimePersonalPerformanceValue?: number
  yearlyPurchasePv?: number
  pendingReferralEarnings?: number
  personalPurchasePv?: number
  groupPv?: number
  currentMonthGroupPv?: number
  currentCv?: number
  monthlyActivation?: MonthlyActivation
}

const SectionHeader = ({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string
  title: string
  description?: string
  badge?: ReactNode
}) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-gray-500">
        {eyebrow}
      </p>
      <h3 className="mt-1.5 text-xl font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-slate-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
    {badge && <div className="shrink-0 self-start">{badge}</div>}
  </div>
)

const StatSection = ({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-700 dark:bg-gray-800/60 dark:shadow-black/20">
    <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
    </div>
    <div className="p-4 md:p-5">{children}</div>
  </section>
)

const PvWalletTab = ({
  currentPv,
  pendingPv,
  lifetimePv,
  lifetimePersonalPerformanceValue,
  yearlyPurchasePv = 0,
  pendingReferralEarnings = 0,
  personalPurchasePv = 0,
  groupPv = 0,
  currentMonthGroupPv = 0,
  currentCv = 0,
  monthlyActivation,
}: PvWalletTabProps) => {
  const activationCurrent =
    monthlyActivation?.current_month_pv ?? monthlyActivation?.qualifying_pv ?? 0
  const activationTarget = monthlyActivation?.threshold_pv ?? 100
  const activationProgress = Math.min(
    (activationCurrent / Math.max(activationTarget, 1)) * 100,
    100
  )
  const isGroupBonusActive = monthlyActivation?.status === "active"
  const activationDeadline = monthlyActivation?.deadline_at
    ? new Date(monthlyActivation.deadline_at).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      })
    : `Day ${monthlyActivation?.deadline_day ?? 7}`

  return (
    <div className="space-y-5">
      {/* ── Group Purchase Bonus Qualification Banner ── */}
      <section
        className={`relative overflow-hidden rounded-2xl border p-5 md:p-6 ${
          isGroupBonusActive
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:border-emerald-800/60 dark:from-emerald-950/60 dark:to-teal-950/40"
            : "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 dark:border-amber-800/60 dark:from-amber-950/60 dark:to-orange-950/40"
        }`}
      >
        {/* decorative circle */}
        <div
          className={`pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-10 ${
            isGroupBonusActive ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-1 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white px-2 shadow-sm dark:border-white/10 dark:bg-white/10">
              <img
                src="/af_home_logo.png"
                alt="AF Home"
                className="h-7 w-auto object-contain"
              />
            </div>
            <div>
              <p
                className={`text-[11px] font-bold uppercase tracking-widest ${isGroupBonusActive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
              >
                Group Purchase Bonus Qualification
              </p>
              <h3 className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {activationCurrent.toLocaleString()}
                <span className="ml-1 text-base font-medium text-slate-400 dark:text-gray-500">
                  / {activationTarget.toLocaleString()} PV
                </span>
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                Personal PV this {monthlyActivation?.month_label ?? "month"}{" "}
                determines if you can receive Group Purchase Bonus.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-2 self-start rounded-xl px-4 py-2 text-sm font-bold shadow-sm ${
              isGroupBonusActive
                ? "bg-emerald-500 text-white shadow-emerald-500/25"
                : "bg-amber-500 text-white shadow-amber-500/25"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isGroupBonusActive ? "bg-emerald-200" : "bg-amber-200"}`}
            />
            {isGroupBonusActive
              ? "Active for Group Bonus"
              : "Inactive for Group Bonus"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative mt-5">
          <div className="h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-black/30">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isGroupBonusActive
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-gradient-to-r from-amber-500 to-orange-400"
              }`}
              style={{ width: `${activationProgress}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>
              {isGroupBonusActive
                ? "You can receive Group Purchase Bonus from delivered group purchases."
                : `${(monthlyActivation?.remaining_pv ?? activationTarget).toLocaleString()} PV more needed from your own delivered purchases.`}
            </span>
            <span className="ml-4 shrink-0 font-medium">
              Deadline: {activationDeadline}
            </span>
          </div>
        </div>

        {/* Sub-stat row */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Personal PV This Month",
              value: (
                monthlyActivation?.current_month_pv ?? 0
              ).toLocaleString(),
            },
            {
              label: "Lifetime Personal PV",
              value: (lifetimePersonalPerformanceValue ?? 0).toLocaleString(),
            },
            {
              label: "Pending Personal PV",
              value: pendingPv.toLocaleString(),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/70 bg-white/60 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                {item.value}
                <span className="ml-1 text-xs font-normal text-slate-400 dark:text-gray-500">
                  PV
                </span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Primary stat row ── */}
      <StatSection
        eyebrow="Personal Earnings"
        title="Personal Rewards"
        description="Rewards generated from your own delivered purchases and affiliate performance."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PvStatCard
            label="Personal Cashback"
            value={currentPv}
            accent="blue"
            icon={<Gift className="h-4 w-4" />}
            helper="4% cashback from your own delivered personal purchase PV"
          />
          <PvStatCard
            label="Yearly Personal PV"
            value={yearlyPurchasePv}
            accent="sky"
            icon={<TrendingUp className="h-4 w-4" />}
            helper="Your own delivered purchase PV accumulated this year"
          />
          <PvStatCard
            label="Affiliate Performance Bonus"
            value={lifetimePv}
            accent="emerald"
            icon={<Trophy className="h-4 w-4" />}
            helper="Bonus earned based on affiliate performance metrics"
          />
        </div>
      </StatSection>

      {/* ── Secondary stat row ── */}
      <StatSection
        eyebrow="Bonus Pools"
        title="Purchase Bonus Summary"
        description="Grouped bonus pools from personal, group, and worldwide purchase activity."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <PvStatCard
            label="Global Purchase Bonus"
            value={personalPurchasePv}
            accent="violet"
            icon={<Globe2 className="h-4 w-4" />}
            helper="Earnings from worldwide purchases"
          />
          <PvStatCard
            label="Group Purchase Bonus"
            value={groupPv}
            accent="blue"
            icon={<Network className="h-4 w-4" />}
            helper="Bonus from delivered group purchases"
          />
          <PvStatCard
            label="Monthly Purchase Points"
            value={currentMonthGroupPv}
            accent="emerald"
            icon={<CalendarDays className="h-4 w-4" />}
            helper="Purchase Points this Month"
          />
          <PvStatCard
            label="Total Bonus"
            value={currentCv}
            accent="sky"
            icon={<CircleDollarSign className="h-4 w-4" />}
            helper="Total earnings from all bonus sources"
          />
        </div>
      </StatSection>

      {/* ── Pending row ── */}
      <StatSection
        eyebrow="Awaiting Release"
        title="Pending Credits"
        description="Credits that are not yet final because delivery or PV posting is still pending."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <PvStatCard
            label="Pending Earnings"
            value={pendingReferralEarnings}
            accent="sky"
            icon={<Clock3 className="h-4 w-4" />}
            helper="Bonus earnings waiting for delivery release"
          />
          <PvStatCard
            label="Pending Performance Value"
            value={pendingPv}
            accent="blue"
            icon={<Gem className="h-4 w-4" />}
            helper="Paid purchases waiting for delivery before PV posting"
          />
        </div>
      </StatSection>
    </div>
  )
}

export default PvWalletTab
