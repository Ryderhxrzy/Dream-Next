'use client'

import { useMemo, useState } from 'react'
import { useGetAdminServiceInquiriesQuery, useUpdateAdminServiceInquiryStatusMutation } from '@/store/api/serviceInquiriesApi'
import type { ServiceInquiryStatus, ServiceInquiryItem } from '@/store/api/serviceInquiriesApi'
import toast from 'react-hot-toast'

type FilterStatus = 'all' | ServiceInquiryStatus | 'pending'
type DisplayStatus = 'New' | 'Pending' | 'Complete'

const DISPLAY_STYLES: Record<DisplayStatus, string> = {
  New: 'border border-blue-200/80 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  Pending: 'border border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  Complete: 'border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
}

const STATUS_STYLES: Record<ServiceInquiryStatus, string> = {
  new: DISPLAY_STYLES.New,
  viewed: DISPLAY_STYLES.New,
  responded: DISPLAY_STYLES.Complete,
  closed: DISPLAY_STYLES.Complete,
}

const STATUS_LABELS: Record<ServiceInquiryStatus, string> = {
  new: 'New',
  viewed: 'New',
  responded: 'Complete',
  closed: 'Complete',
}

const VISIBLE_STATUSES: ServiceInquiryStatus[] = ['new', 'closed']

function getDisplayStatus(item: ServiceInquiryItem): DisplayStatus {
  if (item.status === 'closed' || item.status === 'responded') return 'Complete'
  if (item.status === 'new' || item.status === 'viewed') {
    if (!item.created_at) return 'Pending'
    const created = new Date(item.created_at)
    const now = new Date()
    const sameDay =
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    return sameDay ? 'New' : 'Pending'
  }
  return 'New'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ServiceInquiriesAdminPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [selected, setSelected] = useState<ServiceInquiryItem | null>(null)

  const apiStatus: ServiceInquiryStatus | undefined =
    statusFilter === 'pending' || statusFilter === 'new' ? 'new' :
    statusFilter !== 'all' ? (statusFilter as ServiceInquiryStatus) : undefined

  const { data, isLoading, isError, refetch } = useGetAdminServiceInquiriesQuery(
    { status: apiStatus, per_page: 100 },
    { refetchOnMountOrArgChange: true },
  )

  const { data: allNewData } = useGetAdminServiceInquiriesQuery(
    { status: 'new', per_page: 500 },
    { refetchOnMountOrArgChange: true },
  )

  const [updateStatus, { isLoading: isUpdating }] = useUpdateAdminServiceInquiryStatusMutation()

  const rows = useMemo(() => {
    let source = data?.inquiries ?? []
    const q = search.trim().toLowerCase()
    if (q) {
      source = source.filter((item) =>
        [item.fullname, item.email, item.contact, item.address, item.product?.pd_name]
          .some((v) => v?.toLowerCase().includes(q)),
      )
    }
    if (statusFilter === 'new') source = source.filter((item) => getDisplayStatus(item) === 'New')
    else if (statusFilter === 'pending') source = source.filter((item) => getDisplayStatus(item) === 'Pending')
    return source
  }, [data, search, statusFilter])

  const counts = data?.counts

  const newTodayCount = useMemo(
    () => (allNewData?.inquiries ?? []).filter((i) => getDisplayStatus(i) === 'New').length,
    [allNewData],
  )
  const pendingCount = useMemo(
    () => (allNewData?.inquiries ?? []).filter((i) => getDisplayStatus(i) === 'Pending').length,
    [allNewData],
  )

  const handleStatusChange = async (id: number, status: ServiceInquiryStatus) => {
    try {
      await updateStatus({ id, status }).unwrap()
      toast.success('Status updated.')
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : prev)
    } catch {
      toast.error('Failed to update status.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{counts?.total ?? 0}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Total Inquiries</p>
        </div>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'new' ? 'all' : 'new')}
          className={`rounded-2xl border p-4 text-left transition-all ${statusFilter === 'new' ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{newTodayCount}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">New</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`rounded-2xl border p-4 text-left transition-all ${statusFilter === 'pending' ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Pending</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'closed' ? 'all' : 'closed')}
          className={`rounded-2xl border p-4 text-left transition-all ${statusFilter === 'closed' ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{counts?.closed ?? 0}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Complete</p>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, contact…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="pending">Pending</option>
          <option value="closed">Complete</option>
        </select>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading…</div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 text-sm text-rose-500">Failed to load inquiries.</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            No inquiries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Inquirer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{item.fullname}</p>
                      <p className="text-xs text-slate-400">{item.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 dark:text-slate-200">{item.product?.pd_name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.contact}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPLAY_STYLES[getDisplayStatus(item)]}`}>
                        {getDisplayStatus(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Service Inquiry</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selected.fullname}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-3 p-5">
              <Row label="Service" value={selected.product?.pd_name ?? '—'} />
              <Row label="Email" value={selected.email} />
              <Row label="Contact" value={selected.contact} />
              <Row label="Address" value={selected.address} />
              <Row label="Submitted" value={formatDate(selected.created_at)} />

              {/* Status updater */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</p>
                <div className="flex flex-wrap gap-2">
                  {VISIBLE_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isUpdating || selected.status === s}
                      onClick={() => handleStatusChange(selected.id, s)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${selected.status === s ? STATUS_STYLES[s] : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  )
}
