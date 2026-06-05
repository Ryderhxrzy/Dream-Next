'use client'

import { useMemo, useState } from 'react'
import {
  Users, BarChart2, Search, ChevronDown,
  RotateCcw, Phone, ChevronsUpDown, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useGetPartnerMembersQuery } from '@/store/api/membersApi'
import type { Member } from '@/types/members/types'

type ApiError = {
  status?: number | string
  data?: { message?: string; error?: string }
  error?: string
}

const extractErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return 'Unknown error.'
  const e = error as ApiError
  const message = e.data?.message || e.data?.error || e.error
  if (message && String(message).trim() !== '') {
    return e.status !== undefined ? `${e.status}: ${String(message)}` : String(message)
  }
  return e.status !== undefined ? `${e.status}: Request failed.` : 'Request failed.'
}

const normalize = (value?: string | null) => String(value ?? '').trim().toLowerCase()

const getInitials = (name?: string | null) => {
  const cleaned = String(name ?? '').trim()
  if (!cleaned) return 'U'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (`${first}${last}`.toUpperCase()) || 'U'
}

const formatJoinedDate = (member: Member) => {
  const raw = member.joinedAt || member.createdAt || member.created_at || ''
  if (!raw) return 'N/A'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const INITIALS_COLORS = [
  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
]

const initialsColor = (name?: string | null) => {
  let hash = 0
  const base = String(name ?? '').trim().toLowerCase()
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0
  return INITIALS_COLORS[hash % INITIALS_COLORS.length]
}

const sponsorLabel = (member: Member) => {
  const username = String(member.referredByUsername ?? '').trim()
  const name = String(member.referredByName ?? '').trim()
  if (username && name) return `${name} (@${username})`
  if (username) return `@${username}`
  if (name) return name
  return 'None'
}

const sponsorKey = (member: Member) => {
  const username = normalize(member.referredByUsername)
  if (username) return `u:${username}`
  const name = normalize(member.referredByName)
  if (name) return `n:${name}`
  return 'none'
}

const PER_PAGE_OPTIONS = [10, 25, 50]

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-3.5 w-32 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4"><div className="h-8 w-32 rounded-full bg-slate-100 dark:bg-slate-800" /></td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4"><div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800" /></td>
      <td className="px-5 py-4"><div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-800" /></td>
    </tr>
  )
}

export default function PartnerMembersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sponsorFilter, setSponsorFilter] = useState('all')

  const { data, isLoading, isFetching, error } = useGetPartnerMembersQuery({
    page,
    perPage,
    search: search.trim() || undefined,
  })

  const members = data?.members ?? []
  const meta = data?.meta
  const totalPages = Math.max(1, Number(meta?.last_page ?? 1))
  const totalMembers = Number(meta?.total ?? members.length)
  const canPrev = page > 1
  const canNext = page < totalPages
  const loading = isLoading

  const sponsorOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      const key = sponsorKey(m)
      if (key === 'none') continue
      if (!map.has(key)) map.set(key, sponsorLabel(m))
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [members])

  const filteredMembers = useMemo(() => {
    if (sponsorFilter === 'all') return members
    return members.filter((m) => sponsorKey(m) === sponsorFilter)
  }, [members, sponsorFilter])

  const resetFilters = () => {
    setSearch('')
    setSponsorFilter('all')
    setPage(1)
  }

  // range label e.g. "1–10 of 42"
  const rangeStart = totalMembers === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd   = Math.min(page * perPage, totalMembers)

  const COL_HEADERS = ['Member', 'Contact', 'Sponsor', 'Address', 'Joined']

  return (
    <section className="space-y-4">

      {/* ── Header card ── */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-50 via-violet-50/40 to-sky-50/60 dark:from-indigo-900/20 dark:via-violet-900/10 dark:to-sky-900/20" />

        <div className="relative p-6 sm:p-8">
          {/* Title row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100/80 shadow-sm dark:bg-indigo-900/40">
                <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Members</h1>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Search, filter, and review member profiles by sponsor.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start rounded-full border border-indigo-100 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:self-auto">
              <BarChart2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {isFetching && !loading ? '…' : filteredMembers.length} shown
              </span>
            </div>
          </div>

          {/* Filter row */}
          <div className="mt-5 grid grid-cols-1 items-end gap-4 md:grid-cols-3">
            {/* Search — spans 2 cols */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search by name, username, or email"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Sponsor */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Sponsor
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={sponsorFilter}
                  onChange={(e) => setSponsorFilter(e.target.value)}
                  disabled={loading}
                >
                  <option value="all">All sponsors</option>
                  {sponsorOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Reset row */}
          <div className="mt-4 grid grid-cols-1 items-center gap-3 md:grid-cols-3">
            {/* "X results in view" pill */}
            <div className="flex items-center gap-2 md:col-span-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                {filteredMembers.length} results in view
              </span>
            </div>
            {/* Reset button */}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={resetFilters}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-violet-500 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200/60 transition hover:from-indigo-600 hover:to-violet-600 disabled:opacity-60 dark:shadow-indigo-900/30"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">Use filters to refine results</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Loading skeleton */}
        {loading && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60">
                <tr>
                  {COL_HEADERS.map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {h} <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="space-y-1 p-8 text-sm">
            <p className="font-bold text-rose-600 dark:text-rose-400">Failed to load members.</p>
            <p className="text-xs text-rose-500 dark:text-rose-300">{extractErrorMessage(error)}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredMembers.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30">
              <Users className="h-8 w-8 text-indigo-400" />
            </div>
            <p className="mt-4 text-base font-bold text-slate-700 dark:text-slate-200">No members found.</p>
            <p className="mt-1 text-sm text-slate-400">Try adjusting the search or sponsor filter.</p>
          </div>
        )}

        {/* Data table */}
        {!loading && !error && filteredMembers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-50/80 backdrop-blur dark:bg-slate-800/60">
                <tr>
                  {COL_HEADERS.map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {h} <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMembers.map((member) => {
                  const fullAddress   = String(member.fullAddress ?? '').trim() || 'N/A'
                  const memberUsername = String(member.username ?? '').trim()
                  const sponsorName   = String(member.referredByName ?? '').trim() || 'None'
                  const sponsorUsername = String(member.referredByUsername ?? '').trim()
                  const sponsorAvatar = String(member.referredByAvatar ?? '').trim()
                  const avatar        = String(member.avatar ?? '').trim()
                  const initials      = getInitials(member.name)
                  const color         = initialsColor(member.name)
                  const joinedDate    = formatJoinedDate(member)

                  return (
                    <tr
                      key={member.id}
                      className="align-middle transition hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
                    >
                      {/* Member */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ${avatar ? '' : `${color.bg} ${color.text}`}`}>
                            {avatar ? (
                              <img src={avatar} alt={member.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold">{initials}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold leading-5 text-slate-900 dark:text-slate-100">
                              {member.name}
                            </p>
                            <div className="mt-0.5 space-y-0.5">
                              {memberUsername && (
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{memberUsername}</p>
                              )}
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-900/40">
                            <Phone className="h-3.5 w-3.5" />
                          </span>
                          <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700">
                            {member.contactNumber || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Sponsor */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            {sponsorAvatar ? (
                              <img src={sponsorAvatar} alt={sponsorName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                {getInitials(sponsorName)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{sponsorName}</p>
                            {sponsorUsername && (
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{sponsorUsername}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-5 py-4">
                        <span className="max-w-xs truncate text-sm text-slate-600 dark:text-slate-400" title={fullAddress}>
                          {fullAddress}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-900/50">
                          {joinedDate}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && !error && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
            {/* Per-page */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Show</span>
              <div className="relative">
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-1 pl-3 pr-7 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <span>per page</span>
            </div>

            {/* Page nav */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev || isFetching}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition ${
                      page === p
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext || isFetching}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Range label */}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalMembers === 0 ? '0' : `${rangeStart}–${rangeEnd}`} of {totalMembers}
            </p>
          </div>
        )}

      </div>
    </section>
  )
}
