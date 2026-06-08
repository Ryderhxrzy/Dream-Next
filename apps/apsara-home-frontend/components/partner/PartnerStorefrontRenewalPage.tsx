'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3, Loader2, ShieldCheck, Store, RotateCcw } from 'lucide-react'
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

const paymentModeText = (mode: PaymentMode) => (mode === 'test' ? 'Test checkout' : 'Live checkout')

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
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.18),transparent_40%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_40%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4 px-6 py-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Partner Renewal
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Renew your storefront
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Create a renewal payment for the partner storefront you want to keep active.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Checkout mode</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{paymentModeText(paymentMode)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Storefront</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">/{selectedStorefrontSlug || 'select-storefront'}</p>
              </div>

              <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${isExpired ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : latestApprovedRequest ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {statusLabel}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Storefront</p>
                <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800/60 dark:bg-slate-800/40 dark:text-slate-100">
                  {selectedStorefrontEntry?.config.displayName ?? selectedStorefrontName}
                  <span className="block mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    /{selectedStorefrontSlug || selectedStorefrontEntry?.config.slug || '-'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Current plan</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{currentStorefrontPlan ? planOptions.find((plan) => plan.key === currentStorefrontPlan)?.title ?? '-' : 'No approved plan yet'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Expiry</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{expiryText}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Requested</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedStorefrontRequests.length}</p>
              </div>
            </div>
          </div>

          {isExpired ? (
            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5 text-orange-900 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">This storefront has expired.</p>
                  <p className="mt-1 text-sm text-orange-800/90 dark:text-orange-100/90">
                    Select a plan below, start payment, and we will submit the renewal once the checkout is confirmed.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {message ? (
            <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'}`}>
              {message.text}
            </div>
          ) : null}


          <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <Clock3 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                  Renewal plan
                </div>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Choose your renewal term</h3>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-30" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                </span>
                {selectedPlanData.term}
              </div>
            </div>

            <div className={`mt-5 grid gap-3 ${visiblePlanOptions.length > 3 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
              {visiblePlanOptions.map((plan) => {
                const active = selectedPlan === plan.key
                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-cyan-400 bg-cyan-50 shadow-sm dark:border-cyan-500/60 dark:bg-cyan-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-500/10 blur-2xl" />
                    </div>

                    <div className="relative flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{plan.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{plan.term}</p>
                      </div>

                      {active ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-cyan-200/70 dark:bg-slate-950/70 dark:ring-cyan-400/40">
                          <CheckCircle2 className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                        </span>
                      ) : null}
                    </div>

                    <p className="relative mt-3 text-sm text-slate-600 dark:text-slate-300">{plan.description}</p>

                    <div className="relative mt-3 grid grid-cols-2 gap-2 text-xs">
                      <span className={`rounded-xl px-2 py-1 font-semibold ${
                        active ? 'bg-white text-cyan-800 dark:bg-slate-900/70 dark:text-cyan-200' : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      }`}>
                        Full: PHP {plan.full.toLocaleString()}
                      </span>
                      <span className={`rounded-xl px-2 py-1 font-semibold ${
                        active ? 'bg-white text-cyan-800 dark:bg-slate-900/70 dark:text-cyan-200' : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      }`}>
                        Monthly: PHP {plan.monthly.toLocaleString()}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Billing and payment</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Select how to pay</h3>
              </div>
              <button
                type="button"
                onClick={() => setRenewalEnabled((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  renewalEnabled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Renewal {renewalEnabled ? 'On' : 'Off'}
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Billing option</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['full', 'monthly'] as BillingOption[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedBillingOption(option)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        selectedBillingOption === option
                          ? 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200'
                      }`}
                    >
                      {option === 'full' ? 'Full payment' : 'Monthly installment'}
                    </button>
                  ))}
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Payment method</span>
                <div className="relative">
                  <select
                    value={selectedPaymentMethod}
                    onChange={(event) => setSelectedPaymentMethod(event.target.value as PaymentMethod)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Chosen plan</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPlanData.title}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Amount due</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    PHP {(selectedBillingOption === 'monthly' ? selectedPlanData.monthly : selectedPlanData.full).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Payment method</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {paymentMethods.find((method) => method.value === selectedPaymentMethod)?.label ?? '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Renewal</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{renewalEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleStartPayment()}
              disabled={isCreatingPayment || isSubmitting || !selectedStorefrontEntry || accessBlocked}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingPayment || isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Start renewal payment
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selected storefront</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedStorefrontName}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Slug</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">/{selectedStorefrontSlug || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Assigned users</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{storefrontIds.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Request records</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedStorefrontRequests.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">How this page works</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>1. Pick the storefront you want to renew.</li>
              <li>2. Choose a plan, billing option, and payment method.</li>
              <li>3. Complete checkout, then the request will submit automatically.</li>
            </ul>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Loading renewal details...
            </div>
          ) : null}

          {isHistoryFetching ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Refreshing request history...
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
