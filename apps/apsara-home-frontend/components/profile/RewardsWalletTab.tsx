"use client"

import { FormEvent, useMemo, useState } from "react"
import { AffiliateVoucherItem } from "@/store/api/encashmentApi"
import {
  BadgePercent,
  CalendarDays,
  Hash,
  Sparkles,
  TicketPercent,
} from "lucide-react"

interface RewardsWalletTabProps {
  afVoucherBalance: number
  afVoucherSourceBalance: number
  personalCashbackBalance: number
  personalCashbackSourceBalance: number
  personalCashbackReservedBalance: number
  cashbackRate?: number
  vouchers: AffiliateVoucherItem[]
  isCreatingVoucher?: boolean
  onCreateVoucher: (payload: {
    amount: number
    expires_at?: string
    max_uses?: number
  }) => Promise<void>
}

const peso = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value || 0)

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const colorGradients = [
  "from-orange-400 via-orange-500 to-amber-500",
  "from-violet-500 via-indigo-500 to-cyan-500",
  "from-emerald-400 via-teal-500 to-sky-500",
  "from-rose-500 via-fuchsia-500 to-purple-600",
]

const getGradientColor = (id: number | string) => {
  const key = String(id ?? "0")
  const index = key.charCodeAt(0) % colorGradients.length
  return colorGradients[index]
}

const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  active: {
    label: "Active",
    cls: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 ring-1 ring-sky-200 dark:ring-sky-800",
    dot: "bg-sky-500",
  },
  redeemed: {
    label: "Redeemed",
    cls: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-800",
    dot: "bg-rose-500",
  },
  expired: {
    label: "Expired",
    cls: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 ring-1 ring-sky-200 dark:ring-sky-800",
    dot: "bg-sky-500",
  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    cls: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy code"
      className={`ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all ${
        copied
          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
          : "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-gray-300"
      }`}
    >
      {copied ? (
        <>
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

export default function RewardsWalletTab({
  afVoucherBalance,
  afVoucherSourceBalance,
  personalCashbackBalance,
  personalCashbackSourceBalance,
  personalCashbackReservedBalance,
  cashbackRate = 0,
  vouchers,
  isCreatingVoucher = false,
  onCreateVoucher,
}: RewardsWalletTabProps) {
  const displayCashbackRate =
    cashbackRate > 0 && cashbackRate <= 1 ? cashbackRate * 100 : cashbackRate
  const [voucherAmount, setVoucherAmount] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const activeVoucherCount = useMemo(
    () => vouchers.filter((voucher) => voucher.status === "active").length,
    [vouchers]
  )

  const todayStr = new Date().toISOString().split("T")[0]

  const handleCreateVoucher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    const amount = Number(voucherAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({
        type: "error",
        text: "Enter a valid voucher amount greater than zero.",
      })
      return
    }

    const uses = maxUses.trim() ? Number(maxUses) : undefined
    if (uses !== undefined && (!Number.isInteger(uses) || uses < 1)) {
      setMessage({
        type: "error",
        text: "Max uses must be a whole number of at least 1.",
      })
      return
    }

    const requiredBalance = amount * (uses ?? 1)
    if (requiredBalance > personalCashbackBalance) {
      setMessage({
        type: "error",
        text: `Insufficient personal cashback balance. Available: ${peso(personalCashbackBalance)}.`,
      })
      return
    }

    try {
      await onCreateVoucher({
        amount,
        expires_at: expiresAt || undefined,
        max_uses: uses,
      })

      setVoucherAmount("")
      setExpiresAt("")
      setMaxUses("")
      setMessage({
        type: "success",
        text: "Personal cashback discount created successfully.",
      })
    } catch (error) {
      const fallback = "Failed to create personal cashback discount."
      const text =
        typeof error === "object" && error && "data" in error
          ? ((error as { data?: { message?: string } }).data?.message ??
            fallback)
          : fallback

      setMessage({ type: "error", text })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-white shadow-sm dark:border-amber-800/40 dark:bg-gray-900">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-sky-500" />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-200/60 dark:shadow-orange-950/30">
                <TicketPercent className="h-6 w-6" strokeWidth={2.3} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
                  AF-Voucher Balance
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {peso(afVoucherBalance)}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Profile rewards and existing AF-Voucher credits.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left dark:border-slate-700 dark:bg-slate-800 sm:min-w-32 sm:text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Active Codes
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {activeVoucherCount}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-rose-200/70 bg-white shadow-sm dark:border-rose-800/40 dark:bg-gray-900">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 via-pink-500 to-orange-500" />
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-200/60 dark:shadow-rose-950/30">
                <BadgePercent className="h-6 w-6" strokeWidth={2.3} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
                  Personal Cashback Balance
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {peso(personalCashbackBalance)}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Available cashback from your own delivered or completed
                  purchase PV.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Earned
                </p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {peso(personalCashbackSourceBalance)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Reserved
                </p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {peso(personalCashbackReservedBalance)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Rate
                </p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {displayCashbackRate.toLocaleString("en-PH", {
                    minimumFractionDigits:
                      displayCashbackRate % 1 === 0 ? 0 : 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Voucher Studio + Program Notes ── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Create Voucher */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-gray-800/70 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
                <BadgePercent className="h-5 w-5" strokeWidth={2.3} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Create Personal Cashback Discount
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Reserve available cashback into a shareable discount code
                </p>
              </div>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Active
              </p>
              <p className="text-sm font-black">{activeVoucherCount}</p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <form className="space-y-5" onSubmit={handleCreateVoucher}>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">
                  Discount Amount <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 dark:text-slate-500">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={voucherAmount}
                    onChange={(e) => setVoucherAmount(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:border-slate-700 dark:bg-gray-950 dark:text-white dark:focus:border-amber-600 dark:focus:ring-amber-900/40"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Valid Until{" "}
                    <span className="font-normal normal-case text-slate-400 dark:text-slate-500">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:border-slate-700 dark:bg-gray-950 dark:text-white dark:focus:border-amber-600 dark:focus:ring-amber-900/40"
                  />
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Leave blank for no expiry.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <Hash className="h-3.5 w-3.5" />
                    Max Uses{" "}
                    <span className="font-normal normal-case text-slate-400 dark:text-slate-500">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:border-slate-700 dark:bg-gray-950 dark:text-white dark:focus:border-amber-600 dark:focus:ring-amber-900/40"
                    placeholder="e.g. 1"
                  />
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Leave blank for unlimited uses.
                  </p>
                </div>
              </div>

              {message ? (
                <div
                  className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${
                    message.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800"
                      : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-800"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {message.type === "success" ? "✓" : "✕"}
                  </span>
                  <span>{message.text}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isCreatingVoucher}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-black text-white shadow-lg shadow-orange-200/60 transition hover:from-amber-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-orange-950/30"
              >
                <Sparkles className="h-4 w-4" />
                {isCreatingVoucher ? "Creating..." : "Create Discount"}
              </button>

              <p className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-[11px] leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                The reserved amount is deducted from your available personal
                cashback balance immediately and returned if the code is
                cancelled.
              </p>
            </form>
          </div>
        </div>

        {/* Program Notes */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-900">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-gray-800/70">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Program Notes
            </p>
          </div>
          <div className="px-5 pb-5 pt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-gray-950">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Cashback Rate
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {displayCashbackRate.toLocaleString("en-PH", {
                  minimumFractionDigits: displayCashbackRate % 1 === 0 ? 0 : 2,
                  maximumFractionDigits: 2,
                })}
                %
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Current personal cashback percentage from your own delivered or
                completed purchase PV.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-gray-950">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                AF-Voucher Pool
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {peso(afVoucherSourceBalance)}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Existing AF-Voucher rewards, separate from cashback-backed
                voucher creation.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 px-4 py-4 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                How voucher creation works
              </p>
              {[
                "Create a discount code from your available personal cashback balance.",
                "Set an optional expiry date and usage limit.",
                "Share the generated code with your customer.",
                "The amount stays reserved until redeemed, cancelled, or expired.",
              ].map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2.5 text-xs leading-5 text-slate-500 dark:text-slate-400"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Issued Vouchers ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-gray-800/70">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Issued Vouchers
            </p>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
              Your shareable codes
            </h3>
          </div>
          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-gray-950 dark:text-slate-400">
            {vouchers.length} total / {activeVoucherCount} active
          </span>
        </div>

        <div className="p-5">
          {vouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
                <svg
                  className="h-6 w-6 text-slate-300 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                No vouchers yet
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Create your first affiliate voucher above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vouchers.map((voucher) => {
                const gradient = getGradientColor(voucher.id)
                const usesText =
                  voucher.max_uses != null
                    ? `${voucher.used_count ?? 0} / ${voucher.max_uses}`
                    : "∞ uses"

                return (
                  <div
                    key={voucher.id}
                    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r ${gradient} p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)]`}
                  >
                    <span className="pointer-events-none absolute left-0 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20" />
                    <span className="pointer-events-none absolute right-0 top-1/2 h-7 w-7 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20" />

                    <div className="grid items-center gap-4 lg:grid-cols-[1.7fr_1.15fr_0.75fr]">
                      <div className="space-y-3 text-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/15">
                            <TicketPercent
                              className="h-6 w-6"
                              strokeWidth={2.3}
                            />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/80">
                              discount voucher
                            </p>
                            <p className="mt-1 text-2xl font-black tracking-tight">
                              ₱
                              {(voucher.amount || 0).toLocaleString("en-PH", {
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                            {voucher.code}
                          </span>
                          <CopyButton text={voucher.code} />
                        </div>
                      </div>

                      <div className="grid gap-3 rounded-2xl bg-white/10 p-3 text-sm text-white/95 ring-1 ring-white/10">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                            Valid until
                          </p>
                          <p className="font-semibold">
                            {voucher.expires_at
                              ? formatDate(voucher.expires_at)
                              : "No expiry"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                            Uses
                          </p>
                          <p className="font-semibold">{usesText}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                            Created
                          </p>
                          <p className="font-semibold">
                            {formatDate(voucher.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white/10 p-4 text-white/95 ring-1 ring-white/10">
                        <div className="flex items-center justify-between gap-3">
                          <StatusBadge status={voucher.status} />
                        </div>
                        <p className="text-right text-xs uppercase tracking-[0.2em] text-white/75">
                          {usesText}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
