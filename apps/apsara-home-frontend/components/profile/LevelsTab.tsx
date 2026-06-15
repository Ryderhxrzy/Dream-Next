"use client"

import { AccountSnapshot } from "@/store/api/userApi"
import { motion } from "framer-motion"

import { MemberTier } from "@/types/members/types"

const TIER_BADGE_IMAGE: Record<MemberTier, string> = {
  "Home Starter": "/Badge/homeStarter.png",
  "Home Builder": "/Badge/homeBuilder.png",
  "Home Stylist": "/Badge/homeStylist.png",
  "Lifestyle Consultant": "/Badge/lifestyleConsultant.png",
  "Lifestyle Elite": "/Badge/lifestyleElite.png",
}

const TIER_COVER: Record<MemberTier, { gradient: string; glow: string }> = {
  "Home Starter": {
    gradient: "from-sky-400 to-sky-500",
    glow: "rgba(56,189,248,0.5)",
  },
  "Home Builder": {
    gradient: "from-emerald-400 to-teal-500",
    glow: "rgba(52,211,153,0.5)",
  },
  "Home Stylist": {
    gradient: "from-sky-400 to-blue-500",
    glow: "rgba(56,189,248,0.5)",
  },
  "Lifestyle Consultant": {
    gradient: "from-violet-500 to-purple-600",
    glow: "rgba(167,139,250,0.5)",
  },
  "Lifestyle Elite": {
    gradient: "from-sky-400 via-sky-400 to-rose-400",
    glow: "rgba(251,191,36,0.6)",
  },
}

const ALL_TIERS: { rank: number; tier: MemberTier }[] = [
  { rank: 1, tier: "Home Starter" },
  { rank: 2, tier: "Home Builder" },
  { rank: 3, tier: "Home Stylist" },
  { rank: 4, tier: "Lifestyle Consultant" },
  { rank: 5, tier: "Lifestyle Elite" },
]

type TierReq = {
  pv: number
  referrals: number
  activeMembers?: number
  activeBuilders?: number
  activeLeaders?: number
}
const NEXT_TIER_REQUIREMENTS: Record<number, TierReq> = {
  1: { pv: 300, referrals: 2 },
  2: { pv: 1000, referrals: 5, activeMembers: 2 },
  3: { pv: 3000, referrals: 10, activeBuilders: 5 },
  4: { pv: 8000, referrals: 20, activeLeaders: 10 },
}

const rankToTier = (rank: number): MemberTier => {
  if (rank >= 5) return "Lifestyle Elite"
  if (rank === 4) return "Lifestyle Consultant"
  if (rank === 3) return "Home Stylist"
  if (rank === 2) return "Home Builder"
  return "Home Starter"
}

interface Props {
  effectiveRank: number
  loyaltyTier: MemberTier
  snapshot: AccountSnapshot | undefined
}

export default function LevelsTab({
  effectiveRank,
  loyaltyTier,
  snapshot,
}: Props) {
  const currCover = TIER_COVER[loyaltyTier]
  const pvNow = snapshot?.loyalty?.personal_pv ?? 0
  const refsNow = snapshot?.loyalty?.referral_count ?? 0
  const amNow = snapshot?.loyalty?.active_members_count ?? 0
  const abNow = snapshot?.loyalty?.active_builders_count ?? 0
  const alNow = snapshot?.loyalty?.active_leaders_count ?? 0

  const nextRank = Math.min(5, effectiveRank + 1)
  const nextTier = rankToTier(nextRank)
  const nextCover = TIER_COVER[nextTier]
  const reqs = NEXT_TIER_REQUIREMENTS[effectiveRank]

  type ReqRow = { label: string; hint: string; current: number; target: number }
  const rows: ReqRow[] =
    effectiveRank < 5 && reqs
      ? [
          {
            label: "Personal PV",
            hint: "Buy products to earn PV",
            current: pvNow,
            target: reqs.pv,
          },
          {
            label: "Direct Referrals",
            hint: "Invite friends using your referral link",
            current: refsNow,
            target: reqs.referrals,
          },
          ...(reqs.activeMembers
            ? [
                {
                  label: "Active Members",
                  hint: "Directs who earned 300+ PV",
                  current: amNow,
                  target: reqs.activeMembers,
                },
              ]
            : []),
          ...(reqs.activeBuilders
            ? [
                {
                  label: "Active Builders",
                  hint: "Directs at Home Builder rank or higher",
                  current: abNow,
                  target: reqs.activeBuilders,
                },
              ]
            : []),
          ...(reqs.activeLeaders
            ? [
                {
                  label: "Active Leaders",
                  hint: "Directs at Home Stylist rank or higher",
                  current: alNow,
                  target: reqs.activeLeaders,
                },
              ]
            : []),
        ]
      : []

  const allMet = rows.length > 0 && rows.every((r) => r.current >= r.target)
  const overallPct =
    rows.length > 0
      ? Math.round(
          rows.reduce(
            (acc, r) =>
              acc +
              Math.min(100, r.target > 0 ? (r.current / r.target) * 100 : 100),
            0
          ) / rows.length
        )
      : 100

  return (
    <motion.div
      key="levels"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* ── Hero: Current Level ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
        <div
          className={`bg-gradient-to-br ${currCover.gradient} relative overflow-hidden`}
        >
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
          </div>

          <div className="relative z-10 flex flex-col items-center px-6 py-10 text-center">
            {/* Large badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
              className="mb-5"
            >
              <div
                className="inline-block rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-md"
                style={{
                  boxShadow: `0 20px 60px ${currCover.glow}, 0 0 0 1px rgba(255,255,255,0.15)`,
                }}
              >
                <img
                  src={TIER_BADGE_IMAGE[loyaltyTier]}
                  alt={loyaltyTier}
                  className="h-36 w-36 object-contain drop-shadow-2xl"
                />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="text-3xl font-black tracking-tight text-white drop-shadow-sm"
            >
              {loyaltyTier}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-2 flex items-center gap-2"
            >
              <span className="rounded-full border border-white/25 bg-white/20 px-3 py-1 text-xs font-bold text-white/90 backdrop-blur-sm">
                Rank {effectiveRank}
              </span>
              {effectiveRank >= 5 && (
                <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-amber-900">
                  MAX TIER
                </span>
              )}
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-6 grid w-full max-w-sm grid-cols-3 gap-3"
            >
              {[
                { label: "PV Earned", value: pvNow.toLocaleString() },
                { label: "Referrals", value: refsNow.toString() },
                { label: "Active", value: amNow.toString() },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/25 bg-white/15 px-2 py-3.5 text-center backdrop-blur-sm"
                >
                  <p className="text-2xl leading-none font-black text-white">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-white/70">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Path to Next Level ── */}
      {effectiveRank < 5 && reqs && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
          {/* Header bar */}
          <div
            className={`bg-gradient-to-r ${nextCover.gradient} flex items-center justify-between px-6 py-4`}
          >
            <div>
              <p className="text-[11px] font-bold tracking-wider text-white/70 uppercase">
                Path to
              </p>
              <p className="text-xl leading-tight font-black text-white">
                {nextTier}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl leading-none font-black text-white">
                {overallPct}%
              </p>
              <p className="mt-0.5 text-[11px] text-white/70">Overall</p>
            </div>
          </div>

          <div className="p-5 md:p-6">
            {/* Large badge comparison */}
            <div className="mb-7 flex items-center justify-center gap-6">
              {/* Current */}
              <div className="flex flex-col items-center gap-2.5">
                <div
                  className={`rounded-2xl bg-gradient-to-br ${currCover.gradient} p-4 opacity-65`}
                >
                  <img
                    src={TIER_BADGE_IMAGE[loyaltyTier]}
                    alt={loyaltyTier}
                    className="h-20 w-20 object-contain"
                  />
                </div>
                <p className="max-w-[90px] text-center text-xs leading-tight font-bold text-slate-500 dark:text-gray-400">
                  {loyaltyTier}
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-gray-400">
                  Rank {effectiveRank}
                </span>
              </div>

              {/* Glowing arrow */}
              <div
                className={`h-12 w-12 rounded-full bg-gradient-to-br ${nextCover.gradient} flex shrink-0 items-center justify-center shadow-xl`}
                style={{ boxShadow: `0 6px 24px ${nextCover.glow}` }}
              >
                <svg
                  className="h-6 w-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
              </div>

              {/* Next */}
              <div className="flex flex-col items-center gap-2.5">
                <div
                  className={`rounded-2xl bg-gradient-to-br ${nextCover.gradient} p-4`}
                  style={{ boxShadow: `0 10px 32px ${nextCover.glow}` }}
                >
                  <img
                    src={TIER_BADGE_IMAGE[nextTier]}
                    alt={nextTier}
                    className="h-20 w-20 object-contain drop-shadow-lg"
                  />
                </div>
                <p className="max-w-[90px] text-center text-xs leading-tight font-bold text-slate-700 dark:text-white">
                  {nextTier}
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-gray-300">
                  Rank {nextRank}
                </span>
              </div>
            </div>

            {/* Requirement cards */}
            <div className="space-y-3">
              {rows.map((row, i) => {
                const pct = Math.min(
                  100,
                  row.target > 0 ? (row.current / row.target) * 100 : 100
                )
                const met = row.current >= row.target
                const remaining = Math.max(0, row.target - row.current)

                return (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                    className={`rounded-2xl border p-4 transition-colors ${
                      met
                        ? "border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50/60 dark:border-emerald-800/50 dark:from-emerald-900/15 dark:to-teal-900/10"
                        : "border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-gray-800/60"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            met
                              ? "bg-emerald-100 dark:bg-emerald-900/50"
                              : "border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-gray-700"
                          }`}
                        >
                          {met ? (
                            <svg
                              className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          ) : (
                            <svg
                              className="h-4 w-4 text-slate-400 dark:text-slate-500"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="12" r="9" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-bold ${met ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-gray-200"}`}
                          >
                            {row.label}
                          </p>
                          <p className="truncate text-[11px] text-slate-400 dark:text-gray-500">
                            {row.hint}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`text-xl leading-none font-black tabular-nums ${met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-gray-100"}`}
                        >
                          {row.current.toLocaleString()}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-gray-500">
                          of {row.target.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full border border-slate-100 bg-white shadow-inner dark:border-slate-600 dark:bg-gray-700">
                      <motion.div
                        className={`h-full rounded-full ${met ? "bg-gradient-to-r from-emerald-400 to-teal-500" : `bg-gradient-to-r ${nextCover.gradient}`}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          duration: 1,
                          ease: "easeOut",
                          delay: 0.1 + 0.05 * i,
                        }}
                      />
                    </div>

                    {!met && remaining > 0 && (
                      <p className="mt-1.5 text-[11px] text-slate-400 dark:text-gray-500">
                        {remaining.toLocaleString()} more needed
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* All met celebration */}
            {allMet && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
                className={`mt-5 rounded-2xl bg-gradient-to-r ${nextCover.gradient} p-5 text-center`}
                style={{ boxShadow: `0 8px 32px ${nextCover.glow}` }}
              >
                <p className="text-base font-black text-white">
                  🎉 You've unlocked {nextTier}!
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/80">
                  All requirements met. Your rank updates automatically after
                  your next order's PV is posted.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ── Tier Roadmap ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-gray-800">
        <div className="mb-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Tier Roadmap
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
            Your full journey from Starter to Elite
          </p>
        </div>

        <div className="flex [scrollbar-width:none] items-stretch overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
          {ALL_TIERS.map(({ rank, tier }, idx) => {
            const isCompleted = effectiveRank > rank
            const isCurrent = effectiveRank === rank
            const cover = TIER_COVER[tier]

            return (
              <div key={rank} className="flex shrink-0 items-center">
                {/* Tier card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx, duration: 0.35 }}
                  className={`flex w-[90px] flex-col items-center gap-2.5 rounded-2xl border-2 p-3 transition-all md:w-[104px] ${
                    isCurrent
                      ? "scale-[1.04] bg-white shadow-lg dark:bg-gray-800"
                      : isCompleted
                        ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-900/10"
                        : "border-slate-100 bg-slate-50/40 opacity-55 dark:border-slate-700/60 dark:bg-gray-800/40"
                  }`}
                  style={
                    isCurrent
                      ? {
                          borderColor: cover.glow.replace(/[\d.]+\)$/, "1)"),
                          boxShadow: `0 4px 20px ${cover.glow}`,
                        }
                      : {}
                  }
                >
                  {/* Badge with status overlay */}
                  <div className="relative">
                    {isCompleted ? (
                      <>
                        <div
                          className={`rounded-xl bg-gradient-to-br ${cover.gradient} p-2.5 opacity-65`}
                        >
                          <img
                            src={TIER_BADGE_IMAGE[tier]}
                            alt={tier}
                            className="h-14 w-14 object-contain"
                          />
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-gray-800">
                          <svg
                            style={{ width: 11, height: 11 }}
                            className="text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        </div>
                      </>
                    ) : isCurrent ? (
                      <div
                        className={`rounded-xl bg-gradient-to-br ${cover.gradient} p-2.5`}
                        style={{ boxShadow: `0 6px 18px ${cover.glow}` }}
                      >
                        <img
                          src={TIER_BADGE_IMAGE[tier]}
                          alt={tier}
                          className="h-14 w-14 object-contain drop-shadow-md"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="rounded-xl bg-slate-200 p-2.5 dark:bg-slate-700">
                          <img
                            src={TIER_BADGE_IMAGE[tier]}
                            alt={tier}
                            className="h-14 w-14 object-contain opacity-20 grayscale"
                          />
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-400 dark:border-gray-800 dark:bg-slate-600">
                          <svg
                            style={{ width: 11, height: 11 }}
                            className="text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                          </svg>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Name + status */}
                  <div className="text-center">
                    <p
                      className={`text-[10px] leading-snug font-bold ${
                        isCurrent
                          ? "text-slate-800 dark:text-white"
                          : isCompleted
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-slate-400 dark:text-gray-500"
                      }`}
                    >
                      {tier}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isCurrent
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : isCompleted
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-gray-500"
                      }`}
                    >
                      {isCurrent
                        ? "★ You"
                        : isCompleted
                          ? "✓ Done"
                          : `Rank ${rank}`}
                    </span>
                  </div>
                </motion.div>

                {/* Connector */}
                {idx < ALL_TIERS.length - 1 && (
                  <div className="mx-1.5 flex shrink-0 items-center">
                    <div
                      className={`h-0.5 w-3 rounded-full ${isCompleted ? "bg-emerald-300 dark:bg-emerald-700" : "bg-slate-200 dark:bg-slate-700"}`}
                    />
                    <svg
                      style={{ width: 12, height: 12 }}
                      className={
                        isCompleted
                          ? "text-emerald-400 dark:text-emerald-600"
                          : "text-slate-300 dark:text-slate-600"
                      }
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
