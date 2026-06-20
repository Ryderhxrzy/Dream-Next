"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Category,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
} from "@/store/api/categoriesApi"
import { AnimatePresence, motion } from "framer-motion"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"

import AddCategoryModal from "./AddCategoryModal"
import BulkEditModal from "./BulkEditModal"
import EditCategoryModal from "./EditCategoryModal"

const CARD_COLORS = [
  {
    bg: "bg-violet-500",
    text: "text-violet-700",
    badge: "bg-violet-100 text-violet-700",
    check: "accent-violet-600",
  },
  {
    bg: "bg-teal-500",
    text: "text-teal-700",
    badge: "bg-teal-100 text-teal-700",
    check: "accent-teal-600",
  },
  {
    bg: "bg-blue-500",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    check: "accent-blue-600",
  },
  {
    bg: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    check: "accent-amber-600",
  },
  {
    bg: "bg-rose-500",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-700",
    check: "accent-rose-600",
  },
  {
    bg: "bg-emerald-500",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    check: "accent-emerald-600",
  },
  {
    bg: "bg-orange-500",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    check: "accent-orange-600",
  },
  {
    bg: "bg-sky-500",
    text: "text-sky-700",
    badge: "bg-sky-100 text-sky-700",
    check: "accent-sky-600",
  },
]

type SortKey =
  | "order-asc"
  | "order-desc"
  | "name-asc"
  | "name-desc"
  | "newest"
  | "oldest"

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

function SubcategoryPanel({
  category,
  subcategories,
  colorIndex,
  onEdit,
  onDelete,
  isDeleting,
  onAdd,
}: {
  category: Category
  subcategories: Category[]
  colorIndex: number
  onEdit: (c: Category) => void
  onDelete: (id: number) => void
  isDeleting: Set<number>
  onAdd: (parentId: number, name: string, url: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [subName, setSubName] = useState("")
  const [subUrl, setSubUrl] = useState("")
  const [slugLocked, setSlugLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const color = CARD_COLORS[colorIndex % CARD_COLORS.length]

  const handleNameChange = (v: string) => {
    setSubName(v)
    if (!slugLocked) setSubUrl(toSlug(v))
  }

  const handleUrlChange = (v: string) => {
    setSlugLocked(true)
    setSubUrl(toSlug(v))
  }

  const handleSave = async () => {
    if (!subName.trim()) return
    setSaving(true)
    await onAdd(category.id, subName.trim(), subUrl || toSlug(subName))
    setSubName("")
    setSubUrl("")
    setSlugLocked(false)
    setAdding(false)
    setSaving(false)
  }

  const handleStartAdding = () => {
    setOpen(true)
    setAdding(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="border-t border-slate-100">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5m14 14H5" />
        </svg>
        <span className="text-sm font-semibold text-slate-700">Subcategories</span>
        {subcategories.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
            {subcategories.length}
          </span>
        )}
        <svg
          className={`ml-1 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleStartAdding() }}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-violet-500/30 transition-colors hover:bg-violet-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Subcategory
        </button>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
      <div className="space-y-2 px-5 pb-4">
        {subcategories.length === 0 && !adding && (
          <p className="py-1 text-xs text-slate-400 italic">No subcategories yet</p>
        )}
        {subcategories.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color.bg} bg-opacity-15`}>
              <span className={`text-sm font-bold ${color.text}`}>{sub.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{sub.name}</p>
              {sub.url && sub.url !== "0" && (
                <p className="font-mono text-xs text-slate-400">/{sub.url}</p>
              )}
            </div>
            <button
              onClick={() => onEdit(sub)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(sub.id)}
              disabled={isDeleting.has(sub.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
            >
              {isDeleting.has(sub.id) ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        ))}

        {/* Inline add form */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={subName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Subcategory name"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 focus:outline-none"
              />
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm text-slate-400">/</span>
                <input
                  type="text"
                  value={subUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="url-slug"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 font-mono text-sm text-slate-700 placeholder-slate-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAdding(false); setSubName(""); setSubUrl(""); setSlugLocked(false) }}
                  className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!subName.trim() || saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : "Save"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CategoryCard({
  category,
  colorIndex,
  onEdit,
  onDelete,
  isDeleting,
  isSelected,
  onToggleSelect,
  anySelected,
  subcategories,
  onAddSubcategory,
}: {
  category: Category
  colorIndex: number
  onEdit: (c: Category) => void
  onDelete: (id: number) => void
  isDeleting: Set<number>
  isSelected: boolean
  onToggleSelect: (id: number) => void
  anySelected: boolean
  subcategories: Category[]
  onAddSubcategory: (parentId: number, name: string, url: string) => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const color = CARD_COLORS[colorIndex % CARD_COLORS.length]
  const isThisDeleting = isDeleting.has(category.id)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md ${isSelected ? "border-violet-400 ring-2 ring-violet-300/50" : "border-slate-100 hover:border-slate-200"}`}
    >
      {/* Main content */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <div
            onClick={() => onToggleSelect(category.id)}
            className={`mt-1 shrink-0 cursor-pointer transition-opacity duration-150 ${anySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${isSelected ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white hover:border-violet-400"}`}>
              {isSelected && (
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>

          {/* Icon */}
          <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ${color.bg} flex items-center justify-center shadow-sm`}>
            {category.image ? (
              <Image src={category.image} alt={category.name} fill className="object-cover" unoptimized />
            ) : (
              <span className="text-2xl font-bold text-white uppercase">{category.name.charAt(0)}</span>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-tight text-slate-800">{category.name}</h3>
            {category.url && category.url !== "0" && (
              <p className={`mt-0.5 font-mono text-sm font-medium ${color.text}`}>/{category.url}</p>
            )}
            <p className="mt-1 text-sm text-slate-400 italic">
              {category.description || "No description"}
            </p>
          </div>

          {/* Product count badge */}
          <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${color.badge}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            {category.product_count ?? 0} Products
          </div>

          {/* Three-dot menu */}
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-9 right-0 z-20 min-w-32.5 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg"
                  >
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(category) }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setConfirming(true) }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Subcategory panel */}
      <SubcategoryPanel
        category={category}
        subcategories={subcategories}
        colorIndex={colorIndex}
        onEdit={onEdit}
        onDelete={onDelete}
        isDeleting={isDeleting}
        onAdd={onAddSubcategory}
      />

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">ID #{category.id}</span>
          {category.url && category.url !== "0" && (
            <a
              href={`/${category.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 transition-colors hover:text-violet-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </a>
          )}
        </div>

        <AnimatePresence mode="wait">
          {confirming ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.12 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(category.id); setConfirming(false) }}
                disabled={isThisDeleting}
                className="flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                {isThisDeleting && (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Confirm Delete
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => onEdit(category)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setConfirming(true)}
                disabled={isThisDeleting}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3.5 py-1.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function sortCategories(list: Category[], sort: SortKey): Category[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case "order-asc":
        return a.order - b.order || a.id - b.id
      case "order-desc":
        return b.order - a.order || b.id - a.id
      case "name-asc":
        return a.name.localeCompare(b.name)
      case "name-desc":
        return b.name.localeCompare(a.name)
      case "newest":
        return b.id - a.id
      case "oldest":
        return a.id - b.id
      default:
        return 0
    }
  })
}

export default function CategoriesPageMain() {
  const { data: session, status: authStatus } = useSession()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("order-asc")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [showBulkEdit, setShowBulkEdit] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const hasToken = Boolean(session?.user?.accessToken)
  const skip = authStatus !== "authenticated" || !hasToken

  const { data, isLoading, isFetching, isError } = useGetCategoriesQuery(
    { search: debouncedSearch || undefined, page: 1, per_page: 500 },
    { skip }
  )

  const [deleteCategory] = useDeleteCategoryMutation()
  const [createCategory] = useCreateCategoryMutation()

  const rawCategories = data?.categories ?? []
  const total = data?.total ?? 0

  const { topLevel, subMap } = useMemo(() => {
    const top = rawCategories.filter((c) => !c.parent_id)
    const map = new Map<number, Category[]>()
    rawCategories
      .filter((c) => c.parent_id)
      .forEach((c) => {
        const arr = map.get(c.parent_id!) ?? []
        arr.push(c)
        map.set(c.parent_id!, arr)
      })
    return { topLevel: top, subMap: map }
  }, [rawCategories])

  const categories = useMemo(
    () => sortCategories(topLevel, sort),
    [topLevel, sort]
  )

  const handleAddSubcategory = async (parentId: number, name: string, url: string) => {
    try {
      await createCategory({ cat_name: name, cat_url: url, parent_id: parentId }).unwrap()
    } catch { /* silent */ }
  }

  // — single delete —
  const handleDelete = async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id))
    try {
      await deleteCategory(id).unwrap()
    } catch {
      /* silent */
    } finally {
      setDeletingIds((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
    }
  }

  // — multi-select —
  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const allVisible =
    categories.length > 0 && categories.every((c) => selectedIds.has(c.id))
  const someSelected = selectedIds.size > 0
  const toggleSelectAll = () =>
    setSelectedIds(
      allVisible ? new Set() : new Set(categories.map((c) => c.id))
    )

  const clearSelection = () => setSelectedIds(new Set())

  // — bulk delete —
  const handleBulkDelete = async () => {
    if (!someSelected) return
    setIsBulkDeleting(true)
    const ids = Array.from(selectedIds)
    setDeletingIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
    await Promise.allSettled(ids.map((id) => deleteCategory(id).unwrap()))
    setDeletingIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    setSelectedIds(new Set())
    setIsBulkDeleting(false)
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-xs text-slate-400"
      >
        <Link
          href="/admin/products"
          className="transition-colors hover:text-slate-600"
        >
          Products
        </Link>
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="font-medium text-slate-600">Categories</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Product Categories
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Organize your products into categories
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-500/30 transition-colors hover:bg-violet-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="hidden sm:inline">Add Category</span>
        </button>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <svg
              className="h-5 w-5 text-violet-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <div>
            <p className="text-2xl leading-none font-bold text-slate-800">
              {isLoading ? "—" : total}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Total Categories</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100">
            <svg
              className="h-5 w-5 text-teal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <p className="text-2xl leading-none font-bold text-slate-800">
              {isLoading
                ? "—"
                : rawCategories.filter((c) => c.description).length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">With Description</p>
          </div>
        </div>

        <div className="hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 sm:flex">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <svg
              className="h-5 w-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-2xl leading-none font-bold text-slate-800">
              {isLoading ? "—" : rawCategories.filter((c) => c.image).length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">With Image</p>
          </div>
        </div>
      </motion.div>

      {/* Toolbar: search + sort + select-all */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        {/* Select-all checkbox */}
        {!isLoading && categories.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
              allVisible
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-600"
            }`}
          >
            <div
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${allVisible ? "border-violet-600 bg-violet-600" : "border-slate-300"}`}
            >
              {allVisible && (
                <svg
                  className="h-2.5 w-2.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            {allVisible ? "Deselect All" : "Select All"}
          </button>
        )}

        {/* Search */}
        <div className="relative max-w-sm min-w-45 flex-1">
          <svg
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-8 pl-9 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-8 pl-3 text-sm font-medium text-slate-700 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 focus:outline-none"
          >
            <option value="order-asc">Order ↑</option>
            <option value="order-desc">Order ↓</option>
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <svg
            className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="ml-auto shrink-0 text-sm text-slate-500">
            {debouncedSearch ? (
              <>
                <span className="font-semibold text-slate-700">
                  {categories.length}
                </span>{" "}
                result{categories.length !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">{total}</span>{" "}
                total
              </>
            )}
          </p>
        )}
      </motion.div>

      {/* Fetching indicator */}
      {isFetching && !isLoading && (
        <div className="google-loading-bar google-loading-bar--violet" />
      )}

      {/* Bulk delete bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="flex-1 text-sm font-semibold text-violet-800">
              <span className="text-violet-600">{selectedIds.size}</span>{" "}
              categor{selectedIds.size === 1 ? "y" : "ies"} selected
            </p>
            <button
              onClick={clearSelection}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-100"
            >
              Clear
            </button>
            <button
              onClick={() => setShowBulkEdit(true)}
              disabled={isBulkDeleting}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit {selectedIds.size}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {isBulkDeleting ? (
                <>
                  <svg
                    className="h-3.5 w-3.5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete {selectedIds.size}
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {authStatus === "loading" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Loading your session...
        </div>
      ) : authStatus === "unauthenticated" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Please sign in to load categories.
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load categories. Please try again.
        </div>
      ) : isLoading ? (
        <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-white">
              {/* Header */}
              <div className="flex items-start gap-4 p-5">
                <div className="h-5 w-5 shrink-0 rounded-md bg-slate-100 mt-1" />
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-200" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
                <div className="h-8 w-28 rounded-full bg-slate-100 shrink-0" />
              </div>
              {/* Subcategory section */}
              <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-32 rounded bg-slate-100" />
                  <div className="ml-auto h-8 w-36 rounded-xl bg-slate-100" />
                </div>
                <div className="h-12 w-full rounded-xl bg-slate-50" />
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <div className="h-3.5 w-20 rounded bg-slate-100" />
                <div className="flex gap-2">
                  <div className="h-8 w-16 rounded-xl bg-slate-100" />
                  <div className="h-8 w-16 rounded-xl bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <svg
              className="h-8 w-8 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <p className="font-semibold text-slate-600">
            {debouncedSearch
              ? `No categories matching "${debouncedSearch}"`
              : "No categories yet"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {debouncedSearch
              ? "Try a different search term."
              : 'Click "Add Category" to create your first one.'}
          </p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, idx) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                colorIndex={idx}
                onEdit={setEditCategory}
                onDelete={handleDelete}
                isDeleting={deletingIds}
                isSelected={selectedIds.has(cat.id)}
                onToggleSelect={toggleSelect}
                anySelected={someSelected}
                subcategories={subMap.get(cat.id) ?? []}
                onAddSubcategory={handleAddSubcategory}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <AddCategoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
      <EditCategoryModal
        category={editCategory}
        onClose={() => setEditCategory(null)}
      />
      <BulkEditModal
        categories={
          showBulkEdit ? categories.filter((c) => selectedIds.has(c.id)) : []
        }
        onClose={() => {
          setShowBulkEdit(false)
          setSelectedIds(new Set())
        }}
      />
    </div>
  )
}
