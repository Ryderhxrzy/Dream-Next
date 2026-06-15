"use client"

import type { ReactNode } from "react"

interface PvStatCardProps {
  label: string
  value: number | string
  accent?: "blue" | "sky" | "violet" | "emerald"
  helper?: string
  icon?: ReactNode
}

const accentStyles = {
  blue: {
    card: "border-sky-100 bg-white/95 dark:border-sky-800/60 dark:bg-slate-900/80",
    bar: "from-sky-500 to-cyan-400",
    halo: "from-sky-200/70 to-cyan-100/30 dark:from-sky-500/20 dark:to-cyan-500/10",
    badge:
      "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/70",
    label: "text-sky-600 dark:text-sky-400",
    value: "text-sky-900 dark:text-sky-100",
  },
  sky: {
    card: "border-cyan-100 bg-white/95 dark:border-cyan-800/60 dark:bg-slate-900/80",
    bar: "from-cyan-500 to-sky-400",
    halo: "from-cyan-200/70 to-sky-100/30 dark:from-cyan-500/20 dark:to-sky-500/10",
    badge:
      "bg-cyan-50 text-cyan-600 ring-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-800/70",
    label: "text-sky-600 dark:text-sky-400",
    value: "text-sky-900 dark:text-sky-100",
  },
  emerald: {
    card: "border-emerald-100 bg-white/95 dark:border-emerald-800/60 dark:bg-slate-900/80",
    bar: "from-emerald-500 to-teal-400",
    halo: "from-emerald-200/70 to-teal-100/30 dark:from-emerald-500/20 dark:to-teal-500/10",
    badge:
      "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/70",
    label: "text-emerald-700 dark:text-emerald-400",
    value: "text-emerald-900 dark:text-emerald-100",
  },
  violet: {
    card: "border-violet-100 bg-white/95 dark:border-violet-800/60 dark:bg-slate-900/80",
    bar: "from-violet-500 to-fuchsia-400",
    halo: "from-violet-200/70 to-fuchsia-100/30 dark:from-violet-500/20 dark:to-fuchsia-500/10",
    badge:
      "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800/70",
    label: "text-violet-700 dark:text-violet-400",
    value: "text-violet-900 dark:text-violet-100",
  },
}

const PvStatCard = ({
  label,
  value,
  accent = "blue",
  helper,
  icon,
}: PvStatCardProps) => {
  const s = accentStyles[accent]
  const isNumber = typeof value === "number"
  const display = isNumber ? value.toLocaleString() : String(value)

  return (
    <div
      className={`group relative flex min-h-[170px] flex-col overflow-hidden rounded-2xl border ${s.card} shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80 dark:shadow-black/20`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.bar}`}
      />
      <div
        className={`pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-gradient-to-br ${s.halo}`}
      />
      <div
        className={`relative flex min-h-[58px] items-center justify-between gap-4 border-b border-slate-100/80 px-5 py-3 ring-1 ring-inset ${s.badge} dark:border-slate-700/70`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {icon}
            </span>
          )}
          <p
            className={`whitespace-normal break-words text-[11px] font-black uppercase leading-snug tracking-[0.12em] ${s.label}`}
          >
            {label}
          </p>
        </div>
        <img
          src="/af_home_logo.png"
          alt=""
          aria-hidden="true"
          className="mt-0.5 h-5 w-auto opacity-45 grayscale transition duration-200 group-hover:opacity-80 group-hover:grayscale-0 dark:opacity-60"
        />
      </div>

      <div className="relative px-5 pt-5">
        <p
          className={`text-3xl font-black tabular-nums tracking-normal ${s.value}`}
        >
          {display}
        </p>
      </div>

      {helper && (
        <p className="relative mx-5 mt-auto border-t border-slate-200/80 py-4 text-xs leading-relaxed text-slate-500 dark:border-slate-700/70 dark:text-gray-400">
          {helper}
        </p>
      )}
    </div>
  )
}

export default PvStatCard
