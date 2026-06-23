"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  useGetSupplierCategoriesQuery,
  useAddSupplierSubCategoryMutation,
  useAddSupplierCategoryMutation,
  useUpdateSupplierCategoryMutation,
  useDeleteSupplierSubCategoryMutation,
  useDeleteSupplierCategoryMutation,
} from "@/store/api/suppliersApi"
import { useSession } from "next-auth/react"

const PALETTE = [
  {
    border: "border-l-indigo-500",
    icon: "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300",
    chevron:
      "text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-300",
    ring: "hover:ring-indigo-100 dark:hover:ring-indigo-500/10",
    sub: "border-indigo-100 dark:border-indigo-500/15",
    addBtn:
      "text-indigo-500 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10",
  },
  {
    border: "border-l-emerald-500",
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    chevron:
      "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300",
    ring: "hover:ring-emerald-100 dark:hover:ring-emerald-500/10",
    sub: "border-emerald-100 dark:border-emerald-500/15",
    addBtn:
      "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
  },
  {
    border: "border-l-violet-500",
    icon: "bg-violet-50 text-violet-500 dark:bg-violet-500/15 dark:text-violet-300",
    chevron:
      "text-violet-400 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-300",
    ring: "hover:ring-violet-100 dark:hover:ring-violet-500/10",
    sub: "border-violet-100 dark:border-violet-500/15",
    addBtn:
      "text-violet-500 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10",
  },
  {
    border: "border-l-amber-500",
    icon: "bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-300",
    chevron:
      "text-amber-400 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300",
    ring: "hover:ring-amber-100 dark:hover:ring-amber-500/10",
    sub: "border-amber-100 dark:border-amber-500/15",
    addBtn:
      "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10",
  },
  {
    border: "border-l-sky-500",
    icon: "bg-sky-50 text-sky-500 dark:bg-sky-500/15 dark:text-sky-300",
    chevron: "text-sky-400 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300",
    ring: "hover:ring-sky-100 dark:hover:ring-sky-500/10",
    sub: "border-sky-100 dark:border-sky-500/15",
    addBtn:
      "text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10",
  },
  {
    border: "border-l-rose-500",
    icon: "bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300",
    chevron: "text-rose-400 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300",
    ring: "hover:ring-rose-100 dark:hover:ring-rose-500/10",
    sub: "border-rose-100 dark:border-rose-500/15",
    addBtn:
      "text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10",
  },
]

function CategoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  )
}

function SubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M7 7h10M7 12h7M7 17h4"
      />
    </svg>
  )
}

function AddCategoryModal({ supplierId, onClose }: { supplierId: number; onClose: () => void }) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [addCategory, { isLoading, error }] = useAddSupplierCategoryMutation()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await addCategory({ supplierId, name: name.trim(), url: url.trim() || undefined }).unwrap()
      onClose()
    } catch {
      // error shown via `error` state
    }
  }

  const apiError =
    error && "data" in error
      ? (error.data as { message?: string })?.message
      : null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md animate-fade-up-in rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        {/* Modal header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15">
              <CategoryIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              New Category
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Category name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Footwear"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500/40 dark:focus:bg-slate-950 dark:focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              URL slug <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. footwear"
              pattern="[a-z0-9\-]*"
              title="Only lowercase letters, numbers and hyphens"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500/40 dark:focus:bg-slate-950 dark:focus:ring-indigo-500/10"
            />
          </div>

          {apiError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">{apiError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 rounded-xl bg-indigo-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              {isLoading ? "Saving…" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EditSubFormProps {
  supplierId: number
  sub: { id: number; name: string; url: string }
  onCancel: () => void
}

function EditSubForm({ supplierId, sub, onCancel }: EditSubFormProps) {
  const [name, setName] = useState(sub.name)
  const [url, setUrl] = useState(sub.url)
  const [updateCategory, { isLoading, error }] = useUpdateSupplierCategoryMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await updateCategory({ supplierId, id: sub.id, name: name.trim(), url: url.trim() || undefined }).unwrap()
      onCancel()
    } catch {
      // error shown via `error` state
    }
  }

  const apiError =
    error && "data" in error ? (error.data as { message?: string })?.message : null

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-500/20 dark:bg-indigo-500/5"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/10"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL slug"
          pattern="[a-z0-9\-]*"
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/10"
        />
        {apiError && <p className="text-xs text-red-500">{apiError}</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 pt-0.5">
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
        >
          {isLoading ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

interface AddSubFormProps {
  parentId: number
  supplierId: number
  colorAddBtn: string
  existingSubs: { id: number; name: string }[]
  onCancel: () => void
}

function AddSubForm({
  parentId,
  supplierId,
  colorAddBtn,
  existingSubs,
  onCancel,
}: AddSubFormProps) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [addSubCategory, { isLoading, error }] =
    useAddSupplierSubCategoryMutation()

  const isDuplicate = existingSubs.some(
    (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isDuplicate) return
    try {
      await addSubCategory({
        parentId,
        name: name.trim(),
        url: url.trim() || undefined,
      }).unwrap()
      onCancel()
    } catch {
      // error shown via `error` state
    }
  }

  const apiError =
    error && "data" in error
      ? (error.data as { message?: string })?.message
      : null

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60"
    >
      <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        New sub-category
      </p>
      <div className="space-y-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. Running Shoes)"
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/10"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL slug (optional, e.g. running-shoes)"
          pattern="[a-z0-9\-]*"
          title="Only lowercase letters, numbers and hyphens"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/10"
        />
      </div>

      {(isDuplicate || apiError) && (
        <p className="mt-2 text-xs text-red-500 dark:text-red-400">
          {isDuplicate ? `"${name.trim()}" already exists in this Sub category.` : apiError}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isLoading || !name.trim() || isDuplicate}
          className="flex-1 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
        >
          {isLoading ? "Saving…" : "Add Sub-category"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function SupplierCategoriesPage() {
  const { data: session, status } = useSession()
  const supplierId = Number(session?.user?.supplierId ?? 0)
  const { data, isLoading, isError } = useGetSupplierCategoriesQuery(
    supplierId,
    {
      skip: status !== "authenticated" || supplierId <= 0,
    }
  )

  const [query, setQuery] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [openFormFor, setOpenFormFor] = useState<number | null>(null)
  const [editingSubId, setEditingSubId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [deleteSubCategory] = useDeleteSupplierSubCategoryMutation()
  const [deleteCategory] = useDeleteSupplierCategoryMutation()
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<number | null>(null)

  const toggleExpanded = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id))

  const categories = useMemo(() => data?.categories ?? [], [data?.categories])

  // Separate top-level (assigned) from subcategories
  const { parents, subMap } = useMemo(() => {
    const allIds = new Set(categories.map((c) => c.id))
    const parents = categories.filter(
      (c) => c.parent_id === null || !allIds.has(c.parent_id)
    )
    const subMap = new Map<number, typeof categories>()
    categories.forEach((c) => {
      if (c.parent_id !== null && allIds.has(c.parent_id)) {
        const list = subMap.get(c.parent_id) ?? []
        list.push(c)
        subMap.set(c.parent_id, list)
      }
    })
    return { parents, subMap }
  }, [categories])

  const filteredParents = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parents
    return parents.filter((c) => {
      const nameMatch = (c.name ?? "").toLowerCase().includes(q)
      const urlMatch = (c.url ?? "").toLowerCase().includes(q)
      const subMatch = (subMap.get(c.id) ?? []).some(
        (s) =>
          (s.name ?? "").toLowerCase().includes(q) ||
          (s.url ?? "").toLowerCase().includes(q)
      )
      return nameMatch || urlMatch || subMatch
    })
  }, [parents, subMap, query])

  const { generalCategories, merchantCategories } = useMemo(() => ({
    generalCategories: filteredParents.filter((c) => !c.is_supplier_created),
    merchantCategories: filteredParents.filter((c) => c.is_supplier_created),
  }), [filteredParents])

  if (status === "loading") {
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
              />
            </svg>
            {parents.length} categor{parents.length === 1 ? "y" : "ies"}
          </span>

          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Assigned Categories
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            View your categories and add sub-categories
          </p>
          <button
            onClick={() => setShowAddCategory(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16M4 12h16" />
            </svg>
            Add Category
          </button>
        </div>

        {/* Decorative illustration */}
        <div className="pointer-events-none absolute top-1/2 right-6 -translate-y-1/2 select-none">
          <div className="relative h-40 w-44">
            <svg className="absolute top-2 left-1 h-4 w-4 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            <svg className="absolute top-0 right-3 h-3 w-3 text-indigo-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            <svg className="absolute bottom-3 left-3 h-3 w-3 text-indigo-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            <svg className="absolute right-1 bottom-2 h-4 w-4 text-indigo-300/70" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            <svg className="absolute top-1/2 right-0 h-2.5 w-2.5 -translate-y-1/2 text-indigo-200/80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            <div className="absolute rounded-[20px] shadow-lg" style={{ bottom: 12, left: "50%", transform: "translateX(-50%)", width: 72, height: 62, background: "linear-gradient(160deg, #c4b5fd 0%, #a78bfa 60%, #8b5cf6 100%)" }} />
            <div className="absolute rounded-t-[14px]" style={{ bottom: 44, left: "50%", transform: "translateX(-50%)", width: 56, height: 20, background: "rgba(91,33,182,0.18)" }} />
            <div className="absolute rounded-b-[18px]" style={{ bottom: 12, left: "50%", transform: "translateX(-50%)", width: 72, height: 36, background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)" }} />
            <div className="animate-float absolute flex items-center justify-center rounded-[18px] shadow-xl" style={{ width: 58, height: 58, top: 4, left: 14, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", transform: "rotate(-10deg)", animationDelay: "0s", boxShadow: "0 8px 32px rgba(99,102,241,0.18), 0 2px 8px rgba(99,102,241,0.10)" }}>
              <svg className="h-7 w-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div className="animate-float absolute flex items-center justify-center rounded-2xl shadow-xl" style={{ width: 48, height: 48, top: 14, right: 10, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", transform: "rotate(8deg)", animationDelay: "0.7s", boxShadow: "0 8px 24px rgba(99,102,241,0.15), 0 2px 6px rgba(99,102,241,0.08)" }}>
              <svg className="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add category modal ── */}
      {showAddCategory && (
        <AddCategoryModal supplierId={supplierId} onClose={() => setShowAddCategory(false)} />
      )}

      {/* ── Search bar ── */}
      {!isLoading && !isError && parents.length > 0 && (
        <div className="animate-fade-up-in relative">
          <svg
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by category name or URL…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm transition outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/10"
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
      ) : filteredParents.length === 0 ? (
        <div className="animate-fade-up-in rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-950">
          <div className="animate-float mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
            <CategoryIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            No categories assigned
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {query.trim()
              ? "No categories match your search."
              : "Ask the admin team to assign categories for your supplier."}
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-2">
          {/* ── General Categories column ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="h-3 w-3 rounded-full bg-indigo-400" />
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                General Categories
              </p>
            </div>
            {generalCategories.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400 dark:border-slate-800">
                No general categories
              </p>
            )}
            {generalCategories.map((category, index) => {
              const color = PALETTE[index * 2 % PALETTE.length]
              const subs = subMap.get(category.id) ?? []
              const isFormOpen = openFormFor === category.id
              const isExpanded = expandedId === category.id
              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  color={color}
                  subs={subs}
                  isFormOpen={isFormOpen}
                  isExpanded={isExpanded}
                  index={index}
                  supplierId={supplierId}
                  openFormFor={openFormFor}
                  editingSubId={editingSubId}
                  confirmDeleteId={confirmDeleteId}
                  toggleExpanded={toggleExpanded}
                  setOpenFormFor={setOpenFormFor}
                  setEditingSubId={setEditingSubId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  deleteSubCategory={deleteSubCategory}
                />
              )
            })}
          </div>

          {/* ── Merchant Categories column ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Merchant Categories
              </p>
            </div>
            {merchantCategories.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400 dark:border-slate-800">
                No merchant categories
              </p>
            )}
            {merchantCategories.map((category, index) => {
              const color = PALETTE[(index * 2 + 1) % PALETTE.length]
              const subs = subMap.get(category.id) ?? []
              const isFormOpen = openFormFor === category.id
              const isExpanded = expandedId === category.id
              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  color={color}
                  subs={subs}
                  isFormOpen={isFormOpen}
                  isExpanded={isExpanded}
                  index={index}
                  supplierId={supplierId}
                  openFormFor={openFormFor}
                  editingSubId={editingSubId}
                  confirmDeleteId={confirmDeleteId}
                  toggleExpanded={toggleExpanded}
                  setOpenFormFor={setOpenFormFor}
                  setEditingSubId={setEditingSubId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  deleteSubCategory={deleteSubCategory}
                  canDeleteCategory
                  confirmDeleteCategoryId={confirmDeleteCategoryId}
                  setConfirmDeleteCategoryId={setConfirmDeleteCategoryId}
                  deleteCategory={deleteCategory}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Extracted card component to avoid duplication ── */
function CategoryCard({
  category,
  color,
  subs,
  isFormOpen,
  isExpanded,
  index,
  supplierId,
  openFormFor,
  editingSubId,
  confirmDeleteId,
  toggleExpanded,
  setOpenFormFor,
  setEditingSubId,
  setConfirmDeleteId,
  deleteSubCategory,
  canDeleteCategory = false,
  confirmDeleteCategoryId,
  setConfirmDeleteCategoryId,
  deleteCategory,
}: {
  category: { id: number; name: string; url: string; parent_id: number | null }
  color: (typeof PALETTE)[number]
  subs: Array<{ id: number; name: string; url: string; parent_id: number | null }>
  isFormOpen: boolean
  isExpanded: boolean
  index: number
  supplierId: number
  openFormFor: number | null
  editingSubId: number | null
  confirmDeleteId: number | null
  toggleExpanded: (id: number) => void
  setOpenFormFor: (id: number | null) => void
  setEditingSubId: (id: number | null) => void
  setConfirmDeleteId: (id: number | null) => void
  deleteSubCategory: ReturnType<typeof useDeleteSupplierSubCategoryMutation>[0]
  canDeleteCategory?: boolean
  confirmDeleteCategoryId?: number | null
  setConfirmDeleteCategoryId?: (id: number | null) => void
  deleteCategory?: ReturnType<typeof useDeleteSupplierCategoryMutation>[0]
}) {
  const isConfirmingDelete = canDeleteCategory && confirmDeleteCategoryId === category.id

  if (isConfirmingDelete) {
    return (
      <div
        style={{ animationDelay: `${index * 60}ms` }}
        className={`animate-fade-up-in rounded-2xl border border-l-4 border-red-200 bg-red-50 shadow-sm dark:border-red-500/30 dark:bg-red-500/5 ${color.border}`}
      >
        <div className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
            <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Delete category?</p>
            <p className="mt-0.5 truncate text-xs text-red-500 dark:text-red-400">
              <strong>{category.name}</strong>{subs.length > 0 && ` and ${subs.length} sub-categor${subs.length === 1 ? "y" : "ies"}`} will be permanently removed.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => {
                deleteCategory?.({ supplierId, id: category.id })
                setConfirmDeleteCategoryId?.(null)
              }}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDeleteCategoryId?.(null)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ animationDelay: `${index * 60}ms` }}
      className={`animate-fade-up-in rounded-2xl border border-l-4 border-slate-200 bg-white shadow-sm ring-2 ring-transparent transition-all duration-200 dark:border-slate-800 dark:bg-slate-950 ${color.border} ${color.ring}`}
    >
      {/* Parent category row — click chevron to expand/collapse */}
      <div className="flex items-center gap-2 pr-3">
      <button
        type="button"
        onClick={() => toggleExpanded(category.id)}
        className="flex flex-1 items-center gap-4 p-5 text-left"
      >
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color.icon}`}>
          <CategoryIcon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {category.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            /{category.url || "no-slug"}
            {subs.length > 0 && (
              <span className="ml-2 font-medium">
                · {subs.length} sub{subs.length === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${color.chevron} ${isExpanded ? "rotate-90" : ""}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
      {canDeleteCategory && (
        <button
          type="button"
          onClick={() => setConfirmDeleteCategoryId?.(category.id)}
          title="Delete category"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
      </div>

      {/* Sub-categories + add button (collapsible) */}
      <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="overflow-hidden">
      <div className={`border-t px-5 pb-4 pt-3 ${color.sub}`}>
        {subs.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {subs.map((sub) => (
              <li key={sub.id}>
                {editingSubId === sub.id ? (
                  <EditSubForm
                    supplierId={supplierId}
                    sub={sub}
                    onCancel={() => setEditingSubId(null)}
                  />
                ) : confirmDeleteId === sub.id ? (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/20 dark:bg-red-500/5">
                    <span className="flex-1 text-xs text-red-700 dark:text-red-300">
                      Delete <strong>{sub.name}</strong>?
                    </span>
                    <button
                      onClick={() => {
                        deleteSubCategory({ supplierId, id: sub.id })
                        setConfirmDeleteId(null)
                      }}
                      className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-600"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50">
                    <SubIcon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="truncate font-medium">{sub.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      /{sub.url || "no-slug"}
                    </span>
                    <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => { setEditingSubId(sub.id); setConfirmDeleteId(null) }}
                        title="Edit"
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setConfirmDeleteId(sub.id); setEditingSubId(null) }}
                        title="Delete"
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {isFormOpen ? (
          <AddSubForm
            parentId={category.id}
            supplierId={supplierId}
            colorAddBtn={color.addBtn}
            existingSubs={subs}
            onCancel={() => setOpenFormFor(null)}
          />
        ) : (
          <button
            onClick={() => setOpenFormFor(category.id)}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2 text-xs font-semibold transition dark:border-slate-700 ${color.addBtn}`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16M4 12h16" />
            </svg>
            Add Sub-category
          </button>
        )}
      </div>
      </div>
      </div>
    </div>
  )
}
