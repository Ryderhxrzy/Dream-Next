'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@heroui/react/button'
import { Card } from '@heroui/react/card'
import { Chip } from '@heroui/react/chip'
import { SearchField } from '@heroui/react/search-field'
import { Select } from '@heroui/react/select'
import { ListBox } from '@heroui/react/list-box'
import { ListBoxItem } from '@heroui/react/list-box-item'
import { showErrorToast, showSuccessToast } from '@/libs/toast'
import DataTableShell from '@/components/superAdmin/DataTableShell'
import {
  type SupplierFulfillmentStatus,
  type SupplierOrdersResponse,
  type SupplierShipmentStatus,
  useApproveSupplierOrderMutation,
  useGetSupplierOrdersQuery,
  usePushSupplierOrderToZqMutation,
  useUpdateSupplierOrderFulfillmentMutation,
  useUpdateSupplierOrderTrackingMutation,
} from '@/store/api/supplierOrdersApi'

const ORDER_FILTER_OPTIONS = [
  { value: 'all', label: 'All Orders' },
  { value: 'to_pay', label: 'To Pay' },
  { value: 'to_ship', label: 'To Ship' },
  { value: 'to_receive', label: 'To Receive' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'return', label: 'Return' },
]

const STAT_CONFIG = [
  { key: 'total', filterVal: 'all', label: 'Total Orders' },
  { key: 'toPay', filterVal: 'to_pay', label: 'To Pay' },
  { key: 'toShip', filterVal: 'to_ship', label: 'To Ship' },
  { key: 'toReceive', filterVal: 'to_receive', label: 'To Receive' },
  { key: 'completed', filterVal: 'completed', label: 'Completed' },
  { key: 'cancelled', filterVal: 'cancelled', label: 'Cancelled' },
  { key: 'return', filterVal: 'return', label: 'Return' },
]

const FULFILLMENT_OPTIONS: Array<{ value: SupplierFulfillmentStatus; label: string }> = [
  { value: 'processing', label: 'Processing' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
]

const SHIPMENT_OPTIONS: Array<{ value: SupplierShipmentStatus; label: string }> = [
  { value: 'for_pickup', label: 'For Pickup' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed_delivery', label: 'Failed Delivery' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned_to_sender', label: 'Returned to Sender' },
]

const APPROVAL_COLOR_MAP: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  approved: 'success',
  pending_approval: 'warning',
  rejected: 'danger',
}

const FULFILLMENT_COLOR_MAP: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  pending: 'default',
  processing: 'primary',
  packed: 'secondary',
  shipped: 'primary',
  out_for_delivery: 'warning',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'danger',
}

function formatMoney(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v || 0)
}

function parseDate(v?: string | null) {
  if (!v) return null
  const s = v.trim().replace(' ', 'T')
  const d = new Date(/([zZ]|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+08:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function fmtDate(v?: string | null) {
  const d = parseDate(v)
  return d ? d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

function fmtTime(v?: string | null) {
  const d = parseDate(v)
  return d ? d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }) : ''
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function isNew(v?: string | null) {
  const d = parseDate(v)
  return d ? Date.now() - d.getTime() < 86_400_000 : false
}

function getApiError(err: unknown, fallback: string) {
  return (err as { data?: { message?: string } })?.data?.message || fallback
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/60">
        <svg className="h-7 w-7 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">No orders found</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">Try adjusting your search or filter.</p>
    </div>
  )
}

type TrackingDraft = { courier: string; tracking_no: string; shipment_status: SupplierShipmentStatus }

export default function SupplierOrdersPage({ initialData }: { initialData?: SupplierOrdersResponse }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [fulfillDrafts, setFulfillDrafts] = useState<Record<number, SupplierFulfillmentStatus>>({})
  const [trackDrafts, setTrackDrafts] = useState<Record<number, TrackingDraft>>({})

  const { data, isLoading, isError } = useGetSupplierOrdersQuery(
    { filter, search: search.trim() || undefined, page: 1, perPage: 20 },
    { skip: false },
  )

  const [updateFulfillment] = useUpdateSupplierOrderFulfillmentMutation()
  const [updateTracking] = useUpdateSupplierOrderTrackingMutation()
  const [approveOrder] = useApproveSupplierOrderMutation()
  const [pushToZq] = usePushSupplierOrderToZqMutation()

  const effectiveData = data ?? initialData ?? null
  const orders = useMemo(() => effectiveData?.orders ?? [], [effectiveData])

  useEffect(() => {
    if (!orders.length) return
    setFulfillDrafts(cur => {
      const next = { ...cur }
      for (const o of orders) next[o.id] = (o.fulfillment_status as SupplierFulfillmentStatus) || 'processing'
      return next
    })
    setTrackDrafts(cur => {
      const next = { ...cur }
      for (const o of orders) {
        if (!next[o.id])
          next[o.id] = {
            courier: o.courier ?? '',
            tracking_no: o.tracking_no ?? '',
            shipment_status: (o.shipment_status as SupplierShipmentStatus) || 'in_transit',
          }
      }
      return next
    })
  }, [orders])

  const counts = useMemo(
    () => ({
      total: effectiveData?.counts?.total ?? orders.length,
      toPay: effectiveData?.counts?.to_pay ?? 0,
      toShip: effectiveData?.counts?.to_ship ?? 0,
      toReceive: effectiveData?.counts?.to_receive ?? 0,
      completed: effectiveData?.counts?.completed ?? 0,
      cancelled: effectiveData?.counts?.cancelled ?? 0,
      return: effectiveData?.counts?.return ?? 0,
    }),
    [effectiveData, orders.length],
  )

  async function handleApprove(id: number) {
    setBusyId(id)
    try {
      const r = await approveOrder({ id }).unwrap()
      showSuccessToast(r.message || 'Order approved.')
    } catch (e) {
      showErrorToast(getApiError(e, 'Failed to approve order.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handlePushToZq(id: number) {
    setBusyId(id)
    try {
      const r = await pushToZq({ id }).unwrap()
      showSuccessToast(r.message || 'Order pushed to ZQ.')
    } catch (e) {
      showErrorToast(getApiError(e, 'Failed to push order to ZQ.'))
    } finally {
      setBusyId(null)
    }
  }

  async function saveFulfillment(id: number) {
    const fulfillment_status = fulfillDrafts[id]
    if (!fulfillment_status) return
    setBusyId(id)
    try {
      const r = await updateFulfillment({ id, fulfillment_status }).unwrap()
      showSuccessToast(r.message || 'Fulfillment updated.')
    } catch (e) {
      showErrorToast(getApiError(e, 'Failed to update fulfillment.'))
    } finally {
      setBusyId(null)
    }
  }

  async function saveTracking(id: number) {
    const d = trackDrafts[id]
    if (!d?.tracking_no.trim()) {
      showErrorToast('Tracking number is required.')
      return
    }
    setBusyId(id)
    try {
      const r = await updateTracking({
        id,
        courier: d.courier.trim() || 'zq',
        tracking_no: d.tracking_no.trim(),
        shipment_status: d.shipment_status,
      }).unwrap()
      showSuccessToast(r.message || 'Tracking updated.')
    } catch (e) {
      showErrorToast(getApiError(e, 'Failed to update tracking.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CONFIG.map((stat) => (
          <Card
            key={stat.key}
            className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
            onClick={() => setFilter(stat.filterVal)}
          >
            <Card.Content className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {stat.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {counts[stat.key as keyof typeof counts]}
              </p>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Table */}
      <DataTableShell
        title="Order Fulfillment"
        subtitle="Manage and track supplier orders"
        actions={
          <div className="flex gap-2">
            <SearchField
              aria-label="Search orders"
              value={search}
              onChange={setSearch}
              className="w-full max-w-xs"
              placeholder="Search orders..."
            />
            <Select
              aria-label="Filter orders"
              selectedKey={filter}
              onSelectionChange={(key) => {
                if (key) setFilter(String(key))
              }}
              className="w-40"
            >
              <Select.Trigger className="h-11 flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-left text-sm text-slate-900 dark:text-slate-100 outline-none transition-all duration-200 focus:border-sky-400 dark:focus:border-sky-400/60 focus:bg-white dark:focus:bg-slate-800">
                <span className="truncate">
                  {ORDER_FILTER_OPTIONS.find((o) => o.value === filter)?.label || 'Filter'}
                </span>
                <Select.Indicator className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </Select.Trigger>
              <Select.Popover className="min-w-[var(--trigger-width)] rounded-lg border border-slate-200/80 bg-white dark:border-slate-700/50 dark:bg-slate-900">
                <ListBox className="p-1 text-slate-700 dark:text-slate-100">
                  {ORDER_FILTER_OPTIONS.map((option) => (
                    <ListBoxItem id={option.value} key={option.value}>
                      {option.label}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          {isLoading && !initialData ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-sm">Loading orders…</span>
            </div>
          ) : isError ? (
            <div className="px-5 py-16 text-center text-sm text-rose-500 dark:text-rose-400">
              Failed to load orders.
            </div>
          ) : orders.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/50 dark:border-slate-700/50 dark:bg-slate-800/30">
                  <th className="min-w-52 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Product
                  </th>
                  <th className="min-w-36 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Checkout
                  </th>
                  <th className="min-w-32 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Date
                  </th>
                  <th className="min-w-56 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Customer
                  </th>
                  <th className="min-w-28 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Amount
                  </th>
                  <th className="min-w-32 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Approval
                  </th>
                  <th className="min-w-44 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => {
                  const busy = busyId === order.id
                  const canManage = order.approval_status === 'approved'
                  const approvalStatus = order.approval_status ?? 'pending_approval'
                  const fulfillStatus = order.fulfillment_status ?? 'pending'
                  const newOrder = isNew(order.created_at)

                  return (
                    <tr
                      key={order.id}
                      className={`group border-b border-slate-200/80 transition-colors last:border-0 hover:bg-slate-50/70 dark:border-slate-700/50 dark:hover:bg-slate-800/20 ${
                        idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-900/60'
                      }`}
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-100 dark:border-slate-700/50 dark:bg-slate-800">
                            {order.product_image ? (
                              <img
                                src={order.product_image}
                                alt={order.product_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <svg
                                  className="h-5 w-5 text-slate-300 dark:text-slate-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 pt-0.5">
                            {newOrder && <Chip size="sm" color="primary" className="mb-1">NEW</Chip>}
                            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800 dark:text-slate-100">
                              {order.product_name}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                              Qty {order.quantity}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-mono text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                          {order.checkout_id || `#${order.id}`}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 align-top">
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                          {fmtDate(order.created_at)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                          {fmtTime(order.created_at)}
                        </p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                            {getInitials(order.customer_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                              {order.customer_name || '—'}
                            </p>
                            <p className="line-clamp-1 text-[11px] text-slate-400 dark:text-slate-500">
                              {order.customer_email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                          {formatMoney(order.amount)}
                        </p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2">
                          <Chip
                            color={APPROVAL_COLOR_MAP[approvalStatus] || 'default'}
                            size="sm"
                            variant="flat"
                          >
                            {approvalStatus === 'approved'
                              ? 'Approved'
                              : approvalStatus === 'rejected'
                                ? 'Rejected'
                                : 'Pending'}
                          </Chip>
                          {approvalStatus !== 'approved' && (
                            <Button
                              isDisabled={busy}
                              isLoading={busy}
                              size="sm"
                              color="success"
                              className="w-full"
                              onClick={() => handleApprove(order.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {approvalStatus === 'approved' && !order.zq_platform_order_id && (
                            <Button
                              isDisabled={busy}
                              isLoading={busy}
                              size="sm"
                              color="secondary"
                              className="w-full"
                              onClick={() => handlePushToZq(order.id)}
                            >
                              Push to ZQ
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2">
                          <Chip
                            color={FULFILLMENT_COLOR_MAP[fulfillStatus] || 'default'}
                            size="sm"
                            variant="flat"
                          >
                            {fulfillStatus.replace(/_/g, ' ')}
                          </Chip>
                          {canManage && (
                            <>
                              <Select
                                aria-label="Fulfillment status"
                                selectedKey={fulfillDrafts[order.id] ?? 'processing'}
                                onSelectionChange={(key) => {
                                  if (key) setFulfillDrafts(cur => ({ ...cur, [order.id]: String(key) as SupplierFulfillmentStatus }))
                                }}
                                isDisabled={busy}
                                size="sm"
                                className="w-full"
                              >
                                <Select.Trigger className="h-9 flex min-h-9 w-full items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-left text-xs text-slate-900 dark:text-slate-100 outline-none transition-all duration-200 focus:border-sky-400 dark:focus:border-sky-400/60 focus:bg-white dark:focus:bg-slate-800">
                                  <span className="truncate">
                                    {FULFILLMENT_OPTIONS.find((o) => o.value === fulfillDrafts[order.id])?.label || 'Select'}
                                  </span>
                                  <Select.Indicator className="h-3.5 w-3.5 text-slate-400 dark:text-slate-100/60" />
                                </Select.Trigger>
                                <Select.Popover className="min-w-[var(--trigger-width)] rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
                                  <ListBox className="p-1 text-slate-700 dark:text-slate-100">
                                    {FULFILLMENT_OPTIONS.map((option) => (
                                      <ListBoxItem id={option.value} key={option.value}>
                                        {option.label}
                                      </ListBoxItem>
                                    ))}
                                  </ListBox>
                                </Select.Popover>
                              </Select>
                              <Button
                                isDisabled={busy}
                                isLoading={busy}
                                size="sm"
                                color="default"
                                className="w-full"
                                onClick={() => saveFulfillment(order.id)}
                              >
                                Save Status
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DataTableShell>
    </div>
  )
}
