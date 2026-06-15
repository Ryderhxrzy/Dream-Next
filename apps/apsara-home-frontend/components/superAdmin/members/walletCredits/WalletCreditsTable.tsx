"use client"

import { motion } from "framer-motion"

import AvatarImg from "@/components/superAdmin/AvatarImg"
import DataTableShell from "@/components/superAdmin/DataTableShell"

import {
  getInitials,
  MemberWallet,
  php,
  pv,
  STATUS_CONFIG,
  TIER_COLORS,
  timeAgo,
} from "./types"

interface WalletCreditsTableProps {
  wallets: MemberWallet[]
  sortKey: string
  onAdjust: (member: MemberWallet) => void
  onViewBreakdown: (member: MemberWallet) => void
}

function WalletRow({
  wallet,
  onAdjust,
  onViewBreakdown,
}: {
  wallet: MemberWallet
  onAdjust: () => void
  onViewBreakdown: () => void
}) {
  const tier =
    TIER_COLORS[wallet.tier] ?? "bg-slate-100 text-slate-600 border-slate-200"
  const status = STATUS_CONFIG[wallet.status]

  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      {/* Member */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <AvatarImg
            src={wallet.avatar}
            name={wallet.name}
            size="h-9 w-9"
            bg="bg-gradient-to-br from-teal-400 to-teal-600"
            textSize="text-xs"
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {wallet.name}
            </p>
            <p className="text-xs text-slate-400">{wallet.email}</p>
          </div>
        </div>
      </td>

      {/* Tier */}
      <td className="px-4 py-3.5">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tier}`}
        >
          {wallet.tier}
        </span>
      </td>

      {/* Cash Balance */}
      <td className="px-4 py-3.5">
        <p className="text-sm font-bold text-emerald-700">
          {php(wallet.cashBalance)}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          <span className="text-teal-600">+{php(wallet.cashCredits)}</span>
          {" / "}
          <span className="text-rose-500">-{php(wallet.cashDebits)}</span>
        </p>
      </td>

      {/* PV Balance */}
      <td className="px-4 py-3.5">
        <p className="text-sm font-bold text-blue-700">
          {pv(wallet.pvBalance)}
        </p>
      </td>

      {/* Locked */}
      <td className="px-4 py-3.5">
        <span className="text-sm font-semibold text-sky-700">
          {php(wallet.lockedAmount)}
        </span>
      </td>

      {/* Available */}
      <td className="px-4 py-3.5">
        <span className="text-sm font-semibold text-teal-700">
          {php(wallet.availableAmount)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
          <span className={`text-xs font-medium ${status.text}`}>
            {status.label}
          </span>
        </div>
      </td>

      {/* Last transaction */}
      <td className="px-4 py-3.5 text-xs whitespace-nowrap text-slate-400">
        {timeAgo(wallet.lastTransaction)}
      </td>

      {/* Action */}
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onViewBreakdown}
            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-all hover:bg-sky-100"
          >
            PV Breakdown
          </button>
          <button
            onClick={onAdjust}
            className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-all hover:bg-teal-100"
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
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Adjust
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function WalletCreditsTable({
  wallets,
  sortKey,
  onAdjust,
  onViewBreakdown,
}: WalletCreditsTableProps) {
  const totalCash = wallets.reduce((s, m) => s + m.cashBalance, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-0"
    >
      <DataTableShell
        title="Member Wallets"
        subtitle="Review cash and PV wallet balances"
        badge={
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            By {sortKey.replace(/([A-Z])/g, " $1").toLowerCase()}
          </span>
        }
        footer={
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {wallets.length}
              </span>{" "}
              members
            </span>
            <span>
              Total cash balance:{" "}
              <span className="font-bold text-emerald-600">
                {php(totalCash)}
              </span>
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Member
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Tier
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Cash Balance
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  PV Balance
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Locked
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Available
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Last Txn
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {wallets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="h-8 w-8 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <p className="text-sm font-semibold text-slate-500">
                        No members found
                      </p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your search or filter
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                wallets.map((w) => (
                  <WalletRow
                    key={w.id}
                    wallet={w}
                    onAdjust={() => onAdjust(w)}
                    onViewBreakdown={() => onViewBreakdown(w)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </motion.div>
  )
}
