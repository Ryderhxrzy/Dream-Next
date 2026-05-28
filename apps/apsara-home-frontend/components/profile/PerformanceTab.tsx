'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { WalletTypeFilter, useGetWalletOverviewQuery } from '@/store/api/encashmentApi';

type PvHistoryItem = {
  id: number;
  description: string;
  source: string;
  amount: number;
  status: 'pending' | 'approved' | 'cancelled';
  created_at: string;
};

function statusClasses(status: PvHistoryItem['status']) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-700';
    case 'pending':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-700';
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:ring-rose-700';
    default:
      return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600';
  }
}

const formatNumber = (value: number) => value.toLocaleString('en-PH');

const PerformanceTab = () => {
  const [page, setPage] = useState(1);
  const queryWalletType: WalletTypeFilter = 'pv';
  const { data, isLoading, isFetching, isError, refetch } = useGetWalletOverviewQuery({
    page,
    perPage: 15,
    walletType: queryWalletType,
  });

  const summary = data?.summary;
  const ledger = data?.ledger ?? [];
  const goalPv = 50000;
  const goalCurrent = Number(summary?.direct_referral_total_pv ?? 0);
  const progress = Math.min(100, Math.max(0, (goalCurrent / goalPv) * 100));
  const remaining = Math.max(0, goalPv - goalCurrent);
  const totalReferrals = Number(summary?.referrals?.total ?? 0);
  const verifiedReferrals = Number(summary?.referrals?.verified ?? 0);
  const activeReferrals = Number(summary?.referrals?.active ?? 0);

  const pvHistory = useMemo<PvHistoryItem[]>(
    () =>
      ledger
        .filter((row) => row.wallet_type === 'pv')
        .map((row) => ({
          id: row.id,
          description: row.notes || row.reference_no || 'Performance Value wallet entry',
          source: row.source_type || 'wallet',
          amount: Math.abs(Number(row.amount ?? 0)),
          status: (row.entry_type === 'debit' ? 'cancelled' : 'approved') as PvHistoryItem['status'],
          created_at: row.created_at || new Date().toISOString(),
        })),
    [ledger]
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
        <p className="font-bold">Failed to load performance data.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm shadow-sky-100/70 dark:border-slate-700 dark:bg-gray-800/70 dark:shadow-black/20">
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-6 py-6 dark:from-sky-950/50 dark:via-slate-900 dark:to-cyan-950/30 md:px-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-200/40 dark:bg-sky-500/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-sky-100 dark:bg-white/10 dark:ring-white/10">
                <Target className="h-7 w-7 text-sky-600 dark:text-sky-300" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                  Performance
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white md:text-3xl">
                  {formatNumber(goalCurrent)} / {formatNumber(goalPv)} PV
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                  Track referral performance, PV progress, and posted Performance Value transactions.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 px-5 py-4 text-right shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500">Progress</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-sky-700 dark:text-sky-300">{progress.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">{formatNumber(remaining)} PV remaining</p>
            </div>
          </div>
          <div className="relative mt-6">
            <div className="h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs font-medium text-slate-400 dark:text-gray-500">
              <span>0 PV</span>
              <span>{formatNumber(goalPv)} PV</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total Referrals', value: totalReferrals, icon: Users, tone: 'sky' },
          { label: 'Verified Referrals', value: verifiedReferrals, icon: CheckCircle2, tone: 'emerald' },
          { label: 'Active Referrals', value: activeReferrals, icon: Activity, tone: 'violet' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-gray-800/70">
            <div className="flex items-center justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                item.tone === 'emerald'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : item.tone === 'violet'
                    ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300'
                    : 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300'
              }`}>
                <item.icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-gray-500">{item.label}</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-slate-950 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800/70">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-gray-500">Transaction History</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Performance Value History</h3>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
          >
            <Clock3 className="h-4 w-4" />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="overflow-x-auto p-5">
          {pvHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-slate-700">
              <TrendingUp className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 font-bold text-slate-700 dark:text-gray-300">No Performance Value transactions yet</p>
              <p className="mt-1.5 text-sm text-slate-400 dark:text-gray-500">Delivered purchases and future PV credits will appear here.</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700 dark:text-gray-500">
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">PV</th>
                </tr>
              </thead>
              <tbody>
                {pvHistory.map((item, i) => (
                  <tr key={item.id} className={`border-b border-slate-100 last:border-0 dark:border-slate-700/60 ${i % 2 ? 'bg-slate-50/50 dark:bg-white/[0.02]' : ''}`}>
                    <td className="py-4 pr-4 font-semibold text-slate-900 dark:text-white">{item.description}</td>
                    <td className="py-4 pr-4 text-slate-500 dark:text-gray-400">{item.source}</td>
                    <td className="py-4 pr-4 text-slate-500 dark:text-gray-400">
                      {new Date(item.created_at).toLocaleString('en-PH', {
                        timeZone: 'Asia/Manila',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClasses(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 text-right font-black tabular-nums text-slate-950 dark:text-white">
                      +{formatNumber(item.amount)}
                      <span className="ml-1 text-xs font-medium text-slate-400 dark:text-gray-500">PV</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data?.meta && data.meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-300"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-500 dark:text-gray-400">
              Page {data.meta.current_page} of {data.meta.last_page}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(data.meta.last_page, prev + 1))}
              disabled={page >= data.meta.last_page}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default PerformanceTab;
