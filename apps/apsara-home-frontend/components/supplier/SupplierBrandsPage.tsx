"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  ImagePlus,
  Inbox,
  Loader2,
  PlusCircle,
  Send,
  Sparkles,
  Tags,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import {
  useCreateBrandRequestMutation,
  useGetMyBrandRequestsQuery,
  useGetMyBrandsQuery,
  useMarkBrandRequestsSeenMutation,
  type BrandRequestStatus,
} from "@/store/api/brandRequestsApi"
import { showErrorToast, showSuccessToast } from "@/libs/toast"

const NOTE_MAX = 300

const REQUEST_STATUS: Record<
  BrandRequestStatus,
  { label: string; icon: LucideIcon; badge: string; dot: string; note: string }
> = {
  pending: {
    label: "Pending review",
    icon: Clock,
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    dot: "bg-amber-500",
    note: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    dot: "bg-emerald-500",
    note: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    badge:
      "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
    dot: "bg-rose-500",
    note: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  },
}

const FILTERS: { key: "all" | BrandRequestStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

const getErrorMessage = (err: unknown, fallback: string) => {
  const data = (
    err as { data?: { message?: string; errors?: Record<string, string[]> } }
  )?.data
  const firstFieldError = data?.errors
    ? Object.values(data.errors)[0]?.[0]
    : undefined
  return firstFieldError ?? data?.message ?? fallback
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?"

const formatDate = (iso?: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

/* ── Brand logo with gradient-initials fallback ── */
function BrandLogo({
  name,
  src,
  size = 40,
}: {
  name: string
  src?: string | null
  size?: number
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        unoptimized
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-indigo-500 font-bold text-white ring-1 ring-black/5"
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}

/* ── Compact metric card for the stats strip ── */
function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl leading-none font-bold text-slate-800 tabular-nums dark:text-slate-100">
          {value}
        </p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export default function SupplierBrandsPage() {
  const { data: brandsData, isLoading: loadingBrands } = useGetMyBrandsQuery()
  const { data: requestsData, isLoading: loadingRequests } =
    useGetMyBrandRequestsQuery()
  const [createRequest, { isLoading: submitting }] =
    useCreateBrandRequestMutation()
  const [markSeen] = useMarkBrandRequestsSeenMutation()

  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [image, setImage] = useState("")
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [filter, setFilter] = useState<"all" | BrandRequestStatus>("all")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const brands = useMemo(() => brandsData?.brands ?? [], [brandsData])
  const requests = useMemo(() => requestsData?.requests ?? [], [requestsData])

  const activeBrands = brands.filter((b) => b.status === 0).length
  const pendingCount = requests.filter((r) => r.status === "pending").length
  const approvedCount = requests.filter((r) => r.status === "approved").length

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests, pendingCount, approvedCount]
  )

  const filteredRequests =
    filter === "all" ? requests : requests.filter((r) => r.status === filter)

  // Viewing this page clears the "you have a decision" badge on the nav.
  useEffect(() => {
    if (requests.some((r) => !r.seen && r.status !== "pending")) {
      void markSeen()
    }
  }, [requests, markSeen])

  const processFile = async (file: File | undefined) => {
    if (!file) return
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type
      )
    ) {
      showErrorToast("Only JPEG, PNG, WEBP, or GIF images are allowed.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("Image must be 5MB or smaller.")
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/supplier/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.")
      setImage(data.url)
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Image upload failed.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      showErrorToast("Please enter a brand name.")
      return
    }
    try {
      const res = await createRequest({
        name: trimmed,
        note: note.trim() || undefined,
        image: image || undefined,
      }).unwrap()
      showSuccessToast(res.message)
      setName("")
      setNote("")
      setImage("")
    } catch (err) {
      showErrorToast(getErrorMessage(err, "Unable to submit brand request."))
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-br from-white to-sky-50/60 p-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
        <div className="absolute -top-10 -right-10 hidden h-40 w-40 rounded-full bg-sky-500/10 blur-2xl sm:block" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm shadow-sky-600/30">
            <Tags className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              My Brands
            </h1>
            <p className="mt-1 max-w-prose text-sm text-slate-500 dark:text-slate-400">
              These are the brands assigned to your company. Need a new one?
              Request it below and an admin will review it.
            </p>
          </div>
        </div>
      </header>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={BadgeCheck}
          label="Active brands"
          value={activeBrands}
          tone="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"
        />
        <StatCard
          icon={Clock}
          label="Pending requests"
          value={pendingCount}
          tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved requests"
          value={approvedCount}
          tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Your brands ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
              Your brands
            </h2>
            {!loadingBrands && brands.length > 0 ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 tabular-nums dark:bg-slate-800 dark:text-slate-300">
                {brands.length}
              </span>
            ) : null}
          </div>

          {loadingBrands ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : brands.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-slate-700">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Tags className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                No brands yet
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Request your first brand using the form on the right.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {brands.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/supplier/brands/${b.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-sky-200 hover:bg-sky-50/50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none dark:border-slate-800 dark:hover:border-sky-500/30 dark:hover:bg-sky-500/5"
                  >
                    <BrandLogo name={b.name} src={b.image} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700 transition group-hover:text-sky-700 dark:text-slate-200 dark:group-hover:text-sky-300">
                        {b.name}
                      </p>
                      <p className="text-xs text-slate-400">View products</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        b.status === 0
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          b.status === 0 ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {b.status === 0 ? "Active" : "Disabled"}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Request a new brand ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
              Request a new brand
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="brand-name"
                className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Brand name <span className="text-rose-500">*</span>
              </label>
              <input
                id="brand-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="e.g. POCO"
                maxLength={120}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="brand-note"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Note to admin{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <span className="text-[11px] tabular-nums text-slate-400">
                  {note.length}/{NOTE_MAX}
                </span>
              </div>
              <textarea
                id="brand-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Why you need this brand, etc."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Brand logo{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => void processFile(e.target.files?.[0])}
                className="hidden"
              />

              {image ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <Image
                    src={image}
                    alt="Brand logo preview"
                    width={56}
                    height={56}
                    unoptimized
                    className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Logo ready
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      This image will be attached to your request.
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      aria-label="Remove logo"
                      className="flex items-center justify-center rounded-lg border border-rose-200 px-2.5 py-1.5 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload brand logo"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    void processFile(e.dataTransfer.files?.[0])
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none ${
                    dragOver
                      ? "border-sky-400 bg-sky-50 dark:border-sky-500/50 dark:bg-sky-500/10"
                      : "border-slate-200 hover:border-sky-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-sky-500/40 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                  </span>
                  <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {uploading ? "Uploading…" : "Click or drag an image here"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    JPEG, PNG, WEBP or GIF · Max 5MB
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-600/20 transition hover:bg-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit request
                </>
              )}
            </button>
          </form>
        </section>
      </div>

      {/* ── Your requests ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
            Your requests
          </h2>
          {!loadingRequests && requests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    filter === f.key
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {f.label}
                  <span className="ml-1 tabular-nums opacity-70">
                    {counts[f.key]}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {loadingRequests ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-slate-700">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              No requests yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Submitted brand requests will appear here with their status.
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-400">
            No {filter} requests.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {filteredRequests.map((r) => {
              const status = REQUEST_STATUS[r.status]
              const StatusIcon = status.icon
              const created = formatDate(r.created_at)
              const decided = formatDate(r.decided_at)
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-100 p-3.5 transition hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <BrandLogo name={r.name} src={r.image} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {r.name}
                        </p>
                        {created ? (
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Requested {created}
                            {decided && r.status !== "pending"
                              ? ` · ${r.status === "approved" ? "Approved" : "Reviewed"} ${decided}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{status.label}</span>
                    </span>
                  </div>

                  {r.note ? (
                    <p className="mt-2.5 border-l-2 border-slate-200 pl-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {r.note}
                    </p>
                  ) : null}

                  {r.status === "rejected" && r.reason ? (
                    <p
                      className={`mt-2.5 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-xs ${status.note}`}
                    >
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        <span className="font-semibold">Reason:</span> {r.reason}
                      </span>
                    </p>
                  ) : null}

                  {r.status === "approved" ? (
                    <p
                      className={`mt-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs ${status.note}`}
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      Approved — the brand is now available for your products.
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
