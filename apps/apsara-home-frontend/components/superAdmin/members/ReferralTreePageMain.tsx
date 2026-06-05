'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AdminPagination from '@/components/superAdmin/AdminPagination'
import DataTableShell from '@/components/superAdmin/DataTableShell'
import { Member } from '@/types/members/types'
import { AdminReferralNode, useGetMembersQuery, useGetMembersReferralTreeQuery } from '@/store/api/membersApi'

type ReferralStatus = AdminReferralNode['status']
type Tab = 'tree' | 'list'

const TIER_COLORS: Record<string, string> = {
  'Lifestyle Elite': 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  'Lifestyle Consultant': 'border-blue-200 bg-blue-50 text-blue-700',
  'Home Stylist': 'border-teal-200 bg-teal-50 text-teal-700',
  'Home Builder': 'border-sky-200 bg-sky-50 text-sky-700',
  'Home Starter': 'border-slate-200 bg-slate-50 text-slate-600',
}

const STATUS_CONFIG: Record<ReferralStatus, { dot: string; label: string; text: string; soft: string }> = {
  active: { dot: 'bg-emerald-400', label: 'Active', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  pending: { dot: 'bg-sky-400', label: 'Pending', text: 'text-sky-700', soft: 'bg-sky-50' },
  blocked: { dot: 'bg-rose-400', label: 'Blocked', text: 'text-rose-700', soft: 'bg-rose-50' },
  kyc_review: { dot: 'bg-sky-400', label: 'KYC Review', text: 'text-sky-700', soft: 'bg-sky-50' },
}

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'MB'

const php = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n)

function Avatar({
  name,
  avatar,
  className,
  textClassName,
  fallbackClassName,
}: {
  name: string
  avatar?: string
  className: string
  textClassName: string
  fallbackClassName: string
}) {
  const [failed, setFailed] = useState(false)
  const canShowImage = Boolean(avatar) && !failed

  if (canShowImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt={name}
        className={`${className} object-cover`}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div className={`${className} ${fallbackClassName}`}>
      <span className={textClassName}>{getInitials(name)}</span>
    </div>
  )
}

function formatJoined(value?: string) {
  return value
    ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A'
}

function filterTree(nodes: AdminReferralNode[], query: string): AdminReferralNode[] {
  if (!query) return nodes

  return nodes
    .map((node) => ({
      ...node,
      children: filterTree(node.children ?? [], query),
    }))
    .filter((node) => {
      const searchHaystack = [node.name, node.email, node.username, node.tier, STATUS_CONFIG[node.status].label]
        .join(' ')
        .toLowerCase()

      return searchHaystack.includes(query) || (node.children?.length ?? 0) > 0
    })
}

type ReferralSortKey =
  | 'default'
  | 'referrals_high_low'
  | 'earnings_high_low'
  | 'newest_registered'
  | 'oldest_registered'

const sortOptions: Array<{ value: ReferralSortKey; label: string }> = [
  { value: 'default', label: 'Default Sort' },
  { value: 'referrals_high_low', label: 'Highest Referral' },
  { value: 'earnings_high_low', label: 'Highest Commission' },
  { value: 'newest_registered', label: 'Newest Joined' },
  { value: 'oldest_registered', label: 'Oldest Joined' },
]

function sortTree(nodes: AdminReferralNode[], sortKey: ReferralSortKey): AdminReferralNode[] {
  if (sortKey === 'default') return nodes

  const sorted = [...nodes].sort((a, b) => {
    switch (sortKey) {
      case 'referrals_high_low':
        return b.referralCount - a.referralCount
      case 'earnings_high_low':
        return b.commissionEarned - a.commissionEarned
      case 'newest_registered':
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
      case 'oldest_registered':
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
      default:
        return 0
    }
  })

  return sorted.map((node) => ({
    ...node,
    children: sortTree(node.children ?? [], sortKey),
  }))
}

function buildReferralNodeMap(nodes: AdminReferralNode[], map = new Map<number, AdminReferralNode>()) {
  nodes.forEach((node) => {
    map.set(node.id, node)
    buildReferralNodeMap(node.children ?? [], map)
  })

  return map
}

function countDescendants(node?: AdminReferralNode): number {
  if (!node) return 0
  return (node.children ?? []).reduce((sum, child) => sum + 1 + countDescendants(child), 0)
}

function NetworkPreviewNode({
  node,
  level = 0,
  maxDepth = 3,
}: {
  node: AdminReferralNode
  level?: number
  maxDepth?: number
}) {
  const status = STATUS_CONFIG[node.status]
  const tierColor = TIER_COLORS[node.tier] ?? 'border-slate-200 bg-slate-50 text-slate-600'
  const childCount = node.children?.length ?? 0

  return (
    <div className={level > 0 ? 'ml-4 border-l border-slate-200/80 pl-4' : ''}>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar
              name={node.name}
              avatar={node.avatar}
              className="h-10 w-10 rounded-2xl"
              textClassName="text-xs font-bold text-white"
              fallbackClassName={`flex items-center justify-center ${level === 0 ? 'bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500' : 'bg-gradient-to-br from-slate-500 to-slate-700'}`}
            />
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${status.dot}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-800">{node.name}</p>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tierColor}`}>
                {node.tier}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.soft} ${status.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">{node.email || `@${node.username}`}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500">
              <span>Commission: <span className="font-semibold text-teal-700">{php(node.commissionEarned)}</span></span>
              <span>Direct: <span className="font-semibold text-slate-700">{node.referralCount}</span></span>
              <span>Joined: <span className="font-semibold text-slate-700">{formatJoined(node.joinedAt)}</span></span>
              <span>Next level: <span className="font-semibold text-slate-700">{childCount}</span></span>
            </div>
          </div>
        </div>
      </div>

      {level < maxDepth - 1 && childCount > 0 && (
        <div className="mt-2 space-y-2">
          {node.children?.map((child) => (
            <NetworkPreviewNode key={child.id} node={child} level={level + 1} maxDepth={maxDepth} />
          ))}
        </div>
      )}
    </div>
  )
}

function TreeNodeCard({
  node,
  depth,
  expandAll,
}: {
  node: AdminReferralNode
  depth: number
  expandAll: boolean
}) {
  const [open, setOpen] = useState(expandAll)
  const hasChildren = (node.children?.length ?? 0) > 0
  const status = STATUS_CONFIG[node.status]
  const tierColor = TIER_COLORS[node.tier] ?? 'border-slate-200 bg-slate-50 text-slate-600'
  const descendantCount = countDescendants(node)

  useEffect(() => {
    setOpen(expandAll)
  }, [expandAll, node.id])

  return (
    <div className={depth > 0 ? 'ml-5 border-l border-slate-200/70 pl-4' : ''}>
      <div className={`group relative overflow-hidden rounded-[28px] border bg-white p-4 transition-all duration-200 hover:border-cyan-200 ${depth === 0 ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800'}`}>
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar
              name={node.name}
              avatar={node.avatar}
              className="h-12 w-12 rounded-[18px]"
              textClassName="text-sm font-bold text-white"
              fallbackClassName={`flex items-center justify-center ${depth === 0 ? 'bg-sky-500' : 'bg-slate-500'}`}
            />
            <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${status.dot}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-base font-bold text-slate-900">{node.name}</span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tierColor}`}>
                {node.tier}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.soft} ${status.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>

            <p className="mt-1 truncate text-sm text-slate-400">{node.email || `@${node.username}`}</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Commission', value: php(node.commissionEarned), valueClass: 'text-teal-700' },
                { label: 'Direct Referrals', value: String(node.referralCount), valueClass: 'text-slate-900' },
                { label: 'Network Size', value: String(descendantCount), valueClass: 'text-cyan-700' },
                { label: 'Joined', value: formatJoined(node.joinedAt), valueClass: 'text-slate-700' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className={`mt-1 text-sm font-bold ${item.valueClass}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {hasChildren && (
            <button
              onClick={() => setOpen((value) => !value)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900"
              aria-label={open ? 'Collapse referrals' : 'Expand referrals'}
            >
              <svg className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {hasChildren && open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden pt-2"
          >
            <div className="space-y-2">
              {node.children?.map((child) => (
                <TreeNodeCard key={child.id} node={child} depth={depth + 1} expandAll={expandAll} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ListRow({
  member,
  referralNode,
}: {
  member: Member
  referralNode?: AdminReferralNode
}) {
  const [open, setOpen] = useState(false)
  const status = STATUS_CONFIG[member.status]
  const tierColor = TIER_COLORS[member.tier] ?? 'border-slate-200 bg-slate-50 text-slate-600'
  const directChildren = referralNode?.children ?? []
  const totalNetwork = countDescendants(referralNode)

  return (
    <>
      <tr className="group border-b border-slate-100 dark:border-slate-800/80 bg-white/90 transition-all hover:bg-cyan-50/40">
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={member.name}
              avatar={member.avatar}
              className="h-10 w-10 shrink-0 rounded-2xl"
              textClassName="text-xs font-bold text-white"
              fallbackClassName="flex items-center justify-center bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{member.name}</p>
              <p className="truncate text-xs text-slate-400">{member.email || 'No email address'}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tierColor}`}>
            {member.tier}
          </span>
        </td>
        <td className="px-4 py-4 text-sm font-bold text-teal-700">{php(member.earnings ?? 0)}</td>
        <td className="px-4 py-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800">{member.referrals ?? 0}</span>
            <span className="text-[11px] text-slate-400">{totalNetwork} in network</span>
          </div>
        </td>
        <td className="px-4 py-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.soft} ${status.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </td>
        <td className="px-4 py-4 text-xs text-slate-500">
          <div className="flex items-center justify-between gap-3">
            <span>{formatJoined(member.joinedAt)}</span>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              aria-label={open ? 'Hide network details' : 'Show network details'}
            >
              Explore
              <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </td>
      </tr>

      <AnimatePresence initial={false}>
        {open && (
          <tr className="bg-[linear-gradient(180deg,rgba(240,249,255,0.45),rgba(255,255,255,1))]">
            <td colSpan={6} className="px-5 py-5">
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Referral Explorer</p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">{member.name}&apos;s network</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Direct invites, plus the next invite levels under each person.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { label: 'Direct', value: String(directChildren.length) },
                      { label: 'Total Network', value: String(totalNetwork) },
                      { label: 'Commission', value: php(member.earnings ?? 0) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {referralNode ? (
                  <div className="mt-4 space-y-2">
                    <NetworkPreviewNode node={referralNode} />
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm font-semibold text-slate-700">No referral tree record found</p>
                    <p className="mt-1 text-xs text-slate-400">This customer is in the customer table but has no visible referral branch yet.</p>
                  </div>
                )}
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

export default function ReferralTreePageMain() {
  const [tab, setTab] = useState<Tab>('tree')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [listPage, setListPage] = useState(1)
  const [expandAll, setExpandAll] = useState(true)
  const [sortBy, setSortBy] = useState<ReferralSortKey>('default')
  const perPage = 10

  const { data, isLoading, isFetching, isError } = useGetMembersReferralTreeQuery()
  const {
    data: listData,
    isLoading: isListLoading,
    isFetching: isListFetching,
    isError: isListError,
  } = useGetMembersQuery(
    {
      page: listPage,
      perPage,
      search: debouncedSearch !== '' ? debouncedSearch : undefined,
      sort: sortBy,
    },
    {
      skip: tab !== 'list',
    },
  )

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => clearTimeout(timeout)
  }, [search])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredTree = useMemo(
    () => sortTree(filterTree(data?.roots ?? [], normalizedSearch), sortBy),
    [data?.roots, normalizedSearch, sortBy],
  )
  const referralNodeMap = useMemo(
    () => buildReferralNodeMap(data?.roots ?? []),
    [data?.roots],
  )
  const summary = data?.summary
  const listMembers = listData?.members ?? []
  const listMeta = listData?.meta

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-sky-100 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:border-sky-900/40 dark:bg-slate-900 dark:text-sky-300">
              Referral Overview
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Commission / Referral Tree</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Explore the full customer network, inspect invite chains, and switch between hierarchy and paginated customer table views.
            </p>
          </div>

          <div className="grid min-w-[250px] gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Visible roots</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{filteredTree.length}</p>
              <p className="mt-1 text-xs text-slate-500">Top-level branches currently in view</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Total members</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{summary?.totalMembers ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">Based on the current customer database</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        {[
          {
            label: 'Total Commission Paid',
            value: php(summary?.totalCommissionPaid ?? 0),
            accent: 'from-cyan-500 to-teal-600',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
          },
          {
            label: 'Active Members',
            value: String(summary?.activeMembers ?? 0),
            accent: 'from-blue-500 to-indigo-600',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
          },
          {
            label: 'Total Referrals',
            value: String(summary?.totalReferrals ?? 0),
            accent: 'from-fuchsia-500 to-violet-600',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />,
          },
          {
            label: 'Avg. Commission/Member',
            value: php(summary?.avgCommissionPerMember ?? 0),
            accent: 'from-amber-500 to-orange-600',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
          },
        ].map((stat) => (
          <div key={stat.label} className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${stat.accent} text-white shadow-sm ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {stat.icon}
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
                <p className="mt-1 whitespace-nowrap text-xl font-black tabular-nums text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search member, email, username, or tier..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setListPage(1)
              }}
              className="h-11 w-full rounded-[18px] border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-sky-400 focus:bg-white dark:border-white/18 dark:bg-white/12 dark:text-white dark:placeholder:text-white/55 dark:focus:border-sky-400/60 dark:focus:bg-white/18"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as ReferralSortKey)
                setListPage(1)
              }}
              className="h-11 cursor-pointer appearance-none rounded-[18px] border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-sm font-semibold text-slate-600 outline-none transition-all duration-200 hover:border-slate-400 focus:border-sky-400 dark:border-white/18 dark:bg-white/12 dark:text-slate-200 dark:focus:border-sky-400/60"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            {tab === 'tree' && (
              <button
                onClick={() => setExpandAll((value) => !value)}
                className="rounded-[18px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/18 dark:bg-white/12 dark:text-slate-200 dark:hover:bg-white/18"
              >
                {expandAll ? 'Collapse All' : 'Expand All'}
              </button>
            )}
            <div className="flex items-center rounded-[18px] border border-gray-300 bg-white p-1.5 dark:border-white/18 dark:bg-white/12">
              <button
                onClick={() => setTab('tree')}
                className={`rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-all ${tab === 'tree' ? 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Tree View
              </button>
              <button
                onClick={() => setTab('list')}
                className={`rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-all ${tab === 'list' ? 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                List View
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isLoading || isFetching ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500">Loading referral tree...</p>
          </div>
        ) : isError ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-12 text-center dark:border-rose-900/40 dark:bg-rose-950/30">
            <p className="text-sm font-semibold text-rose-600">Failed to load referral tree data.</p>
          </div>
        ) : tab === 'tree' ? (
          <div className="space-y-3">
            {filteredTree.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-700">No results found</p>
                <p className="mt-1 text-xs text-slate-400">Try a different search term</p>
              </div>
            ) : (
              filteredTree.map((node) => <TreeNodeCard key={node.id} node={node} depth={0} expandAll={expandAll} />)
            )}
          </div>
        ) : (
          <DataTableShell
            title="Customer Table View"
            subtitle="Paginated customer list with referral explorer"
            badge={(
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                Page records {listMembers.length}
              </span>
            )}
            footer={(
              <div className="flex items-center justify-between text-xs text-slate-400">
                <p>
                  Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{listMembers.length}</span> customer records on this page
                </p>
                <div className="text-xs text-slate-400">
                  Page earnings:{' '}
                  <span className="font-bold text-teal-700">
                    {php(listMembers.reduce((sum, member) => sum + (member.earnings ?? 0), 0))}
                  </span>
                </div>
              </div>
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Member</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tier</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Commission</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Network</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Joined / Explore</th>
                  </tr>
                </thead>
                <tbody>
                  {isListLoading || (isListFetching && !listData) ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                        Loading customers...
                      </td>
                    </tr>
                  ) : isListError ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-rose-600">
                        Failed to load customer table data.
                      </td>
                    </tr>
                  ) : listMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    listMembers.map((member) => (
                      <ListRow
                        key={member.id}
                        member={member}
                        referralNode={referralNodeMap.get(member.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination
              currentPage={listMeta?.current_page ?? 1}
              totalPages={listMeta?.last_page ?? 1}
              from={listMeta?.from ?? null}
              to={listMeta?.to ?? null}
              totalRecords={listMeta?.total ?? listMembers.length}
              onPageChange={setListPage}
            />
          </DataTableShell>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tier Legend</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TIER_COLORS).map(([tier, color]) => (
            <span key={tier} className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${color}`}>
              {tier}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
