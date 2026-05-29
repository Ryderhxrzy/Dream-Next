'use client'

import { useMemo } from 'react'
import Navbar from '@/components/layout/Navbar'
import TopBar from '@/components/layout/TopBar'
import Footer from '@/components/landing-page/Footer'
import ScrollToTop from '@/components/landing-page/ScrollToTop'
import { useGetPublicGeneralSettingsQuery } from '@/store/api/adminSettingsApi'
import type { Category } from '@/store/api/categoriesApi'
import { Building2, Factory, MapPin, Store, Navigation, Map as MapIcon } from 'lucide-react'

type Branch = {
  name: string
  address: string
  google_map_link?: string
  waze_link?: string
}

type BranchTag = 'HEAD OFFICE' | 'FACTORY OUTLET' | 'SM STORE' | 'STORE' | 'BRANCH'

const getBranchTag = (name: string): BranchTag => {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return 'BRANCH'
  if (normalized.includes('head office') || normalized.includes('main office')) return 'HEAD OFFICE'
  if (normalized.includes('factory')) return 'FACTORY OUTLET'
  if (normalized.includes('sm ')) return 'SM STORE'
  if (normalized.includes('store') || normalized.includes('branch')) return 'STORE'
  return 'BRANCH'
}

const tagStyles: Record<BranchTag, { badge: string; icon: typeof Building2 }> = {
  'HEAD OFFICE':    { badge: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/30',       icon: Building2 },
  'FACTORY OUTLET': { badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200 dark:ring-cyan-500/30',   icon: Factory   },
  'SM STORE':       { badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/30', icon: Store },
  STORE:            { badge: 'bg-sky-50 text-sky-600 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/20',         icon: Store     },
  BRANCH:           { badge: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-white/70 dark:ring-white/15',     icon: Building2 },
}

const normalizeExternalUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, '')}`
}

const parseBranches = (raw?: string | null): Branch[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => ({
        name: typeof item?.name === 'string' ? item.name : '',
        address: typeof item?.address === 'string' ? item.address : '',
        google_map_link: typeof item?.google_map_link === 'string' ? item.google_map_link : '',
        waze_link: typeof item?.waze_link === 'string' ? item.waze_link : '',
      }))
      .filter((item) => item.name.trim() || item.address.trim())
  } catch {
    return []
  }
}

export default function CompanyBranchesPageMain({ initialCategories = [] }: { initialCategories?: Category[] }) {
  const { data, isFetching } = useGetPublicGeneralSettingsQuery()
  const settings = data?.settings
  const branches = useMemo(() => parseBranches(settings?.branches), [settings?.branches])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar />
      <Navbar initialCategories={initialCategories} />

      <main>
        {/* Hero */}
        <section className="bg-linear-to-br from-sky-500 to-cyan-600 text-white">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <MapPin className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70">AF Home · Locations</p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Our Branches</h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                    Find the nearest AF Home branch and open directions instantly using Google Maps or Waze.
                  </p>
                </div>
              </div>

              {!isFetching && branches.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-xl bg-white/15 px-4 py-2.5 text-center">
                    <p className="text-sm font-bold">{branches.length}</p>
                    <p className="text-[10px] font-medium opacity-70">Locations</p>
                  </div>
                  <div className="rounded-xl bg-white/15 px-4 py-2.5 text-center">
                    <p className="text-sm font-bold">Nationwide</p>
                    <p className="text-[10px] font-medium opacity-70">Coverage</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Branches grid */}
        <section className="container mx-auto px-4 py-10 md:py-14">
          {isFetching ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="mt-4 h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-2 h-4 w-full rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="mt-1 h-4 w-2/3 rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="mt-5 flex gap-2">
                    <div className="h-8 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-8 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : branches.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch, index) => {
                const query = (branch.address || branch.name).trim()
                const googleHref = branch.google_map_link?.trim()
                  ? normalizeExternalUrl(branch.google_map_link)
                  : query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : ''
                const wazeHref = branch.waze_link?.trim()
                  ? normalizeExternalUrl(branch.waze_link)
                  : query ? `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes` : ''

                const tag = getBranchTag(branch.name)
                const { badge, icon: TagIcon } = tagStyles[tag]

                return (
                  <div
                    key={`${branch.name}-${index}`}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-sky-700"
                  >
                    {/* Top accent line */}
                    <div className="h-1 w-full bg-linear-to-r from-sky-400 to-cyan-400 opacity-0 transition-opacity group-hover:opacity-100" />

                    <div className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${badge}`}>
                          {tag}
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-sky-200 group-hover:bg-sky-50 group-hover:text-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:border-sky-800 dark:group-hover:bg-sky-900/30 dark:group-hover:text-sky-300">
                          <TagIcon className="h-5 w-5" />
                        </div>
                      </div>

                      <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                        {branch.name || `Branch ${index + 1}`}
                      </p>

                      {branch.address ? (
                        <div className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                          <span>{branch.address}</span>
                        </div>
                      ) : null}

                      {(googleHref || wazeHref) ? (
                        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                          {googleHref ? (
                            <a
                              href={googleHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50"
                            >
                              <MapIcon className="h-3.5 w-3.5" />
                              Google Maps
                            </a>
                          ) : null}
                          {wazeHref ? (
                            <a
                              href={wazeHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-white px-4 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-300 dark:hover:bg-cyan-900/20"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              Waze
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-400 dark:bg-sky-900/30 dark:text-sky-500">
                <MapPin className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No branches added yet.</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Check back soon for branch locations.</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  )
}
