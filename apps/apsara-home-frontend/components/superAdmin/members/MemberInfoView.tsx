"use client"

import { useState } from "react"
import Link from "next/link"
import { useGetMemberQuery } from "@/store/api/membersApi"

import {
  FulfillmentChip,
  PaymentChip,
} from "@/components/orders/OrderStatusTimeline"
import TierBadge from "@/components/ui/TierBadge"

import AdminCustomerChatDrawer from "@/components/superAdmin/chat/AdminCustomerChatDrawer"

import MembersStatusBadge from "./MembersStatusBadge"

/* ─── helpers ──────────────────────────────────────────────── */

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value || 0)

const parseDate = (value?: string | null) => {
  if (!value) return null
  const s = value.trim().replace(" ", "T")
  const d = new Date(/([zZ]|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+08:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const fmtDate = (value?: string | null) => {
  const d = parseDate(value)
  return d
    ? d.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—"
}

const fmtDateTime = (value?: string | null) => {
  const d = parseDate(value)
  return d
    ? d.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—"
}

const customerSince = (value?: string | null) => {
  const d = parseDate(value)
  if (!d) return "—"
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000))
  if (days <= 0) return "Today"
  if (days === 1) return "1 day"
  if (days < 30) return `${days} days`
  return fmtDate(value)
}

const getInitials = (name?: string | null) => {
  if (!name) return "MB"
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "MB"
  )
}

const variantLabel = (item: {
  color?: string
  size?: string
  type?: string
}) => [item.color, item.size, item.type].filter(Boolean).join(" / ")

/* ─── small UI ─────────────────────────────────────────────── */

function BackLink() {
  return (
    <Link
      href="/admin/members"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Members
    </Link>
  )
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        {label}
      </p>
      <div className="mt-1.5 text-lg font-bold text-slate-800 dark:text-white">
        {value}
      </div>
    </div>
  )
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
          {title}
        </p>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="text-right text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </dd>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

/* ─── main ─────────────────────────────────────────────────── */

export default function MemberInfoView({ memberId }: { memberId: number }) {
  const { data, isLoading, isError } = useGetMemberQuery(memberId, {
    skip: !Number.isFinite(memberId) || memberId <= 0,
  })

  const [thumbPreview, setThumbPreview] = useState<{
    src: string
    alt: string
    price: string
    top: number
    left: number
  } | null>(null)
  const [recentPage, setRecentPage] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-32 text-slate-400">
        <Spinner />
        <span className="text-sm">Loading member…</span>
      </div>
    )
  }

  if (isError || !data?.member) {
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white py-20 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Member not found
          </p>
          <p className="text-xs text-slate-400">
            We couldn&apos;t find a member with id{" "}
            <span className="font-mono">{memberId}</span>.
          </p>
        </div>
      </div>
    )
  }

  const { member, lastOrder, recentOrders } = data
  const hasPhone = member.contactNumber && member.contactNumber !== "0"

  const RECENT_PAGE_SIZE = 6
  const totalRecentPages = Math.max(
    1,
    Math.ceil(recentOrders.length / RECENT_PAGE_SIZE)
  )
  const safeRecentPage = Math.min(recentPage, totalRecentPages - 1)
  const pagedRecentOrders = recentOrders.slice(
    safeRecentPage * RECENT_PAGE_SIZE,
    safeRecentPage * RECENT_PAGE_SIZE + RECENT_PAGE_SIZE
  )

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="space-y-3">
        <BackLink />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-sm font-bold text-white">
            {member.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(member.name)
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">
              {member.name}
            </h1>
            <p className="text-sm text-slate-400">
              {member.username ? `@${member.username}` : member.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={member.tier} />
            <MembersStatusBadge status={member.status} />
          </div>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat customer
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Amount spent" value={formatMoney(member.totalSpent)} />
        <StatCard label="Orders" value={member.orders} />
        <StatCard label="Customer since" value={customerSince(member.joinedAt)} />
        <StatCard label="Rank / Tier" value={<TierBadge tier={member.tier} />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Left: last order + recent orders ── */}
        <div className="space-y-5 lg:col-span-2">
          <SectionCard
            title="Last order placed"
            action={
              lastOrder ? (
                <Link
                  href={`/admin/orders/view/${encodeURIComponent(lastOrder.checkoutId)}`}
                  className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
                >
                  View order
                </Link>
              ) : null
            }
          >
            {lastOrder ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {lastOrder.checkoutId}
                    </span>
                    <PaymentChip status={lastOrder.paymentStatus} />
                    <FulfillmentChip status={lastOrder.fulfillmentStatus || "pending"} />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatMoney(lastOrder.amount)}
                  </span>
                </div>
                <p className="text-[12px] text-slate-400">
                  {fmtDateTime(lastOrder.createdAt)}
                  {lastOrder.paymentMethod ? ` · ${lastOrder.paymentMethod}` : ""}
                </p>

                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                  {lastOrder.items.map((item, idx) => {
                    const variant = variantLabel(item)
                    return (
                      <Link
                        key={`${item.productId}-${idx}`}
                        href={`/admin/orders/view/${encodeURIComponent(lastOrder.checkoutId)}`}
                        className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <div
                          className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition group-hover:ring-2 group-hover:ring-sky-300 dark:border-slate-700 dark:bg-slate-800"
                          onMouseEnter={(e) => {
                            if (!item.image) return
                            const rect = e.currentTarget.getBoundingClientRect()
                            setThumbPreview({
                              src: item.image,
                              alt: item.productName,
                              price: formatMoney(item.lineTotal),
                              top: rect.top + rect.height / 2,
                              left: rect.left,
                            })
                          }}
                          onMouseLeave={() => setThumbPreview(null)}
                        >
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-slate-800 transition-colors group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400">
                            {item.productName}
                          </p>
                          {variant ? (
                            <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              {variant}
                            </span>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[12px] text-slate-400">x {item.quantity}</p>
                          <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                            {formatMoney(item.lineTotal)}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                No orders yet.
              </p>
            )}
          </SectionCard>

          {recentOrders.length > 1 ? (
            <SectionCard
              title="Recent orders"
              action={
                <span className="text-[11px] text-slate-400">
                  {recentOrders.length} total
                </span>
              }
            >
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedRecentOrders.map((order) => (
                  <Link
                    key={order.checkoutId}
                    href={`/admin/orders/view/${encodeURIComponent(order.checkoutId)}`}
                    className="group flex items-center gap-3 py-2 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <div
                      className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition group-hover:ring-2 group-hover:ring-sky-300 dark:border-slate-700 dark:bg-slate-800"
                      onMouseEnter={(e) => {
                        if (!order.image) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        setThumbPreview({
                          src: order.image,
                          alt: order.checkoutId,
                          price: formatMoney(order.amount),
                          top: rect.top + rect.height / 2,
                          left: rect.left,
                        })
                      }}
                      onMouseLeave={() => setThumbPreview(null)}
                    >
                      {order.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={order.image} alt={order.checkoutId} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[12px] font-semibold text-sky-600 group-hover:underline dark:text-sky-400">
                        {order.checkoutId}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {fmtDate(order.createdAt)} · {order.itemCount}{" "}
                        {order.itemCount === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <PaymentChip status={order.paymentStatus} />
                    <span className="w-[90px] shrink-0 text-right text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      {formatMoney(order.amount)}
                    </span>
                  </Link>
                ))}
              </div>

              {totalRecentPages > 1 ? (
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={safeRecentPage <= 0}
                    onClick={() => setRecentPage((p) => Math.max(0, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Previous
                  </button>
                  <span className="text-[11px] text-slate-400">
                    {safeRecentPage * RECENT_PAGE_SIZE + 1}–
                    {Math.min(
                      (safeRecentPage + 1) * RECENT_PAGE_SIZE,
                      recentOrders.length
                    )}{" "}
                    of {recentOrders.length}
                  </span>
                  <button
                    type="button"
                    disabled={safeRecentPage >= totalRecentPages - 1}
                    onClick={() =>
                      setRecentPage((p) => Math.min(totalRecentPages - 1, p + 1))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </SectionCard>
          ) : null}
        </div>

        {/* ── Right: customer info ── */}
        <div className="space-y-5">
          <SectionCard title="Contact information">
            <div className="space-y-1.5 text-sm">
              <a
                href={`mailto:${member.email}`}
                className="block truncate font-semibold text-sky-600 hover:underline dark:text-sky-400"
              >
                {member.email}
              </a>
              <p className="text-slate-500 dark:text-slate-400">
                {hasPhone ? member.contactNumber : "No phone number"}
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Default address">
            {member.fullAddress ? (
              <div className="space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                {[member.addressLine, member.barangay, member.city, member.province, member.region, member.zipCode]
                  .filter(Boolean)
                  .map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                {hasPhone ? <p className="pt-0.5 text-slate-400">{member.contactNumber}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No address provided</p>
            )}
          </SectionCard>

          <SectionCard title="Account">
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <InfoRow label="Username" value={member.username ? `@${member.username}` : "—"} />
              <InfoRow label="Rank / Tier" value={member.tier} />
              <InfoRow
                label="Verification"
                value={(member.verificationStatus ?? "not_verified").replace(/_/g, " ")}
              />
              <InfoRow label="Referrals" value={member.referrals} />
              <InfoRow
                label="Sponsor"
                value={member.referredByUsername ? `@${member.referredByUsername}` : "None"}
              />
              <InfoRow label="Member since" value={fmtDate(member.joinedAt)} />
              <InfoRow label="Last active" value={fmtDate(member.lastActiveAt)} />
            </dl>
          </SectionCard>

          <SectionCard title="Wallet & earnings">
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
              <InfoRow label="Earnings" value={<span className="text-teal-600 dark:text-teal-400">{formatMoney(member.earnings)}</span>} />
              <InfoRow label="Cash balance" value={formatMoney(member.walletCashBalance ?? 0)} />
              <InfoRow label="PV balance" value={Number(member.walletPvBalance ?? 0).toLocaleString()} />
              <InfoRow
                label="Cash credits"
                value={<span className="text-emerald-600 dark:text-emerald-400">+{Number(member.walletCashCredits ?? 0).toLocaleString()}</span>}
              />
              <InfoRow
                label="PV credits"
                value={<span className="text-indigo-600 dark:text-indigo-400">+{Number(member.walletPvCredits ?? 0).toLocaleString()}</span>}
              />
            </dl>
          </SectionCard>
        </div>
      </div>

      {/* Hover image preview — pops to the left of the hovered thumbnail */}
      {thumbPreview ? (
        <div
          className="pointer-events-none fixed z-[100] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          style={{
            top: thumbPreview.top,
            left: thumbPreview.left,
            transform: "translate(calc(-100% - 10px), -50%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbPreview.src}
            alt={thumbPreview.alt}
            className="h-44 w-44 rounded-xl bg-slate-50 object-contain dark:bg-slate-800"
          />
          <p className="mt-1 text-center text-[12px] font-bold text-slate-800 dark:text-slate-100">
            {thumbPreview.price}
          </p>
        </div>
      ) : null}

      <AdminCustomerChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        customerId={member.id}
        customerName={member.name}
        subject="Member support"
      />
    </div>
  )
}
