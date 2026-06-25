"use client"

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { showErrorToast, showInfoToast, showSuccessToast } from "@/libs/toast"
import {
  useCreateKnowledgeDocumentMutation,
  useDeleteKnowledgeDocumentMutation,
  useGetKnowledgeDocumentsQuery,
  usePreviewKnowledgeUploadMutation,
  useReindexKnowledgeDocumentMutation,
  useUpdateKnowledgeDocumentMutation,
  type KnowledgeDocument,
  type KnowledgeDocumentPayload,
  type KnowledgeDocumentStatus,
} from "@/store/api/knowledgeBaseApi"
import {
  Database,
  FileText,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"

type KnowledgeForm = {
  title: string
  status: KnowledgeDocumentStatus
  content: string
}

const emptyForm: KnowledgeForm = {
  title: "",
  status: "active",
  content: "",
}

const fileNameToTitle = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as {
    data?: { message?: string; errors?: Record<string, string[]> }
  }
  return (
    apiError?.data?.message ??
    Object.values(apiError?.data?.errors ?? {})[0]?.[0] ??
    fallback
  )
}

const formatDate = (value?: string | null) => {
  if (!value) return "Not indexed"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function StatusBadge({ value }: { value: string }) {
  const classes =
    value === "active" || value === "indexed"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : value === "draft" || value === "pending"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        : value === "failed"
          ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.16em] uppercase ${classes}`}
    >
      {value}
    </span>
  )
}

export default function KnowledgeBasePageMain() {
  const [form, setForm] = useState<KnowledgeForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [deletingDocument, setDeletingDocument] =
    useState<KnowledgeDocument | null>(null)

  const { data, isLoading, isFetching } = useGetKnowledgeDocumentsQuery({
    page,
    perPage: 20,
    search,
    status,
  })
  const [createDocument, { isLoading: isCreating }] =
    useCreateKnowledgeDocumentMutation()
  const [updateDocument, { isLoading: isUpdating }] =
    useUpdateKnowledgeDocumentMutation()
  const [deleteDocument] = useDeleteKnowledgeDocumentMutation()
  const [reindexDocument] = useReindexKnowledgeDocumentMutation()
  const [previewKnowledgeUpload, { isLoading: isPreviewingUpload }] =
    usePreviewKnowledgeUploadMutation()

  const documents = useMemo(() => data?.documents ?? [], [data?.documents])
  const meta = data?.meta
  const isSaving = isCreating || isUpdating
  const contentLength = form.content.trim().length

  const updateField = <K extends keyof KnowledgeForm>(
    key: K,
    value: KnowledgeForm[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const buildPayload = (): KnowledgeDocumentPayload => ({
    title: form.title.trim(),
    type: "knowledge",
    scope: "global",
    partner_slug: null,
    status: form.status,
    content: form.content.trim(),
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.title.trim()) {
      showErrorToast("Title is required.")
      return
    }

    if (form.content.trim().length < 10) {
      showErrorToast("Content must be at least 10 characters.")
      return
    }

    try {
      if (editingId) {
        await updateDocument({ id: editingId, ...buildPayload() }).unwrap()
        showSuccessToast("Knowledge document updated.")
      } else {
        await createDocument(buildPayload()).unwrap()
        showSuccessToast("Knowledge document saved.")
      }
      resetForm()
    } catch (error) {
      showErrorToast(
        getApiErrorMessage(error, "Unable to save knowledge document.")
      )
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith(".doc")) {
      showInfoToast(
        "Old DOC files are not supported yet. Save it as DOCX, TXT, or Markdown."
      )
      return
    }

    if (lowerName.endsWith(".docx")) {
      try {
        const body = new FormData()
        body.append("file", file)
        const preview = await previewKnowledgeUpload(body).unwrap()
        setForm((current) => ({
          ...current,
          title: current.title || preview.title || fileNameToTitle(file.name),
          content: preview.content,
        }))
        showSuccessToast("DOCX content loaded.")
      } catch (error) {
        showErrorToast(
          getApiErrorMessage(error, "Unable to extract DOCX content.")
        )
      }
      return
    }

    const canReadAsText = [
      ".txt",
      ".md",
      ".markdown",
      ".csv",
      ".json",
    ].some((ext) => lowerName.endsWith(ext))

    if (!canReadAsText) {
      showErrorToast("Use TXT, Markdown, CSV, or JSON for now.")
      return
    }

    if (file.size > 1_500_000) {
      showErrorToast("File is too large. Keep knowledge files under 1.5 MB.")
      return
    }

    try {
      const text = await file.text()
      setForm((current) => ({
        ...current,
        title: current.title || fileNameToTitle(file.name),
        content: text,
      }))
      showSuccessToast("File content loaded.")
    } catch {
      showErrorToast("Unable to read the selected file.")
    }
  }

  const openEdit = (document: KnowledgeDocument) => {
    setEditingId(document.id)
    setForm({
      title: document.title,
      status: document.status,
      content: document.content,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const confirmDelete = async () => {
    if (!deletingDocument) return
    try {
      setBusyId(deletingDocument.id)
      await deleteDocument(deletingDocument.id).unwrap()
      if (editingId === deletingDocument.id) resetForm()
      setDeletingDocument(null)
      showSuccessToast("Knowledge document deleted.")
    } catch (error) {
      showErrorToast(
        getApiErrorMessage(error, "Unable to delete knowledge document.")
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleReindex = async (document: KnowledgeDocument) => {
    try {
      setBusyId(document.id)
      await reindexDocument(document.id).unwrap()
      showSuccessToast("Knowledge document reindexed.")
    } catch (error) {
      showErrorToast(
        getApiErrorMessage(error, "Unable to reindex knowledge document.")
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.24em] text-sky-500 uppercase">
                Chat Support
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                AI Knowledge Base
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Documents
              </p>
              <p className="mt-1 text-xl font-bold">{meta?.total ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Showing
              </p>
              <p className="mt-1 text-xl font-bold">{documents.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                State
              </p>
              <p className="mt-1 text-xl font-bold">
                {isFetching ? "Sync" : "Ready"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.24em] text-slate-400 uppercase">
                  {editingId ? "Edit" : "Create"}
                </p>
                <h2 className="mt-1 text-lg font-bold">Knowledge Document</h2>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Cancel edit"
                  title="Cancel edit"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-sky-900/30"
                  placeholder="Return and Damaged Item Policy"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value as KnowledgeDocumentStatus
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-sky-900/30"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                    Content
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    {isPreviewingUpload ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {isPreviewingUpload ? "Reading" : "Import"}
                    <input
                      type="file"
                      accept=".txt,.md,.markdown,.csv,.json,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={isPreviewingUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  value={form.content}
                  onChange={(event) =>
                    updateField("content", event.target.value)
                  }
                  rows={13}
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-sky-900/30"
                  placeholder="Paste policy, FAQ, or guide content here."
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{contentLength.toLocaleString()} characters</span>
                  <span>TXT, Markdown, CSV, JSON, DOCX</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editingId ? "Save Changes" : "Save Knowledge"}
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.24em] text-slate-400 uppercase">
                    Documents
                  </p>
                  <h2 className="mt-1 text-lg font-bold">Indexed Content</h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px] xl:w-[520px]">
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value)
                        setPage(1)
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-4 pl-10 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-sky-900/30"
                      placeholder="Search documents"
                    />
                  </div>
                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value)
                      setPage(1)
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-sky-900/30"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="max-h-[820px] overflow-auto p-5">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Loading knowledge documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-slate-700">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">
                    No knowledge documents
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Add the first policy, FAQ, or guide from the form.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((document) => {
                    const isBusy = busyId === document.id
                    return (
                      <article
                        key={document.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-sky-300 dark:border-slate-800 dark:bg-slate-950/50"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-slate-950 dark:text-white">
                                {document.title}
                              </h3>
                              <StatusBadge value={document.status} />
                              <StatusBadge value={document.index_status} />
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {document.content}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="rounded-full bg-white px-2.5 py-1 font-semibold dark:bg-slate-900">
                                {formatDate(document.indexed_at)}
                              </span>
                            </div>
                            {document.index_error ? (
                              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                                {document.index_error}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(document)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReindex(document)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-60 dark:border-sky-900/60 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-sky-950/30"
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`}
                              />
                              Reindex
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingDocument(document)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            {meta && meta.last_page > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Previous
                </button>
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Page {meta.current_page} of {meta.last_page}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(meta.last_page, current + 1))
                  }
                  disabled={page >= meta.last_page}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {deletingDocument ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            aria-label="Close delete confirmation"
            onClick={() => (busyId ? undefined : setDeletingDocument(null))}
          />
          <div className="relative z-[81] w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-[0.22em] text-red-500 uppercase">
                    Delete Document
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                    Remove knowledge entry?
                  </h3>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                This will delete{" "}
                <span className="font-bold text-slate-950 dark:text-white">
                  {deletingDocument.title}
                </span>{" "}
                and remove its indexed chunks from AI support search.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/60">
              <button
                type="button"
                onClick={() => setDeletingDocument(null)}
                disabled={busyId === deletingDocument.id}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={busyId === deletingDocument.id}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === deletingDocument.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
