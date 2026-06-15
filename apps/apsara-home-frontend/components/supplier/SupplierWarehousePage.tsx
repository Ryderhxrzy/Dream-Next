"use client"

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  useCreateSupplierWarehouseMutation,
  useDeleteSupplierWarehouseMutation,
  useGetSupplierWarehousesQuery,
  useUpdateSupplierWarehouseMutation,
  type SupplierWarehouseProfile,
} from "@/store/api/supplierWarehouseApi"
import {
  AlertCircle,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Edit2,
  ExternalLink,
  Lightbulb,
  Loader2,
  MapPin,
  MapPinned,
  MoreHorizontal,
  Navigation,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Warehouse,
  X,
} from "lucide-react"

const buildGoogleMapsUrl = (query: string) => {
  const normalized = query.trim()
  if (!normalized) return ""
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalized)}`
}

const buildWazeUrl = (query: string) => {
  const normalized = query.trim()
  if (!normalized) return ""
  return `https://waze.com/ul?q=${encodeURIComponent(normalized)}&navigate=yes`
}

function NavBtn({
  href,
  label,
  icon,
  variant,
}: {
  href: string
  label: string
  icon: ReactNode
  variant: "google" | "waze" | "disabled"
}) {
  const classes = {
    google:
      "bg-slate-900 text-white hover:bg-slate-700 shadow-sm dark:bg-white dark:text-slate-900",
    waze: "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300",
    disabled:
      "pointer-events-none border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500",
  }

  return (
    <a
      href={href || "#"}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ${classes[variant]}`}
    >
      {icon}
      {label}
      {variant !== "disabled" ? (
        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
      ) : null}
    </a>
  )
}

function WarehouseModal({
  mode,
  warehouse,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit"
  warehouse: SupplierWarehouseProfile | null
  onClose: () => void
  onSaved: () => void
}) {
  const [createWarehouse, { isLoading: isCreating }] =
    useCreateSupplierWarehouseMutation()
  const [updateWarehouse, { isLoading: isUpdating }] =
    useUpdateSupplierWarehouseMutation()
  const [name, setName] = useState(warehouse?.warehouse_name ?? "")
  const [address, setAddress] = useState(warehouse?.warehouse_address ?? "")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>(
    warehouse?.image_url ?? ""
  )
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSaving = isCreating || isUpdating

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handlePickFile = (file?: File | null) => {
    if (!file) return

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview)
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Warehouse name is required.")
      return
    }

    if (!address.trim()) {
      setError("Warehouse address is required.")
      return
    }

    try {
      const payload = new FormData()
      payload.append("warehouse_name", name.trim())
      payload.append("warehouse_address", address.trim())
      if (imageFile) payload.append("image", imageFile)

      if (mode === "edit" && warehouse) {
        await updateWarehouse({ id: warehouse.id, body: payload }).unwrap()
      } else {
        await createWarehouse(payload).unwrap()
      }

      onSaved()
    } catch (err: unknown) {
      const apiError = err as {
        data?: { message?: string; errors?: Record<string, string[]> }
      }
      const fieldError = apiError?.data?.errors
        ? Object.values(apiError.data.errors)[0]?.[0]
        : null
      setError(
        fieldError ||
          apiError?.data?.message ||
          "Failed to save. Please try again."
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
              <Warehouse className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {mode === "edit" ? "Edit Warehouse" : "Add Warehouse"}
              </h2>
              <p className="text-[12px] text-slate-400">
                Fill in the details and upload a photo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-5 px-6 py-5">
              {error ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                    {error}
                  </p>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Warehouse Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Main Warehouse, North Hub"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Warehouse Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Street, barangay, city, province"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 pt-2.5 pr-4 pb-3 pl-10 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Warehouse Photo
                </label>

                <div className="space-y-2">
                  <label
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(event) => {
                      event.preventDefault()
                      setDragOver(false)
                      handlePickFile(event.dataTransfer.files[0])
                    }}
                    className={`flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed px-5 py-7 text-center transition ${
                      dragOver
                        ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                        : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/40"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        handlePickFile(event.target.files?.[0] ?? null)
                      }
                    />
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
                      <Camera className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Drop an image or{" "}
                        <span className="text-indigo-600 dark:text-indigo-400">
                          click to browse
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        JPG, PNG, WEBP · Max 5 MB
                      </p>
                    </div>
                  </label>

                  {imagePreview ? (
                    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-500/25">
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="aspect-video w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-end justify-end p-3">
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white">
                            <Upload className="h-3 w-3" /> Change
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) =>
                                handlePickFile(event.target.files?.[0] ?? null)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {warehouse?.image_url && !imageFile ? (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800">
                      <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <img
                          src={warehouse.image_url}
                          alt="Current"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Current saved photo
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Upload a new image above to replace it.
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-500/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Warehouse
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirmModal({
  warehouse,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  warehouse: SupplierWarehouseProfile
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Icon header */}
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
            <Trash2 className="h-7 w-7 text-rose-500" />
          </div>
          <div>
            <h2 className="text-[17px] font-black text-slate-900 dark:text-white">
              Delete Warehouse?
            </h2>
            <p className="mt-1.5 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
              You&apos;re about to permanently delete{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                &ldquo;{warehouse.warehouse_name}&rdquo;
              </span>
              . This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Preview strip */}
        {warehouse.image_url ? (
          <div className="mx-6 mb-5 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
            <img
              src={warehouse.image_url}
              alt={warehouse.warehouse_name}
              className="h-24 w-full object-cover"
            />
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isDeleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SupplierWarehousePage() {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetSupplierWarehousesQuery()
  const [deleteWarehouse, { isLoading: isDeleting }] =
    useDeleteSupplierWarehouseMutation()
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] =
    useState<SupplierWarehouseProfile | null>(null)
  const [deleteTarget, setDeleteTarget] =
    useState<SupplierWarehouseProfile | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null
  )
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const warehouses = data?.warehouses ?? []
  const selectedWarehouse =
    warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ??
    warehouses[0] ??
    null
  const latestWarehouse = warehouses[0] ?? null

  const googleMapsUrl = useMemo(
    () => buildGoogleMapsUrl(latestWarehouse?.warehouse_address ?? ""),
    [latestWarehouse?.warehouse_address]
  )
  const wazeUrl = useMemo(
    () => buildWazeUrl(latestWarehouse?.warehouse_address ?? ""),
    [latestWarehouse?.warehouse_address]
  )

  useEffect(() => {
    if (!warehouses.length) {
      setSelectedWarehouseId(null)
      return
    }

    const selectedStillExists = selectedWarehouseId
      ? warehouses.some((warehouse) => warehouse.id === selectedWarehouseId)
      : false

    if (!selectedStillExists) {
      setSelectedWarehouseId(warehouses[0].id)
    }
  }, [selectedWarehouseId, warehouses])

  const openAdd = () => {
    setModalMode("add")
    setEditingWarehouse(null)
    setModalOpen(true)
  }

  const openEdit = (warehouse: SupplierWarehouseProfile) => {
    setModalMode("edit")
    setEditingWarehouse(warehouse)
    setModalOpen(true)
  }

  const handleSaved = async () => {
    await refetch()
    setModalOpen(false)
    setEditingWarehouse(null)
    setModalMode("add")
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 4000)
  }

  const handleDelete = (warehouse: SupplierWarehouseProfile) => {
    setDeleteTarget(warehouse)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setNotice(null)
      await deleteWarehouse(deleteTarget.id).unwrap()
      if (selectedWarehouseId === deleteTarget.id) {
        setSelectedWarehouseId(null)
      }
      await refetch()
      setDeleteTarget(null)
      setNotice("Warehouse deleted successfully.")
      setTimeout(() => setNotice(null), 3500)
    } catch {
      setDeleteTarget(null)
      setNotice("Failed to delete warehouse. Please try again.")
      setTimeout(() => setNotice(null), 4000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-40 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading warehouses...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 dark:border-rose-500/20 dark:bg-rose-500/10">
        <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
        <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
          Could not load warehouse details. Please refresh the page.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 pb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.24em] text-indigo-600 uppercase dark:text-indigo-400">
              Supplier Warehouse
            </p>
            <h1 className="mt-1 text-[30px] font-black tracking-tight text-slate-900 dark:text-white">
              Warehouses
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Manage multiple warehouse locations, photos, and navigation links.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(99,102,241,0.28)] transition hover:from-indigo-500 hover:to-violet-500"
          >
            <Plus className="h-4 w-4" />
            Add Warehouse
          </button>
        </div>

        {saveSuccess ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              Warehouse saved successfully!
            </p>
            <button
              type="button"
              onClick={() => setSaveSuccess(false)}
              className="ml-auto text-emerald-400 hover:text-emerald-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {notice ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <p>{notice}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {warehouses.length ? (
              warehouses.map((warehouse) => {
                const isSelected = warehouse.id === selectedWarehouse?.id
                const mapsUrl = buildGoogleMapsUrl(warehouse.warehouse_address)
                const wazeUrlItem = buildWazeUrl(warehouse.warehouse_address)

                return (
                  <div
                    key={warehouse.id}
                    onClick={() => setSelectedWarehouseId(warehouse.id)}
                    className={`group w-full cursor-pointer overflow-hidden rounded-[24px] border bg-white text-left shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)] dark:bg-slate-900 ${
                      isSelected
                        ? "border-indigo-400 ring-2 ring-indigo-100 dark:border-indigo-500 dark:ring-indigo-500/20"
                        : "border-slate-200/80 dark:border-slate-800"
                    }`}
                  >
                    <div className="p-3">
                      {/* Card image */}
                      <div className="relative h-42 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                        {warehouse.image_url ? (
                          <img
                            src={warehouse.image_url}
                            alt={warehouse.warehouse_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                            <Warehouse className="h-9 w-9 text-slate-300 dark:text-slate-600" />
                            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              No photo
                            </p>
                          </div>
                        )}
                        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                            <CheckCircle2 className="h-3 w-3" />
                            Saved
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              openEdit(warehouse)
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md ring-1 ring-black/5 backdrop-blur transition hover:bg-white dark:bg-slate-900/95 dark:text-slate-300 dark:ring-white/10"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="space-y-3 px-1 pt-4">
                        {/* Name row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                              <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                                Warehouse
                              </p>
                            </div>
                            <p className="mt-1 truncate text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                              {warehouse.warehouse_name || "Unnamed Warehouse"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                openEdit(warehouse)
                              }}
                              title="Edit"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDelete(warehouse)
                              }}
                              disabled={isDeleting}
                              title="Delete"
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <p className="text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                            {warehouse.warehouse_address ||
                              "No address saved yet"}
                          </p>
                        </div>

                        {/* Status badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: "Maps", ok: !!mapsUrl },
                            { label: "Waze", ok: !!wazeUrlItem },
                            { label: "Photo", ok: !!warehouse.image_url },
                          ].map((item) => (
                            <span
                              key={item.label}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                item.ok
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${item.ok ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
                              />
                              {item.label} {item.ok ? "Ready" : "Pending"}
                            </span>
                          ))}
                        </div>

                        {/* Nav buttons */}
                        <div
                          className="grid grid-cols-2 gap-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <NavBtn
                            href={mapsUrl}
                            label="Google Maps"
                            icon={<Navigation className="h-3.5 w-3.5" />}
                            variant={mapsUrl ? "google" : "disabled"}
                          />
                          <NavBtn
                            href={wazeUrlItem}
                            label="Waze"
                            icon={<Navigation className="h-3.5 w-3.5" />}
                            variant={wazeUrlItem ? "waze" : "disabled"}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                  <Warehouse className="h-10 w-10 text-indigo-400 dark:text-indigo-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    No warehouses yet
                  </p>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-slate-400 dark:text-slate-500">
                    Add your first warehouse so your team can keep track of
                    multiple locations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAdd}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-500/25 transition hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Warehouse
                </button>
              </div>
            )}
          </div>

          <div className="sticky top-6 space-y-5">
            <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-500/10">
                  <MapPinned className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </span>
                <div>
                  <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                    Map Preview
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Live embedded map from the selected warehouse.
                  </p>
                </div>
              </div>
              <div className="p-4">
                {latestWarehouse?.warehouse_address ? (
                  <iframe
                    title="Warehouse map"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(latestWarehouse.warehouse_address)}&z=15&output=embed`}
                    className="h-56 w-full rounded-2xl border border-slate-100 dark:border-slate-800"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    <MapPin className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs text-slate-400">
                      Add a warehouse to preview the latest address
                    </p>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <NavBtn
                    href={googleMapsUrl}
                    label="Google Maps"
                    icon={<Navigation className="h-4 w-4" />}
                    variant={googleMapsUrl ? "google" : "disabled"}
                  />
                  <NavBtn
                    href={wazeUrl}
                    label="Waze"
                    icon={<Navigation className="h-4 w-4" />}
                    variant={wazeUrl ? "waze" : "disabled"}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm dark:border-violet-500/15 dark:bg-slate-900">
              {/* Header */}
              <div className="flex items-center gap-2.5 bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20">
                  <Lightbulb className="h-4 w-4 text-white" />
                </div>
                <p className="text-[11px] font-black tracking-[0.28em] text-white uppercase">
                  Tips
                </p>
              </div>

              {/* Tip items */}
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  {
                    num: "1",
                    icon: <Building2 className="h-4 w-4 text-violet-500" />,
                    text: "Use a distinct name for each warehouse so the team can identify it quickly.",
                  },
                  {
                    num: "2",
                    icon: <Camera className="h-4 w-4 text-violet-500" />,
                    text: "Upload a clear photo of the entrance or signage for easy identification.",
                  },
                  {
                    num: "3",
                    icon: <Edit2 className="h-4 w-4 text-violet-500" />,
                    text: "Click Edit or Delete on any card to manage warehouses individually.",
                  },
                ].map((tip) => (
                  <li
                    key={tip.num}
                    className="flex items-start gap-3 px-5 py-4"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
                      {tip.icon}
                    </div>
                    <p className="pt-1 text-[12px] leading-[1.6] text-slate-600 dark:text-slate-400">
                      {tip.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {modalOpen ? (
        <WarehouseModal
          mode={modalMode}
          warehouse={editingWarehouse}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteConfirmModal
          warehouse={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </>
  )
}
