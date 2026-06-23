"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { getPartnerStorefrontConfig } from "@/libs/partnerStorefront"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import {
  computeEndDateRaw,
  isWebstoreRequestExpired,
} from "@/libs/webstoreExpiry"
import {
  useCreatePartnerWebstorePaymentSessionMutation,
  useGetPartnerWebstoreRequestsQuery,
  useLazyVerifyPartnerWebstorePaymentSessionQuery,
  useSubmitPartnerWebstoreRequestMutation,
  useUploadPartnerWebstoreReceiptMutation,
} from "@/store/api/adminInquiriesApi"
import { useGetAdminMeQuery } from "@/store/api/authApi"
import { type SubmitWebstoreRequestPayload } from "@/store/api/userApi"
import { useGetAdminWebPageItemsQuery } from "@/store/api/webPagesApi"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Star,
  Store,
  Upload,
  Users,
  X,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

type PlanKey = "test" | "quarterly" | "semiAnnual" | "annual"
type BillingOption = "full" | "monthly"
type PaymentMethod = "gcash" | "grab_pay" | "maya" | "card"
type PaymentMode = "test" | "live"
type RenewalDraftPayload = {
  selectedPlan?: PlanKey
  selectedBillingOption?: BillingOption
  selectedPaymentMethod?: PaymentMethod
  renewalEnabled?: boolean
  storefrontKey?: string
}

const LOCAL_PAYMENT_MODE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const DRAFT_STORAGE_KEY = "afhome:partner-renewal-draft:v1"
const LAST_CHECKOUT_KEY = "afhome:partner-renewal-last-checkout:v1"

const planMap: Record<PlanKey, SubmitWebstoreRequestPayload["plan"]> = {
  test: "test",
  quarterly: "quarterly",
  semiAnnual: "semi_annual",
  annual: "annual",
}

const planOptions: Array<{
  key: PlanKey
  title: string
  term: string
  full: number
  monthly: number
  description: string
}> = [
  {
    key: "test",
    title: "Test",
    term: "2 days",
    full: 1,
    monthly: 1,
    description: "Quick renewal check for testing.",
  },
  {
    key: "quarterly",
    title: "Quarterly",
    term: "3 months",
    full: 48000,
    monthly: 16000,
    description: "Good for short-term relaunches.",
  },
  {
    key: "semiAnnual",
    title: "Semi-Annual",
    term: "6 months",
    full: 90000,
    monthly: 15000,
    description: "Balanced mid-term renewal.",
  },
  {
    key: "annual",
    title: "Annual",
    term: "1 year",
    full: 150000,
    monthly: 12500,
    description: "Best value for long-term storefronts.",
  },
]

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "gcash", label: "Gcash" },
  { value: "grab_pay", label: "GrabPay" },
  { value: "maya", label: "Maya" },
  { value: "card", label: "Card" },
]

const planStyleMap: Record<
  PlanKey,
  {
    iconBg: string
    iconText: string
    activeBorder: string
    activeBg: string
    priceText: string
  }
> = {
  test: {
    iconBg: "bg-violet-100 dark:bg-violet-500/20",
    iconText: "text-violet-600 dark:text-violet-400",
    activeBorder: "border-violet-400 dark:border-violet-400/70",
    activeBg: "bg-violet-50/80 dark:bg-violet-500/5",
    priceText: "text-violet-700 dark:text-violet-300",
  },
  quarterly: {
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    iconText: "text-blue-600 dark:text-blue-400",
    activeBorder: "border-blue-400 dark:border-blue-400/70",
    activeBg: "bg-blue-50/80 dark:bg-blue-500/5",
    priceText: "text-blue-700 dark:text-blue-300",
  },
  semiAnnual: {
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconText: "text-emerald-600 dark:text-emerald-400",
    activeBorder: "border-emerald-400 dark:border-emerald-400/70",
    activeBg: "bg-emerald-50/80 dark:bg-emerald-500/5",
    priceText: "text-emerald-700 dark:text-emerald-300",
  },
  annual: {
    iconBg: "bg-amber-100 dark:bg-amber-500/20",
    iconText: "text-amber-600 dark:text-amber-400",
    activeBorder: "border-amber-400 dark:border-amber-400/70",
    activeBg: "bg-amber-50/80 dark:bg-amber-500/5",
    priceText: "text-amber-700 dark:text-amber-300",
  },
}

const resolvePaymentMode = (): PaymentMode => {
  if (typeof window === "undefined") return "live"
  const host = window.location.hostname.trim().toLowerCase()
  return LOCAL_PAYMENT_MODE_HOSTS.has(host) || host.endsWith(".local")
    ? "test"
    : "live"
}

const getRequestTimestamp = (
  request?: {
    reviewed_at?: string | null
    created_at?: string | null
    approved_at?: string | null
  } | null
) => {
  if (!request) return 0
  const raw =
    request.reviewed_at || request.created_at || request.approved_at || ""
  const value = new Date(raw).getTime()
  return Number.isFinite(value) ? value : 0
}

export default function PartnerStorefrontRenewalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const sessionAccessToken = String(
    (session?.user as { accessToken?: string } | undefined)?.accessToken ?? ""
  )
  const adminIdentityKey = sessionAccessToken
    ? `${String((session?.user as { id?: string | number } | undefined)?.id ?? "unknown")}:${sessionAccessToken}`
    : undefined

  const { data: adminMe } = useGetAdminMeQuery(adminIdentityKey, {
    skip: !sessionAccessToken,
  })
  const storefrontIds = useMemo(
    () =>
      (adminMe?.storefront_ids ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    [adminMe?.storefront_ids]
  )
  const { data: storefrontItemsData, isLoading: isStorefrontLoading } =
    useGetAdminWebPageItemsQuery(
      { type: "partner-storefront", page: 1, perPage: 100, status: "all" },
      { skip: !sessionAccessToken || storefrontIds.length === 0 }
    )
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    refetch: refetchHistory,
  } = useGetPartnerWebstoreRequestsQuery(undefined, {
    skip: !sessionAccessToken,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    pollingInterval: 5000,
  })
  const [createPaymentSession, { isLoading: isCreatingPayment }] =
    useCreatePartnerWebstorePaymentSessionMutation()
  const [verifyPaymentSession] =
    useLazyVerifyPartnerWebstorePaymentSessionQuery()
  const [submitWebstoreRequest, { isLoading: isSubmitting }] =
    useSubmitPartnerWebstoreRequestMutation()
  const [uploadPartnerReceipt] = useUploadPartnerWebstoreReceiptMutation()
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("annual")
  const [selectedBillingOption, setSelectedBillingOption] =
    useState<BillingOption>("full")
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("gcash")
  const [renewalEnabled, setRenewalEnabled] = useState(true)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [successModalData, setSuccessModalData] = useState<{
    checkoutId: string
    paymentReference: string
    paymentIntent: string
    paymentMethod: string
    customerName: string
    email: string
    plan: PlanKey
    billingOption: BillingOption
    fee: number
  } | null>(null)
  const [pendingFinalizePayload, setPendingFinalizePayload] =
    useState<SubmitWebstoreRequestPayload | null>(null)
  const [reuploadSource, setReuploadSource] = useState<
    "success" | "rejection" | null
  >(null)
  const [reuploadFiles, setReuploadFiles] = useState<
    Array<{ name: string; preview: string; file: File; isRejected?: boolean }>
  >([])
  const [isReuploadingReceipt, setIsReuploadingReceipt] = useState(false)
  const [isReuploadModalOpen, setIsReuploadModalOpen] = useState(false)
  const [isDraggingReupload, setIsDraggingReupload] = useState(false)
  const reuploadInputRef = useRef<HTMLInputElement>(null)
  const hydratedStorefrontKeyRef = useRef<string | null>(null)
  const finalizingCheckoutRef = useRef<string | null>(null)
  const submittingFinalizeRef = useRef(false)

  const storefrontEntries = useMemo(() => {
    const entries = (storefrontItemsData?.items ?? [])
      .map((item) => ({
        item,
        config: getPartnerStorefrontConfig(item),
      }))
      .filter(
        (
          entry
        ): entry is {
          item: NonNullable<typeof storefrontItemsData>["items"][number]
          config: NonNullable<ReturnType<typeof getPartnerStorefrontConfig>>
        } => Boolean(entry.config)
      )

    return entries.filter((entry) => storefrontIds.includes(entry.item.id))
  }, [storefrontIds, storefrontItemsData?.items])

  const selectedStorefrontQuery = String(searchParams.get("storefront") ?? "")
    .trim()
    .toLowerCase()
  const selectedStorefrontEntry = useMemo(() => {
    if (storefrontEntries.length === 0) return null
    if (!selectedStorefrontQuery) return storefrontEntries[0]
    return (
      storefrontEntries.find(
        (entry) =>
          entry.config.slug === selectedStorefrontQuery ||
          String(entry.item.id) === selectedStorefrontQuery ||
          String(entry.item.key ?? "")
            .trim()
            .toLowerCase() === selectedStorefrontQuery
      ) ?? storefrontEntries[0]
    )
  }, [selectedStorefrontQuery, storefrontEntries])

  const selectedStorefrontKey = selectedStorefrontEntry
    ? `${selectedStorefrontEntry.config.slug}:${selectedStorefrontEntry.item.id}`
    : ""
  const selectedStorefrontName =
    selectedStorefrontEntry?.config.displayName ?? "Partner storefront"
  const selectedStorefrontSlug = selectedStorefrontEntry?.config.slug ?? ""
  const adminUsername = String(adminMe?.username ?? "")
    .trim()
    .toLowerCase()
  const canAccessTestRenewal =
    selectedStorefrontSlug === "test" || adminUsername === "afuser"
  const visiblePlanOptions = useMemo(
    () =>
      canAccessTestRenewal
        ? planOptions
        : planOptions.filter((plan) => plan.key !== "test"),
    [canAccessTestRenewal]
  )

  const selectedStorefrontRequests = useMemo(() => {
    const requests = historyData?.requests ?? []
    if (!selectedStorefrontEntry) return requests
    const slug = selectedStorefrontEntry.config.slug.trim().toLowerCase()
    const display = selectedStorefrontEntry.config.displayName
      .trim()
      .toLowerCase()
    return requests
      .filter((request) => {
        const requestSlug = String(request.slug_name ?? "")
          .trim()
          .toLowerCase()
        const requestDisplay = String(request.display_name ?? "")
          .trim()
          .toLowerCase()
        return (
          (slug && requestSlug === slug) ||
          (display && requestDisplay === display)
        )
      })
      .sort((a, b) => getRequestTimestamp(b) - getRequestTimestamp(a))
  }, [historyData?.requests, selectedStorefrontEntry])

  const latestApprovedRequest = useMemo(() => {
    return (
      selectedStorefrontRequests.find(
        (request) => request.status === "approved"
      ) ?? null
    )
  }, [selectedStorefrontRequests])

  const totalReceiptCount = useMemo(
    () =>
      selectedStorefrontRequests.reduce(
        (sum, req) => sum + (req.receipt_items?.length ?? 0),
        0
      ),
    [selectedStorefrontRequests]
  )

  const latestReceiptItem = useMemo(() => {
    const items = latestApprovedRequest?.receipt_items ?? []
    if (items.length === 0) return null
    return (
      [...items].sort((a, b) => {
        const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
        const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
        return bTime - aTime
      })[0] ?? null
    )
  }, [latestApprovedRequest?.receipt_items])

  const isLatestReceiptRejected =
    latestReceiptItem?.approval_status === "rejected"

  const isExpired = Boolean(
    latestApprovedRequest && isWebstoreRequestExpired(latestApprovedRequest)
  )
  const expiryDate = useMemo(() => {
    if (!latestApprovedRequest) return null
    return computeEndDateRaw(
      latestApprovedRequest.approved_at,
      latestApprovedRequest.billing_option,
      latestApprovedRequest.plan,
      latestApprovedRequest.plan_term,
      latestApprovedRequest.status,
      latestApprovedRequest.receipt_items?.map((item) => ({
        type: item.type ?? null,
        approvalStatus: item.approval_status ?? null,
        approvedAt: item.approved_at ?? null,
      })) ?? null,
      latestApprovedRequest.plan_term_months
    )
  }, [latestApprovedRequest])

  useEffect(() => {
    if (canAccessTestRenewal) return
    if (selectedPlan === "test") {
      setSelectedPlan("quarterly")
    }
  }, [canAccessTestRenewal, selectedPlan])

  const selectedPlanData =
    visiblePlanOptions.find((plan) => plan.key === selectedPlan) ??
    visiblePlanOptions[0]
  const currentStorefrontPlan =
    latestApprovedRequest?.plan === "quarterly"
      ? "quarterly"
      : latestApprovedRequest?.plan === "semi_annual"
        ? "semiAnnual"
        : latestApprovedRequest?.plan === "annual"
          ? "annual"
          : latestApprovedRequest?.plan === "test"
            ? "test"
            : null

  useEffect(() => {
    if (
      !selectedStorefrontKey ||
      hydratedStorefrontKeyRef.current === selectedStorefrontKey
    )
      return
    hydratedStorefrontKeyRef.current = selectedStorefrontKey

    const readDraft = () => {
      if (typeof window === "undefined") return null
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) return null
      try {
        const parsed = JSON.parse(raw) as {
          storefrontKey?: string
          selectedPlan?: PlanKey
          selectedBillingOption?: BillingOption
          selectedPaymentMethod?: PaymentMethod
          renewalEnabled?: boolean
        }
        return parsed
      } catch {
        return null
      }
    }

    const draft = readDraft()
    if (draft?.storefrontKey === selectedStorefrontKey) {
      if (draft.selectedPlan) setSelectedPlan(draft.selectedPlan)
      if (draft.selectedBillingOption)
        setSelectedBillingOption(draft.selectedBillingOption)
      if (draft.selectedPaymentMethod)
        setSelectedPaymentMethod(draft.selectedPaymentMethod)
      if (typeof draft.renewalEnabled === "boolean")
        setRenewalEnabled(draft.renewalEnabled)
      return
    }

    if (currentStorefrontPlan) setSelectedPlan(currentStorefrontPlan)
    setSelectedBillingOption(
      latestApprovedRequest?.billing_option === "monthly" ? "monthly" : "full"
    )
    setSelectedPaymentMethod(
      (latestApprovedRequest?.payment_method as PaymentMethod | undefined) ??
        "gcash"
    )
    setRenewalEnabled(isExpired || !latestApprovedRequest)
  }, [
    currentStorefrontPlan,
    isExpired,
    latestApprovedRequest?.billing_option,
    latestApprovedRequest?.payment_method,
    selectedStorefrontKey,
  ])

  useEffect(() => {
    const paymentStatus = String(
      searchParams.get("webstore_payment") ?? ""
    ).toLowerCase()
    const checkoutIdFromUrl = String(
      searchParams.get("checkout_id") ?? ""
    ).trim()
    const checkoutIdFromStorage =
      typeof window !== "undefined"
        ? (window.localStorage.getItem(LAST_CHECKOUT_KEY) ?? "")
        : ""
    const checkoutId = checkoutIdFromUrl || checkoutIdFromStorage
    if (paymentStatus !== "success" || !checkoutId) return
    if (!selectedStorefrontSlug) return
    if (finalizingCheckoutRef.current === checkoutId) return
    finalizingCheckoutRef.current = checkoutId

    const finalize = async () => {
      try {
        let draft: RenewalDraftPayload | null = null
        try {
          const raw =
            typeof window !== "undefined"
              ? window.localStorage.getItem(DRAFT_STORAGE_KEY)
              : null
          draft = raw ? (JSON.parse(raw) as RenewalDraftPayload) : null
        } catch {
          draft = null
        }

        const effectiveRenewalEnabled =
          typeof draft?.renewalEnabled === "boolean"
            ? draft.renewalEnabled
            : renewalEnabled

        const paymentMode = (() => {
          const raw = String(
            searchParams.get("payment_mode") ?? ""
          ).toLowerCase()
          return raw === "test" || raw === "live"
            ? (raw as PaymentMode)
            : resolvePaymentMode()
        })()

        let verified = await verifyPaymentSession({
          checkoutId,
          paymentMode,
        }).unwrap()
        if (!verified?.payment_reference && paymentMode) {
          verified = await verifyPaymentSession({ checkoutId }).unwrap()
        }

        if (!verified.is_paid) {
          throw new Error(
            "Payment has not been completed. Please complete the payment before proceeding."
          )
        }

        const validPlanKeys: PlanKey[] = ["test", "quarterly", "semiAnnual", "annual"]
        const verifiedPlanRaw = String(verified.plan ?? "").trim()
        const verifiedPlanKey = verifiedPlanRaw === "semi_annual" ? "semiAnnual" : verifiedPlanRaw
        const effectivePlan: PlanKey =
          validPlanKeys.includes(verifiedPlanKey as PlanKey)
            ? (verifiedPlanKey as PlanKey)
            : (draft?.selectedPlan ?? selectedPlan)

        const verifiedBilling = String(verified.billing_option ?? "").trim()
        const effectiveBillingOption: BillingOption =
          verifiedBilling === "full" || verifiedBilling === "monthly"
            ? (verifiedBilling as BillingOption)
            : (draft?.selectedBillingOption ?? selectedBillingOption)

        const verifiedMethod = String(verified.payment_method ?? "").trim()
        const effectivePaymentMethod: PaymentMethod =
          ["gcash", "grab_pay", "maya", "card"].includes(verifiedMethod)
            ? (verifiedMethod as PaymentMethod)
            : (draft?.selectedPaymentMethod ?? selectedPaymentMethod)

        const proofUrl = String(verified?.proof_url ?? "").trim()
        if (!proofUrl) {
          throw new Error(
            "Payment was verified, but no proof URL was returned for submission."
          )
        }

        const payload: SubmitWebstoreRequestPayload = {
          full_name:
            String(adminMe?.name ?? "").trim() || selectedStorefrontName,
          username:
            String(adminMe?.username ?? "").trim() || selectedStorefrontSlug,
          email: String(adminMe?.email ?? "").trim() || "",
          slug_name: selectedStorefrontSlug,
          display_name: selectedStorefrontName,
          plan: planMap[effectivePlan],
          billing_option: effectiveBillingOption,
          payment_method: effectivePaymentMethod,
          receipt_urls: [proofUrl],
          checkout_id: verified.checkout_id ?? checkoutId,
          payment_reference:
            verified.payment_reference ||
            verified.payment_intent_id ||
            verified.checkout_id ||
            checkoutId,
          payment_intent_id: verified.payment_intent_id || null,
          accepted_terms: true,
          renewal_enabled: effectiveRenewalEnabled,
        }

        if (typeof window !== "undefined") {
          window.localStorage.removeItem(LAST_CHECKOUT_KEY)
        }
        setPendingFinalizePayload(payload)
        const planOpt = planOptions.find((p) => p.key === effectivePlan)
        setSuccessModalData({
          checkoutId: verified.checkout_id ?? checkoutId,
          paymentReference:
            verified.payment_reference ||
            verified.payment_intent_id ||
            checkoutId,
          paymentIntent: verified.payment_intent_id || "-",
          paymentMethod: effectivePaymentMethod,
          customerName:
            String(adminMe?.name ?? "").trim() || selectedStorefrontName,
          email: String(adminMe?.email ?? "").trim() || "",
          plan: effectivePlan,
          billingOption: effectiveBillingOption,
          fee:
            effectiveBillingOption === "full"
              ? (planOpt?.full ?? 0)
              : (planOpt?.monthly ?? 0),
        })
      } catch (error) {
        const apiErr = error as {
          data?: { message?: string }
          message?: string
        }
        const text =
          apiErr?.data?.message ||
          apiErr?.message ||
          "Failed to finalize the renewal payment."
        setMessage({ type: "error", text })
        showErrorToast(text)
      }
    }

    void finalize()
  }, [
    adminMe?.email,
    adminMe?.name,
    adminMe?.username,
    renewalEnabled,
    router,
    searchParams,
    selectedPaymentMethod,
    selectedPlan,
    selectedStorefrontName,
    selectedStorefrontSlug,
    selectedBillingOption,
    verifyPaymentSession,
  ])

  useEffect(() => {
    if (typeof window === "undefined" || !selectedStorefrontKey) return
    const payload = {
      storefrontKey: selectedStorefrontKey,
      selectedPlan,
      selectedBillingOption,
      selectedPaymentMethod,
      renewalEnabled,
    }
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
  }, [
    renewalEnabled,
    selectedBillingOption,
    selectedPaymentMethod,
    selectedPlan,
    selectedStorefrontKey,
  ])

  const paymentMode = resolvePaymentMode()
  const isLoading = isStorefrontLoading || isHistoryLoading
  const statusLabel = latestApprovedRequest
    ? isExpired
      ? "Expired"
      : "Active"
    : "No history yet"

  const handleStartPayment = async () => {
    if (!selectedStorefrontEntry) {
      setMessage({ type: "error", text: "Choose a storefront first." })
      return
    }
    if (!selectedPlan || !selectedBillingOption || !selectedPaymentMethod) {
      setMessage({
        type: "error",
        text: "Please complete the plan, billing, and payment method first.",
      })
      return
    }

    try {
      setMessage(null)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            storefrontKey: selectedStorefrontKey,
            selectedPlan,
            selectedBillingOption,
            selectedPaymentMethod,
            renewalEnabled,
          })
        )
      }

      const checkout = await createPaymentSession({
        plan: planMap[selectedPlan],
        billing_option: selectedBillingOption,
        payment_method: selectedPaymentMethod,
        payment_mode: paymentMode,
        slug_name: selectedStorefrontSlug || undefined,
      }).unwrap()

      if (!checkout.checkout_url) {
        throw new Error("Failed to create a checkout session.")
      }

      if (checkout.checkout_id && typeof window !== "undefined") {
        window.localStorage.setItem(LAST_CHECKOUT_KEY, checkout.checkout_id)
      }

      window.location.href = checkout.checkout_url
    } catch (error) {
      const apiErr = error as { data?: { message?: string }; message?: string }
      const text =
        apiErr?.data?.message ||
        apiErr?.message ||
        "Failed to start renewal payment."
      setMessage({ type: "error", text })
      showErrorToast(text)
    }
  }

  const openReuploadModalWithPrefill = async () => {
    setReuploadSource("rejection")
    const urls = (latestReceiptItem?.receipt_urls ?? []).filter(
      (u): u is string => Boolean(u)
    )
    if (urls.length > 0) {
      try {
        const loaded = await Promise.all(
          urls.map(async (url) => {
            const res = await fetch(url)
            const blob = await res.blob()
            const fileName = decodeURIComponent(
              url.split("/").pop()?.split("?")[0] ?? "receipt.jpg"
            )
            const file = new File([blob], fileName, {
              type: blob.type || "image/jpeg",
            })
            return {
              name: fileName,
              preview: URL.createObjectURL(file),
              file,
              isRejected: true,
            }
          })
        )
        setReuploadFiles(loaded)
      } catch {
        setReuploadFiles([])
      }
    } else {
      setReuploadFiles([])
    }
    setIsReuploadModalOpen(true)
  }

  const handleReuploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    )
    setReuploadFiles(
      files.map((f) => ({
        name: f.name,
        preview: URL.createObjectURL(f),
        file: f,
      }))
    )
    if (reuploadInputRef.current) reuploadInputRef.current.value = ""
  }

  const submitPendingFinalizePayload = async (
    overrideReceiptUrls?: string[]
  ) => {
    if (!pendingFinalizePayload || submittingFinalizeRef.current) return
    submittingFinalizeRef.current = true
    const payload = overrideReceiptUrls
      ? { ...pendingFinalizePayload, receipt_urls: overrideReceiptUrls }
      : pendingFinalizePayload
    try {
      await submitWebstoreRequest(payload).unwrap()
    } catch {
      /* silent fallback */
    }
    submittingFinalizeRef.current = false
    setPendingFinalizePayload(null)
    await refetchHistory()
  }

  const closeReuploadModal = async () => {
    if (reuploadSource === "success" && pendingFinalizePayload) {
      await submitPendingFinalizePayload()
    }
    setIsReuploadModalOpen(false)
    setReuploadFiles([])
    setIsDraggingReupload(false)
    setReuploadSource(null)
  }

  const handleSubmitReupload = async () => {
    if (reuploadFiles.length === 0) return
    setIsReuploadingReceipt(true)
    setMessage(null)
    try {
      const uploadedUrls: string[] = []
      for (const receipt of reuploadFiles) {
        const formData = new FormData()
        formData.append("file", receipt.file)
        const res = await uploadPartnerReceipt(formData).unwrap()
        if (res?.url) uploadedUrls.push(res.url)
      }
      if (uploadedUrls.length === 0)
        throw new Error("No receipt images were uploaded successfully.")

      if (reuploadSource === "success" && pendingFinalizePayload) {
        // Use only the uploaded PNG URLs — the proofUrl is a PayMongo HTML page, not an image
        await submitPendingFinalizePayload(uploadedUrls.slice(0, 5))
        setReuploadFiles([])
        setIsReuploadModalOpen(false)
        setReuploadSource(null)
        showSuccessToast("Receipt submitted successfully.")
        router.replace(
          `/partner/webpages/renewal${selectedStorefrontSlug ? `?storefront=${encodeURIComponent(selectedStorefrontSlug)}` : ""}`
        )
        return
      }

      // Rejection flow
      const targetRequest =
        latestApprovedRequest ??
        selectedStorefrontRequests.find((r) => r.status === "pending_review") ??
        null
      if (!targetRequest) throw new Error("No active subscription found.")
      const paymentRef =
        targetRequest.payment_reference ||
        targetRequest.checkout_id ||
        `WEB-${Date.now()}`
      await submitWebstoreRequest({
        full_name: String(adminMe?.name ?? "").trim() || selectedStorefrontName,
        username:
          String(adminMe?.username ?? "").trim() || selectedStorefrontSlug,
        email: String(adminMe?.email ?? "").trim() || "",
        slug_name: selectedStorefrontSlug,
        display_name: selectedStorefrontName,
        plan: (targetRequest.plan ??
          "test") as SubmitWebstoreRequestPayload["plan"],
        billing_option: (targetRequest.billing_option ?? "full") as
          | "full"
          | "monthly",
        payment_method: (targetRequest.payment_method ??
          "gcash") as PaymentMethod,
        receipt_urls: uploadedUrls,
        checkout_id: targetRequest.checkout_id ?? null,
        payment_reference: paymentRef,
        payment_intent_id: targetRequest.payment_intent_id ?? null,
        accepted_terms: true,
        renewal_enabled: renewalEnabled,
      }).unwrap()
      setReuploadFiles([])
      setIsReuploadModalOpen(false)
      setReuploadSource(null)
      await refetchHistory()
      showSuccessToast("Receipt submitted successfully.")
      router.replace(
        `/partner/webpages/renewal${selectedStorefrontSlug ? `?storefront=${encodeURIComponent(selectedStorefrontSlug)}` : ""}`
      )
    } catch (error) {
      const apiErr = error as { data?: { message?: string }; message?: string }
      const text =
        apiErr?.data?.message || apiErr?.message || "Failed to submit receipt."
      setMessage({ type: "error", text })
      showErrorToast(text)
    } finally {
      setIsReuploadingReceipt(false)
    }
  }

  const handleDownloadSuccessImage = async () => {
    if (!successModalData || typeof window === "undefined") return
    const esc = (v: string) =>
      v
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
    const planOpt = planOptions.find((p) => p.key === successModalData.plan)
    const planLabel = planOpt?.title ?? successModalData.plan
    const billingLabel =
      successModalData.billingOption === "full" ? "Full Payment" : "Monthly"
    const methodLabel =
      successModalData.paymentMethod === "gcash"
        ? "GCash"
        : successModalData.paymentMethod === "grab_pay"
          ? "GrabPay"
          : successModalData.paymentMethod === "maya"
            ? "Maya"
            : "Card"
    const fee = `PHP ${successModalData.fee.toLocaleString()}`

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <defs>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6a0"/><stop offset="100%" stop-color="#10b981"/></linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.12"/></filter>
  </defs>
  <rect width="1200" height="1500" fill="#f8fbff"/>
  <rect x="40" y="40" width="1120" height="1420" rx="34" fill="#ffffff" filter="url(#sh)"/>
  <rect x="40" y="40" width="1120" height="220" rx="34" fill="url(#hdr)"/>
  <rect x="40" y="226" width="1120" height="34" fill="#ffffff"/>
  <g transform="translate(600 122)"><circle r="46" fill="rgba(255,255,255,0.22)"/><circle r="32" fill="#ffffff" opacity="0.18"/><path d="M -16 0 L -4 12 L 20 -12" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>
  <text x="600" y="198" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="800" fill="#ffffff">Webstore Payment Success</text>
  <text x="600" y="244" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="rgba(255,255,255,0.92)">Your payment is confirmed.</text>
  <g transform="translate(76 300)">
    <rect x="0" y="0" width="1048" height="94" rx="22" fill="#f8fafc" stroke="#e5e7eb"/>
    <text x="24" y="34" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#94a3b8">CHECKOUT ID</text>
    <text x="24" y="66" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(successModalData.checkoutId)}</text>
    <rect x="516" y="0" width="532" height="94" rx="22" fill="#f8fafc" stroke="#e5e7eb"/>
    <text x="540" y="34" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#94a3b8">STATUS</text>
    <rect x="540" y="46" width="78" height="34" rx="17" fill="#d1fae5"/>
    <text x="579" y="68" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="17" font-weight="700" fill="#047857">Paid</text>
  </g>
  <g transform="translate(76 414)">
    <rect x="0" y="0" width="1048" height="94" rx="22" fill="#f8fafc" stroke="#e5e7eb"/>
    <text x="24" y="34" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#94a3b8">PAYMENT REFERENCE</text>
    <text x="24" y="66" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(successModalData.paymentReference)}</text>
  </g>
  <g transform="translate(76 528)">
    <rect x="0" y="0" width="1048" height="94" rx="22" fill="#f8fafc" stroke="#e5e7eb"/>
    <text x="24" y="34" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#94a3b8">PAYMENT INTENT</text>
    <text x="24" y="66" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(successModalData.paymentIntent)}</text>
  </g>
  <g transform="translate(76 664)">
    <rect x="0" y="0" width="334" height="96" rx="22" fill="#ffffff" stroke="#e5e7eb"/>
    <text x="24" y="33" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#94a3b8">CUSTOMER</text>
    <text x="24" y="64" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(successModalData.customerName)}</text>
  </g>
  <g transform="translate(432 664)">
    <rect x="0" y="0" width="334" height="96" rx="22" fill="#ffffff" stroke="#e5e7eb"/>
    <text x="24" y="33" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#94a3b8">EMAIL</text>
    <text x="24" y="64" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(successModalData.email)}</text>
  </g>
  <g transform="translate(788 664)">
    <rect x="0" y="0" width="336" height="96" rx="22" fill="#ffffff" stroke="#e5e7eb"/>
    <text x="24" y="33" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#94a3b8">PAYMENT METHOD</text>
    <text x="24" y="64" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(methodLabel)}</text>
  </g>
  <g transform="translate(76 780)">
    <rect x="0" y="0" width="1048" height="178" rx="22" fill="#ffffff" stroke="#e5e7eb"/>
    <text x="24" y="33" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="#94a3b8">ORDER SUMMARY</text>
    <g transform="translate(24 62)">
      <text x="0" y="0" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#94a3b8">PLAN</text>
      <text x="0" y="32" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(planLabel)}</text>
    </g>
    <g transform="translate(392 62)">
      <text x="0" y="0" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#94a3b8">BILLING</text>
      <text x="0" y="32" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(billingLabel)}</text>
    </g>
    <g transform="translate(760 62)">
      <text x="0" y="0" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#94a3b8">SUBSCRIPTION FEE</text>
      <text x="0" y="32" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(fee)}</text>
    </g>
    <g transform="translate(760 112)">
      <text x="0" y="0" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#94a3b8">TOTAL</text>
      <text x="0" y="32" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(fee)}</text>
    </g>
  </g>
  <g transform="translate(76 982)">
    <rect x="0" y="0" width="1048" height="128" rx="22" fill="#effaf3" stroke="#86efac"/>
    <text x="24" y="48" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="700" fill="#047857">This PNG is generated locally from your confirmed payment details.</text>
    <text x="24" y="82" font-family="Arial,Helvetica,sans-serif" font-size="18" fill="#064e3b">Use it as your payment confirmation snapshot.</text>
  </g>
</svg>`

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.decoding = "async"
      await new Promise<void>((res, rej) => {
        img.onload = () => res()
        img.onerror = () => rej(new Error("Unable to render receipt image."))
        img.src = svgUrl
      })
      const scale = 2
      const canvas = document.createElement("canvas")
      canvas.width = 1200 * scale
      canvas.height = 1500 * scale
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0, 1200, 1500)
      const pngUrl = canvas.toDataURL("image/png")
      const fileRef = (
        successModalData.paymentReference ||
        successModalData.checkoutId ||
        "receipt"
      ).replace(/[^a-zA-Z0-9_-]/g, "-")
      const fileName = `webstore-payment-success-${fileRef}`
      const link = document.createElement("a")
      link.href = pngUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      const imageFile = await new Promise<File | null>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(
            blob ? new File([blob], fileName, { type: "image/png" }) : null
          )
        }, "image/png")
      })
      return imageFile ?? undefined
    } finally {
      URL.revokeObjectURL(svgUrl)
    }
  }

  const title = selectedStorefrontName
  const expiryText = expiryDate
    ? expiryDate.toLocaleDateString()
    : "Not available"

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-linear-to-br from-white via-blue-50/50 to-violet-100/70 px-8 py-7 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40">
        <div className="pointer-events-none absolute top-0 right-0 h-full w-2/5">
          <div className="absolute top-3 right-16 h-14 w-14 rounded-full bg-violet-300/50 blur-sm dark:bg-violet-500/20" />
          <div className="absolute top-10 right-6 h-20 w-20 rounded-full bg-blue-300/40 blur-sm dark:bg-blue-500/15" />
          <div className="absolute right-24 bottom-3 h-8 w-8 rounded-full bg-indigo-400/40 dark:bg-indigo-500/20" />
          <div className="absolute top-6 right-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/60 bg-white/50 shadow-lg backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-900/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-md">
              <Store className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="relative max-w-[60%]">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            Partner Renewal
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Renew your storefront
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Keep your partner storefront active with a new subscription plan.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Storefront Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/10">
                  <Store className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Storefront
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    /{selectedStorefrontSlug || "select-storefront"}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isExpired ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : latestApprovedRequest ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                {latestApprovedRequest && !isExpired && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
                {statusLabel}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                  <Clock3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Current plan
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {currentStorefrontPlan
                      ? (planOptions.find(
                          (p) => p.key === currentStorefrontPlan
                        )?.title ?? "-")
                      : "None"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                  <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Expires
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {expiryText}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                  <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Payments
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {totalReceiptCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isExpired ? (
            <div className="flex gap-3 rounded-3xl border border-orange-200 bg-linear-to-r from-orange-50 to-amber-50 p-5 shadow-sm dark:border-orange-500/30 dark:from-orange-500/10 dark:to-amber-500/10">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
              <div>
                <p className="font-bold text-orange-900 dark:text-orange-100">
                  This storefront has expired
                </p>
                <p className="mt-1 text-sm text-orange-800/80 dark:text-orange-100/80">
                  Select a plan below, start payment, and we&apos;ll submit the
                  renewal once your checkout is confirmed.
                </p>
              </div>
            </div>
          ) : null}

          {isLatestReceiptRejected ? (
            <div className="flex gap-3 rounded-3xl border border-rose-200 bg-linear-to-r from-rose-50 to-pink-50 p-5 shadow-sm dark:border-rose-500/30 dark:from-rose-500/10 dark:to-pink-500/10">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-rose-900 dark:text-rose-100">
                    Payment receipt rejected
                  </p>
                  <p className="mt-1 text-sm text-rose-800/80 dark:text-rose-100/80">
                    Your latest submitted receipt was rejected. Please upload a
                    new receipt.
                    {latestReceiptItem?.submitted_at ? (
                      <span className="mt-0.5 block text-xs text-rose-600/70 dark:text-rose-300/70">
                        Submitted:{" "}
                        {new Date(
                          latestReceiptItem.submitted_at
                        ).toLocaleDateString()}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void openReuploadModalWithPrefill()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Re-upload Receipt
                </button>
              </div>
            </div>
          ) : null}

          {message ? (
            <div
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"}`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              {message.text}
            </div>
          ) : null}

          {/* Plan Selection */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold tracking-widest text-blue-600 uppercase dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Renewal plan
                </div>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  Choose your renewal term
                </h3>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                {selectedPlanData.term}
              </div>
            </div>

            <div
              className={`grid gap-3 ${visiblePlanOptions.length > 3 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-3"}`}
            >
              {visiblePlanOptions.map((plan) => {
                const active = selectedPlan === plan.key
                const style = planStyleMap[plan.key]
                const PlanIcon =
                  plan.key === "test"
                    ? Clock3
                    : plan.key === "annual"
                      ? Star
                      : Calendar
                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`relative rounded-2xl border p-4 text-left transition-all duration-150 ${active ? `${style.activeBorder} ${style.activeBg} shadow-sm` : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? style.iconBg : "bg-slate-100 dark:bg-slate-800"}`}
                      >
                        {active ? (
                          <CheckCircle2
                            className={`h-4 w-4 ${style.iconText}`}
                          />
                        ) : (
                          <PlanIcon className={`h-4 w-4 ${style.iconText}`} />
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-sm leading-tight font-bold ${active ? style.priceText : "text-slate-900 dark:text-slate-100"}`}
                        >
                          {plan.title}
                        </p>
                        <p
                          className={`text-xs ${active ? style.iconText : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {plan.term}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {plan.description}
                    </p>

                    <div className="mt-3 space-y-1">
                      <p
                        className={`text-xs font-semibold ${active ? style.priceText : "text-slate-700 dark:text-slate-300"}`}
                      >
                        <span className="font-normal text-slate-400 dark:text-slate-500">
                          Full{" "}
                        </span>
                        PHP {plan.full.toLocaleString()}
                      </p>
                      <p
                        className={`text-xs font-semibold ${active ? style.priceText : "text-slate-700 dark:text-slate-300"}`}
                      >
                        <span className="font-normal text-slate-400 dark:text-slate-500">
                          Monthly{" "}
                        </span>
                        PHP {plan.monthly.toLocaleString()}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="space-y-5">
          {/* Selected Storefront Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/10">
                <Store className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Selected storefront
                </p>
                <p className="truncate font-bold text-slate-900 dark:text-white">
                  {selectedStorefrontName}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
                <Store className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="flex-1 text-sm text-slate-500 dark:text-slate-400">
                  Slug
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  /{selectedStorefrontSlug || "-"}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
                <Users className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="flex-1 text-sm text-slate-500 dark:text-slate-400">
                  Assigned users
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {storefrontIds.length}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
                <FileText className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="flex-1 text-sm text-slate-500 dark:text-slate-400">
                  Payment receipts
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {totalReceiptCount}
                </span>
              </div>
            </div>
          </div>

          {/* Billing Details Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Payment
                </p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Billing details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRenewalEnabled((current) => !current)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${renewalEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"}`}
              >
                <RotateCcw className="h-3 w-3" />
                Renewal {renewalEnabled ? "On" : "Off"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 items-end gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Billing option
                </p>
                <div className="flex gap-1.5">
                  {(["full", "monthly"] as BillingOption[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedBillingOption(option)}
                      className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-all ${selectedBillingOption === option ? "border-blue-500 bg-blue-500 text-white shadow-sm dark:border-blue-600 dark:bg-blue-600" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"}`}
                    >
                      {option === "full" ? "Full payment" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Payment method
                </p>
                <div className="relative">
                  <select
                    value={selectedPaymentMethod}
                    onChange={(event) =>
                      setSelectedPaymentMethod(
                        event.target.value as PaymentMethod
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-8 pl-3 text-xs font-semibold text-slate-800 transition outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Plan</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedPlanData.title}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Amount
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  PHP{" "}
                  {(selectedBillingOption === "monthly"
                    ? selectedPlanData.monthly
                    : selectedPlanData.full
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Renewal
                </span>
                <span
                  className={`font-semibold ${renewalEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {renewalEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleStartPayment()}
              disabled={
                isCreatingPayment ||
                isSubmitting ||
                !selectedStorefrontEntry ||
                !renewalEnabled
              }
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm shadow-indigo-200/60 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none"
            >
              {isCreatingPayment || isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Start renewal payment
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading renewal details...
              </p>
            </div>
          ) : null}

          {isHistoryFetching ? (
            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Refreshing request history...
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Payment Success Modal */}
      {successModalData ? (
        <div className="fixed inset-0 z-230 flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-linear-to-r from-teal-500 to-emerald-500 px-6 py-5 text-center text-white">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black tracking-tight">
                Webstore Payment Success
              </h3>
              <p className="mt-1 text-xs text-white/90">
                Your payment is confirmed and renewal request has been
                submitted.
              </p>
            </div>

            {/* Body */}
            <div className="space-y-2.5 px-6 py-5">
              {/* Row 1: Checkout ID + Status */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Checkout ID
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {successModalData.checkoutId}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Status
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    Paid
                  </span>
                </div>
              </div>
              {/* Row 2: Payment Reference + Payment Intent */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Payment Reference
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {successModalData.paymentReference}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Payment Intent
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {successModalData.paymentIntent}
                  </p>
                </div>
              </div>
              {/* Row 3: Customer + Email */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Customer
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {successModalData.customerName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Email
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {successModalData.email}
                  </p>
                </div>
              </div>
              {/* Row 4: Method + Plan + Billing + Amount */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Method
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                    {successModalData.paymentMethod === "gcash"
                      ? "GCash"
                      : successModalData.paymentMethod === "grab_pay"
                        ? "GrabPay"
                        : successModalData.paymentMethod === "maya"
                          ? "Maya"
                          : "Card"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Plan
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                    {planOptions.find((p) => p.key === successModalData.plan)
                      ?.title ?? successModalData.plan}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Billing
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                    {successModalData.billingOption === "full"
                      ? "Full"
                      : "Monthly"}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <p className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                    Amount
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    PHP {successModalData.fee.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setReuploadSource("success")
                  setReuploadFiles([])
                  setSuccessModalData(null)
                  setIsReuploadModalOpen(true)
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Skip Download
              </button>
              <button
                type="button"
                onClick={async () => {
                  let imageFile: File | undefined
                  try {
                    imageFile =
                      (await handleDownloadSuccessImage()) ?? undefined
                  } catch {
                    // download failed — still open re-upload modal so user can submit manually
                  }
                  setReuploadSource("success")
                  if (imageFile) {
                    setReuploadFiles([
                      {
                        name: imageFile.name,
                        preview: URL.createObjectURL(imageFile),
                        file: imageFile,
                      },
                    ])
                  } else {
                    setReuploadFiles([])
                  }
                  setSuccessModalData(null)
                  setIsReuploadModalOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Upload className="h-4 w-4" />
                Download as Image
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Re-upload Receipt Modal */}
      {isReuploadModalOpen ? (
        <div
          className="fixed inset-0 z-230 flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm"
          onClick={() => {
            if (!isReuploadingReceipt) {
              void closeReuploadModal()
            }
          }}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[30px] border border-sky-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              disabled={isReuploadingReceipt}
              onClick={() => {
                void closeReuploadModal()
              }}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Header */}
            <div className="bg-linear-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-7 text-center text-white">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                <Upload className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">
                Upload Payment Receipt
              </h3>
              <p className="mt-1.5 text-sm text-white/90">
                Upload your new receipt image to re-submit for review.
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <input
                ref={reuploadInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleReuploadFileChange}
              />

              {/* Drop zone */}
              <div
                onDragEnter={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingReupload(true)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingReupload(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingReupload(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDraggingReupload(false)
                  const files = Array.from(e.dataTransfer.files ?? []).filter(
                    (f) =>
                      f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
                  )
                  setReuploadFiles((prev) => [
                    ...prev,
                    ...files.map((f) => ({
                      name: f.name,
                      preview: URL.createObjectURL(f),
                      file: f,
                    })),
                  ])
                }}
                className={`rounded-2xl border-2 border-dashed transition ${isDraggingReupload ? "border-sky-400 bg-sky-50 dark:bg-sky-500/10" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40"}`}
              >
                {reuploadFiles.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => reuploadInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center p-6 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  >
                    <Upload className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Click or drag images here
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      PNG, JPG, WEBP up to 10MB
                    </p>
                  </button>
                ) : (
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {reuploadFiles.map((f, idx) => (
                        <div
                          key={idx}
                          className={`relative shrink-0 ${f.isRejected ? "rounded-[14px] bg-linear-to-br from-rose-400 to-pink-500 p-0.5 shadow-lg shadow-rose-200/70" : ""}`}
                        >
                          <img
                            src={f.preview}
                            alt={f.name}
                            className={`block h-24 w-24 rounded-xl object-cover ${f.isRejected ? "" : "border border-slate-200 dark:border-slate-600"}`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setReuploadFiles((prev) => {
                                const removed = prev[idx]
                                if (removed?.preview?.startsWith("blob:"))
                                  URL.revokeObjectURL(removed.preview)
                                return prev.filter((_, i) => i !== idx)
                              })
                            }
                            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => reuploadInputRef.current?.click()}
                        className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-sky-400 hover:text-sky-500 dark:border-slate-600 dark:bg-slate-800"
                      >
                        <Upload className="h-5 w-5" />
                        <span className="mt-1 text-[10px] font-semibold">
                          Add more
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  void closeReuploadModal()
                }}
                disabled={isReuploadingReceipt}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitReupload()}
                disabled={isReuploadingReceipt || reuploadFiles.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReuploadingReceipt ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isReuploadingReceipt ? "Submitting…" : "Submit Receipt"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
