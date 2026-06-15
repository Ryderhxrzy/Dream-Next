"use client"

import Link from "next/link"

interface Props {
  title: string
  description: string
}

export default function AccountingSectionPlaceholder({
  title,
  description,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          {title}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          This module is now linked in the accounting workspace. You can
          continue by wiring data sources and table actions.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/accounting"
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/40"
          >
            Back to Accounting Dashboard
          </Link>
          <Link
            href="/admin/encashment"
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/40"
          >
            Open Encashment Queue
          </Link>
        </div>
      </div>
    </div>
  )
}
