"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  useCreateBrandRequestMutation,
  useGetMyBrandRequestsQuery,
  useGetMyBrandsQuery,
  useMarkBrandRequestsSeenMutation,
  type BrandRequestStatus,
} from "@/store/api/brandRequestsApi"
import { showErrorToast, showSuccessToast } from "@/libs/toast"

const STATUS_BADGE: Record<BrandRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
}

const getErrorMessage = (err: unknown, fallback: string) => {
  const data = (
    err as { data?: { message?: string; errors?: Record<string, string[]> } }
  )?.data
  const firstFieldError = data?.errors
    ? Object.values(data.errors)[0]?.[0]
    : undefined
  return firstFieldError ?? data?.message ?? fallback
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const brands = brandsData?.brands ?? []
  const requests = requestsData?.requests ?? []

  // Viewing this page clears the "you have a decision" badge on the nav.
  useEffect(() => {
    if (requests.some((r) => !r.seen && r.status !== "pending")) {
      void markSeen()
    }
  }, [requests, markSeen])

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
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
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          My Brands
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          These are the brands assigned to your company. Need a new one? Request
          it below and an admin will review it.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
            Your brands
          </h2>
          {loadingBrands ? (
            <p className="mt-4 text-sm text-slate-400">Loading…</p>
          ) : brands.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              You don&apos;t have any brands yet. Request one on the right.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {brands.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800"
                >
                  <Link
                    href={`/supplier/brands/${b.id}`}
                    className="text-sm font-medium text-slate-700 transition hover:text-sky-600 hover:underline dark:text-slate-200"
                  >
                    {b.name}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      b.status === 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {b.status === 0 ? "Active" : "Disabled"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
            Request a new brand
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Brand name <span className="text-rose-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="e.g. POCO"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Note to admin (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Why you need this brand, etc."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Brand logo (optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                className="hidden"
              />
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {image ? (
                    <Image
                      src={image}
                      alt="Brand logo"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                      No Img
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {uploading ? "Uploading…" : image ? "Change" : "Upload logo"}
                  </button>
                  {image ? (
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                JPEG, PNG, WEBP or GIF · Max 5MB
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
          Your requests
        </h2>
        {loadingRequests ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No requests yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {r.image ? (
                      <Image
                        src={r.image}
                        alt={r.name}
                        width={32}
                        height={32}
                        unoptimized
                        className="h-8 w-8 rounded-md object-cover"
                      />
                    ) : null}
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {r.name}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[r.status]}`}
                  >
                    {r.status}
                  </span>
                </div>
                {r.note ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {r.note}
                  </p>
                ) : null}
                {r.status === "rejected" && r.reason ? (
                  <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    Reason: {r.reason}
                  </p>
                ) : null}
                {r.status === "approved" ? (
                  <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Approved — the brand is now available for your products.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
