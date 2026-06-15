"use client"

import { useEffect, useState } from "react"
import {
  Category,
  CreateCategoryPayload,
  useUpdateCategoryMutation,
} from "@/store/api/categoriesApi"
import { AnimatePresence, motion } from "framer-motion"

interface Props {
  category: Category | null
  onClose: () => void
}

interface FormState {
  cat_name: string
  cat_description: string
  cat_url: string
  cat_order: string
}

type Errors = Partial<Record<keyof FormState, string>>

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

export default function EditCategoryModal({ category, onClose }: Props) {
  const isOpen = category !== null

  const [form, setForm] = useState<FormState>({
    cat_name: "",
    cat_description: "",
    cat_url: "",
    cat_order: "0",
  })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState("")
  const [slugManual, setSlugManual] = useState(false)

  const [updateCategory, { isLoading }] = useUpdateCategoryMutation()

  useEffect(() => {
    if (!category) return
    setForm({
      cat_name: category.name ?? "",
      cat_description: category.description ?? "",
      cat_url: category.url ?? "",
      cat_order: String(category.order ?? 0),
    })
    setSlugManual(true) // pre-filled slug = keep it
    setErrors({})
    setServerError("")
  }, [category])

  const set = (key: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const handleSlugChange = (value: string) => {
    setSlugManual(true)
    set("cat_url", toSlug(value))
  }

  const validate = (): Errors => {
    const e: Errors = {}
    if (!form.cat_name.trim()) e.cat_name = "Category name is required"
    if (form.cat_name.trim().length > 50) e.cat_name = "Maximum 50 characters"
    if (form.cat_description.length > 200)
      e.cat_description = "Maximum 200 characters"
    if (form.cat_url.length > 40) e.cat_url = "Maximum 40 characters"
    return e
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!category) return
    setServerError("")
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const payload: Partial<CreateCategoryPayload> = {
      cat_name: form.cat_name.trim(),
      cat_description: form.cat_description.trim(),
      cat_url: form.cat_url || toSlug(form.cat_name),
      cat_order: Number(form.cat_order) || 0,
    }

    try {
      await updateCategory({ id: category.id, data: payload }).unwrap()
      onClose()
    } catch (err: unknown) {
      const ex = err as { data?: { message?: string } }
      setServerError(ex?.data?.message ?? "Failed to update category.")
    }
  }

  const handleClose = () => {
    if (isLoading) return
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-md shadow-blue-500/30">
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base leading-none font-bold text-slate-800">
                        Edit Category
                      </h2>
                      <p className="mt-1 text-xs text-slate-400">
                        ID #{category?.id} · {category?.name}
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

                  {/* Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.cat_name}
                      onChange={(e) => set("cat_name", e.target.value)}
                      maxLength={50}
                      className={`w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-all focus:ring-2 focus:outline-none dark:bg-slate-800 dark:text-slate-100 ${errors.cat_name ? "border-red-300 focus:border-red-400 focus:ring-red-300/30" : "border-slate-200 focus:border-blue-400 focus:ring-blue-500/30"}`}
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
                        maxLength={40}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-6 font-mono text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                      />
                    </div>
                    {errors.cat_url && (
                      <p className="mt-1 text-xs text-red-500">
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
                      rows={3}
                      maxLength={200}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                      min="0"
                      className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Lower number = appears first
                    </p>
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
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-blue-700 disabled:opacity-60"
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Save Changes
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
