"use client"

import { useEffect, useState } from "react"
import {
  CreateCategoryPayload,
  useCreateCategoryMutation,
} from "@/store/api/categoriesApi"
import { AnimatePresence, motion } from "framer-motion"

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface FormState {
  cat_name: string
  cat_description: string
  cat_url: string
  cat_order: string
}

const defaultForm: FormState = {
  cat_name: "",
  cat_description: "",
  cat_url: "",
  cat_order: "0",
}

type Errors = Partial<Record<keyof FormState, string>>

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

export default function AddCategoryModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState<FormState>(defaultForm)
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState("")
  const [slugLocked, setSlugLocked] = useState(false)

  const [createCategory, { isLoading }] = useCreateCategoryMutation()

  // Auto-generate slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugLocked) {
      setForm((p) => ({ ...p, cat_url: toSlug(p.cat_name) }))
    }
  }, [form.cat_name, slugLocked])

  const set = (key: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const handleSlugChange = (value: string) => {
    setSlugLocked(true)
    set("cat_url", toSlug(value))
  }

  const validate = (): Errors => {
    const e: Errors = {}
    if (!form.cat_name.trim()) e.cat_name = "Category name is required"
    if (form.cat_name.trim().length > 50) e.cat_name = "Maximum 50 characters"
    if (form.cat_description.length > 200)
      e.cat_description = "Maximum 200 characters"
    if (form.cat_url.length > 40) e.cat_url = "Maximum 40 characters"
    if (form.cat_order && isNaN(Number(form.cat_order)))
      e.cat_order = "Must be a number"
    return e
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError("")
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const payload: CreateCategoryPayload = {
      cat_name: form.cat_name.trim(),
      cat_description: form.cat_description.trim() || undefined,
      cat_url: form.cat_url || toSlug(form.cat_name),
      cat_order: Number(form.cat_order) || 0,
    }

    try {
      await createCategory(payload).unwrap()
      handleClose()
    } catch (err: unknown) {
      const ex = err as { data?: { message?: string } }
      setServerError(ex?.data?.message ?? "Failed to create category.")
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setForm(defaultForm)
    setErrors({})
    setServerError("")
    setSlugLocked(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="my-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 shadow-md shadow-violet-500/30">
                      <svg
                        className="h-5 w-5 text-white"
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
                      <h2 className="text-base leading-none font-bold text-slate-800">
                        Add Category
                      </h2>
                      <p className="mt-1 text-xs text-slate-400">
                        Create a new product category
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
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
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                  {serverError && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-xs text-red-600">{serverError}</p>
                    </div>
                  )}

                  {/* Category Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.cat_name}
                      onChange={(e) => set("cat_name", e.target.value)}
                      placeholder="e.g. Home Furniture"
                      maxLength={50}
                      className={`w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-all focus:ring-2 focus:outline-none dark:bg-slate-800 dark:text-slate-100 ${errors.cat_name ? "border-red-300 focus:border-red-400 focus:ring-red-300/30" : "border-slate-200 focus:border-violet-400 focus:ring-violet-500/30"}`}
                    />
                    <div className="mt-1 flex justify-between">
                      {errors.cat_name ? (
                        <p className="text-xs text-red-500">
                          {errors.cat_name}
                        </p>
                      ) : (
                        <span />
                      )}
                      <p className="text-xs text-slate-400">
                        {form.cat_name.length}/50
                      </p>
                    </div>
                  </div>

                  {/* URL Slug */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      URL Slug
                    </label>
                    <div className="relative">
                      <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-slate-400">
                        /
                      </span>
                      <input
                        type="text"
                        value={form.cat_url}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="home-furniture"
                        maxLength={40}
                        className={`w-full rounded-xl border bg-slate-50 py-2.5 pr-3 pl-6 font-mono text-sm text-slate-700 placeholder-slate-400 transition-all focus:ring-2 focus:outline-none ${errors.cat_url ? "border-red-300 focus:border-red-400 focus:ring-red-300/30" : "border-slate-200 focus:border-violet-400 focus:ring-violet-500/30"}`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Auto-generated from name · editable
                    </p>
                    {errors.cat_url && (
                      <p className="mt-0.5 text-xs text-red-500">
                        {errors.cat_url}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Description
                    </label>
                    <textarea
                      value={form.cat_description}
                      onChange={(e) => set("cat_description", e.target.value)}
                      placeholder="Short description of this category..."
                      rows={3}
                      maxLength={200}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <div className="mt-1 flex justify-between">
                      {errors.cat_description ? (
                        <p className="text-xs text-red-500">
                          {errors.cat_description}
                        </p>
                      ) : (
                        <span />
                      )}
                      <p className="text-xs text-slate-400">
                        {form.cat_description.length}/200
                      </p>
                    </div>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={form.cat_order}
                      onChange={(e) => set("cat_order", e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Lower number = appears first
                    </p>
                    {errors.cat_order && (
                      <p className="mt-0.5 text-xs text-red-500">
                        {errors.cat_order}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-500/30 transition-colors hover:bg-violet-700 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <svg
                            className="h-4 w-4 animate-spin"
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
                          Saving...
                        </>
                      ) : (
                        <>
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
                          Add Category
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
