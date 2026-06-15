"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Trophy, ShoppingBag, Users, Calendar, TrendingUp } from "lucide-react"
import TierBadge from "@/components/ui/TierBadge"
import { TopEarner, STATUS_CONFIG, MEDALS, php } from "./types"

function MemberAvatar({
  src,
  name,
  bgCls,
  size,
}: {
  src?: string
  name: string
  bgCls: string
  size: string
}) {
  const [err, setErr] = useState(false)
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        className={`rounded-full object-cover shrink-0 ${size}`}
      />
    )
  }
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center font-bold text-white ${size} ${bgCls}`}
    >
      {initials}
    </div>
  )
}

const RANK_STYLE: Record<number, { wrapper: string; text: string }> = {
  1: {
    wrapper:
      "bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-200 dark:shadow-amber-900/40 shadow-md",
    text: "text-white",
  },
  2: {
    wrapper:
      "bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-200 dark:shadow-slate-900/40 shadow-md",
    text: "text-white",
  },
  3: {
    wrapper:
      "bg-gradient-to-br from-orange-400 to-amber-500 shadow-orange-200 dark:shadow-orange-900/40 shadow-md",
    text: "text-white",
  },
}

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDALS[rank]
  const style = RANK_STYLE[rank]

  if (medal && style) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-base ${style.wrapper}`}
        >
          {medal.crown}
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {medal.label}
        </span>
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 mx-auto">
      <span className="text-xs font-black text-slate-500 dark:text-slate-400">
        #{rank}
      </span>
    </div>
  )
}

interface TableRowProps {
  earner: TopEarner
  rank: number
  maxEarnings: number
}

function TableRow({ earner, rank, maxEarnings }: TableRowProps) {
  const status = STATUS_CONFIG[earner.status] ?? STATUS_CONFIG.active
  const medal = MEDALS[rank]
  const pct =
    maxEarnings > 0 ? Math.min((earner.earnings / maxEarnings) * 100, 100) : 0
  const avatarBg = medal?.bg ?? "bg-gradient-to-br from-slate-500 to-slate-600"
  const isTopThree = rank <= 3

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03, duration: 0.25 }}
      className={`group transition-colors ${
        isTopThree
          ? "bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-900/5 dark:hover:bg-amber-900/10"
          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
      }`}
    >
      {/* Rank */}
      <td className="px-4 py-4 text-center w-16">
        <RankBadge rank={rank} />
      </td>

      {/* Member */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <MemberAvatar
            src={earner.avatar}
            name={earner.name}
            bgCls={avatarBg}
            size="h-10 w-10 text-xs"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">
              {earner.name}
            </p>
            <p className="mt-0.5 max-w-40 truncate text-[11px] text-slate-400 dark:text-slate-500">
              {earner.email}
            </p>
          </div>
        </div>
      </td>

      {/* Tier */}
      <td className="px-4 py-4">
        <TierBadge tier={earner.tier} sizeClassName="h-14 w-14" />
      </td>

      {/* Earnings */}
      <td className="px-4 py-4 min-w-42.5">
        <p className="text-sm font-black tabular-nums text-teal-700 dark:text-teal-300">
          {php(earner.earnings)}
        </p>
        <div className="mt-2 h-2 w-full max-w-32.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-linear-to-r from-teal-400 to-emerald-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
          {pct.toFixed(0)}% of top
        </p>
      </td>

      {/* Orders */}
      <td className="px-4 py-4">
        <div className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-2.5 py-1.5 dark:bg-indigo-900/20">
          <ShoppingBag className="h-3 w-3 text-indigo-400 dark:text-indigo-400" />
          <span className="text-xs font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
            {earner.orders}
          </span>
        </div>
      </td>

      {/* Referrals */}
      <td className="px-4 py-4">
        <div className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-2.5 py-1.5 dark:bg-violet-900/20">
          <Users className="h-3 w-3 text-violet-400 dark:text-violet-400" />
          <span className="text-xs font-bold tabular-nums text-violet-700 dark:text-violet-300">
            {earner.referrals}
          </span>
        </div>
      </td>

      {/* Total Spent */}
      <td className="px-4 py-4">
        <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800">
          <TrendingUp className="h-3 w-3 text-slate-400" />
          <span className="text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">
            {php(earner.totalSpent)}
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-transparent border-slate-200 dark:border-slate-700`}
        >
          <span className={`h-2 w-2 rounded-full shrink-0 ${status.dot}`} />
          <span className={status.text}>{status.label}</span>
        </div>
      </td>

      {/* Joined */}
      <td className="px-4 py-4">
        <div className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-2.5 py-1.5 dark:bg-sky-900/20">
          <Calendar className="h-3 w-3 text-sky-400" />
          <span className="text-[11px] font-semibold tabular-nums whitespace-nowrap text-sky-700 dark:text-sky-300">
            {new Date(earner.joinedAt).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </td>
    </motion.tr>
  )
}

interface TopEarnersTableProps {
  earners: TopEarner[]
  sortKey: string
  isLoading?: boolean
  isError?: boolean
}

export default function TopEarnersTable({
  earners,
  sortKey,
  isLoading = false,
  isError = false,
}: TopEarnersTableProps) {
  const maxEarnings = earners[0]?.earnings ?? 1
  const totalShown = earners.reduce((s, m) => s + m.earnings, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm"
    >
      {/* Table header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/15">
            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Full Rankings
          </h2>
          <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {earners.length}
          </span>
        </div>
        <span className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-[11px] font-semibold capitalize text-slate-500 dark:text-slate-400">
          Sorted by {sortKey}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-225 text-left">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-900">
              {[
                { label: "Rank", cls: "text-center w-16" },
                { label: "Member", cls: "" },
                { label: "Tier", cls: "" },
                { label: "Earnings", cls: "" },
                { label: "Orders", cls: "" },
                { label: "Referrals", cls: "" },
                { label: "Total Spent", cls: "" },
                { label: "Status", cls: "" },
                { label: "Joined", cls: "" },
              ].map(({ label, cls }) => (
                <th
                  key={label}
                  className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ${cls}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4">
                    <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                      <div className="space-y-2">
                        <div className="h-3 w-28 rounded-full bg-slate-100 dark:bg-slate-800" />
                        <div className="h-2.5 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </div>
                  </td>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-7 w-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
                      <svg
                        className="h-6 w-6 text-rose-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-rose-500">
                      Unable to load top earners.
                    </p>
                  </div>
                </td>
              </tr>
            ) : earners.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                      <Trophy className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      No members found
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Try adjusting your search or filter
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              earners.map((earner, i) => (
                <TableRow
                  key={earner.id}
                  earner={earner}
                  rank={i + 1}
                  maxEarnings={maxEarnings}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30 px-5 py-3.5">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Showing{" "}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {earners.length}
          </span>{" "}
          members
        </span>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-teal-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total earnings:{" "}
            <span className="font-black text-teal-600 dark:text-teal-400">
              {php(totalShown)}
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  )
}
