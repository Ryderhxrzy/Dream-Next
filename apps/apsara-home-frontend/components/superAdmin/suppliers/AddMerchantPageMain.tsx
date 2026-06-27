"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  InviteSupplierUserResponse,
  useCreateSupplierMutation,
  useGetSuppliersQuery,
  useInviteSupplierUserMutation,
} from "@/store/api/suppliersApi"
import {
  ArrowLeft,
  AtSign,
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Send,
  Store,
  User,
  UserPlus,
} from "lucide-react"

type SupplierCompanyForm = {
  name: string
  company: string
  email: string
  contact: string
  address: string
  status: "1" | "0"
}

type SupplierInviteForm = {
  supplier_id: string
  fullname: string
  username: string
  email: string
}

const defaultSupplierCompanyForm: SupplierCompanyForm = {
  name: "",
  company: "",
  email: "",
  contact: "",
  address: "",
  status: "1",
}

const defaultSupplierInviteForm: SupplierInviteForm = {
  supplier_id: "",
  fullname: "",
  username: "",
  email: "",
}

export default function AddMerchantPageMain() {
  const { data } = useGetSuppliersQuery()
  const [createSupplier, { isLoading: isCreatingSupplier }] =
    useCreateSupplierMutation()
  const [inviteSupplierUser, { isLoading: isInvitingSupplierUser }] =
    useInviteSupplierUserMutation()

  const [companyForm, setCompanyForm] = useState<SupplierCompanyForm>(
    defaultSupplierCompanyForm
  )
  const [inviteForm, setInviteForm] = useState<SupplierInviteForm>(
    defaultSupplierInviteForm
  )
  const [companyFeedback, setCompanyFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [inviteFeedback, setInviteFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [latestInvite, setLatestInvite] =
    useState<InviteSupplierUserResponse | null>(null)

  const sortedSuppliers = useMemo(
    () =>
      [...(data?.suppliers ?? [])].sort((a, b) =>
        (a.company || a.name).localeCompare(b.company || b.name)
      ),
    [data?.suppliers]
  )
  const selectedInviteSupplier = useMemo(
    () =>
      sortedSuppliers.find(
        (supplier) => String(supplier.id) === String(inviteForm.supplier_id)
      ) ?? null,
    [sortedSuppliers, inviteForm.supplier_id]
  )

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

  const handleCompanyInput =
    (field: keyof SupplierCompanyForm) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setCompanyForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleInviteInput =
    (field: keyof SupplierInviteForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setInviteForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleCreateSupplier = async (event: React.FormEvent) => {
    event.preventDefault()
    setCompanyFeedback(null)

    try {
      const created = await createSupplier({
        name: companyForm.name.trim(),
        company: companyForm.company.trim(),
        email: companyForm.email.trim(),
        contact: companyForm.contact.trim(),
        address: companyForm.address.trim(),
        status: Number(companyForm.status),
      }).unwrap()

      setCompanyFeedback({ type: "success", message: created.message })
      setCompanyForm(defaultSupplierCompanyForm)
      setLatestInvite(null)
      // Auto-select the freshly created merchant in the invite form.
      setInviteForm((prev) => ({
        ...prev,
        supplier_id: String(created.supplier.id),
      }))
    } catch (error) {
      setCompanyFeedback({
        type: "error",
        message: getErrorMessage(error, "Unable to create merchant."),
      })
    }
  }

  const handleInviteSupplier = async (event: React.FormEvent) => {
    event.preventDefault()
    setInviteFeedback(null)
    setLatestInvite(null)

    if (!selectedInviteSupplier) {
      setInviteFeedback({
        type: "error",
        message: "Please select a valid merchant first.",
      })
      return
    }

    try {
      const result = await inviteSupplierUser({
        supplier_id: selectedInviteSupplier.id,
        fullname: inviteForm.fullname.trim(),
        username: inviteForm.username.trim(),
        email: inviteForm.email.trim() || undefined,
      }).unwrap()

      setInviteFeedback({ type: "success", message: result.message })
      setLatestInvite(result)
      setInviteForm((prev) => ({
        ...defaultSupplierInviteForm,
        supplier_id: prev.supplier_id,
      }))
    } catch (error) {
      setInviteFeedback({
        type: "error",
        message: getErrorMessage(error, "Unable to create merchant invite."),
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Top bar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/merchants"
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500/30 dark:hover:text-cyan-200"
            aria-label="Back to merchants"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
              <Link
                href="/admin/merchants"
                className="transition hover:text-cyan-700 dark:hover:text-cyan-300"
              >
                Merchants
              </Link>
              <span>/</span>
              <span className="text-slate-600 dark:text-slate-300">
                Add Merchant
              </span>
            </nav>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Add a new merchant
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Create the merchant company first, then optionally invite the main
              merchant owner login. The owner can later invite their own
              sub-users from the merchant portal.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ── Add Merchant ── */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 border-b border-slate-100 bg-linear-to-br from-slate-50 to-white px-6 py-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-cyan-600">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Merchant Details
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Fill in the merchant&apos;s company profile. Display name and
                company name are required.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateSupplier} className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Display Name" required>
                <IconInput icon={<User className="h-4 w-4" />}>
                  <input
                    value={companyForm.name}
                    onChange={handleCompanyInput("name")}
                    required
                    placeholder="e.g. AF Appliance"
                    className={iconInputClassName}
                  />
                </IconInput>
              </FormField>
              <FormField label="Company Name" required>
                <IconInput icon={<Building2 className="h-4 w-4" />}>
                  <input
                    value={companyForm.company}
                    onChange={handleCompanyInput("company")}
                    required
                    placeholder="Registered company name"
                    className={iconInputClassName}
                  />
                </IconInput>
              </FormField>
              <FormField label="Email">
                <IconInput icon={<Mail className="h-4 w-4" />}>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={handleCompanyInput("email")}
                    placeholder="merchant@email.com"
                    className={iconInputClassName}
                  />
                </IconInput>
              </FormField>
              <FormField label="Contact">
                <IconInput icon={<Phone className="h-4 w-4" />}>
                  <input
                    value={companyForm.contact}
                    onChange={handleCompanyInput("contact")}
                    placeholder="09xx xxx xxxx"
                    className={iconInputClassName}
                  />
                </IconInput>
              </FormField>
            </div>

            <FormField label="Address">
              <div className="relative">
                <MapPin className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-slate-400" />
                <textarea
                  value={companyForm.address}
                  onChange={handleCompanyInput("address")}
                  rows={3}
                  placeholder="Complete business address"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"
                />
              </div>
            </FormField>

            <FormField label="Status">
              <div className="relative">
                <CheckCircle2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={companyForm.status}
                  onChange={handleCompanyInput("status")}
                  className={iconInputClassName}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </FormField>

            {companyFeedback ? (
              <FeedbackBanner
                type={companyFeedback.type}
                message={companyFeedback.message}
              />
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <Link
                href="/admin/merchants"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isCreatingSupplier}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-600 dark:hover:bg-cyan-500"
              >
                {isCreatingSupplier ? "Creating merchant..." : "Create Merchant"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Invite Merchant Login ── */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 border-b border-slate-100 bg-linear-to-br from-cyan-50/70 to-white px-6 py-5 dark:border-slate-800 dark:from-cyan-900/20 dark:to-slate-950">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Invite Merchant Login
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Optional: create the main merchant owner account. A secure setup
                link will be generated.
              </p>
            </div>
          </div>

          <form onSubmit={handleInviteSupplier} className="space-y-4 p-6">
            <FormField label="Merchant" required>
              <IconInput icon={<Store className="h-4 w-4" />}>
                <select
                  value={inviteForm.supplier_id}
                  onChange={handleInviteInput("supplier_id")}
                  required
                  className={iconInputClassName}
                >
                  <option value="">Select merchant</option>
                  {sortedSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.company || supplier.name}
                    </option>
                  ))}
                </select>
              </IconInput>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full Name" required>
                <IconInput icon={<User className="h-4 w-4" />}>
                  <input
                    value={inviteForm.fullname}
                    onChange={handleInviteInput("fullname")}
                    required
                    placeholder="Owner full name"
                    className={iconInputClassName}
                  />
                </IconInput>
              </FormField>
              <FormField label="Username" required>
                <IconInput icon={<AtSign className="h-4 w-4" />}>
                  <input
                    value={inviteForm.username}
                    onChange={handleInviteInput("username")}
                    required
                    placeholder="Login username"
                    className={iconInputClassName}
                  />
                </IconInput>
              </FormField>
            </div>

            <FormField label="Email (Optional)">
              <IconInput icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={handleInviteInput("email")}
                  placeholder="Leave blank to send the link manually"
                  className={iconInputClassName}
                />
              </IconInput>
            </FormField>

            {inviteFeedback ? (
              <FeedbackBanner
                type={inviteFeedback.type}
                message={inviteFeedback.message}
              />
            ) : null}

            {latestInvite ? (
              <SetupLinkCard
                setupUrl={latestInvite.setup_url}
                delivery={latestInvite.delivery}
              />
            ) : null}

            <button
              type="submit"
              disabled={isInvitingSupplierUser}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-cyan-500 to-teal-500 py-3 text-sm font-bold text-white shadow-md shadow-cyan-200/60 transition hover:from-cyan-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-cyan-900/30"
            >
              <Send className="h-4 w-4" />
              {isInvitingSupplierUser
                ? "Creating invite..."
                : "Create Main Merchant Invite Link"}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <Lock className="h-3 w-3" />A secure invite link will be generated
              for this user.
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function IconInput({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400">
        {icon}
      </span>
      {children}
    </div>
  )
}

function FeedbackBanner({
  type,
  message,
}: {
  type: "success" | "error"
  message: string
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
      }`}
    >
      {message}
    </div>
  )
}

function localizeSetupUrl(url: string): string {
  if (typeof window === "undefined") return url
  if (window.location.hostname !== "localhost") return url
  try {
    const parsed = new URL(url)
    parsed.protocol = window.location.protocol
    parsed.hostname = window.location.hostname
    parsed.port = window.location.port
    return parsed.toString()
  } catch {
    return url
  }
}

function SetupLinkCard({
  setupUrl,
  delivery,
}: {
  setupUrl: string
  delivery: "link_only" | "email_and_link"
}) {
  const [copied, setCopied] = useState(false)
  const displayUrl = localizeSetupUrl(setupUrl)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/10">
      <p className="text-xs font-bold tracking-[0.18em] text-cyan-700 uppercase">
        Setup Link Ready
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {delivery === "email_and_link"
          ? "An email was sent, and you can also copy the setup link below."
          : "No email was sent. Copy this setup link and send it manually to your merchant user."}
      </p>
      <div className="mt-3 rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm break-all text-slate-700 dark:border-cyan-500/20 dark:bg-slate-950 dark:text-slate-200">
        {displayUrl}
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-3 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-500/20 dark:bg-slate-950 dark:text-cyan-200 dark:hover:bg-cyan-500/10"
      >
        {copied ? "Copied" : "Copy Link"}
      </button>
    </div>
  )
}

const iconInputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"
