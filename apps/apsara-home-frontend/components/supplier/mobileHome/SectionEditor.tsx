"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  GalleryHorizontalEnd,
  GripVertical,
  Image as ImageIcon,
  Loader,
  Pencil,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import {
  useGetMyBrandProductsQuery,
  type MyBrandProduct,
} from "@/store/api/brandRequestsApi"
import {
  useCreateHomeSectionMutation,
  useDeleteHomeSectionMutation,
  useGetBrandHomeQuery,
  useReorderHomeSectionsMutation,
  useUpdateHomeSectionMutation,
  type CreateSectionPayload,
  type HomeSection,
  type SectionProduct,
} from "@/store/api/supplierBrandHomeApi"
import ImageInput from "./ImageInput"
import { getPriceInfo, peso } from "./productPrice"

type Mode = "list" | "banner" | "carousel" | "products"

// Inline feedback shown inside a section form after a save attempt.
type Status = { type: "success" | "error"; text: string } | null

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
  const [updateSection, { isLoading: isUpdating }] = useUpdateHomeSectionMutation()
  const [deleteSection] = useDeleteHomeSectionMutation()
  const [reorderSections, { isLoading: isReordering }] =
    useReorderHomeSectionsMutation()

  // Inline success/error banner shown inside the open form (replaces toasts for
  // the create/update flow so feedback appears right where the user is editing).
  const [status, setStatus] = useState<Status>(null)
  // The section currently being edited (content editor open). null = list view.
  const [editing, setEditing] = useState<HomeSection | null>(null)

  // Product ids already used by *other* product sections, so they can't be added
  // twice. When editing, the section's own products stay selectable.
  const usedProductIds = (excludeSectionId?: number) => {
    const ids = new Set<number>()
    for (const s of sections) {
      if (s.type !== "products" || s.id === excludeSectionId) continue
      for (const p of s.product_section?.products ?? []) ids.add(p.id)
    }
    return ids
  }

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

  // Live draft of the section currently being built in a sub-form, appended to
  // the preview so the merchant sees it in realtime before saving.
  const [draft, setDraft] = useState<HomeSection | null>(null)

  // Mirror the live order (+ any in-progress draft) up to the preview.
  const onSectionsChangeRef = useRef(onSectionsChange)
  useEffect(() => {
    onSectionsChangeRef.current = onSectionsChange
  }, [onSectionsChange])
  useEffect(() => {
    let preview: HomeSection[] = items
    if (draft) {
      // When editing, swap the draft in place of the section being edited so the
      // preview updates that section live; when adding, append it at the end.
      preview = editing
        ? items.map((s) => (s.id === editing.id ? draft : s))
        : [...items, draft]
    }
    onSectionsChangeRef.current?.(preview)
  }, [items, draft, editing])

  const isDirty = useMemo(
    () =>
      items.map((s) => s.id).join(",") !== sections.map((s) => s.id).join(","),
    [items, sections]
  )

  // ── Drag-and-drop reordering (sections are always draggable) ──
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
    setStatus(null)
    try {
      const res = await createSection({ brandId, body: payload }).unwrap()
      // Show the inline success message, then drop back to the list once the
      // refetched sections are in (BrandHome is invalidated by the mutation).
      setStatus({ type: "success", text: res?.message || "Section added." })
      setTimeout(() => {
        setStatus(null)
        setMode("list")
      }, 1000)
    } catch (err) {
      const e = err as { data?: { message?: string } }
      setStatus({ type: "error", text: e?.data?.message || "Failed to save. Please try again." })
    }
  }

  // Save edits to an existing section. Reuses the same payload shape as create;
  // the backend replaces the section's content with it.
  const handleUpdate = async (sectionId: number, payload: CreateSectionPayload) => {
    setStatus(null)
    try {
      const res = await updateSection({ sectionId, body: payload }).unwrap()
      // The mutation invalidates BrandHome, so the list/preview reflect the edit
      // right away; show success inline, then return to the list.
      setStatus({ type: "success", text: res?.message || "Section updated." })
      setTimeout(() => {
        setStatus(null)
        setEditing(null)
      }, 1000)
    } catch (err) {
      const e = err as { data?: { message?: string } }
      setStatus({ type: "error", text: e?.data?.message || "Failed to update. Please try again." })
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
    return <BannerForm onBack={() => setMode("list")} onSave={handleSave} saving={isSaving} status={status} onPreview={setDraft} />
  }
  if (mode === "carousel") {
    return <CarouselForm onBack={() => setMode("list")} onSave={handleSave} saving={isSaving} status={status} onPreview={setDraft} />
  }
  if (mode === "products") {
    return <ProductsForm brandId={brandId} onBack={() => setMode("list")} onSave={handleSave} saving={isSaving} status={status} onPreview={setDraft} disabledProductIds={usedProductIds()} />
  }

  // ── Edit an existing section (pre-filled content editor) ──
  if (editing) {
    const back = () => {
      setEditing(null)
      setStatus(null)
    }
    const onSave = (p: CreateSectionPayload) => handleUpdate(editing.id, p)
    if (editing.type === "banner") {
      return (
        <BannerForm
          onBack={back}
          onSave={onSave}
          saving={isUpdating}
          status={status}
          onPreview={setDraft}
          title="Edit Banner"
          submitLabel="Save Changes"
          initialImage={editing.banner?.image_url ?? ""}
        />
      )
    }
    if (editing.type === "carousel") {
      return (
        <CarouselForm
          onBack={back}
          onSave={onSave}
          saving={isUpdating}
          status={status}
          onPreview={setDraft}
          title="Edit Carousel"
          submitLabel="Save Changes"
          initialImages={(editing.items ?? []).map((i) => i.image_url)}
        />
      )
    }
    return (
      <ProductsForm
        brandId={brandId}
        onBack={back}
        onSave={onSave}
        saving={isUpdating}
        status={status}
        onPreview={setDraft}
        disabledProductIds={usedProductIds(editing.id)}
        title="Edit Section with Products"
        submitLabel="Save Changes"
        initial={{
          label: editing.product_section?.label ?? "",
          buttonText: editing.product_section?.button_text ?? "",
          buttonLink: editing.product_section?.button_link ?? "",
          products: editing.product_section?.products ?? [],
        }}
      />
    )
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
                    setStatus(null)
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
                Drag the sections to reorder them. Tap the pencil to edit a
                section&apos;s content.
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
                onEdit={() => {
                  setStatus(null)
                  setEditing(section)
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
  onEdit,
  onDelete,
}: {
  section: HomeSection
  isDragging: boolean
  isDragOver: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  onEdit: () => void
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
      {/* Edit content + Delete */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-500 dark:hover:bg-sky-500/10"
          title="Edit section"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
          title="Remove section"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
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
  status,
  submitLabel = "Save Section",
}: {
  title: string
  onBack: () => void
  children: React.ReactNode
  onSave: () => void
  saving: boolean
  canSave: boolean
  status: Status
  submitLabel?: string
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

      {status && (
        <p
          className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          }`}
        >
          {status.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <X className="h-4 w-4 shrink-0" />
          )}
          {status.text}
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
          {submitLabel}
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
  status,
  onPreview,
  title = "Add Banner",
  submitLabel,
  initialImage = "",
}: {
  onBack: () => void
  onSave: (p: CreateSectionPayload) => void
  saving: boolean
  status: Status
  onPreview: (section: HomeSection | null) => void
  title?: string
  submitLabel?: string
  initialImage?: string
}) {
  const [image, setImage] = useState(initialImage)

  // Mirror the in-progress banner into the preview in realtime.
  useEffect(() => {
    onPreview({
      id: -1,
      type: "banner",
      order: 0,
      is_active: true,
      banner: { image_url: image },
    })
  }, [image, onPreview])
  useEffect(() => () => onPreview(null), [onPreview])

  return (
    <FormShell
      title={title}
      onBack={onBack}
      onSave={() => onSave({ type: "banner", image_url: image })}
      saving={saving}
      canSave={Boolean(image)}
      status={status}
      submitLabel={submitLabel}
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
  status,
  onPreview,
  title = "Add Carousel",
  submitLabel,
  initialImages,
}: {
  onBack: () => void
  onSave: (p: CreateSectionPayload) => void
  saving: boolean
  status: Status
  onPreview: (section: HomeSection | null) => void
  title?: string
  submitLabel?: string
  initialImages?: string[]
}) {
  const [images, setImages] = useState<string[]>(
    initialImages && initialImages.length > 0 ? initialImages : [""]
  )

  // Mirror the in-progress carousel into the preview in realtime.
  useEffect(() => {
    onPreview({
      id: -1,
      type: "carousel",
      order: 0,
      is_active: true,
      items: images
        .filter((u) => u.trim())
        .map((image_url, i) => ({ id: i, image_url, order: i })),
    })
  }, [images, onPreview])
  useEffect(() => () => onPreview(null), [onPreview])

  const setAt = (i: number, url: string) =>
    setImages((prev) => prev.map((v, idx) => (idx === i ? url : v)))
  const addSlide = () => setImages((prev) => [...prev, ""])
  const removeAt = (i: number) =>
    setImages((prev) => prev.filter((_, idx) => idx !== i))

  // Drag-reorder state for the slides, so the carousel order can be edited.
  const [slideDrag, setSlideDrag] = useState<number | null>(null)
  const [slideOver, setSlideOver] = useState<number | null>(null)
  const moveSlide = (from: number, to: number) => {
    if (from === to) return
    setImages((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const valid = images.filter((u) => u.trim())

  return (
    <FormShell
      title={title}
      onBack={onBack}
      onSave={() =>
        onSave({
          type: "carousel",
          items: valid.map((image_url) => ({ image_url })),
        })
      }
      saving={saving}
      canSave={valid.length > 0}
      status={status}
      submitLabel={submitLabel}
    >
      {images.length > 1 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Drag the grip handle to reorder the slides.
        </p>
      )}
      <div className="space-y-4">
        {images.map((url, i) => (
          <div
            key={i}
            onDragOver={(e) => {
              if (slideDrag === null) return
              e.preventDefault()
              setSlideOver(i)
            }}
            onDrop={() => {
              if (slideDrag !== null) moveSlide(slideDrag, i)
              setSlideDrag(null)
              setSlideOver(null)
            }}
            className={`rounded-xl border p-3 transition ${
              slideDrag === i
                ? "border-sky-400 opacity-40"
                : slideOver === i && slideDrag !== i
                  ? "border-sky-400 ring-2 ring-sky-300/60 dark:ring-sky-500/40"
                  : "border-slate-200/80 dark:border-slate-700/50"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {images.length > 1 && (
                  <span
                    draggable
                    onDragStart={() => setSlideDrag(i)}
                    onDragEnd={() => {
                      setSlideDrag(null)
                      setSlideOver(null)
                    }}
                    className="cursor-grab text-slate-300 transition hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-500">
                  Slide {i + 1}
                </span>
              </div>
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
  status,
  onPreview,
  disabledProductIds,
  title = "Add Section with Products",
  submitLabel,
  initial,
}: {
  brandId: number
  onBack: () => void
  onSave: (p: CreateSectionPayload) => void
  saving: boolean
  status: Status
  onPreview: (section: HomeSection | null) => void
  // Product ids already used by other sections — shown as "Added" and unselectable.
  disabledProductIds?: Set<number>
  title?: string
  submitLabel?: string
  initial?: {
    label: string
    buttonText: string
    buttonLink: string
    products: SectionProduct[]
  }
}) {
  const [label, setLabel] = useState(initial?.label ?? "")
  const [buttonText, setButtonText] = useState(initial ? initial.buttonText : "See All")
  const [buttonLink, setButtonLink] = useState(initial?.buttonLink ?? "")
  const [selected, setSelected] = useState<number[]>(
    initial?.products.map((p) => p.id) ?? []
  )
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  // Drag-reorder state for the chosen-products list.
  const [selDrag, setSelDrag] = useState<number | null>(null)
  const [selOver, setSelOver] = useState<number | null>(null)

  // Searching resets us back to the first page.
  useEffect(() => {
    setPage(1)
  }, [search])

  const { data, isLoading, isFetching } = useGetMyBrandProductsQuery({
    id: brandId,
    q: search,
    page,
  })
  const products = data?.products ?? []
  const meta = data?.meta

  // Cache details of every product we've seen so a selection (and its order
  // preview) survives moving between pages. Seeded with the section's existing
  // products when editing, so they render before any fetch returns.
  const [seen, setSeen] = useState<Record<number, MyBrandProduct>>(() => {
    const init: Record<number, MyBrandProduct> = {}
    for (const p of initial?.products ?? []) {
      init[p.id] = {
        id: p.id,
        name: p.name,
        image: p.image ?? null,
        price: p.price ?? null,
        original_price: p.original_price ?? null,
        member_price: p.member_price ?? null,
        pv: p.pv ?? null,
        status: 1,
      }
    }
    return init
  })
  useEffect(() => {
    if (products.length === 0) return
    setSeen((prev) => {
      const next = { ...prev }
      for (const p of products) next[p.id] = p
      return next
    })
  }, [products])

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const moveSelected = (from: number, to: number) => {
    if (from === to) return
    setSelected((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }
  const removeSelected = (id: number) =>
    setSelected((prev) => prev.filter((x) => x !== id))

  const selectedProducts = selected
    .map((id) => seen[id])
    .filter(Boolean)

  // Mirror the in-progress products section into the preview in realtime, so the
  // label and chosen products show up on the phone as they're picked.
  useEffect(() => {
    const sectionProducts = selected
      .map((id) => seen[id])
      .filter((p): p is MyBrandProduct => Boolean(p))
      .map((p, i) => ({
        id: p.id,
        order: i + 1,
        name: p.name,
        image: p.image ?? null,
        price: p.price ?? null,
        original_price: p.original_price ?? null,
        member_price: p.member_price ?? null,
        pv: p.pv ?? null,
      }))
    onPreview({
      id: -1,
      type: "products",
      order: 0,
      is_active: true,
      product_section: {
        label: label.trim() || "Products",
        button_text: buttonText || null,
        button_link: buttonLink || null,
        products: sectionProducts,
      },
    })
  }, [label, buttonText, buttonLink, selected, seen, onPreview])
  useEffect(() => () => onPreview(null), [onPreview])

  return (
    <FormShell
      title={title}
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
      status={status}
      submitLabel={submitLabel}
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

      {/* Chosen products — drag to reorder, X to remove */}
      {selectedProducts.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Chosen products ({selectedProducts.length})
            </label>
            {selectedProducts.length > 1 && (
              <span className="text-xs text-slate-400">Drag to reorder</span>
            )}
          </div>
          <ul className="space-y-1.5">
            {selectedProducts.map((p, index) => (
              <li
                key={p!.id}
                draggable
                onDragStart={() => setSelDrag(index)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setSelOver(index)
                }}
                onDrop={() => {
                  if (selDrag !== null) moveSelected(selDrag, index)
                  setSelDrag(null)
                  setSelOver(null)
                }}
                onDragEnd={() => {
                  setSelDrag(null)
                  setSelOver(null)
                }}
                className={`flex items-center gap-2 rounded-lg border bg-white p-1.5 transition dark:bg-slate-900 ${
                  selDrag === index
                    ? "border-sky-400 opacity-40"
                    : selOver === index && selDrag !== index
                      ? "border-sky-400 ring-2 ring-sky-300/60 dark:ring-sky-500/40"
                      : "border-slate-200/80 dark:border-slate-700/50"
                }`}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300 active:cursor-grabbing dark:text-slate-600" />
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                  {p!.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p!.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                  {p!.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeSelected(p!.id)}
                  className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
        <>
          <div
            className={`grid max-h-80 grid-cols-3 gap-1.5 overflow-y-auto transition-opacity sm:grid-cols-4 lg:grid-cols-5 ${
              isFetching ? "opacity-50" : ""
            }`}
          >
            {products.map((p) => {
              const isSel = selected.includes(p.id)
              // Used by another section already → can't be picked here.
              const isUsed = !isSel && Boolean(disabledProductIds?.has(p.id))
              const order = selected.indexOf(p.id) + 1
              const info = getPriceInfo(p)
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isUsed}
                  title={isUsed ? "Already added to another section" : undefined}
                  onClick={() => toggle(p.id)}
                  className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition ${
                    isSel
                      ? "border-sky-500 ring-1 ring-sky-500"
                      : isUsed
                        ? "cursor-not-allowed border-slate-200 opacity-50 dark:border-slate-700"
                        : "border-slate-200 hover:border-sky-300 dark:border-slate-700"
                  }`}
                >
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                    {/* Discount ribbon (top-left) */}
                    {info.hasDiscount && (
                      <span className="absolute left-0 top-0 rounded-br-md bg-sky-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {info.discountPct}% OFF
                      </span>
                    )}
                    {/* Selection order (top-right) */}
                    {isSel && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white">
                        {order}
                      </span>
                    )}
                    {/* Already used by another section */}
                    {isUsed && (
                      <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white">
                        Added
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 p-1">
                    <p className="truncate text-[10px] font-medium text-slate-700 dark:text-slate-200">
                      {p.name}
                    </p>
                    {/* Badges: PV + Save */}
                    {(info.pv > 0 || info.hasDiscount) && (
                      <div className="flex flex-wrap items-center gap-1">
                        {info.pv > 0 && (
                          <span className="rounded bg-sky-500 px-1 py-0.5 text-[8px] font-bold text-white">
                            PV {info.pv.toLocaleString()}
                          </span>
                        )}
                        {info.hasDiscount && (
                          <span className="rounded bg-red-500 px-1 py-0.5 text-[8px] font-bold text-white">
                            Save {peso(info.save)}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Price: member first, original struck-through */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                        {peso(info.display)}
                      </span>
                      {info.hasDiscount && (
                        <span className="text-[9px] text-slate-400 line-through">
                          {peso(info.original)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-slate-400">
                Page {meta.current_page} of {meta.last_page} · {meta.total} products
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.current_page <= 1 || isFetching}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={meta.current_page >= meta.last_page || isFetching}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </FormShell>
  )
}
