'use client'

import { useEffect, useMemo, useState } from 'react'
import { showErrorToast, showSuccessToast } from '@/libs/toast'
import { getPartnerStorefrontConfig } from '@/libs/partnerStorefront'
import { isWebstoreRequestExpired } from '@/libs/webstoreExpiry'
import { Pencil, Trash2 } from 'lucide-react'
import {
  useCreatePartnerUserMutation,
  useDeletePartnerUserMutation,
  useGetPartnerUsersQuery,
  useUpdatePartnerUserMutation,
  type PartnerUserItem,
} from '@/store/api/partnerUsersApi'
import { useGetWebstoreRequestsQuery } from '@/store/api/adminInquiriesApi'
import { useGetAdminWebPageItemsQuery } from '@/store/api/webPagesApi'

type FormState = {
  name: string
  username: string
  email: string
  password: string
  storefrontIds: number[]
}

const emptyForm: FormState = {
  name: '',
  username: '',
  email: '',
  password: '',
  storefrontIds: [],
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30'

export default function PartnerUsersPage({ showStorefrontFilter = true }: { showStorefrontFilter?: boolean }) {
  const [search, setSearch] = useState('')
  const [storefrontFilter, setStorefrontFilter] = useState<string>('all')
  const [selected, setSelected] = useState<PartnerUserItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [deleteModalUser, setDeleteModalUser] = useState<PartnerUserItem | null>(null)
  const [accessStorefrontIds, setAccessStorefrontIds] = useState<number[]>([])
  const [accessTargetUserId, setAccessTargetUserId] = useState<number | null>(null)

  const { data: storefrontData } = useGetAdminWebPageItemsQuery({
    type: 'partner-storefront',
    page: 1,
    perPage: 100,
    status: 'all',
  })

  const storefronts = useMemo(() => {
    const storefrontItems = storefrontData?.items ?? []
    return storefrontItems
      .map((item) => {
        const cfg = getPartnerStorefrontConfig(item)
        return {
          id: item.id,
          slug: cfg?.slug || String(item.key ?? '').trim() || `storefront-${item.id}`,
          name: cfg?.displayName || String(item.title ?? '').trim() || String(item.key ?? '').trim() || `Storefront #${item.id}`,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [storefrontData?.items])

  const storefrontNameById = useMemo(() => {
    const map = new Map<number, string>()
    storefronts.forEach((s) => map.set(s.id, s.name))
    return map
  }, [storefronts])

  const { data: webstoreRequestsData } = useGetWebstoreRequestsQuery()

  // Compute expired storefront IDs purely on the frontend — same logic as the inquiry page —
  // so both pages always agree on expiry without relying on backend timing or slug DB lookups.
  const globalExpiredStorefrontIds = useMemo(() => {
    const expiredSlugs = new Set<string>()
    for (const req of webstoreRequestsData?.requests ?? []) {
      const slug = String(req.slug_name ?? '').trim().toLowerCase()
      if (slug && isWebstoreRequestExpired(req)) {
        expiredSlugs.add(slug)
      }
    }
    return storefronts
      .filter((s) => expiredSlugs.has(s.slug.toLowerCase()))
      .map((s) => s.id)
  }, [webstoreRequestsData?.requests, storefronts])

  const { data, isLoading, isError, error: loadError, refetch } = useGetPartnerUsersQuery(
    { search },
    { refetchOnMountOrArgChange: true },
  )

  const [createUser, { isLoading: isCreating }] = useCreatePartnerUserMutation()
  const [updateUser, { isLoading: isUpdating }] = useUpdatePartnerUserMutation()
  const [deleteUser, { isLoading: isDeleting }] = useDeletePartnerUserMutation()
  const [isSavingStorefrontAccess, setIsSavingStorefrontAccess] = useState(false)

  const users = useMemo(() => data?.users ?? [], [data?.users])
  const busy = isCreating || isUpdating || isDeleting

  useEffect(() => {
    if (users.length === 0) {
      setAccessTargetUserId(null)
      setAccessStorefrontIds([])
      return
    }
    if (accessTargetUserId !== null) return
    const firstUser = users[0]
    if (!firstUser) return
    setAccessTargetUserId(firstUser.id)
    setAccessStorefrontIds(
      (firstUser.disabled_storefront_ids ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    )
  }, [users, accessTargetUserId])

  useEffect(() => {
    // Partner page: default to all assigned storefronts selected for new-create mode.
    if (showStorefrontFilter) return
    if (selected) return
    if (storefronts.length === 0) return
    if (form.storefrontIds.length > 0) return
    setForm((prev) => ({ ...prev, storefrontIds: storefronts.map((s) => s.id) }))
  }, [showStorefrontFilter, selected, storefronts, form.storefrontIds.length])

  const visibleUsers = useMemo(() => {
    if (!showStorefrontFilter) return users
    if (storefrontFilter === 'all') {
      // Show only users that are connected to at least one storefront by default.
      return users.filter((u) => (u.storefront_ids ?? []).length > 0)
    }
    const id = Number(storefrontFilter)
    if (!Number.isFinite(id)) return users
    return users.filter((u) => (u.storefront_ids ?? []).includes(id))
  }, [users, storefrontFilter, showStorefrontFilter])

  const resetForm = () => {
    setSelected(null)
    setForm(emptyForm)
    setShowPassword(false)
  }

  const startEdit = (user: PartnerUserItem) => {
    const normalizedStorefrontIds = (user.storefront_ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
    setSelected(user)
    setForm({
      name: user.name,
      username: user.username,
      email: user.email ?? '',
      storefrontIds: normalizedStorefrontIds,
      password: '',
    })
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      showErrorToast('Name and username are required.')
      return
    }
    if (form.storefrontIds.length === 0) {
      showErrorToast('Select at least one storefront for this account.')
      return
    }

    try {
      if (selected) {
        await updateUser({
          id: selected.id,
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password.trim() || undefined,
          storefront_ids: form.storefrontIds,
        }).unwrap()
        showSuccessToast('Partner user updated.')
      } else {
        if (!form.password.trim()) {
          showErrorToast('Password is required for new users.')
          return
        }
        await createUser({
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim() || undefined,
          password: form.password.trim(),
          storefront_ids: form.storefrontIds,
        }).unwrap()
        showSuccessToast('Partner user created.')
      }
      resetForm()
    } catch (error) {
      const apiErr = error as { data?: { message?: string } }
      showErrorToast(apiErr?.data?.message || 'Failed to save partner user.')
    }
  }

  const targetAccessUser = useMemo(() => {
    if (accessTargetUserId !== null) {
      return users.find((u) => u.id === accessTargetUserId) ?? null
    }
    return null
  }, [accessTargetUserId, users])

  const currentAccessIds = useMemo(() => {
    if (!targetAccessUser) return []
    if (accessTargetUserId === targetAccessUser.id) {
      return accessStorefrontIds
    }
    return (targetAccessUser.disabled_storefront_ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
  }, [targetAccessUser, accessTargetUserId, accessStorefrontIds])

  const currentAssignedAccessIds = useMemo(() => {
    if (!targetAccessUser) return []
    return (targetAccessUser.storefront_ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
  }, [targetAccessUser])

  const currentExpiredIds = globalExpiredStorefrontIds

  const saveStorefrontAccess = async (targetUser: PartnerUserItem, nextDisabledIds: number[]) => {
    setIsSavingStorefrontAccess(true)
    try {
      await updateUser({
        id: targetUser.id,
        name: targetUser.name.trim(),
        username: targetUser.username.trim(),
        email: (targetUser.email ?? '').trim(),
        disabled_storefront_ids: nextDisabledIds,
      }).unwrap()
      setAccessStorefrontIds(nextDisabledIds)
      await refetch()
      showSuccessToast('Storefront access updated.')
    } catch (error) {
      const apiErr = error as { data?: { message?: string } }
      showErrorToast(apiErr?.data?.message || 'Failed to update storefront access.')
      const fallbackIds = (targetUser.disabled_storefront_ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
      setAccessStorefrontIds(fallbackIds)
    } finally {
      setIsSavingStorefrontAccess(false)
    }
  }

  const toggleStorefrontAccess = async (storefrontId: number) => {
    const targetUser = targetAccessUser
    if (!targetUser) {
      showErrorToast('No partner user available to update.')
      return
    }
    const assignedIds = (targetUser.storefront_ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
    if (!assignedIds.includes(storefrontId)) {
      showErrorToast('This storefront is not assigned to the selected user.')
      return
    }

    const currentDisabledIds = accessTargetUserId === targetUser.id
      ? accessStorefrontIds
      : (targetUser.disabled_storefront_ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
    // In this section, a toggled ON switch means "disable access".
    // Stored IDs here are disabled IDs, so ON adds the storefront ID.
    const next = new Set(currentDisabledIds)
    const isCurrentlyDisabled = next.has(storefrontId)
    if (isCurrentlyDisabled) next.delete(storefrontId)
    else next.add(storefrontId)
    const nextDisabledIds = Array.from(next)

    setAccessTargetUserId(targetUser.id)
    setAccessStorefrontIds(nextDisabledIds)
    await saveStorefrontAccess(targetUser, nextDisabledIds)
  }

  const handleDelete = async (user: PartnerUserItem) => {
    if (busy) return
    setDeleteModalUser(user)
  }

  const confirmDelete = async () => {
    const user = deleteModalUser
    setDeleteModalUser(null)
    if (!user) return
    try {
      await deleteUser({ id: user.id }).unwrap()
      showSuccessToast('Partner user deleted.')
      if (selected?.id === user.id) resetForm()
    } catch (error) {
      const apiErr = error as { data?: { message?: string } }
      showErrorToast(apiErr?.data?.message || 'Failed to delete partner user.')
    }
  }

  if (isLoading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Loading partner users...</div>
  }

  if (isError) {
    const apiMessage = (loadError as { data?: { message?: string } } | undefined)?.data?.message
      || (loadError as { error?: string } | undefined)?.error
      || 'Failed to load partner users.'

    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center shadow-sm dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">{apiMessage}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start text-slate-900 dark:text-slate-100">
        {/* Sidebar */}
        <aside className="lg:w-75 lg:shrink-0 space-y-3">
          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-900/20">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Partner</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">User Accounts</h1>
            <p className="mt-3 text-xs opacity-70">{users.length} user{users.length !== 1 ? 's' : ''} total</p>
          </div>

          {/* Storefront stats */}
          {showStorefrontFilter && storefronts.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Storefronts</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {storefronts.map((store) => {
                  const count = users.filter((u) => (u.storefront_ids ?? []).includes(store.id)).length
                  return (
                    <div key={store.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{store.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">/{store.slug}</p>
                      </div>
                      <span className="ml-3 shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* Create / Edit form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selected ? `Edit @${selected.username}` : 'Create New User'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {selected ? 'Update account details below.' : 'Fill in the details to add a partner.'}
                </p>
              </div>
              {selected ? (
                <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">Editing</span>
              ) : null}
            </div>
            <div className="space-y-3">
              <Field label="Full Name">
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Enter full name" className={inputClass} />
              </Field>
              <Field label="Username">
                <input name="partner_user_username_input" autoComplete="off" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="Enter username" className={inputClass} />
              </Field>
              <Field label="Email (Optional)">
                <input type="email" name="partner_user_email_input" autoComplete="off" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="name@example.com" className={inputClass} />
              </Field>
              <Field label={selected ? 'Password (Optional)' : 'Password'}>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="partner_user_password_input"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder={selected ? 'Leave blank to keep' : '••••••••'}
                    className={`${inputClass} pr-14`}
                  />
                  <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>
              <Field label="Assign Storefronts">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                  {showStorefrontFilter ? (
                    <div className="mb-2 flex gap-2">
                      <button type="button" onClick={() => setForm((p) => ({ ...p, storefrontIds: storefronts.map((s) => s.id) }))} disabled={storefronts.length === 0} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">Select All</button>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, storefrontIds: [] }))} disabled={form.storefrontIds.length === 0} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">Clear</button>
                    </div>
                  ) : null}
                  <div className="max-h-36 overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
                    {storefronts.map((store) => {
                      const checked = form.storefrontIds.includes(store.id)
                      return (
                        <label key={`assign-${store.id}`} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setForm((p) => { const n = new Set(p.storefrontIds); if (n.has(store.id)) n.delete(store.id); else n.add(store.id); return { ...p, storefrontIds: Array.from(n) } })}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{store.name}</span>
                        </label>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{form.storefrontIds.length} storefront{form.storefrontIds.length !== 1 ? 's' : ''} selected</p>
                </div>
              </Field>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={busy}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? (selected ? 'Saving…' : 'Creating…') : (selected ? 'Save Changes' : 'Create User')}
              </button>
              {selected ? (
                <button type="button" onClick={resetForm} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 flex-1 space-y-4">
          {/* Search + filter bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="relative min-w-[200px] flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, username, email…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/70 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-800" />
            </div>
            {showStorefrontFilter ? (
              <select value={storefrontFilter} onChange={(e) => setStorefrontFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <option value="all">All Storefronts</option>
                {storefronts.map((store) => (
                  <option key={store.id} value={String(store.id)}>{store.name}</option>
                ))}
              </select>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {visibleUsers.length} user{visibleUsers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Users list */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Partner Users</h2>
            </div>
            {visibleUsers.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <svg className="h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">No partner users found.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleUsers.map((user) => {
                  const initials = user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
                  const isEditing = selected?.id === user.id
                  const isAccessTarget = accessTargetUserId === user.id
                  return (
                    <div key={user.id} className={`flex items-center gap-4 px-5 py-4 transition ${isEditing ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'}`}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isEditing ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {initials || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                          <span className="text-xs text-slate-400 dark:text-slate-500">@{user.username}</span>
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Active</span>
                        </div>
                        {user.email ? <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{user.email}</p> : null}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(user.storefront_ids ?? []).length > 0 ? (
                            (user.storefront_ids ?? []).map((id) => (
                              <span key={`${user.id}-${id}`} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                                {storefrontNameById.get(id) || `#${id}`}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-amber-500 dark:text-amber-400">No storefront assigned</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {showStorefrontFilter ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAccessTargetUserId(user.id)
                              setAccessStorefrontIds((user.disabled_storefront_ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id)))
                            }}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${isAccessTarget ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                          >
                            Access
                          </button>
                        ) : null}
                        <button type="button" onClick={() => startEdit(user)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300" title="Edit user" aria-label="Edit user">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => void handleDelete(user)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300" title="Delete user" aria-label="Delete user">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Storefront Access */}
          {showStorefrontFilter ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Storefront Access</h2>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Toggle OFF disables access to that storefront for the selected user.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!targetAccessUser) return
                    const nextIds: number[] = []
                    setAccessTargetUserId(targetAccessUser.id)
                    setAccessStorefrontIds(nextIds)
                    void saveStorefrontAccess(targetAccessUser, nextIds)
                  }}
                  disabled={!targetAccessUser || isSavingStorefrontAccess}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                >
                  Enable All
                </button>
              </div>
              <div className="p-5">
                {targetAccessUser ? (
                  <div className="mb-4 flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 dark:bg-indigo-950/30">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                      {targetAccessUser.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{targetAccessUser.name}</p>
                      <p className="text-xs text-indigo-500 dark:text-indigo-300">@{targetAccessUser.username}</p>
                    </div>
                    {isSavingStorefrontAccess ? <span className="text-xs text-indigo-400">Saving…</span> : null}
                  </div>
                ) : (
                  <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                    Click <span className="font-semibold text-slate-700 dark:text-slate-200">Access</span> on a user above to manage their storefront access.
                  </p>
                )}
                <div className="space-y-2">
                  {storefronts.map((store) => {
                    const isAssigned = currentAssignedAccessIds.includes(store.id)
                    const isExpired = currentExpiredIds.includes(store.id)
                    const isDisabled = isExpired || currentAccessIds.includes(store.id)
                    const toggleLocked = isSavingStorefrontAccess || !targetAccessUser || !isAssigned || isExpired
                    return (
                      <div
                        key={`toggle-${store.id}`}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                          isExpired
                            ? 'border-orange-200 bg-orange-50/60 dark:border-orange-900/50 dark:bg-orange-950/20'
                            : !isAssigned
                              ? 'border-slate-200 bg-slate-50 opacity-50 dark:border-slate-700 dark:bg-slate-800/40'
                              : isDisabled
                                ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20'
                                : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{store.name}</p>
                            {isExpired ? (
                              <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">Expired</span>
                            ) : !isAssigned ? (
                              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-700 dark:text-slate-400">Not Assigned</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500">/{store.slug}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 pl-4">
                          {isAssigned || isExpired ? (
                            <span className={`text-xs font-semibold ${isExpired ? 'text-orange-500 dark:text-orange-400' : isDisabled ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {isExpired ? 'Expired' : isDisabled ? 'Disabled' : 'Enabled'}
                            </span>
                          ) : null}
                          <label className={`relative inline-flex items-center ${toggleLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              checked={isDisabled}
                              onChange={() => void toggleStorefrontAccess(store.id)}
                              disabled={toggleLocked}
                              className="peer sr-only"
                            />
                            <div className={`peer h-6 w-11 rounded-full border transition ${isExpired ? 'border-orange-500! bg-orange-500!' : isDisabled ? 'border-rose-500! bg-rose-500!' : 'border-slate-300 bg-slate-300 dark:border-slate-600 dark:bg-slate-700'} ${toggleLocked ? 'opacity-40' : ''}`} />
                            <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isDisabled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {/* Delete modal */}
      {deleteModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setDeleteModalUser(null)} role="presentation" />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete partner user?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This will permanently delete <span className="font-semibold text-slate-900 dark:text-slate-100">@{deleteModalUser.username}</span>. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={() => setDeleteModalUser(null)} disabled={busy} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Cancel</button>
              <button type="button" onClick={() => void confirmDelete()} disabled={busy} className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </div>
  )
}
