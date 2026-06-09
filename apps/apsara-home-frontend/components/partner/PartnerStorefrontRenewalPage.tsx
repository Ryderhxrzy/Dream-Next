'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AlertTriangle, Calendar, CheckCircle2, ChevronDown, Clock3, FileText, Loader2, Lock, RotateCcw, ShieldCheck, Star, Store, Users } from 'lucide-react'
import { useGetAdminMeQuery } from '@/store/api/authApi'
import { useGetAdminWebPageItemsQuery } from '@/store/api/webPagesApi'
import { useGetPartnerWebstoreRequestsQuery } from '@/store/api/adminInquiriesApi'
import {
  useCreateWebstorePaymentSessionMutation,
  useLazyVerifyWebstorePaymentSessionQuery,
  useSubmitWebstoreRequestMutation,
  type SubmitWebstoreRequestPayload,
  type WebstoreRequest,
} from '@/store/api/userApi'
import { getPartnerStorefrontConfig } from '@/libs/partnerStorefront'
import { computeEndDateRaw, isWebstoreRequestExpired } from '@/libs/webstoreExpiry'
import { showErrorToast, showSuccessToast } from '@/libs/toast'

type PlanKey = 'test' | 'quarterly' | 'semiAnnual' | 'annual'
type BillingOption = 'full' | 'monthly'
type PaymentMethod = 'gcash' | 'grab_pay' | 'maya' | 'card'
type PaymentMode = 'test' | 'live'

const LOCAL_PAYMENT_MODE_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const DRAFT_STORAGE_KEY = 'afhome:partner-renewal-draft:v1'
const LAST_CHECKOUT_KEY = 'afhome:partner-renewal-last-checkout:v1'

const planMap: Record<PlanKey, SubmitWebstoreRequestPayload['plan']> = {
  test: 'test',
  quarterly: 'quarterly',
  semiAnnual: 'semi_annual',
  annual: 'annual',
}

const planOptions: Array<{
  key: PlanKey
  title: string
  term: string
  full: number
  monthly: number
  description: string
}> = [
  { key: 'test', title: 'Test', term: '2 days', full: 1, monthly: 1, description: 'Quick renewal check for testing.' },
  { key: 'quarterly', title: 'Quarterly', term: '3 months', full: 48000, monthly: 16000, description: 'Good for short-term relaunches.' },
  { key: 'semiAnnual', title: 'Semi-Annual', term: '6 months', full: 90000, monthly: 15000, description: 'Balanced mid-term renewal.' },
  { key: 'annual', title: 'Annual', term: '1 year', full: 150000, monthly: 12500, description: 'Best value for long-term storefronts.' },
]

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'gcash', label: 'Gcash' },
  { value: 'grab_pay', label: 'GrabPay' },
  { value: 'maya', label: 'Maya' },
  { value: 'card', label: 'Card' },
]

const planStyleMap: Record<PlanKey, { iconBg: string; iconText: string; activeBorder: string; activeBg: string; priceText: string }> = {
  test: {
    iconBg: 'bg-violet-100 dark:bg-violet-500/20',
    iconText: 'text-violet-600 dark:text-violet-400',
    activeBorder: 'border-violet-400 dark:border-violet-400/70',
    activeBg: 'bg-violet-50/80 dark:bg-violet-500/5',
    priceText: 'text-violet-700 dark:text-violet-300',
  },
  quarterly: {
    iconBg: 'bg-blue-100 dark:bg-blue-500/20',
    iconText: 'text-blue-600 dark:text-blue-400',
    activeBorder: 'border-blue-400 dark:border-blue-400/70',
    activeBg: 'bg-blue-50/80 dark:bg-blue-500/5',
    priceText: 'text-blue-700 dark:text-blue-300',
  },
  semiAnnual: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    activeBorder: 'border-emerald-400 dark:border-emerald-400/70',
    activeBg: 'bg-emerald-50/80 dark:bg-emerald-500/5',
    priceText: 'text-emerald-700 dark:text-emerald-300',
  },
  annual: {
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    iconText: 'text-amber-600 dark:text-amber-400',
    activeBorder: 'border-amber-400 dark:border-amber-400/70',
    activeBg: 'bg-amber-50/80 dark:bg-amber-500/5',
    priceText: 'text-amber-700 dark:text-amber-300',
  },
}

const resolvePaymentMode = (): PaymentMode => {
  if (typeof window === 'undefined') return 'live'
  const host = window.location.hostname.trim().toLowerCase()
  return LOCAL_PAYMENT_MODE_HOSTS.has(host) || host.endsWith('.local') ? 'test' : 'live'
}

const getRequestTimestamp = (request?: WebstoreRequest | null) => {
  if (!request) return 0
  const raw = request.reviewed_at || request.created_at || request.approved_at || ''
  const value = new Date(raw).getTime()
  return Number.isFinite(value) ? value : 0
}

export default function PartnerStorefrontRenewalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const sessionAccessToken = String((session?.user as { accessToken?: string } | undefined)?.accessToken ?? '')
  const adminIdentityKey = sessionAccessToken
    ? `${String((session?.user as { id?: string | number } | undefined)?.id ?? 'unknown')}:${sessionAccessToken}`
    : undefined

  const { data: adminMe } = useGetAdminMeQuery(adminIdentityKey, { skip: !sessionAccessToken })
  const storefrontIds = useMemo(() => (adminMe?.storefront_ids ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0), [adminMe?.storefront_ids])
  const { data: storefrontItemsData, isLoading: isStorefrontLoading } = useGetAdminWebPageItemsQuery(
    { type: 'partner-storefront', page: 1, perPage: 100, status: 'all' },
    { skip: !sessionAccessToken || storefrontIds.length === 0 },
  )
  const { data: historyData, isLoading: isHistoryLoading, isFetching: isHistoryFetching, refetch: refetchHistory } = useGetPartnerWebstoreRequestsQuery(undefined, {
    skip: !sessionAccessToken,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  const [createPaymentSession, { isLoading: isCreatingPayment }] = useCreateWebstorePaymentSessionMutation()
  const [verifyPaymentSession] = useLazyVerifyWebstorePaymentSessionQuery()
  const [submitWebstoreRequest, { isLoading: isSubmitting }] = useSubmitWebstoreRequestMutation()

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('annual')
  const [selectedBillingOption, setSelectedBillingOption] = useState<BillingOption>('full')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('gcash')
  const [renewalEnabled, setRenewalEnabled] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const hydratedStorefrontKeyRef = useRef<string | null>(null)
  const finalizingCheckoutRef = useRef<string | null>(null)

  const storefrontEntries = useMemo(() => {
    const entries = (storefrontItemsData?.items ?? [])
      .map((item) => ({
        item,
        config: getPartnerStorefrontConfig(item),
      }))
      .filter((entry): entry is { item: NonNullable<typeof storefrontItemsData>['items'][number]; config: NonNullable<ReturnType<typeof getPartnerStorefrontConfig>> } => Boolean(entry.config))

    return entries.filter((entry) => storefrontIds.includes(entry.item.id))
  }, [storefrontIds, storefrontItemsData?.items])

  const selectedStorefrontQuery = String(searchParams.get('storefront') ?? '').trim().toLowerCase()
  const selectedStorefrontEntry = useMemo(() => {
    if (storefrontEntries.length === 0) return null
    if (!selectedStorefrontQuery) return storefrontEntries[0]
    return storefrontEntries.find((entry) =>
      entry.config.slug === selectedStorefrontQuery ||
      String(entry.item.id) === selectedStorefrontQuery ||
      String(entry.item.key ?? '').trim().toLowerCase() === selectedStorefrontQuery,
    ) ?? storefrontEntries[0]
  }, [selectedStorefrontQuery, storefrontEntries])

  const selectedStorefrontKey = selectedStorefrontEntry ? `${selectedStorefrontEntry.config.slug}:${selectedStorefrontEntry.item.id}` : ''
  const selectedStorefrontName = selectedStorefrontEntry?.config.displayName ?? 'Partner storefront'
  const selectedStorefrontSlug = selectedStorefrontEntry?.config.slug ?? ''
  const adminUsername = String(adminMe?.username ?? '').trim().toLowerCase()
  const canAccessTestRenewal = selectedStorefrontSlug === 'test' || adminUsername === 'afuser'
  const visiblePlanOptions = useMemo(
    () => (canAccessTestRenewal ? planOptions : planOptions.filter((plan) => plan.key !== 'test')),
    [canAccessTestRenewal],
  )

  const selectedStorefrontRequests = useMemo(() => {
    const requests = historyData?.requests ?? []
    if (!selectedStorefrontEntry) return requests
    const slug = selectedStorefrontEntry.config.slug.trim().toLowerCase()
    const display = selectedStorefrontEntry.config.displayName.trim().toLowerCase()
    return requests
      .filter((request) => {
        const requestSlug = String(request.slug_name ?? '').trim().toLowerCase()
        const requestDisplay = String(request.display_name ?? '').trim().toLowerCase()
        return (slug && requestSlug === slug) || (display && requestDisplay === display)
      })
      .sort((a, b) => getRequestTimestamp(b) - getRequestTimestamp(a))
  }, [historyData?.requests, selectedStorefrontEntry])

  const latestApprovedRequest = useMemo(() => {
    return selectedStorefrontRequests.find((request) => request.status === 'approved') ?? null
  }, [selectedStorefrontRequests])

  const isExpired = Boolean(latestApprovedRequest && isWebstoreRequestExpired(latestApprovedRequest))
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
      latestApprovedRequest.plan_term_months,
    )
  }, [latestApprovedRequest])

  useEffect(() => {
    if (canAccessTestRenewal) return
    if (selectedPlan === 'test') {
      setSelectedPlan('quarterly')
    }
  }, [canAccessTestRenewal, selectedPlan])

  const selectedPlanData = visiblePlanOptions.find((plan) => plan.key === selectedPlan) ?? visiblePlanOptions[0]
  const currentStorefrontPlan = latestApprovedRequest?.plan === 'quarterly'
    ? 'quarterly'
    : latestApprovedRequest?.plan === 'semi_annual'
      ? 'semiAnnual'
      : latestApprovedRequest?.plan === 'annual'
        ? 'annual'
        : latestApprovedRequest?.plan === 'test'
          ? 'test'
          : null

  useEffect(() => {
    if (!selectedStorefrontKey || hydratedStorefrontKeyRef.current === selectedStorefrontKey) return
    hydratedStorefrontKeyRef.current = selectedStorefrontKey

    const readDraft = () => {
      if (typeof window === 'undefined') return null
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
      if (draft.selectedBillingOption) setSelectedBillingOption(draft.selectedBillingOption)
      if (draft.selectedPaymentMethod) setSelectedPaymentMethod(draft.selectedPaymentMethod)
      if (typeof draft.renewalEnabled === 'boolean') setRenewalEnabled(draft.renewalEnabled)
      return
    }

    if (currentStorefrontPlan) setSelectedPlan(currentStorefrontPlan)
    setSelectedBillingOption(latestApprovedRequest?.billing_option === 'monthly' ? 'monthly' : 'full')
    setSelectedPaymentMethod((latestApprovedRequest?.payment_method as PaymentMethod | undefined) ?? 'gcash')
    setRenewalEnabled(isExpired || !latestApprovedRequest)
  }, [currentStorefrontPlan, isExpired, latestApprovedRequest?.billing_option, latestApprovedRequest?.payment_method, selectedStorefrontKey])

  useEffect(() => {
    const paymentStatus = String(searchParams.get('webstore_payment') ?? '').toLowerCase()
    const checkoutId = String(searchParams.get('checkout_id') ?? '').trim()
    if (paymentStatus !== 'success' || !checkoutId) return
    if (finalizingCheckoutRef.current === checkoutId) return
    finalizingCheckoutRef.current = checkoutId

    const finalize = async () => {
      try {
        const paymentMode = (() => {
          const raw = String(searchParams.get('payment_mode') ?? '').toLowerCase()
          return raw === 'test' || raw === 'live' ? (raw as PaymentMode) : resolvePaymentMode()
        })()

        let verified = await verifyPaymentSession({ checkoutId, paymentMode }).unwrap()
        if (!verified?.payment_reference && paymentMode) {
          verified = await verifyPaymentSession({ checkoutId }).unwrap()
        }

        const proofUrl = String(verified?.proof_url ?? '').trim()
        if (!proofUrl) {
          throw new Error('Payment was verified, but no proof URL was returned for submission.')
        }

        const payload: SubmitWebstoreRequestPayload = {
          full_name: String(adminMe?.name ?? '').trim() || selectedStorefrontName,
          username: String(adminMe?.username ?? '').trim() || selectedStorefrontSlug,
          email: String(adminMe?.email ?? '').trim() || '',
          slug_name: selectedStorefrontSlug,
          display_name: selectedStorefrontName,
          plan: planMap[selectedPlan],
          billing_option: selectedBillingOption,
          payment_method: selectedPaymentMethod,
          receipt_urls: [proofUrl],
          checkout_id: verified.checkout_id ?? checkoutId,
          payment_reference: verified.payment_reference || verified.payment_intent_id || verified.checkout_id || checkoutId,
          payment_intent_id: verified.payment_intent_id || null,
          accepted_terms: true,
          renewal_enabled: renewalEnabled,
        }

        await submitWebstoreRequest(payload).unwrap()
        await refetchHistory()
        setMessage({ type: 'success', text: 'Renewal request submitted successfully.' })
        showSuccessToast('Renewal request submitted successfully.')
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(LAST_CHECKOUT_KEY)
        }
        router.replace(`/partner/webpages/renewal${selectedStorefrontSlug ? `?storefront=${encodeURIComponent(selectedStorefrontSlug)}` : ''}`)
      } catch (error) {
        const apiErr = error as { data?: { message?: string }; message?: string }
        const text = apiErr?.data?.message || apiErr?.message || 'Failed to finalize the renewal payment.'
        setMessage({ type: 'error', text })
        showErrorToast(text)
      }
    }

    void finalize()
  }, [
    adminMe?.email,
    adminMe?.name,
    adminMe?.username,
    refetchHistory,
    renewalEnabled,
    router,
    searchParams,
    selectedPaymentMethod,
    selectedPlan,
    selectedStorefrontName,
    selectedStorefrontSlug,
    selectedBillingOption,
    submitWebstoreRequest,
    verifyPaymentSession,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedStorefrontKey) return
    const payload = {
      storefrontKey: selectedStorefrontKey,
      selectedPlan,
      selectedBillingOption,
      selectedPaymentMethod,
      renewalEnabled,
    }
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
  }, [renewalEnabled, selectedBillingOption, selectedPaymentMethod, selectedPlan, selectedStorefrontKey])

  const paymentMode = resolvePaymentMode()
  const isLoading = isStorefrontLoading || isHistoryLoading
  const statusLabel = latestApprovedRequest
    ? isExpired
      ? 'Expired'
      : 'Active'
    : 'No history yet'
  const accessBlocked = !canAccessTestRenewal

  const handleStorefrontChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('storefront', value)
    else params.delete('storefront')
    const query = params.toString()
    router.replace(`/partner/webpages/renewal${query ? `?${query}` : ''}`)
  }, [router, searchParams])

  const handleStartPayment = async () => {
    if (!selectedStorefrontEntry) {
      setMessage({ type: 'error', text: 'Choose a storefront first.' })
      return
    }
    if (!selectedPlan || !selectedBillingOption || !selectedPaymentMethod) {
      setMessage({ type: 'error', text: 'Please complete the plan, billing, and payment method first.' })
      return
    }

    try {
      setMessage(null)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            storefrontKey: selectedStorefrontKey,
            selectedPlan,
            selectedBillingOption,
            selectedPaymentMethod,
            renewalEnabled,
          }),
        )
      }

      const checkout = await createPaymentSession({
        plan: planMap[selectedPlan],
        billing_option: selectedBillingOption,
        payment_method: selectedPaymentMethod,
        payment_mode: paymentMode,
      }).unwrap()

      if (!checkout.checkout_url) {
        throw new Error('Failed to create a checkout session.')
      }

      if (checkout.checkout_id && typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_CHECKOUT_KEY, checkout.checkout_id)
      }

      window.location.href = checkout.checkout_url
    } catch (error) {
      const apiErr = error as { data?: { message?: string }; message?: string }
      const text = apiErr?.data?.message || apiErr?.message || 'Failed to start renewal payment.'
      setMessage({ type: 'error', text })
      showErrorToast(text)
    }
  }

  const title = selectedStorefrontName
  const expiryText = expiryDate ? expiryDate.toLocaleDateString() : 'Not available'

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-linear-to-br from-white via-blue-50/50 to-violet-100/70 px-8 py-7 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-2/5">
          <div className="absolute right-16 top-3 h-14 w-14 rounded-full bg-violet-300/50 blur-sm dark:bg-violet-500/20" />
          <div className="absolute right-6 top-10 h-20 w-20 rounded-full bg-blue-300/40 blur-sm dark:bg-blue-500/15" />
          <div className="absolute bottom-3 right-24 h-8 w-8 rounded-full bg-indigo-400/40 dark:bg-indigo-500/20" />
          <div className="absolute right-10 top-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/60 bg-white/50 shadow-lg backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-900/50">
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
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Renew your storefront</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Keep your partner storefront active with a new subscription plan.</p>
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Storefront</p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">/{selectedStorefrontSlug || 'select-storefront'}</p>
                </div>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isExpired ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : latestApprovedRequest ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {latestApprovedRequest && !isExpired && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                {statusLabel}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                  <Clock3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current plan</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {currentStorefrontPlan ? planOptions.find((p) => p.key === currentStorefrontPlan)?.title ?? '-' : 'None'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                  <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expires</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{expiryText}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                  <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requests</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">{selectedStorefrontRequests.length}</p>
                </div>
              </div>
            </div>
          </div>

          {isExpired ? (
            <div className="flex gap-3 rounded-3xl border border-orange-200 bg-linear-to-r from-orange-50 to-amber-50 p-5 shadow-sm dark:border-orange-500/30 dark:from-orange-500/10 dark:to-amber-500/10">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
              <div>
                <p className="font-bold text-orange-900 dark:text-orange-100">This storefront has expired</p>
                <p className="mt-1 text-sm text-orange-800/80 dark:text-orange-100/80">
                  Select a plan below, start payment, and we&apos;ll submit the renewal once your checkout is confirmed.
                </p>
              </div>
            </div>
          ) : null}

          {message ? (
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'}`}>
              {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {message.text}
            </div>
          ) : null}

          {/* Plan Selection */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Renewal plan
                </div>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Choose your renewal term</h3>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                {selectedPlanData.term}
              </div>
            </div>

            <div className={`grid gap-3 ${visiblePlanOptions.length > 3 ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-3'}`}>
              {visiblePlanOptions.map((plan) => {
                const active = selectedPlan === plan.key
                const style = planStyleMap[plan.key]
                const PlanIcon = plan.key === 'test' ? Clock3 : plan.key === 'annual' ? Star : Calendar
                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`relative rounded-2xl border p-4 text-left transition-all duration-150 ${active ? `${style.activeBorder} ${style.activeBg} shadow-sm` : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? style.iconBg : 'bg-slate-100 dark:bg-slate-800'}`}>
                        {active
                          ? <CheckCircle2 className={`h-4 w-4 ${style.iconText}`} />
                          : <PlanIcon className={`h-4 w-4 ${style.iconText}`} />
                        }
                      </div>
                      <div>
                        <p className={`text-sm font-bold leading-tight ${active ? style.priceText : 'text-slate-900 dark:text-slate-100'}`}>{plan.title}</p>
                        <p className={`text-xs ${active ? style.iconText : 'text-slate-500 dark:text-slate-400'}`}>{plan.term}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{plan.description}</p>

                    <div className="mt-3 space-y-1">
                      <p className={`text-xs font-semibold ${active ? style.priceText : 'text-slate-700 dark:text-slate-300'}`}>
                        <span className="font-normal text-slate-400 dark:text-slate-500">Full </span>PHP {plan.full.toLocaleString()}
                      </p>
                      <p className={`text-xs font-semibold ${active ? style.priceText : 'text-slate-700 dark:text-slate-300'}`}>
                        <span className="font-normal text-slate-400 dark:text-slate-500">Monthly </span>PHP {plan.monthly.toLocaleString()}
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selected storefront</p>
                <p className="truncate font-bold text-slate-900 dark:text-white">{selectedStorefrontName}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
                <Store className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="flex-1 text-sm text-slate-500 dark:text-slate-400">Slug</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">/{selectedStorefrontSlug || '-'}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
                <Users className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="flex-1 text-sm text-slate-500 dark:text-slate-400">Assigned users</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{storefrontIds.length}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
                <FileText className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="flex-1 text-sm text-slate-500 dark:text-slate-400">Request records</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedStorefrontRequests.length}</span>
              </div>
            </div>
          </div>

          {/* Billing Details Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Billing details</h3>
              </div>
              <button
                type="button"
                onClick={() => setRenewalEnabled((current) => !current)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${renewalEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}
              >
                <RotateCcw className="h-3 w-3" />
                Renewal {renewalEnabled ? 'On' : 'Off'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 items-end gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Billing option</p>
                <div className="flex gap-1.5">
                  {(['full', 'monthly'] as BillingOption[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedBillingOption(option)}
                      className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-all ${selectedBillingOption === option ? 'border-blue-500 bg-blue-500 text-white shadow-sm dark:border-blue-600 dark:bg-blue-600' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300'}`}
                    >
                      {option === 'full' ? 'Full payment' : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment method</p>
                <div className="relative">
                  <select
                    value={selectedPaymentMethod}
                    onChange={(event) => setSelectedPaymentMethod(event.target.value as PaymentMethod)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Plan</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPlanData.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  PHP {(selectedBillingOption === 'monthly' ? selectedPlanData.monthly : selectedPlanData.full).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Auto-renew</span>
                <span className={`font-semibold ${renewalEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {renewalEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleStartPayment()}
              disabled={isCreatingPayment || isSubmitting || !selectedStorefrontEntry || accessBlocked}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm shadow-indigo-200/60 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none"
            >
              {isCreatingPayment || isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Lock className="h-4 w-4" />
              }
              Start renewal payment
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading renewal details...</p>
            </div>
          ) : null}

          {isHistoryFetching ? (
            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Refreshing request history...</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
