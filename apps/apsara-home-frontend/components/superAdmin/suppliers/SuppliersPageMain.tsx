"use client"

import { Fragment, useMemo, useState } from "react"
import { useGetCategoriesQuery } from "@/store/api/categoriesApi"
import {
  InviteSupplierUserResponse,
  SupplierItem,
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useDeleteSupplierUserMutation,
  useGetSuppliersQuery,
  useGetSupplierUsersQuery,
  useInviteSupplierUserMutation,
  useUpdateSupplierCategoriesMutation,
  useUpdateSupplierMutation,
  useUpdateSupplierUserMutation,
} from "@/store/api/suppliersApi"
import {
  AtSign,
  Building2,
  CheckCircle2,
  Copy,
  FolderOpen,
  Lock,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Store,
  Tag,
  User,
  UserPlus,
} from "lucide-react"
import { useSession } from "next-auth/react"

const CAT_COLORS = [
  { bg: "bg-indigo-100 dark:bg-indigo-500/15", icon: "text-indigo-500 dark:text-indigo-400" },
  { bg: "bg-rose-100 dark:bg-rose-500/15",    icon: "text-rose-500 dark:text-rose-400" },
  { bg: "bg-amber-100 dark:bg-amber-500/15",  icon: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-emerald-100 dark:bg-emerald-500/15", icon: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-violet-100 dark:bg-violet-500/15", icon: "text-violet-500 dark:text-violet-400" },
  { bg: "bg-sky-100 dark:bg-sky-500/15",      icon: "text-sky-500 dark:text-sky-400" },
  { bg: "bg-orange-100 dark:bg-orange-500/15", icon: "text-orange-500 dark:text-orange-400" },
  { bg: "bg-teal-100 dark:bg-teal-500/15",    icon: "text-teal-600 dark:text-teal-400" },
]

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

export default function SuppliersPageMain() {
  const { data: session } = useSession()
  const role = String(session?.user?.role ?? "").toLowerCase()
  const isSupplierPortal = role === "supplier"
  const isMainSupplier = Boolean(session?.user?.isMainSupplier)
  const isSupplierAdmin =
    role === "supplier_admin" ||
    isSupplierPortal ||
    (session?.user?.userLevelId ?? 0) === 8
  const { data, isLoading, isError } = useGetSuppliersQuery()
  const [createSupplier, { isLoading: isCreatingSupplier }] =
    useCreateSupplierMutation()
  const [updateSupplier, { isLoading: isUpdatingSupplier }] =
    useUpdateSupplierMutation()
  const [deleteSupplier, { isLoading: isDeletingSupplier }] =
    useDeleteSupplierMutation()
  const [inviteSupplierUser, { isLoading: isInvitingSupplierUser }] =
    useInviteSupplierUserMutation()
  const [updateSupplierCategories, { isLoading: isSavingSupplierCategories }] =
    useUpdateSupplierCategoriesMutation()
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
  const [supplierOverrides, setSupplierOverrides] = useState<
    Record<number, SupplierItem>
  >({})
  const [inviteFeedback, setInviteFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [supplierSearch, setSupplierSearch] = useState("")
  const [supplierPage, setSupplierPage] = useState(1)
  const [latestInvite, setLatestInvite] =
    useState<InviteSupplierUserResponse | null>(null)
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(
    null
  )
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [expandedSupplierTreeId, setExpandedSupplierTreeId] = useState<
    number | null
  >(null)
  const [categoryTarget, setCategoryTarget] = useState<SupplierItem | null>(
    null
  )
  const [categorySelection, setCategorySelection] = useState<number[]>([])
  const [categorySearch, setCategorySearch] = useState("")
  const [categoryFeedback, setCategoryFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number
    company: string
    name: string
  } | null>(null)

  const sortedSuppliers = useMemo(
    () =>
      Object.values(
        [
          ...(data?.suppliers ?? []),
          ...Object.values(supplierOverrides),
        ].reduce<Record<number, SupplierItem>>((acc, supplier) => {
          acc[supplier.id] = supplier
          return acc
        }, {})
      ).sort((a, b) =>
        (a.company || a.name).localeCompare(b.company || b.name)
      ),
    [data?.suppliers, supplierOverrides]
  )
  const linkedSupplierId = Number(session?.user?.supplierId ?? 0)
  const { data: allCategoriesData } = useGetCategoriesQuery({
    page: 1,
    per_page: 500,
  })
  const allCategories = useMemo(
    () => (allCategoriesData?.categories ?? []).filter((c) => !c.parent_id),
    [allCategoriesData?.categories]
  )
  const subCountMap = useMemo(() => {
    const map = new Map<number, number>()
    ;(allCategoriesData?.categories ?? []).forEach((c) => {
      if (c.parent_id) map.set(c.parent_id, (map.get(c.parent_id) ?? 0) + 1)
    })
    return map
  }, [allCategoriesData?.categories])
  const subListMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string; url: string }[]>()
    ;(allCategoriesData?.categories ?? []).forEach((c) => {
      if (c.parent_id) {
        const list = map.get(c.parent_id) ?? []
        list.push({ id: c.id, name: c.name, url: c.url ?? "" })
        map.set(c.parent_id, list)
      }
    })
    return map
  }, [allCategoriesData?.categories])
  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase()
    if (!q) return allCategories
    return allCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.url ?? "").toLowerCase().includes(q)
    )
  }, [allCategories, categorySearch])
  const supplierInviteForm = useMemo(
    () =>
      isSupplierAdmin && linkedSupplierId > 0
        ? { ...inviteForm, supplier_id: String(linkedSupplierId) }
        : inviteForm,
    [inviteForm, isSupplierAdmin, linkedSupplierId]
  )
  const selectedInviteSupplier = useMemo(
    () =>
      sortedSuppliers.find(
        (supplier) =>
          String(supplier.id) === String(supplierInviteForm.supplier_id)
      ) ?? null,
    [sortedSuppliers, supplierInviteForm.supplier_id]
  )
  const filteredSuppliers = useMemo(() => {
    const keyword = supplierSearch.trim().toLowerCase()
    if (keyword === "") return sortedSuppliers

    return sortedSuppliers.filter((supplier) =>
      [supplier.company, supplier.name, supplier.email, supplier.contact]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(keyword))
    )
  }, [sortedSuppliers, supplierSearch])
  const supplierPageSize = 8
  const supplierTotalPages = Math.max(
    1,
    Math.ceil(filteredSuppliers.length / supplierPageSize)
  )
  const normalizedSupplierPage = Math.min(supplierPage, supplierTotalPages)
  const paginatedSuppliers = useMemo(() => {
    const start = (normalizedSupplierPage - 1) * supplierPageSize
    return filteredSuppliers.slice(start, start + supplierPageSize)
  }, [filteredSuppliers, normalizedSupplierPage])

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
      setSupplierOverrides((prev) => ({
        ...prev,
        [created.supplier.id]: created.supplier,
      }))
      setCompanyForm(defaultSupplierCompanyForm)
      setLatestInvite(null)
      setSupplierSearch("")
      setSupplierPage(1)
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

  const handleEditSupplier = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingSupplierId) return

    setCompanyFeedback(null)

    try {
      const updated = await updateSupplier({
        id: editingSupplierId,
        data: {
          name: companyForm.name.trim(),
          company: companyForm.company.trim(),
          email: companyForm.email.trim(),
          contact: companyForm.contact.trim(),
          address: companyForm.address.trim(),
          status: Number(companyForm.status),
        },
      }).unwrap()

      setCompanyFeedback({ type: "success", message: updated.message })
      setSupplierOverrides((prev) => ({
        ...prev,
        [updated.supplier.id]: updated.supplier,
      }))
      setEditingSupplierId(null)
      setIsEditModalOpen(false)
      setCompanyForm(defaultSupplierCompanyForm)
    } catch (error) {
      setCompanyFeedback({
        type: "error",
        message: getErrorMessage(error, "Unable to update merchant."),
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
        fullname: supplierInviteForm.fullname.trim(),
        username: supplierInviteForm.username.trim(),
        email: supplierInviteForm.email.trim() || undefined,
      }).unwrap()

      setInviteFeedback({ type: "success", message: result.message })
      setLatestInvite(result)
      setInviteForm((prev) => ({
        ...defaultSupplierInviteForm,
        supplier_id:
          isSupplierAdmin && linkedSupplierId > 0
            ? String(linkedSupplierId)
            : prev.supplier_id,
      }))
    } catch (error) {
      setInviteFeedback({
        type: "error",
        message: getErrorMessage(error, "Unable to create merchant invite."),
      })
    }
  }

  const openCategoryManager = (supplier: SupplierItem) => {
    setCategoryTarget(supplier)
    setCategoryFeedback(null)
    setCategorySelection(
      (supplier.assigned_categories ?? []).map((category) => category.id)
    )
  }

  const toggleCategorySelection = (categoryId: number) => {
    setCategorySelection((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSaveSupplierCategories = async () => {
    if (!categoryTarget) return

    setCategoryFeedback(null)

    try {
      const result = await updateSupplierCategories({
        supplierId: categoryTarget.id,
        category_ids: categorySelection,
      }).unwrap()

      setCategoryFeedback({ type: "success", message: result.message })
    } catch (error) {
      setCategoryFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to update merchant category access."
        ),
      })
    }
  }

  const startEditSupplier = (supplier: {
    id: number
    name: string
    company: string
    email: string
    contact: string
    address: string
    status: number
  }) => {
    setEditingSupplierId(supplier.id)
    setCompanyFeedback(null)
    setCompanyForm({
      name: supplier.name || "",
      company: supplier.company || "",
      email: supplier.email || "",
      contact: supplier.contact || "",
      address: supplier.address || "",
      status: supplier.status === 1 ? "1" : "0",
    })
    setIsEditModalOpen(true)
  }

  const cancelEditSupplier = () => {
    setEditingSupplierId(null)
    setCompanyForm(defaultSupplierCompanyForm)
    setIsEditModalOpen(false)
  }

  const handleDeleteSupplier = async () => {
    if (!deleteTarget) return
    setCompanyFeedback(null)

    try {
      const result = await deleteSupplier({
        id: Number(deleteTarget.id),
        company: deleteTarget.company,
        name: deleteTarget.name,
      }).unwrap()
      setCompanyFeedback({ type: "success", message: result.message })
      setSupplierOverrides((prev) => {
        const next = { ...prev }
        delete next[deleteTarget.id]
        return next
      })
      if (editingSupplierId === deleteTarget.id) {
        cancelEditSupplier()
      }
      setDeleteTarget(null)
    } catch (error) {
      setCompanyFeedback({
        type: "error",
        message: getErrorMessage(error, "Unable to delete merchant."),
      })
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        Loading supplier data...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
        Failed to load supplier data.
      </div>
    )
  }

  if (sortedSuppliers.length === 0 && isSupplierAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/20 dark:bg-amber-500/10">
        <h1 className="text-lg font-bold text-amber-900 dark:text-amber-100">
          No Supplier Linked
        </h1>
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">
          This supplier account is not yet linked to a supplier company.
        </p>
      </div>
    )
  }

  if (isSupplierAdmin) {
    const supplier = sortedSuppliers[0]
    const isActive = supplier.status === 1

    const INFO_ITEMS = [
      {
        icon: <User className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
        label: "Display Name",
        value: supplier.name || "-",
      },
      {
        icon: <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
        label: "Company",
        value: supplier.company || "-",
      },
      {
        icon: <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
        label: "Email",
        value: supplier.email || "-",
      },
      {
        icon: <Phone className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
        label: "Contact",
        value: supplier.contact || "-",
      },
      {
        icon: <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
        label: "Address",
        value: supplier.address || "-",
      },
      {
        icon: (
          <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        ),
        label: "Status",
        value: null,
        isStatus: true,
      },
    ]

    return (
      <div className="space-y-5">
        {/* ── Hero header ── */}
        <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-linear-to-br from-sky-50 via-cyan-50/40 to-indigo-50/60 p-6 shadow-sm sm:p-8 dark:border-sky-900/30 dark:from-sky-900/20 dark:via-cyan-900/10 dark:to-indigo-900/20">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100/80 shadow-sm dark:bg-sky-900/40">
                <Store className="h-7 w-7 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-[0.22em] text-sky-700 uppercase dark:text-sky-400">
                  Supplier Company
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {supplier.company || supplier.name}
                </h1>
                <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
                  Your supplier account is scoped to this company only. Products
                  and dashboard data stay limited to this profile.
                </p>
              </div>
            </div>
            {/* Decorative illustration */}
            <div className="hidden shrink-0 sm:block">
              <div className="relative h-28 w-40">
                <svg
                  className="absolute top-0 right-0 opacity-25"
                  width="56"
                  height="44"
                  viewBox="0 0 56 44"
                >
                  {[0, 1, 2, 3].map((r) =>
                    [0, 1, 2, 3, 4].map((c) => (
                      <circle
                        key={`${r}${c}`}
                        cx={c * 13 + 4}
                        cy={r * 11 + 4}
                        r="1.8"
                        fill="#64748b"
                      />
                    ))
                  )}
                </svg>
                <div className="absolute right-4 bottom-0 w-32 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-md dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-2.5 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100">
                      <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="h-1.5 w-16 rounded-full bg-slate-200" />
                      <div className="h-1.5 w-10 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-slate-100" />
                    <div className="h-1.5 w-4/5 rounded-full bg-slate-100" />
                  </div>
                  <div className="mt-2.5 flex justify-end">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100">
                      <svg
                        className="h-2.5 w-2.5 text-emerald-600"
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
          </div>
        </div>

        {/* ── Info grid ── */}
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 lg:divide-x dark:divide-slate-800">
            {INFO_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-5 ${i >= 3 ? "sm:border-t sm:border-slate-100 dark:sm:border-slate-800" : ""} ${i >= 2 && i < 4 ? "lg:border-t-0" : ""}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                    {item.label}
                  </p>
                  {item.isStatus ? (
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {isActive ? "Active" : "Inactive"}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Categories ── */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/20">
                <FolderOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-violet-600 uppercase dark:text-violet-400">
                  Allowed Categories
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                  Assigned Product Categories
                </h2>
                <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                  These are the only categories this supplier portal can use
                  when creating or editing products.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {(supplier.assigned_categories ?? []).length > 0 ? (
                supplier.assigned_categories?.map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300"
                  >
                    <Tag className="h-3 w-3" />
                    {category.name}
                  </span>
                ))
              ) : (
                <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  No categories assigned yet.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Invite section ── */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Description */}
            <div className="flex items-start gap-3 lg:w-64 lg:shrink-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-900/20">
                <UserPlus className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-cyan-600 uppercase dark:text-cyan-400">
                  Supplier Access
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isMainSupplier
                    ? "Invite Sub-Merchant User"
                    : "Merchant Access"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isMainSupplier
                    ? "Give your staff their own merchant portal login. Email is optional, and you can copy the setup link manually after creating the invite."
                    : "This account is a sub-merchant account. Only the main merchant owner can invite additional merchant users."}
                </p>
              </div>
            </div>

            {/* Form */}
            {isMainSupplier ? (
              <form
                onSubmit={handleInviteSupplier}
                className="flex-1 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full Name">
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={supplierInviteForm.fullname}
                        onChange={handleInviteInput("fullname")}
                        required
                        placeholder="Enter full name"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-800 transition outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </FormField>
                  <FormField label="Username">
                    <div className="relative">
                      <AtSign className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={supplierInviteForm.username}
                        onChange={handleInviteInput("username")}
                        required
                        placeholder="Enter username"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-800 transition outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </FormField>
                </div>

                <FormField label="Email (Optional)">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={supplierInviteForm.email}
                      onChange={handleInviteInput("email")}
                      placeholder="Leave blank if you will send the setup link manually"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-800 transition outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </FormField>

                {inviteFeedback && (
                  <FeedbackBanner
                    type={inviteFeedback.type}
                    message={inviteFeedback.message}
                  />
                )}
                {latestInvite && (
                  <SetupLinkCard
                    setupUrl={latestInvite.setup_url}
                    delivery={latestInvite.delivery}
                  />
                )}

                <button
                  type="submit"
                  disabled={isInvitingSupplierUser}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-cyan-500 to-teal-500 py-3 text-sm font-bold text-white shadow-md shadow-cyan-200/60 transition hover:from-cyan-600 hover:to-teal-600 disabled:opacity-60 dark:shadow-cyan-900/30"
                >
                  <Send className="h-4 w-4" />
                  {isInvitingSupplierUser
                    ? "Creating invite…"
                    : "Create Merchant Invite Link"}
                </button>

                <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  <Lock className="h-3 w-3" />A secure invite link will be
                  generated for this user.
                </p>
              </form>
            ) : (
              <div className="flex-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                Only the main supplier owner can invite sub-supplier users.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Merchants
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pick or create a brand, then add the merchant linked to it. You can
          invite the merchant&apos;s login afterwards.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Add Merchant
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pick (or create) the brand this merchant belongs to, then fill in
              the merchant details. A brand is required.
            </p>
          </div>

          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Display Name">
                <input
                  value={companyForm.name}
                  onChange={handleCompanyInput("name")}
                  required
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Company Name">
                <input
                  value={companyForm.company}
                  onChange={handleCompanyInput("company")}
                  required
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={handleCompanyInput("email")}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Contact">
                <input
                  value={companyForm.contact}
                  onChange={handleCompanyInput("contact")}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <FormField label="Address">
              <textarea
                value={companyForm.address}
                onChange={handleCompanyInput("address")}
                rows={3}
                className={textareaClassName}
              />
            </FormField>

            <FormField label="Status">
              <select
                value={companyForm.status}
                onChange={handleCompanyInput("status")}
                className={inputClassName}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </FormField>

            {companyFeedback ? (
              <FeedbackBanner
                type={companyFeedback.type}
                message={companyFeedback.message}
              />
            ) : null}

            <button
              type="submit"
              disabled={isCreatingSupplier}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-600 dark:hover:bg-cyan-500"
            >
              {isCreatingSupplier ? "Creating merchant..." : "Create Merchant"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Invite Merchant Login
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Optional: create the main merchant owner account here. That owner
              can later invite their own sub-users from the merchant portal.
            </p>
          </div>

          <form onSubmit={handleInviteSupplier} className="space-y-4">
            <FormField label="Merchant">
              <select
                value={supplierInviteForm.supplier_id}
                onChange={handleInviteInput("supplier_id")}
                required
                className={inputClassName}
              >
                <option value="">Select merchant</option>
                {sortedSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.company || supplier.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full Name">
                <input
                  value={inviteForm.fullname}
                  onChange={handleInviteInput("fullname")}
                  required
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Username">
                <input
                  value={inviteForm.username}
                  onChange={handleInviteInput("username")}
                  required
                  className={inputClassName}
                />
              </FormField>
            </div>

            <FormField label="Email">
              <input
                type="email"
                value={inviteForm.email}
                onChange={handleInviteInput("email")}
                className={inputClassName}
                placeholder="Optional"
              />
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
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isInvitingSupplierUser
                ? "Creating invite..."
                : "Create Main Merchant Invite Link"}
            </button>
          </form>
        </section>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))] dark:shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
        <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(240,249,255,0.9),rgba(255,255,255,0.96)_42%,rgba(236,254,255,0.88))] px-5 py-5 dark:border-white/8 dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.28),rgba(15,23,42,0.96)_42%,rgba(8,145,178,0.12))]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/80 px-3 py-1 text-[11px] font-bold tracking-[0.22em] text-cyan-700 uppercase shadow-sm dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_14px_rgba(6,182,212,0.8)]" />
                Merchant Directory
              </div>
              <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Manage merchants in one workspace
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Search faster, inspect account status instantly, and jump
                    straight into users, categories, or edits.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {filteredSuppliers.length} total
                  </span>
                  <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 shadow-sm dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                    {paginatedSuppliers.length} on this page
                  </span>
                </div>
              </div>
            </div>

            <div className="relative w-full xl:max-w-md">
              <svg
                className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={supplierSearch}
                onChange={(event) => {
                  setSupplierSearch(event.target.value)
                  setSupplierPage(1)
                }}
                placeholder="Search merchant, email, or contact..."
                className="w-full rounded-[20px] border border-white/70 bg-white/80 py-3.5 pr-4 pl-11 text-sm text-slate-800 shadow-sm transition-all duration-300 outline-none placeholder:text-slate-400 focus:-translate-y-0.5 focus:border-cyan-300 focus:shadow-[0_14px_35px_rgba(6,182,212,0.12)] focus:ring-4 focus:ring-cyan-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400/40 dark:focus:shadow-[0_14px_35px_rgba(8,145,178,0.2)] dark:focus:ring-cyan-500/10"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50/90 dark:bg-slate-900/70">
              <tr className="border-b border-slate-200/80 dark:border-white/8">
                <th className="px-5 py-4 text-left text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                  Company
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                  Contact
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                  Email
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90 dark:divide-white/[0.06]">
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14">
                    <div className="mx-auto max-w-md rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/60">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                        <svg
                          className="h-6 w-6 text-slate-400 dark:text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {supplierSearch.trim()
                          ? `No merchants found for "${supplierSearch.trim()}".`
                          : "No merchants found."}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Try a different keyword or clear the current search.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
              {paginatedSuppliers.map((supplier, index) => (
                <Fragment key={supplier.id}>
                  <tr
                    className="group animate-fade-up-in border-l-2 border-transparent transition-all duration-300 hover:border-cyan-400/60 hover:bg-[linear-gradient(90deg,rgba(236,254,255,0.55),rgba(248,250,252,0.1))] dark:hover:border-cyan-400/30 dark:hover:bg-[linear-gradient(90deg,rgba(8,145,178,0.12),rgba(15,23,42,0.06))]"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold text-slate-900 transition-colors duration-300 group-hover:text-cyan-700 dark:text-slate-100 dark:group-hover:text-cyan-200">
                          {supplier.company || supplier.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          {supplier.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {supplier.contact || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {supplier.email || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-transform duration-300 group-hover:scale-[1.03] ${
                          supplier.status === 1
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                            : "border-slate-200 bg-slate-100 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${supplier.status === 1 ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-500"}`}
                        />
                        {supplier.status === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSupplierTreeId((prev) =>
                              prev === supplier.id ? null : supplier.id
                            )
                          }
                          className="rounded-full border border-emerald-200/90 bg-emerald-50/80 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/15"
                        >
                          {expandedSupplierTreeId === supplier.id
                            ? "Hide Users"
                            : "Users"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openCategoryManager(supplier)}
                          className="rounded-full border border-cyan-200/90 bg-cyan-50/80 px-3.5 py-2 text-xs font-semibold text-cyan-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-100 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/15"
                        >
                          Categories
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditSupplier(supplier)}
                          className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(supplier)}
                          disabled={isDeletingSupplier}
                          className="rounded-full border border-red-200/90 bg-red-50/75 px-3.5 py-2 text-xs font-semibold text-red-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedSupplierTreeId === supplier.id ? (
                    <tr className="animate-fade-up-in bg-slate-50/70 dark:bg-slate-800/30">
                      <td colSpan={5} className="px-5 py-5">
                        <div className="rounded-[22px] border border-slate-200/80 bg-white/80 p-4 shadow-inner dark:border-white/8 dark:bg-slate-950/60">
                          <SupplierUsersTree supplierId={supplier.id} />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/85 px-5 py-4 md:flex-row md:items-center md:justify-between dark:border-white/8 dark:bg-slate-900/70">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
              Pagination
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Page{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {normalizedSupplierPage}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {supplierTotalPages}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSupplierPage((prev) => Math.max(1, prev - 1))}
              disabled={normalizedSupplierPage <= 1}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setSupplierPage((prev) =>
                  Math.min(supplierTotalPages, prev + 1)
                )
              }
              disabled={normalizedSupplierPage >= supplierTotalPages}
              className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-semibold text-cyan-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/15"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {categoryTarget ? (
        <ModalShell onClose={() => { setCategoryTarget(null); setCategorySearch("") }}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15">
                <FolderOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-400">
                  Supplier Categories
                </p>
                <h3 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
                  Assign Allowed Categories
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {categoryTarget.company || categoryTarget.name} will only be able to use the categories you enable here.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setCategoryTarget(null); setCategorySearch("") }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search + selected badge */}
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-9 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            {categorySelection.length > 0 && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {categorySelection.length} selected
              </span>
            )}
          </div>

          {/* Category grid */}
          <div className="mt-3 max-h-[400px] overflow-y-auto pr-0.5">
            {allCategories.length === 0 ? (
              <p className="py-8 text-center text-sm text-amber-700 dark:text-amber-200">
                Create master categories first before assigning them to suppliers.
              </p>
            ) : filteredCategories.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No categories match &ldquo;{categorySearch}&rdquo;
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {filteredCategories.map((category, idx) => {
                  const checked = categorySelection.includes(category.id)
                  const color = CAT_COLORS[idx % CAT_COLORS.length]
                  const subs = subListMap.get(category.id) ?? []
                  return (
                    <div key={category.id} className="group/cat relative">
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                          checked
                            ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color.bg}`}>
                          <Tag className={`h-4 w-4 ${color.icon}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {category.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              /{category.url || "no-slug"}
                            </p>
                            {subs.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {subs.length} sub
                              </span>
                            )}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategorySelection(category.id)}
                          className="h-4 w-4 shrink-0 accent-indigo-600"
                        />
                      </label>

                      {subs.length > 0 && (
                        <div className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-56 opacity-0 transition-opacity duration-150 group-hover/cat:opacity-100">
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                              Subcategories
                            </p>
                            <ul className="space-y-1.5">
                              {subs.map((sub) => (
                                <li key={sub.id} className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                                  <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                                    {sub.name}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {/* arrow */}
                          <div className="ml-5 h-2 w-2 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 -mt-1" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Info footer */}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
            <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only selected categories will be accessible to this supplier.
            </p>
          </div>

          {categoryFeedback && (
            <div className="mt-3">
              <FeedbackBanner type={categoryFeedback.type} message={categoryFeedback.message} />
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setCategoryTarget(null); setCategorySearch("") }}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveSupplierCategories()}
              disabled={isSavingSupplierCategories || allCategories.length === 0}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isSavingSupplierCategories ? "Saving access..." : "Save Category Access"}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {isEditModalOpen ? (
        <ModalShell onClose={cancelEditSupplier}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.22em] text-cyan-700 uppercase dark:text-cyan-300">
                Edit Supplier
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                Update Merchant
              </h3>
            </div>
            <button
              type="button"
              onClick={cancelEditSupplier}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleEditSupplier} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Display Name">
                <input
                  value={companyForm.name}
                  onChange={handleCompanyInput("name")}
                  required
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Company Name">
                <input
                  value={companyForm.company}
                  onChange={handleCompanyInput("company")}
                  required
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={handleCompanyInput("email")}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Contact">
                <input
                  value={companyForm.contact}
                  onChange={handleCompanyInput("contact")}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <FormField label="Address">
              <textarea
                value={companyForm.address}
                onChange={handleCompanyInput("address")}
                rows={3}
                className={textareaClassName}
              />
            </FormField>

            <FormField label="Status">
              <select
                value={companyForm.status}
                onChange={handleCompanyInput("status")}
                className={inputClassName}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </FormField>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelEditSupplier}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingSupplier}
                className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingSupplier ? "Saving changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {deleteTarget ? (
        <ModalShell onClose={() => setDeleteTarget(null)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.22em] text-red-500 uppercase">
                Delete Merchant
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                Confirm Delete
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            Delete{" "}
            <span className="font-semibold">
              {deleteTarget.company || deleteTarget.name}
            </span>
            ? This will remove linked merchant accounts and unassign products
            from this merchant.
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSupplier}
              disabled={isDeletingSupplier}
              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletingSupplier ? "Deleting..." : "Delete Merchant"}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

function SupplierUsersTree({ supplierId }: { supplierId: number }) {
  const { data: session } = useSession()
  const role = String(session?.user?.role ?? "").toLowerCase()
  const canManageAccounts = role !== "supplier"

  const { data, isLoading, isError, error, refetch } =
    useGetSupplierUsersQuery(supplierId)
  const [updateSupplierUser, { isLoading: isUpdating }] =
    useUpdateSupplierUserMutation()
  const [deleteSupplierUser, { isLoading: isDeleting }] =
    useDeleteSupplierUserMutation()
  const users = data?.users ?? []
  const [editing, setEditing] = useState<{
    id: number
    fullname: string
    username: string
    email: string
    password: string
    is_main_supplier?: boolean
  } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number
    label: string
    isMain?: boolean
  } | null>(null)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const getErrorMessage = (errorValue: unknown, fallback: string) => {
    if (errorValue && typeof errorValue === "object") {
      const dataValue = (
        errorValue as {
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

  const openEdit = (user: {
    id: number
    fullname: string
    username: string
    email: string
    is_main_supplier?: boolean
  }) => {
    setFeedback(null)
    setEditing({
      id: user.id,
      fullname: user.fullname || "",
      username: user.username || "",
      email: user.email || "",
      password: "",
      is_main_supplier: user.is_main_supplier,
    })
  }

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setFeedback(null)

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
        message: getErrorMessage(err, "Unable to update merchant user."),
      })
    }
  }

  const requestDelete = (user: {
    id: number
    fullname: string
    username: string
    is_main_supplier?: boolean
  }) => {
    setFeedback(null)
    setConfirmDelete({
      id: user.id,
      label: user.fullname?.trim() ? user.fullname : `@${user.username}`,
      isMain: Boolean(user.is_main_supplier),
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
        message: getErrorMessage(err, "Unable to remove merchant user."),
      })
    }
  }

  if (isLoading) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Loading supplier users...
      </p>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
        <p>{getErrorMessage(error, "Failed to load merchant users.")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-slate-950 dark:text-red-200 dark:hover:bg-red-500/10"
        >
          Retry
        </button>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No supplier users yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
          Supplier User Tree
        </p>
        <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          Main Supplier and Sub-Suppliers
        </h4>
      </div>
      {users.map((user) => (
        <div
          key={user.id}
          className={`rounded-2xl border px-4 py-3 ${
            user.is_main_supplier
              ? "border-cyan-200 bg-cyan-50 dark:border-cyan-500/20 dark:bg-cyan-500/10"
              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {user.fullname || user.username}
                </p>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    user.is_main_supplier
                      ? "border-cyan-200 bg-white text-cyan-700 dark:border-cyan-500/20 dark:bg-slate-950 dark:text-cyan-200"
                      : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {user.role_label ||
                    (user.is_main_supplier ? "Main Merchant" : "Sub Merchant")}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                @{user.username}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {user.email || "No email provided"}
              </p>
            </div>

            {canManageAccounts ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(user)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500/30 dark:hover:text-cyan-200"
                >
                  Manage Account
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(user)}
                  disabled={isDeleting || Boolean(user.is_main_supplier)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ))}

      {editing ? (
        <ModalShell onClose={() => setEditing(null)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.22em] text-slate-400 uppercase dark:text-slate-500">
                Manage Account
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                Update supplier portal user
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Keep the password blank if you don’t want to change it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleUpdate} className="mt-6 space-y-4">
            <FormField label="Full Name">
              <input
                value={editing.fullname}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, fullname: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"
                required
              />
            </FormField>
            <FormField label="Username">
              <input
                value={editing.username}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, username: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"
                required
              />
            </FormField>
            <FormField label="Email (Optional)">
              <input
                type="email"
                value={editing.email}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, email: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"
                placeholder="Optional"
              />
            </FormField>
            <FormField label="New Password (Optional)">
              <input
                type="password"
                value={editing.password}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, password: e.target.value } : prev
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"
                placeholder="Leave blank if you don't want to change it"
              />
            </FormField>

            {feedback ? (
              <FeedbackBanner type={feedback.type} message={feedback.message} />
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {confirmDelete ? (
        <ModalShell onClose={() => setConfirmDelete(null)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.22em] text-red-600 uppercase">
                Confirm Delete
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                Remove supplier user?
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                This will remove access for{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {confirmDelete.label}
                </span>
                .
              </p>
              {confirmDelete.isMain ? (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">
                  The main supplier owner account cannot be deleted here.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          {feedback ? (
            <div className="mt-4">
              <FeedbackBanner type={feedback.type} message={feedback.message} />
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteNow()}
              disabled={isDeleting || Boolean(confirmDelete.isMain)}
              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      {children}
    </label>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
  )
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
      <button
        type="button"
        aria-label="Close modal backdrop"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative z-10 w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950">
        {children}
      </div>
    </div>
  )
}

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"

const textareaClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-cyan-500/20"
