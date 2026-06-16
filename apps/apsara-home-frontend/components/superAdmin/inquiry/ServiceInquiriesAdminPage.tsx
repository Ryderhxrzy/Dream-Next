"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  useGetAdminServiceInquiriesQuery,
  useUpdateAdminServiceInquiryStatusMutation,
} from "@/store/api/serviceInquiriesApi"
import type {
  ServiceInquiryItem,
  ServiceInquiryStatus,
} from "@/store/api/serviceInquiriesApi"
import toast from "react-hot-toast"

type FilterStatus = "all" | ServiceInquiryStatus | "pending"
type DisplayStatus = "New" | "Pending" | "Complete"

const DISPLAY_STYLES: Record<DisplayStatus, string> = {
  New: "border border-blue-200/80 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  Pending:
    "border border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  Complete:
    "border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
}

const AVATAR_COLORS = [
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-violet-600",
  "from-sky-400 to-sky-600",
  "from-emerald-400 to-emerald-600",
  "from-rose-400 to-rose-600",
  "from-amber-400 to-amber-600",
]

function getDisplayStatus(item: ServiceInquiryItem): DisplayStatus {
  if (item.status === "closed" || item.status === "responded") return "Complete"
  if (item.status === "new" || item.status === "viewed") {
    if (!item.created_at) return "Pending"
    const d = new Date(item.created_at),
      now = new Date()
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    return sameDay ? "New" : "Pending"
  }
  return "New"
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export default function ServiceInquiriesAdminPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")
  const [selected, setSelected] = useState<ServiceInquiryItem | null>(null)

  const apiStatus: ServiceInquiryStatus | undefined =
    statusFilter === "pending" || statusFilter === "new"
      ? "new"
      : statusFilter !== "all"
        ? (statusFilter as ServiceInquiryStatus)
        : undefined

  const { data, isLoading, isError, refetch } =
    useGetAdminServiceInquiriesQuery(
      { status: apiStatus, per_page: 100 },
      { refetchOnMountOrArgChange: true }
    )
  const { data: allNewData } = useGetAdminServiceInquiriesQuery(
    { status: "new", per_page: 500 },
    { refetchOnMountOrArgChange: true }
  )

  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateAdminServiceInquiryStatusMutation()

  const rows = useMemo(() => {
    let source = data?.inquiries ?? []
    const q = search.trim().toLowerCase()
    if (q)
      source = source.filter((item) =>
        [
          item.fullname,
          item.email,
          item.contact,
          item.address,
          item.product?.pd_name,
        ].some((v) => v?.toLowerCase().includes(q))
      )
    if (statusFilter === "new")
      source = source.filter((i) => getDisplayStatus(i) === "New")
    if (statusFilter === "pending")
      source = source.filter((i) => getDisplayStatus(i) === "Pending")
    return source
  }, [data, search, statusFilter])

  const counts = data?.counts
  const newCount = useMemo(
    () =>
      (allNewData?.inquiries ?? []).filter((i) => getDisplayStatus(i) === "New")
        .length,
    [allNewData]
  )
  const pendingCount = useMemo(
    () =>
      (allNewData?.inquiries ?? []).filter(
        (i) => getDisplayStatus(i) === "Pending"
      ).length,
    [allNewData]
  )

  const handleStatusChange = async (
    id: number,
    status: ServiceInquiryStatus
  ) => {
    try {
      await updateStatus({ id, status }).unwrap()
      toast.success("Status updated.")
      if (selected?.id === id)
        setSelected((prev) => (prev ? { ...prev, status } : prev))
    } catch {
      toast.error("Failed to update status.")
    }
  }

  const statCards = [
    {
      key: "total",
      label: "Total Inquiries",
      count: counts?.total ?? 0,
      filterVal: "all" as FilterStatus,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
      iconBg: "bg-indigo-100 dark:bg-indigo-500/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      activeBg:
        "border-indigo-300 bg-indigo-50/60 dark:border-indigo-600 dark:bg-indigo-900/20",
      numColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      key: "new",
      label: "New",
      count: newCount,
      filterVal: "new" as FilterStatus,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.091z"
          />
        </svg>
      ),
      iconBg: "bg-blue-100 dark:bg-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      activeBg:
        "border-blue-300 bg-blue-50/60 dark:border-blue-600 dark:bg-blue-900/20",
      numColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "pending",
      label: "Pending",
      count: pendingCount,
      filterVal: "pending" as FilterStatus,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      iconBg: "bg-amber-100 dark:bg-amber-500/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      activeBg:
        "border-amber-300 bg-amber-50/60 dark:border-amber-600 dark:bg-amber-900/20",
      numColor: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "complete",
      label: "Complete",
      count: counts?.closed ?? 0,
      filterVal: "closed" as FilterStatus,
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      activeBg:
        "border-emerald-300 bg-emerald-50/60 dark:border-emerald-600 dark:bg-emerald-900/20",
      numColor: "text-emerald-600 dark:text-emerald-400",
    },
  ]

  return (
    <div className="space-y-5 pb-8">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => {
          const active = statusFilter === card.filterVal
          return (
            <button
              key={card.key}
              type="button"
              onClick={() =>
                setStatusFilter(
                  active && card.filterVal !== "all" ? "all" : card.filterVal
                )
              }
              className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
                active
                  ? `border-2 ${card.activeBg} -translate-y-0.5 shadow-md`
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div
                className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}
              >
                {card.icon}
              </div>
              <p className={`text-3xl font-bold ${card.numColor}`}>
                {card.count}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* ── Table panel ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Panel header / toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Service Inquiries
            </h2>
            <p className="text-sm text-slate-400">
              All service inquiries across suppliers
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <svg
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search inquiries…"
                className="h-10 w-56 rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-800 transition-all outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="pending">Pending</option>
              <option value="closed">Complete</option>
            </select>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 21v-5h5"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Table body */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                className="opacity-25"
              />
              <path d="M21 12a9 9 0 01-9-9" strokeLinecap="round" />
            </svg>
            Loading inquiries…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-6 w-6 text-rose-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l7.5-13c.866-1.5 3.032-1.5 3.898 0l7.206 12.374zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Failed to load inquiries
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-7 w-7 text-slate-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No inquiries found
            </p>
            <p className="text-xs text-slate-400">
              Try adjusting your search or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/50">
                  {[
                    "Inquirer",
                    "Service",
                    "Contact",
                    "Status",
                    "Date",
                    "Actions",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-6 py-3 text-left text-[11px] font-semibold tracking-wider text-slate-400 uppercase"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((item, idx) => {
                  const ini = initials(item.fullname)
                  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                  const ds = getDisplayStatus(item)
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${color} text-xs font-bold text-white`}
                          >
                            {ini || "?"}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                              {item.fullname}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {item.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[12px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                          {item.product?.pd_name ?? "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300">
                          <svg
                            className="h-3.5 w-3.5 shrink-0 text-slate-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                            />
                          </svg>
                          {item.contact || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${DISPLAY_STYLES[ds]}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${ds === "New" ? "bg-blue-500" : ds === "Pending" ? "bg-amber-500" : "bg-emerald-500"}`}
                          />
                          {ds}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                          <svg
                            className="h-3.5 w-3.5 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
                            />
                          </svg>
                          {formatDate(item.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!isLoading && !isError && rows.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {rows.length} of {counts?.total ?? rows.length}{" "}
              {counts?.total === 1 ? "inquiry" : "inquiries"}
            </p>
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/20">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-4 w-4 text-indigo-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-indigo-500 uppercase">
                    Service Inquiry
                  </p>
                  <h3 className="text-base leading-tight font-bold text-slate-900 dark:text-white">
                    {selected.fullname}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="h-3.5 w-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Detail rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <ModalRow
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                    />
                  </svg>
                }
                iconBg="bg-indigo-50 text-indigo-500 dark:bg-indigo-500/20"
                label="Service"
                value={selected.product?.pd_name ?? "—"}
              />
              <ModalRow
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                }
                iconBg="bg-emerald-50 text-emerald-500 dark:bg-emerald-500/20"
                label="Email"
                value={selected.email}
              />
              <ModalRow
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                    />
                  </svg>
                }
                iconBg="bg-emerald-50 text-emerald-500 dark:bg-emerald-500/20"
                label="Contact"
                value={selected.contact}
              />
              <ModalRow
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                }
                iconBg="bg-violet-50 text-violet-500 dark:bg-violet-500/20"
                label="Address"
                value={selected.address}
              />
              {selected.intent && (
                <ModalRow
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      className="h-3.5 w-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      />
                    </svg>
                  }
                  iconBg="bg-sky-50 text-sky-500 dark:bg-sky-500/20"
                  label="Intent"
                  value={selected.intent}
                />
              )}
              <ModalRow
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
                    />
                  </svg>
                }
                iconBg="bg-orange-50 text-orange-500 dark:bg-orange-500/20"
                label="Submitted"
                value={formatDate(selected.created_at)}
              />
            </div>

            {/* Status footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800">
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Status
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(selected.id, "new")}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected.status === "new" || selected.status === "viewed"
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  New
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(selected.id, "closed")}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected.status === "closed" ||
                    selected.status === "responded"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    className="h-3 w-3 text-emerald-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalRow({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode
  iconBg: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-2.5">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">
          {value}
        </p>
      </div>
    </div>
  )
}
