"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Check,
  GalleryHorizontalEnd,
  GripVertical,
  Image as ImageIcon,
  Loader,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import { useGetMyBrandProductsQuery } from "@/store/api/brandRequestsApi"
import {
  useCreateHomeSectionMutation,
  useDeleteHomeSectionMutation,
  useGetBrandHomeQuery,
  useReorderHomeSectionsMutation,
  type CreateSectionPayload,
  type HomeSection,
} from "@/store/api/supplierBrandHomeApi"
import ImageInput from "./ImageInput"

type Mode = "list" | "banner" | "carousel" | "products"

const SECTION_OPTIONS: {
  type: Mode
  label: string
  description: string
  icon: typeof ImageIcon
}[] = [
  { type: "banner", label: "Banner", description: "A single full-width promotional image.", icon: ImageIcon },
  { type: "carousel", label: "Carousel", description: "Multiple sliding banners customers can swipe.", icon: GalleryHorizontalEnd },
  { type: "products", label: "Section with Products", description: "A titled row of your products.", icon: ShoppingBag },
]

export default function SectionEditor({
  brandId,
  allowAdd = true,
  onSectionsChange,
}: {
  brandId: number
  allowAdd?: boolean
  // Reports the live (locally-ordered) sections up, so a preview can mirror
  // reordering in realtime before it's saved.
  onSectionsChange?: (sections: HomeSection[]) => void
}) {
  const [mode, setMode] = useState<Mode>("list")

  const { data, isLoading } = useGetBrandHomeQuery(brandId)
  const sections = useMemo(() => data?.sections ?? [], [data])

  const [createSection, { isLoading: isSaving }] = useCreateHomeSectionMutation()
  const [deleteSection] = useDeleteHomeSectionMutation()
  const [reorderSections, { isLoading: isReordering }] =
    useReorderHomeSectionsMutation()

  const [error, setError] = useState<string | null>(null)

  // ── Local, reorderable copy of the sections list ──
  const [items, setItems] = useState<HomeSection[]>([])
  // Signature of the server order we last synced from, so pure-local reorders
  // aren't clobbered by re-renders but real server changes (add/delete/save) are.
  const serverSigRef = useRef<string>("")

  useEffect(() => {
    const sig = sections.map((s) => s.id).join(",")
    if (sig !== serverSigRef.current) {
      serverSigRef.current = sig
      setItems(sections)
    }
  }, [sections])

  // Mirror the live order up to the preview whenever it changes.
  const onSectionsChangeRef = useRef(onSectionsChange)
  useEffect(() => {
    onSectionsChangeRef.current = onSectionsChange
  }, [onSectionsChange])
  useEffect(() => {
    onSectionsChangeRef.current?.(items)
  }, [items])

  const isDirty = useMemo(
    () =>
      items.map((s) => s.id).join(",") !== sections.map((s) => s.id).join(","),
    [items, sections]
  )

  // ── Drag-and-drop reordering ──
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(draggedIndex, 1)
      next.splice(dropIndex, 0, moved)
      return next
    })
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleSaveOrder = async () => {
    try {
      const res = await reorderSections({
        brandId,
        order: items.map((s) => s.id),
      }).unwrap()
      showSuccessToast(res?.message || "Order saved.")
    } catch {
      showErrorToast("Failed to save order. Please try again.")
    }
  }

  const handleDiscardOrder = () => {
    setItems(sections)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleSave = async (payload: CreateSectionPayload) => {
    setError(null)
    try {
      const res = await createSection({ brandId, body: payload }).unwrap()
      showSuccessToast(res?.message || "Section added.")
      setMode("list")
    } catch (err) {
      const e = err as { data?: { message?: string } }
      setError(e?.data?.message || "Failed to save. Please try again.")
    }
  }

  const handleDelete = async (sectionId: number) => {
    try {
      const res = await deleteSection(sectionId).unwrap()
      showSuccessToast(res?.message || "Section removed.")
    } catch {
      showErrorToast("Failed to remove section. Please try again.")
    }
  }

  // ── Sub-form views ──
  if (mode === "banner") {
    return <BannerForm onBack={() => setMode("list")} onSave={handleSave} saving={isSaving} error={error} />
  }
  if (mode === "carousel") {
    return <CarouselForm onBack={() => setMode("list")} onSave={handleSave} saving={isSaving} error={error} />
  }
  if (mode === "products") {
    return <ProductsForm brandId={brandId} onBack={() => setMode("list")} onSave={handleSave} saving={isSaving} error={error} />
  }

  // ── List view ──
  return (
    <div className="space-y-6">
      {allowAdd && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Add to Home
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {SECTION_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.type}
                  onClick={() => {
                    setError(null)
                    setMode(option.type)
                  }}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-slate-200/80 p-5 text-center transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700/50 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-sky-100 group-hover:text-sky-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-sky-500/20 dark:group-hover:text-sky-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {option.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {option.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Current Sections
          </h4>
          <div className="flex items-center gap-2">
            {isDirty && (
              <>
                <button
                  onClick={handleDiscardOrder}
                  disabled={isReordering}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                  Discard
                </button>
                <button
                  onClick={handleSaveOrder}
                  disabled={isReordering}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isReordering ? (
                    <Loader className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save order
                </button>
              </>
            )}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {items.length} section{items.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-5 w-5 animate-spin text-sky-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-950/30">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {allowAdd
                ? "No sections yet. Add one above."
                : "No sections yet. Click Edit to add one."}
            </p>
          </div>
        ) : (
          <>
            {items.length > 1 && (
              <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
                Drag the sections to reorder them, then click Save order.
              </p>
            )}
          <ul className="space-y-2">
            {items.map((section, index) => (
              <SectionRow
                key={section.id}
                section={section}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index && draggedIndex !== index}
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverIndex(index)
                }}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => {
                  setDraggedIndex(null)
                  setDragOverIndex(null)
                }}
                onDelete={() => handleDelete(section.id)}
              />
            ))}
          </ul>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────── List row ───────────────────────────────────

function SectionRow({
  section,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDelete,
}: {
  section: HomeSection
  isDragging: boolean
  isDragOver: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  onDelete: () => void
}) {
  const meta = useMemo(() => {
    if (section.type === "banner") {
      return { icon: ImageIcon, title: "Banner", sub: "Single image" }
    }
    if (section.type === "carousel") {
      return {
        icon: GalleryHorizontalEnd,
        title: "Carousel",
        sub: `${section.items?.length ?? 0} slide(s)`,
      }
    }
    return {
      icon: ShoppingBag,
      title: section.product_section?.label || "Products",
      sub: `${section.product_section?.products.length ?? 0} product(s)`,
    }
  }, [section])

  const Icon = meta.icon
  const thumb =
    section.type === "banner"
      ? section.banner?.image_url
      : section.type === "carousel"
        ? section.items?.[0]?.image_url
        : section.product_section?.products[0]?.image

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 rounded-xl border bg-white p-3 transition dark:bg-slate-900 ${
        isDragging
          ? "border-sky-400 opacity-40"
          : isDragOver
            ? "border-sky-400 ring-2 ring-sky-300/60 dark:ring-sky-500/40"
            : "border-slate-200/80 dark:border-slate-700/50"
      }`}
    >
      {/* Drag handle */}
      <div
        className="shrink-0 cursor-grab text-slate-300 transition hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
        title="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {meta.title}
        </p>
        <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
          {section.type} · {meta.sub}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
        title="Remove section"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

// ───────────────────────────── Shared chrome ─────────────────────────────────

function FormShell({
  title,
  onBack,
  children,
  onSave,
  saving,
  canSave,
  error,
}: {
  title: string
  onBack: () => void
  children: React.ReactNode
  onSave: () => void
  saving: boolean
  canSave: boolean
  error: string | null
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h4>
      </div>

      <div className="space-y-4">{children}</div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-700/50">
        <button
          onClick={onBack}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!canSave || saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Section
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────── Banner form ─────────────────────────────────

function BannerForm({
  onBack,
  onSave,
  saving,
  error,
}: {
  onBack: () => void
  onSave: (p: CreateSectionPayload) => void
  saving: boolean
  error: string | null
}) {
  const [image, setImage] = useState("")

  return (
    <FormShell
      title="Add Banner"
      onBack={onBack}
      onSave={() => onSave({ type: "banner", image_url: image })}
      saving={saving}
      canSave={Boolean(image)}
      error={error}
    >
      <ImageInput label="Banner image" value={image} onChange={setImage} />
    </FormShell>
  )
}

// ────────────────────────────── Carousel form ────────────────────────────────

function CarouselForm({
  onBack,
  onSave,
  saving,
  error,
}: {
  onBack: () => void
  onSave: (p: CreateSectionPayload) => void
  saving: boolean
  error: string | null
}) {
  const [images, setImages] = useState<string[]>([""])

  const setAt = (i: number, url: string) =>
    setImages((prev) => prev.map((v, idx) => (idx === i ? url : v)))
  const addSlide = () => setImages((prev) => [...prev, ""])
  const removeAt = (i: number) =>
    setImages((prev) => prev.filter((_, idx) => idx !== i))

  const valid = images.filter((u) => u.trim())

  return (
    <FormShell
      title="Add Carousel"
      onBack={onBack}
      onSave={() =>
        onSave({
          type: "carousel",
          items: valid.map((image_url) => ({ image_url })),
        })
      }
      saving={saving}
      canSave={valid.length > 0}
      error={error}
    >
      <div className="space-y-4">
        {images.map((url, i) => (
          <div key={i} className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-700/50">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Slide {i + 1}
              </span>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <ImageInput value={url} onChange={(u) => setAt(i, u)} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSlide}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition hover:border-sky-400 hover:text-sky-600 dark:border-slate-600"
      >
        <Plus className="h-4 w-4" />
        Add another slide
      </button>
    </FormShell>
  )
}

// ────────────────────────────── Products form ────────────────────────────────

function ProductsForm({
  brandId,
  onBack,
  onSave,
  saving,
  error,
}: {
  brandId: number
  onBack: () => void
  onSave: (p: CreateSectionPayload) => void
  saving: boolean
  error: string | null
}) {
  const [label, setLabel] = useState("")
  const [buttonText, setButtonText] = useState("See All")
  const [buttonLink, setButtonLink] = useState("")
  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState("")

  const { data, isLoading } = useGetMyBrandProductsQuery({ id: brandId, q: search })
  const products = data?.products ?? []

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const selectedProducts = selected
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean)

  return (
    <FormShell
      title="Add Section with Products"
      onBack={onBack}
      onSave={() =>
        onSave({
          type: "products",
          label,
          button_text: buttonText || null,
          button_link: buttonLink || null,
          product_ids: selected,
        })
      }
      saving={saving}
      canSave={Boolean(label.trim()) && selected.length > 0}
      error={error}
    >
      {/* Label + button config */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Section label *
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Best Sellers"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Button text
          </label>
          <input
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            placeholder="e.g. View More"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Button link (optional)
        </label>
        <input
          value={buttonLink}
          onChange={(e) => setButtonLink(e.target.value)}
          placeholder="Deep link or URL"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>

      {/* Selected count */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Choose products
        </label>
        <span className="text-xs text-slate-400">{selected.length} selected</span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none dark:text-slate-200"
        />
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="h-5 w-5 animate-spin text-sky-500" />
        </div>
      ) : products.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No products found for this brand.
        </p>
      ) : (
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {products.map((p) => {
            const isSel = selected.includes(p.id)
            const order = selected.indexOf(p.id) + 1
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition ${
                  isSel
                    ? "border-sky-500 ring-1 ring-sky-500"
                    : "border-slate-200 hover:border-sky-300 dark:border-slate-700"
                }`}
              >
                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  )}
                  {isSel && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                      {order}
                    </span>
                  )}
                </div>
                <div className="p-1.5">
                  <p className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {p.name}
                  </p>
                  {p.price != null && (
                    <p className="text-[11px] text-sky-600 dark:text-sky-400">
                      ₱{p.price.toLocaleString()}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Selected order preview */}
      {selectedProducts.length > 0 && (
        <p className="text-xs text-slate-400">
          Display order: {selectedProducts.map((p) => p!.name).join(" → ")}
        </p>
      )}
    </FormShell>
  )
}
