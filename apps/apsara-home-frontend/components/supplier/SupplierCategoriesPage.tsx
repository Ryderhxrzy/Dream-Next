'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useGetSupplierCategoriesQuery } from '@/store/api/suppliersApi'

const PALETTE = [
  {
    border: 'border-l-indigo-500',
    icon: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300',
    chevron: 'text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-300',
    ring: 'hover:ring-indigo-100 dark:hover:ring-indigo-500/10',
  },
  {
    border: 'border-l-emerald-500',
    icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    chevron: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300',
    ring: 'hover:ring-emerald-100 dark:hover:ring-emerald-500/10',
  },
  {
    border: 'border-l-violet-500',
    icon: 'bg-violet-50 text-violet-500 dark:bg-violet-500/15 dark:text-violet-300',
    chevron: 'text-violet-400 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-300',
    ring: 'hover:ring-violet-100 dark:hover:ring-violet-500/10',
  },
  {
    border: 'border-l-amber-500',
    icon: 'bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-300',
    chevron: 'text-amber-400 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300',
    ring: 'hover:ring-amber-100 dark:hover:ring-amber-500/10',
  },
  {
    border: 'border-l-sky-500',
    icon: 'bg-sky-50 text-sky-500 dark:bg-sky-500/15 dark:text-sky-300',
    chevron: 'text-sky-400 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300',
    ring: 'hover:ring-sky-100 dark:hover:ring-sky-500/10',
  },
  {
    border: 'border-l-rose-500',
    icon: 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300',
    chevron: 'text-rose-400 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300',
    ring: 'hover:ring-rose-100 dark:hover:ring-rose-500/10',
  },
]

function CategoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

export default function SupplierCategoriesPage() {
  const { data: session, status } = useSession()
  const supplierId = Number(session?.user?.supplierId ?? 0)
  const { data, isLoading, isError } = useGetSupplierCategoriesQuery(supplierId, {
    skip: status !== 'authenticated' || supplierId <= 0,
  })

  const [query, setQuery] = useState('')

  const categories = useMemo(() => data?.categories ?? [], [data?.categories])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.url ?? '').toLowerCase().includes(q)
    )
  }, [categories, query])

  if (status === 'loading') {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        Loading supplier session...
      </div>
    )
  }

  if (supplierId <= 0) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        This supplier account is not linked to a supplier company yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <div className="animate-fade-up-in relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="p-7 pr-44">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
          </span>

          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Assigned Categories
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            View your product category assignments
          </p>
        </div>

        {/* Decorative illustration */}
        <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 select-none">
          <div className="relative h-40 w-44">

            {/* ── Sparkles ── */}
            {/* top-left */}
            <svg className="absolute left-1 top-2 h-4 w-4 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            {/* top-right small */}
            <svg className="absolute right-3 top-0 h-3 w-3 text-indigo-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            {/* bottom-left small */}
            <svg className="absolute bottom-3 left-3 h-3 w-3 text-indigo-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            {/* bottom-right */}
            <svg className="absolute bottom-2 right-1 h-4 w-4 text-indigo-300/70" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            {/* middle-right tiny */}
            <svg className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-indigo-200/80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>

            {/* ── Open box / container ── */}
            {/* back wall of box */}
            <div
              className="absolute rounded-[20px] shadow-lg"
              style={{
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 72,
                height: 62,
                background: 'linear-gradient(160deg, #c4b5fd 0%, #a78bfa 60%, #8b5cf6 100%)',
              }}
            />
            {/* box inner dark opening */}
            <div
              className="absolute rounded-t-[14px]"
              style={{
                bottom: 44,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 56,
                height: 20,
                background: 'rgba(91,33,182,0.18)',
              }}
            />
            {/* box front face highlight */}
            <div
              className="absolute rounded-b-[18px]"
              style={{
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 72,
                height: 36,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)',
              }}
            />

            {/* ── Floating card 1 — grid icon (larger, left-of-center, tilted left) ── */}
            <div
              className="animate-float absolute flex items-center justify-center rounded-[18px] shadow-xl"
              style={{
                width: 58,
                height: 58,
                top: 4,
                left: 14,
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(8px)',
                transform: 'rotate(-10deg)',
                animationDelay: '0s',
                boxShadow: '0 8px 32px rgba(99,102,241,0.18), 0 2px 8px rgba(99,102,241,0.10)',
              }}
            >
              <svg className="h-7 w-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>

            {/* ── Floating card 2 — tag icon (smaller, right, tilted right) ── */}
            <div
              className="animate-float absolute flex items-center justify-center rounded-2xl shadow-xl"
              style={{
                width: 48,
                height: 48,
                top: 14,
                right: 10,
                background: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(8px)',
                transform: 'rotate(8deg)',
                animationDelay: '0.7s',
                boxShadow: '0 8px 24px rgba(99,102,241,0.15), 0 2px 6px rgba(99,102,241,0.08)',
              }}
            >
              <svg className="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>

          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      {!isLoading && !isError && categories.length > 0 && (
        <div className="animate-fade-up-in relative">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by category name or URL…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/10"
          />
        </div>
      )}

      {/* ── States ── */}
      {isLoading ? (
        <div className="animate-fade-up-in rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="google-loading-bar mb-3 rounded-full" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading categories…</p>
        </div>
      ) : isError ? (
        <div className="animate-fade-up-in rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          Failed to load allowed categories.
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-fade-up-in rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto mb-3 flex h-12 w-12 animate-float items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
            <CategoryIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No categories assigned</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {query.trim()
              ? 'No categories match your search.'
              : 'Ask the admin team to assign categories for your supplier.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((category, index) => {
            const color = PALETTE[index % PALETTE.length]
            return (
              <div
                key={category.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className={`animate-fade-up-in group flex items-center gap-4 rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm ring-2 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 ${color.border} ${color.ring}`}
              >
                {/* Icon */}
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color.icon}`}>
                  <CategoryIcon className="h-7 w-7" />
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {category.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    /{category.url || 'no-slug'}
                  </p>
                </div>

                {/* Chevron */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color.chevron}`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
