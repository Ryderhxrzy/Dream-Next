'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ShoppingBag, Users, WalletCards, Zap } from 'lucide-react';
import type { DownlineActivityItem } from '@/store/api/encashmentApi';
import { useGetDownlineActivityQuery } from '@/store/api/encashmentApi';

const peso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value || 0);

const numberFmt = (value: number) =>
  new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(value || 0);

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const displayName = (row: DownlineActivityItem) =>
  row.buyer_name || row.buyer_username || row.buyer_email || `Customer #${row.customer_id}`;

const primaryStatus = (row: DownlineActivityItem) =>
  row.fulfillment_status || row.shipment_status || row.approval_status || row.payment_status || 'pending';

const statusClass = (status?: string | null) => {
  const normalized = (status ?? '').toLowerCase();
  if (['delivered', 'completed', 'approved', 'paid', 'success', 'succeeded'].includes(normalized)) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-300 dark:ring-emerald-800/60';
  }
  if (['cancelled', 'canceled', 'failed', 'expired', 'rejected', 'refunded'].includes(normalized)) {
    return 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/25 dark:text-rose-300 dark:ring-rose-800/60';
  }
  if (['shipped', 'to_ship', 'to_receive', 'processing'].includes(normalized)) {
    return 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/25 dark:text-sky-300 dark:ring-sky-800/60';
  }
  return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/25 dark:text-amber-300 dark:ring-amber-800/60';
};

const readableStatus = (status?: string | null) => {
  const raw = (status ?? '').trim();
  if (!raw) return 'Pending';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function DownlineActivityTab() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<number | null>(null);
  const [status, setStatus] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, isError, refetch } = useGetDownlineActivityQuery({
    page,
    perPage: 15,
    level,
    status,
    search,
  });

  const rows = data?.activities ?? [];
  const meta = data?.meta;
  const summary = data?.summary;
  const levels = useMemo(() => data?.levels ?? [], [data?.levels]);

  const submitSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const setFilterStatus = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  const setFilterLevel = (value: string) => {
    setPage(1);
    setLevel(value === 'all' ? null : Number(value));
  };

  return (
    <div className="space-y-5 pt-1">
      <section className="relative overflow-hidden rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 dark:border-sky-800/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">Downline Activity</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              Purchase monitor for your network
            </h3>
            <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Track downline orders, PV movement, status, and any bonus generated from eligible purchases.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800"
          >
            <span className={isFetching ? 'h-3 w-3 animate-spin rounded-full border-2 border-sky-500 border-t-transparent' : 'h-2 w-2 rounded-full bg-sky-500'} />
            {isFetching ? 'Refreshing' : 'Refresh'}
          </button>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={ShoppingBag} label="Downline Orders" value={numberFmt(summary?.total_orders ?? 0)} sub="matching orders" color="sky" />
          <SummaryCard icon={Zap} label="Total PV" value={`${numberFmt(summary?.total_pv ?? 0)} PV`} sub="network purchase PV" color="blue" />
          <SummaryCard icon={WalletCards} label="Bonus Generated" value={peso(summary?.total_bonus ?? 0)} sub="credited when eligible" color="emerald" />
          <SummaryCard icon={Users} label="Active Buyers" value={numberFmt(summary?.active_downlines ?? 0)} sub="unique downlines" color="violet" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Activity Feed</p>
            <h4 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">Downline Purchases</h4>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitSearch();
                }}
                placeholder="Search buyer, product, order..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-sky-900/40 sm:w-72"
              />
            </div>
            <select
              value={level ?? 'all'}
              onChange={(event) => setFilterLevel(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="all">All levels</option>
              {levels.map((item) => (
                <option key={item} value={item}>Level {item}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="approved">Approved</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              type="button"
              onClick={submitSearch}
              className="h-10 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
            >
              Search
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
              Failed to load downline activity.
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <p className="mt-3 font-bold text-slate-700 dark:text-slate-200">No downline purchases found</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Orders from your referral network will appear here once they are created.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1420px] table-fixed text-sm">
              <colgroup>
                <col className="w-[290px]" />
                <col className="w-[95px]" />
                <col className="w-[390px]" />
                <col className="w-[135px]" />
                <col className="w-[170px]" />
                <col className="w-[150px]" />
                <col className="w-[160px]" />
                <col className="w-[230px]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/80 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800/40 dark:text-slate-500">
                  {['Downline', 'Level', 'Product / Order', 'Status', 'PV', 'Amount', 'Bonus', 'Date'].map((heading) => (
                    <th key={heading} className={`px-4 py-3 first:pl-5 last:pr-5 ${['PV', 'Amount', 'Bonus'].includes(heading) ? 'text-right' : ''}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {rows.map((row, index) => {
                  const statusValue = primaryStatus(row);
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: index * 0.015 }}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/35"
                    >
                      <td className="px-4 py-3.5 first:pl-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-xs font-black text-white">
                            {(displayName(row)[0] ?? '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="break-words font-bold leading-snug text-slate-900 dark:text-white">{displayName(row)}</p>
                            <p className="break-all text-xs text-slate-400">
                              {row.buyer_username ? `@${row.buyer_username}` : row.buyer_email ?? 'Member'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/25 dark:text-sky-300 dark:ring-sky-800/60">
                          L{row.level_no || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="break-words font-semibold leading-snug text-slate-800 dark:text-slate-200">{row.product_name || 'Order item'}</p>
                        <p className="mt-0.5 break-all text-xs text-slate-400">
                          {row.checkout_id || `Order #${row.id}`}
                          {row.product_sku ? ` / ${row.product_sku}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusClass(statusValue)}`}>
                          {readableStatus(statusValue)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums leading-snug text-blue-700 dark:text-blue-300">
                        {numberFmt(row.earned_pv)} PV
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-700 dark:text-slate-200">
                        {peso(row.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className={`font-black tabular-nums ${row.bonus_amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {row.bonus_amount > 0 ? `+${peso(row.bonus_amount)}` : peso(0)}
                        </p>
                        {row.bonus_rate ? (
                          <p className="text-[11px] text-slate-400">{(row.bonus_rate * 100).toFixed(2).replace(/\.00$/, '')}% rate</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 last:pr-5">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(row.created_at)}</p>
                        {row.pv_posted_at ? <p className="text-[11px] text-emerald-500">PV posted</p> : <p className="text-[11px] text-slate-400">PV pending</p>}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing <span className="font-bold text-slate-700 dark:text-slate-300">{meta?.from ?? 0}-{meta?.to ?? 0}</span> of{' '}
            <span className="font-bold text-slate-700 dark:text-slate-300">{meta?.total ?? 0}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!meta || page <= 1}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {page} / {meta?.last_page ?? 1}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => (meta && prev < meta.last_page ? prev + 1 : prev))}
              disabled={!meta || page >= (meta?.last_page ?? 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

type SummaryColor = 'sky' | 'blue' | 'emerald' | 'violet';

const SUMMARY_STYLES: Record<SummaryColor, string> = {
  sky: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-900/20 dark:text-sky-300',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-300',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-300',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-900/20 dark:text-violet-300',
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  sub: string;
  color: SummaryColor;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${SUMMARY_STYLES[color]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-75">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm dark:bg-slate-950/50">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-xl font-black leading-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold opacity-75">{sub}</p>
    </div>
  );
}
