"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  User,
  AtSign,
  Mail,
  Lock,
  Send,
  Copy,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
  AlertTriangle,
  X,
} from "lucide-react"
import {
  useDeleteSupplierUserMutation,
  useGetSupplierUsersQuery,
  useInviteSupplierUserMutation,
  useUpdateSupplierUserMutation,
} from "@/store/api/suppliersApi"

type InviteForm = { fullname: string; username: string; email: string }
const defaultInviteForm: InviteForm = { fullname: "", username: "", email: "" }

type EditForm = {
  id: number
  fullname: string
  username: string
  email: string
  password: string
  is_main_supplier?: boolean
}

/* ── Avatar colours ─────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
]
const avatarColor = (name: string) => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
const initials = (fullname: string, username: string) => {
  const n = (fullname || username).trim()
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "U"
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase()
}

/* ── Shared UI helpers ───────────────────────────────────────────────────── */
function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  )
}

function IconInput({
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"
      />
    </div>
  )
}

function Feedback({
  type,
  message,
}: {
  type: "success" | "error"
  message: string
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
      }`}
    >
      {message}
    </div>
  )
}

/* ── Decorative hero illustration ────────────────────────────────────────── */
function HeroIllustration() {
  return (
    <div className="hidden sm:flex shrink-0 items-center justify-center">
      <div className="relative w-44 h-32">
        {/* Dot grid */}
        <svg
          className="absolute top-0 right-0 opacity-30"
          width="60"
          height="50"
          viewBox="0 0 60 50"
        >
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <circle
                key={`${r}${c}`}
                cx={c * 14 + 5}
                cy={r * 12 + 5}
                r="2"
                fill="#64748b"
              />
            ))
          )}
        </svg>
        {/* Card */}
        <div className="absolute bottom-0 right-6 w-36 rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100">
              <ShieldCheck className="h-4 w-4 text-cyan-600" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-2 w-20 rounded-full bg-slate-200 dark:bg-slate-600" />
              <div className="h-2 w-14 rounded-full bg-slate-100 dark:bg-slate-700" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700" />
            <div className="h-2 w-4/5 rounded-full bg-slate-100 dark:bg-slate-700" />
          </div>
          <div className="mt-3 flex justify-end">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-3 w-3 text-emerald-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function SupplierUsersPage() {
  const { data: session, status } = useSession()
  const supplierId = Number(session?.user?.supplierId ?? 0)
  const isMainSupplier = Boolean(session?.user?.isMainSupplier)
  const currentSupplierUserId = Number(
    (session?.user as { id?: string | number } | undefined)?.id ?? 0
  )

  const { data, isLoading, isError, error, refetch } = useGetSupplierUsersQuery(
    supplierId || undefined,
    {
      skip: status !== "authenticated" || supplierId <= 0,
      refetchOnMountOrArgChange: true,
    }
  )
  const [inviteSupplierUser, { isLoading: isInviting }] =
    useInviteSupplierUserMutation()
  const [updateSupplierUser, { isLoading: isUpdating }] =
    useUpdateSupplierUserMutation()
  const [deleteSupplierUser, { isLoading: isDeleting }] =
    useDeleteSupplierUserMutation()

  const [inviteForm, setInviteForm] = useState(defaultInviteForm)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [setupUrl, setSetupUrl] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditForm | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number
    label: string
  } | null>(null)

  const users = useMemo(() => data?.users ?? [], [data?.users])

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object") {
      const dataValue = (
        error as {
          data?: { message?: string; errors?: Record<string, string[]> }
        }
      ).data
      const firstEntry = dataValue?.errors
        ? Object.values(dataValue.errors)[0]
        : null
      if (Array.isArray(firstEntry) && typeof firstEntry[0] === "string")
        return firstEntry[0]
      if (typeof dataValue?.message === "string") return dataValue.message
    }
    return fallback
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setSetupUrl(null)
    try {
      const result = await inviteSupplierUser({
        supplier_id: supplierId,
        fullname: inviteForm.fullname.trim(),
        username: inviteForm.username.trim(),
        email: inviteForm.email.trim() || undefined,
      }).unwrap()
      setFeedback({ type: "success", message: result.message })
      setSetupUrl(result.setup_url)
      setInviteForm(defaultInviteForm)
    } catch (err) {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Unable to create supplier user invite."),
      })
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setFeedback(null)
    setSetupUrl(null)
    try {
      const result = await updateSupplierUser({
        id: editing.id,
        fullname: editing.fullname.trim(),
        username: editing.username.trim(),
        email: editing.email.trim() || undefined,
        password: editing.password.trim() || undefined,
      }).unwrap()
      setFeedback({ type: "success", message: result.message })
      setEditing(null)
    } catch (err) {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Unable to update supplier user."),
      })
    }
  }

  const requestDelete = (user: {
    id: number
    fullname: string
    username: string
  }) => {
    setFeedback(null)
    setSetupUrl(null)
    setConfirmDelete({
      id: user.id,
      label: user.fullname?.trim() ? user.fullname : `@${user.username}`,
    })
  }

  const confirmDeleteNow = async () => {
    if (!confirmDelete) return
    setFeedback(null)
    try {
      const result = await deleteSupplierUser(confirmDelete.id).unwrap()
      setFeedback({ type: "success", message: result.message })
      setConfirmDelete(null)
    } catch (err) {
      setFeedback({
        type: "error",
        message: getErrorMessage(err, "Unable to remove supplier user."),
      })
    }
  }

  const handleCopy = async () => {
    if (!setupUrl) return
    setFeedback(null)
    const fallback = () => {
      const ta = document.createElement("textarea")
      ta.value = setupUrl
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0"
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(ta)
      return ok
    }
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(setupUrl)
        setFeedback({
          type: "success",
          message: "Setup link copied to clipboard.",
        })
        return
      }
      const ok = fallback()
      setFeedback({
        type: ok ? "success" : "error",
        message: ok ? "Copied!" : "Copy failed.",
      })
    } catch {
      const ok = fallback()
      setFeedback({
        type: ok ? "success" : "error",
        message: ok ? "Copied!" : "Copy failed.",
      })
    }
  }

  const openEdit = (user: {
    id: number
    fullname: string
    username: string
    email: string
    is_main_supplier?: boolean
  }) => {
    setFeedback(null)
    setSetupUrl(null)
    setEditing({
      id: user.id,
      fullname: user.fullname || "",
      username: user.username || "",
      email: user.email || "",
      password: "",
      is_main_supplier: user.is_main_supplier,
    })
  }

  if (status === "loading") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading session…
      </div>
    )
  }
  if (supplierId <= 0) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        This supplier account is not linked to a supplier company yet.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Hero header ── */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-linear-to-br from-cyan-50 via-sky-50/40 to-indigo-50/60 p-6 shadow-sm sm:p-8 dark:border-cyan-900/30 dark:from-cyan-900/20 dark:via-sky-900/10 dark:to-indigo-900/20">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-100/80 shadow-sm dark:bg-cyan-900/40">
              <Users className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-400">
                Supplier Users
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Manage your supplier team access.
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
                Give each staff member their own supplier portal login so they
                can upload and maintain products safely.
              </p>
            </div>
          </div>
          <HeroIllustration />
        </div>
      </section>

      {/* ── Two-column layout ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
        {/* ── Invite card ── */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">
            Invite
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {isMainSupplier ? "Create Sub-Supplier User" : "Invite Access"}
          </h2>

          {isMainSupplier ? (
            <form onSubmit={handleInvite} className="mt-5 space-y-4">
              <Field label="Full Name">
                <IconInput
                  icon={<User className="h-4 w-4" />}
                  placeholder="Enter full name"
                  value={inviteForm.fullname}
                  onChange={(e) =>
                    setInviteForm((p) => ({ ...p, fullname: e.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Username">
                <IconInput
                  icon={<AtSign className="h-4 w-4" />}
                  placeholder="Enter username"
                  value={inviteForm.username}
                  onChange={(e) =>
                    setInviteForm((p) => ({ ...p, username: e.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Email (Optional)">
                <IconInput
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  placeholder="Enter email address (optional)"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </Field>

              {feedback && (
                <Feedback type={feedback.type} message={feedback.message} />
              )}

              {setupUrl && (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                    Setup Link
                  </p>
                  <p className="mt-2 break-all text-sm text-slate-700 dark:text-slate-200">
                    {setupUrl}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50 dark:border-cyan-500/20 dark:bg-slate-950 dark:text-cyan-300"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isInviting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-cyan-500 to-teal-500 py-3 text-sm font-bold text-white shadow-md shadow-cyan-200/60 transition hover:from-cyan-600 hover:to-teal-600 disabled:opacity-60 dark:shadow-cyan-900/30"
              >
                <Send className="h-4 w-4" />
                {isInviting ? "Creating invite…" : "Create Invite Link"}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <Lock className="h-3 w-3" />A secure invite link will be
                generated for this user.
              </p>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              Only the main supplier account can invite sub-supplier users.
            </div>
          )}
        </section>

        {/* ── Team card ── */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">
                Current Team
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                Supplier Portal Users
              </h2>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {users.length} user{users.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-5">
            {isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading supplier users…
              </p>
            ) : isError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4" />
                  {getErrorMessage(error, "Failed to load supplier users.")}
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/20 dark:bg-slate-950 dark:text-rose-300"
                >
                  Retry
                </button>
              </div>
            ) : users.length === 0 ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                No supplier users yet.
              </p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => {
                  const color = avatarColor(user.fullname || user.username)
                  const inits = initials(user.fullname, user.username)
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${color.bg} ${color.text}`}
                        >
                          {inits}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {user.fullname || user.username}
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                user.is_main_supplier
                                  ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {user.role_label ||
                                (user.is_main_supplier
                                  ? "Main Supplier"
                                  : "Sub Supplier")}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            @{user.username}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {user.email || "No email provided"}
                          </p>
                        </div>
                      </div>
                      {/* Action buttons — icon only */}
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          disabled={
                            !(
                              isMainSupplier ||
                              user.id === currentSupplierUserId
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-cyan-300 hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(user)}
                          disabled={
                            isDeleting ||
                            !isMainSupplier ||
                            Boolean(user.is_main_supplier)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-800 dark:bg-slate-800 dark:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Edit modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-600">
                  Edit User
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                  Update supplier portal user
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="mt-5 space-y-4">
              <Field label="Full Name">
                <IconInput
                  icon={<User className="h-4 w-4" />}
                  value={editing.fullname}
                  required
                  onChange={(e) =>
                    setEditing((p) =>
                      p ? { ...p, fullname: e.target.value } : p
                    )
                  }
                />
              </Field>
              <Field label="Username">
                <IconInput
                  icon={<AtSign className="h-4 w-4" />}
                  value={editing.username}
                  required
                  onChange={(e) =>
                    setEditing((p) =>
                      p ? { ...p, username: e.target.value } : p
                    )
                  }
                />
              </Field>
              <Field label="Email (Optional)">
                <IconInput
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  value={editing.email}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, email: e.target.value } : p))
                  }
                />
              </Field>
              <Field label="New Password (Optional)">
                <IconInput
                  icon={<Lock className="h-4 w-4" />}
                  type="password"
                  value={editing.password}
                  placeholder="Leave blank to keep current password"
                  onChange={(e) =>
                    setEditing((p) =>
                      p ? { ...p, password: e.target.value } : p
                    )
                  }
                />
              </Field>
              {feedback && (
                <Feedback type={feedback.type} message={feedback.message} />
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-cyan-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-cyan-200/50 transition hover:from-cyan-600 hover:to-teal-600 disabled:opacity-60"
                >
                  {isUpdating ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-6 shadow-2xl dark:border-rose-900/30 dark:bg-slate-950">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/20">
              <Trash2 className="h-5 w-5 text-rose-500" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">
              Remove supplier user?
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              This will remove access for{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {confirmDelete.label}
              </span>
              .
            </p>
            {feedback && (
              <div className="mt-4">
                <Feedback type={feedback.type} message={feedback.message} />
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void confirmDeleteNow()}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {isDeleting ? "Removing…" : "Yes, Remove"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
