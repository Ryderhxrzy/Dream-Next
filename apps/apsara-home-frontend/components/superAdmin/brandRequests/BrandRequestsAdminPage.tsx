"use client"

import { useState } from "react"
import Image from "next/image"
import {
  useDecideBrandRequestMutation,
  useGetAdminBrandRequestsQuery,
  type BrandRequestItem,
} from "@/store/api/brandRequestsApi"
import { showErrorToast, showSuccessToast } from "@/libs/toast"

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
}

const getErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as { data?: { message?: string } })?.data
  return data?.message ?? fallback
}

export default function BrandRequestsAdminPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending")
  const { data, isLoading } = useGetAdminBrandRequestsQuery(
    statusFilter === "all" ? undefined : { status: statusFilter }
  )
  const [decide, { isLoading: deciding }] = useDecideBrandRequestMutation()
  const [rejectTarget, setRejectTarget] = useState<BrandRequestItem | null>(
    null
  )
  const [rejectReason, setRejectReason] = useState("")

  const requests = data?.requests ?? []
  const counts = data?.counts

  const handleApprove = async (r: BrandRequestItem) => {
    try {
      const res = await decide({ id: r.id, action: "approve" }).unwrap()
      showSuccessToast(res.message)
    } catch (err) {
      showErrorToast(getErrorMessage(err, "Unable to approve request."))
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    try {
      const res = await decide({
        id: rejectTarget.id,
        action: "reject",
        reason: rejectReason.trim() || undefined,
      }).unwrap()
      showSuccessToast(res.message)
      setRejectTarget(null)
      setRejectReason("")
    } catch (err) {
      showErrorToast(getErrorMessage(err, "Unable to reject request."))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Brand Requests
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Merchants request brands here. Approving instantly creates the brand
          owned by that merchant; rejecting lets you send a reason.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
              statusFilter === s
                ? "bg-slate-900 text-white dark:bg-cyan-600"
                : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {s}
            {counts && s !== "all" ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-400">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            No {statusFilter === "all" ? "" : statusFilter} requests.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.image ? (
                      <Image
                        src={r.image}
                        alt={r.name}
                        width={28}
                        height={28}
                        unoptimized
                        className="h-7 w-7 rounded-md object-cover"
                      />
                    ) : null}
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {r.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Requested by{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {r.supplier_name ?? "—"}
                    </span>
                  </p>
                  {r.note ? (
                    <p className="mt-1 text-xs text-slate-500 italic dark:text-slate-400">
                      “{r.note}”
                    </p>
                  ) : null}
                  {r.status === "rejected" && r.reason ? (
                    <p className="mt-1 text-xs text-rose-600">
                      Reason: {r.reason}
                    </p>
                  ) : null}
                </div>
                {r.status === "pending" ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(r)}
                      disabled={deciding}
                      className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                    >
                      Approve &amp; create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectTarget(r)
                        setRejectReason("")
                      }}
                      disabled={deciding}
                      className="rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {rejectTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Reject “{rejectTarget.name}”
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Optionally tell the merchant why (they&apos;ll see this).
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="e.g. We already carry this brand under another merchant."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={deciding}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {deciding ? "Rejecting…" : "Reject request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
