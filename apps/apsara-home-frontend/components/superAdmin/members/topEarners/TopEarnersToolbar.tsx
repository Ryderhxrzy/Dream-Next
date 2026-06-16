"use client"

import { motion } from "framer-motion"

import { SortKey, TIERS } from "./types"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "earnings", label: "Earnings" },
  { key: "orders", label: "Orders" },
  { key: "referrals", label: "Referrals" },
  { key: "totalSpent", label: "Spent" },
]

const PERIODS = ["All Time", "This Month", "Last 30 Days", "This Year"]

interface TopEarnersToolbarProps {
  search: string
  onSearch: (v: string) => void
  tierFilter: string
  onTierFilter: (v: string) => void
  period: string
  onPeriod: (v: string) => void
  sortKey: SortKey
  onSortKey: (v: SortKey) => void
}

export default function TopEarnersToolbar({
  search,
  onSearch,
  tierFilter,
  onTierFilter,
  period,
  onPeriod,
  sortKey,
  onSortKey,
}: TopEarnersToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {/* Search */}
        <div className="relative min-w-[180px] flex-1">
          <svg
            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
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
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search member or email..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-9 text-sm text-slate-700 placeholder-slate-400 transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-sky-500"
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Tier filter */}
        <select
          value={tierFilter}
          onChange={(e) => onTierFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {TIERS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        {/* Period filter */}
        <select
          value={period}
          onChange={(e) => onPeriod(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {PERIODS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        {/* Sort pills */}
        <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSortKey(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                sortKey === opt.key
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
