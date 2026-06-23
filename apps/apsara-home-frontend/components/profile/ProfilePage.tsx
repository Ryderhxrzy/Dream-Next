"use client"

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { containsBlockedWord } from "@/libs/badWords"
import { getPartnerStorefrontConfig } from "@/libs/partnerStorefront"
import { getProfileCompletion } from "@/libs/profileCompletion"
import { extractPartnerSlugFromPath } from "@/libs/storefrontRouting"
import { showErrorToast, showSuccessToast } from "@/libs/toast"
import { computeEndDateRaw } from "@/libs/webstoreExpiry"
import {
  AccountSnapshot,
  LinkedAccount,
  MeResponse,
  ReferralTreeNode,
  SetupTotpResponse,
  useAccountSnapshotQuery,
  useChangePasswordMutation,
  useCreateWebstorePaymentSessionMutation,
  useDisableTotpMutation,
  useDismissProfileRewardModalMutation,
  useEnableTotpMutation,
  useLazyVerifyWebstorePaymentSessionQuery,
  useLinkedAccountsQuery,
  useLinkFacebookAccountMutation,
  useLinkGoogleAccountMutation,
  useMemberActivityQuery,
  useMemberSessionsQuery,
  useMeQuery,
  useReferralTreeQuery,
  useRevokeMemberSessionMutation,
  useSendUsernameChangeOtpMutation,
  useSetupTotpMutation,
  useSubmitUsernameChangeRequestMutation,
  useSubmitWebstoreRequestMutation,
  useSyncWebstorePartnerAccountMutation,
  useUnlinkFacebookAccountMutation,
  useUnlinkGoogleAccountMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useUploadWebstoreReceiptMutation,
  useUsernameChangeLatestQuery,
  useWebstoreRequestHistoryQuery,
  useWebstoreRequestLatestQuery,
  WebstoreRequest,
} from "@/store/api/userApi"
import { useGetPublicWebPageItemsQuery } from "@/store/api/webPagesApi"
import { AnimatePresence, motion } from "framer-motion"
import { signOut, useSession } from "next-auth/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { MemberTier } from "@/types/members/types"
import { usePhAddress } from "@/hooks/usePhAddress"
import Footer from "@/components/landing-page/Footer"
import Navbar from "@/components/layout/Navbar"
import TopBar from "@/components/layout/TopBar"

import Loading from "../Loading"
import WebstoreLearnMore from "../WebstoreLearnMore"
import AvatarCropModal from "./AvatarCropModal"
import EncashmentTab from "./EncashmentTab"
import fadeUp from "./FadeUp"
import getActivityIcon from "./GetActivityIcon"
import getPasswordStrength from "./GetPasswordStrength"
import Icon from "./Icons"
import InteriorRequestsTab from "./InteriorRequestsTab"
import LevelsTab from "./LevelsTab"
import PasswordInput from "./PasswordInput"
import Toggle from "./Toggle"
import WalletTab from "./WalletTab"

const TIER_BADGE_IMAGE: Record<MemberTier, string> = {
  "Home Starter": "/Badge/homeStarter.png",
  "Home Builder": "/Badge/homeBuilder.png",
  "Home Stylist": "/Badge/homeStylist.png",
  "Lifestyle Consultant": "/Badge/lifestyleConsultant.png",
  "Lifestyle Elite": "/Badge/lifestyleElite.png",
}

const TIER_COVER: Record<
  MemberTier,
  { gradient: string; glow: string; pill: string }
> = {
  "Home Starter": {
    gradient: "from-sky-400 to-sky-500",
    glow: "rgba(251,146,60,0.5)",
    pill: "bg-white/80 text-sky-700 border-sky-200",
  },
  "Home Builder": {
    gradient: "from-emerald-400 to-teal-500",
    glow: "rgba(52,211,153,0.5)",
    pill: "bg-white/80 text-emerald-700 border-emerald-200",
  },
  "Home Stylist": {
    gradient: "from-sky-400 to-blue-500",
    glow: "rgba(56,189,248,0.5)",
    pill: "bg-white/80 text-sky-700 border-sky-200",
  },
  "Lifestyle Consultant": {
    gradient: "from-violet-500 to-purple-600",
    glow: "rgba(167,139,250,0.5)",
    pill: "bg-white/80 text-violet-700 border-violet-200",
  },
  "Lifestyle Elite": {
    gradient: "from-sky-400 via-sky-400 to-rose-400",
    glow: "rgba(251,191,36,0.6)",
    pill: "bg-white/80 text-sky-700 border-sky-300",
  },
}

const rankToTier = (rank: number): MemberTier => {
  if (rank >= 5) return "Lifestyle Elite"
  if (rank === 4) return "Lifestyle Consultant"
  if (rank === 3) return "Home Stylist"
  if (rank === 2) return "Home Builder"
  return "Home Starter"
}

type TierReq = {
  pv: number
  referrals: number
  activeMembers?: number
  activeBuilders?: number
  activeLeaders?: number
}
const NEXT_TIER_REQUIREMENTS: Record<number, TierReq> = {
  1: { pv: 300, referrals: 2 },
  2: { pv: 1000, referrals: 5, activeMembers: 2 },
  3: { pv: 3000, referrals: 10, activeBuilders: 5 },
  4: { pv: 8000, referrals: 20, activeLeaders: 10 },
}

const hasRealPhoneNumber = (value?: string | null) => {
  const digits = String(value ?? "").replace(/\D/g, "")
  return digits.length >= 10
}

const base64UrlToUint8Array = (value: string): Uint8Array<ArrayBuffer> => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const uint8ArrayToBase64Url = (input: ArrayBuffer | Uint8Array): string => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

// Google OAuth popup handler
type GoogleAuthResult =
  | {
      success: true
      provider_id: string
      token: string
      email: string
      name: string
    }
  | {
      success: false
      error: string
    }

const openGoogleAuthPopup = (
  systemEmail: string
): Promise<GoogleAuthResult> => {
  return new Promise((resolve) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      resolve({ success: false, error: "Google Client ID not configured" })
      return
    }

    const redirectUri =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/google/callback`
        : ""
    const scope = encodeURIComponent("openid email profile")

    // Encode system email in state parameter (format: random_string|email)
    const randomState = Math.random().toString(36).substring(2, 15)
    const state = `${randomState}|${encodeURIComponent(systemEmail)}`

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${scope}` +
      `&state=${state}` +
      `&prompt=consent`

    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      authUrl,
      "googleAuth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    )

    if (!popup) {
      resolve({
        success: false,
        error: "Popup blocked. Please allow popups for this site.",
      })
      return
    }

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== "GOOGLE_AUTH_CALLBACK") return

      window.removeEventListener("message", messageHandler)
      clearInterval(checkClosed)

      const { error, access_token, provider_id, email, name } = event.data

      if (error) {
        resolve({ success: false, error })
      } else if (access_token && provider_id && email) {
        resolve({
          success: true,
          token: access_token,
          provider_id,
          email,
          name: name || email.split("@")[0],
        })
      } else {
        resolve({ success: false, error: "Failed to get Google credentials" })
      }
    }

    window.addEventListener("message", messageHandler)

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener("message", messageHandler)
        resolve({ success: false, error: "Authentication cancelled" })
      }
    }, 500)
  })
}

// Facebook OAuth popup handler
type FacebookAuthResult =
  | {
      success: true
      provider_id: string
      token: string
      email: string
      name: string
    }
  | {
      success: false
      error: string
    }

const openFacebookAuthPopup = (): Promise<FacebookAuthResult> => {
  return new Promise((resolve) => {
    const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    if (!clientId) {
      resolve({ success: false, error: "Facebook App ID not configured" })
      return
    }

    const redirectUri =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/facebook/callback`
        : ""
    const state = Math.random().toString(36).substring(2, 15)

    const authUrl =
      `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=email,public_profile` +
      `&state=${state}`

    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      authUrl,
      "facebookAuth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    )

    if (!popup) {
      resolve({
        success: false,
        error: "Popup blocked. Please allow popups for this site.",
      })
      return
    }

    const broadcast = new BroadcastChannel("facebook_auth")

    const cleanup = () => {
      broadcast.close()
      clearInterval(checkClosed)
      window.removeEventListener("message", legacyMessageHandler)
    }

    const handleResult = (data: Record<string, unknown>) => {
      cleanup()
      const { error, access_token, provider_id, email, name } = data as Record<
        string,
        string
      >
      if (error) {
        resolve({ success: false, error })
      } else if (access_token && provider_id && email) {
        resolve({
          success: true,
          token: access_token,
          provider_id,
          email,
          name: name || email.split("@")[0],
        })
      } else {
        resolve({ success: false, error: "Failed to get Facebook credentials" })
      }
    }

    broadcast.onmessage = (event) => handleResult(event.data)

    // fallback: window.opener.postMessage for browsers that still support it
    const legacyMessageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== "FACEBOOK_AUTH_CALLBACK") return
      handleResult(event.data)
    }
    window.addEventListener("message", legacyMessageHandler)

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        cleanup()
        resolve({ success: false, error: "Authentication cancelled" })
      }
    }, 500)
  })
}

type PasskeyListItem = {
  id: number
  name: string
  credential_id: string
  sign_count: number
  last_used_at?: string | null
  created_at?: string | null
  authenticator_type?: string | null
  authenticator_attachment?: string | null
  transports?: string[] | null
}

type PasskeyCredentialDescriptor = {
  id: string
  transports?: AuthenticatorTransport[]
}

type ProfileFormState = {
  name: string
  email: string
  phone: string
  username: string
  middle_name: string
  birth_date: string
  gender: "male" | "female" | "other" | ""
  occupation: string
  work_location: "local" | "overseas"
  country: string
}

type WebstoreRequestFormState = {
  fullName: string
  username: string
  email: string
  slugName: string
  displayName: string
}

type AddressFormState = {
  address: string
  zipCode: string
}

type PreferencesState = {
  marketingEmails: boolean
  smsUpdates: boolean
  orderUpdates: boolean
  pushNotifications: boolean
  twoFactorEnabled: boolean
  language: "en" | "fil"
  currency: "PHP" | "USD"
}

type Tab =
  | "profile"
  | "security"
  | "preferences"
  | "wallet"
  | "pv"
  | "encashment"
  | "interior-requests"
  | "activity"
  | "change-username"
  | "webstore"
  | "referrals"
  | "levels"

type AlertMsg = { type: "success" | "error"; text: string }
type TreeStatusFilter =
  | "all"
  | "verified"
  | "pending_review"
  | "not_verified"
  | "blocked"
const PROFILE_TABS: Tab[] = [
  "profile",
  "security",
  "preferences",
  "wallet",
  "pv",
  "encashment",
  "interior-requests",
  "activity",
  "change-username",
  "webstore",
  "referrals",
  "levels",
]

type WebstorePaymentMethod = "gcash" | "grab_pay" | "maya" | "card"

const WEBSTORE_PAYMENT_METHODS: Array<{
  value: WebstorePaymentMethod
  label: string
  logo: string
}> = [
  {
    value: "gcash",
    label: "GCash",
    logo: "/payment-logos/gcash.svg",
  },
  {
    value: "grab_pay",
    label: "GrabPay",
    logo: "/payment-logos/gp.jpg",
  },
  {
    value: "maya",
    label: "Maya / PayMaya",
    logo: "/payment-logos/maya.svg",
  },
  {
    value: "card",
    label: "Card (Visa / Mastercard / JCB)",
    logo: "/payment-logos/paymongo-supported.svg",
  },
]

const WEBSTORE_AVAILABLE_PAYMENT_METHODS: Array<{
  label: string
  logo?: string
  textClassName?: string
  badgeClassName?: string
}> = [
  { label: "GCash", logo: "/payment-logos/gcash.svg" },
  { label: "GrabPay", logo: "/payment-logos/gp.jpg" },
  { label: "Maya", logo: "/payment-logos/maya.svg" },
  { label: "VISA", logo: "/payment-logos/visa.svg" },
  { label: "Mastercard", logo: "/payment-logos/mastercard.svg" },
  { label: "JCB", textClassName: "text-[#1d3577]" },
  { label: "Bank Transfer", logo: "/payment-logos/online-banking.svg" },
]

const COUNTRY_REGION_CODES = [
  "AF",
  "AX",
  "AL",
  "DZ",
  "AS",
  "AD",
  "AO",
  "AI",
  "AQ",
  "AG",
  "AR",
  "AM",
  "AW",
  "AU",
  "AT",
  "AZ",
  "BS",
  "BH",
  "BD",
  "BB",
  "BY",
  "BE",
  "BZ",
  "BJ",
  "BM",
  "BT",
  "BO",
  "BQ",
  "BA",
  "BW",
  "BV",
  "BR",
  "IO",
  "BN",
  "BG",
  "BF",
  "BI",
  "KH",
  "CM",
  "CA",
  "CV",
  "KY",
  "CF",
  "TD",
  "CL",
  "CN",
  "CX",
  "CC",
  "CO",
  "KM",
  "CG",
  "CD",
  "CK",
  "CR",
  "CI",
  "HR",
  "CU",
  "CW",
  "CY",
  "CZ",
  "DK",
  "DJ",
  "DM",
  "DO",
  "EC",
  "EG",
  "SV",
  "GQ",
  "ER",
  "EE",
  "SZ",
  "ET",
  "FK",
  "FO",
  "FJ",
  "FI",
  "FR",
  "GF",
  "PF",
  "TF",
  "GA",
  "GM",
  "GE",
  "DE",
  "GH",
  "GI",
  "GR",
  "GL",
  "GD",
  "GP",
  "GU",
  "GT",
  "GG",
  "GN",
  "GW",
  "GY",
  "HT",
  "HM",
  "VA",
  "HN",
  "HK",
  "HU",
  "IS",
  "IN",
  "ID",
  "IR",
  "IQ",
  "IE",
  "IM",
  "IL",
  "IT",
  "JM",
  "JP",
  "JE",
  "JO",
  "KZ",
  "KE",
  "KI",
  "KP",
  "KR",
  "KW",
  "KG",
  "LA",
  "LV",
  "LB",
  "LS",
  "LR",
  "LY",
  "LI",
  "LT",
  "LU",
  "MO",
  "MG",
  "MW",
  "MY",
  "MV",
  "ML",
  "MT",
  "MH",
  "MQ",
  "MR",
  "MU",
  "YT",
  "MX",
  "FM",
  "MD",
  "MC",
  "MN",
  "ME",
  "MS",
  "MA",
  "MZ",
  "MM",
  "NA",
  "NR",
  "NP",
  "NL",
  "NC",
  "NZ",
  "NI",
  "NE",
  "NG",
  "NU",
  "NF",
  "MK",
  "MP",
  "NO",
  "OM",
  "PK",
  "PW",
  "PS",
  "PA",
  "PG",
  "PY",
  "PE",
  "PH",
  "PN",
  "PL",
  "PT",
  "PR",
  "QA",
  "RE",
  "RO",
  "RU",
  "RW",
  "BL",
  "SH",
  "KN",
  "LC",
  "MF",
  "PM",
  "VC",
  "WS",
  "SM",
  "ST",
  "SA",
  "SN",
  "RS",
  "SC",
  "SL",
  "SG",
  "SX",
  "SK",
  "SI",
  "SB",
  "SO",
  "ZA",
  "GS",
  "SS",
  "ES",
  "LK",
  "SD",
  "SR",
  "SJ",
  "SE",
  "CH",
  "SY",
  "TW",
  "TJ",
  "TZ",
  "TH",
  "TL",
  "TG",
  "TK",
  "TO",
  "TT",
  "TN",
  "TR",
  "TM",
  "TC",
  "TV",
  "UG",
  "UA",
  "AE",
  "GB",
  "US",
  "UM",
  "UY",
  "UZ",
  "VU",
  "VE",
  "VN",
  "VG",
  "VI",
  "WF",
  "EH",
  "YE",
  "ZM",
  "ZW",
] as const

const regionDisplayNames = new Intl.DisplayNames(["en"], { type: "region" })

const OVERSEAS_COUNTRIES = COUNTRY_REGION_CODES.map((code) =>
  regionDisplayNames.of(code)
)
  .filter(
    (country): country is string =>
      Boolean(country) && country !== "Philippines"
  )
  .sort((a, b) => a.localeCompare(b))

const getWebstorePaymentMethodConfig = (
  method: WebstorePaymentMethod | null | undefined
) =>
  WEBSTORE_PAYMENT_METHODS.find((item) => item.value === method) ??
  WEBSTORE_PAYMENT_METHODS[0]

const isWebstorePaymentMethod = (
  value: string
): value is WebstorePaymentMethod =>
  WEBSTORE_PAYMENT_METHODS.some((item) => item.value === value)

const normalizeWebstorePaymentMethod = (
  value: unknown
): WebstorePaymentMethod | null => {
  const candidate = String(value ?? "")
    .trim()
    .toLowerCase()
  return isWebstorePaymentMethod(candidate) ? candidate : null
}

const formatPhpAmount = (amount: number | string | null | undefined) => {
  const value = Number(amount)
  if (!Number.isFinite(value)) return "₱0"
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const formatExactJoinedDate = (value?: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const getWebstoreIntendedAmount = (tx: {
  billing_option?: "full" | "monthly" | null
  subscription_fee?: number | null
  effective_monthly?: number | null
}) => {
  const subscriptionFee = Number(tx.subscription_fee ?? 0)
  const effectiveMonthly = Number(tx.effective_monthly ?? 0)
  if (tx.billing_option === "monthly")
    return Number.isFinite(effectiveMonthly) && effectiveMonthly > 0
      ? effectiveMonthly
      : subscriptionFee
  return Number.isFinite(subscriptionFee) && subscriptionFee > 0
    ? subscriptionFee
    : effectiveMonthly
}

const getWebstoreReceiptUrls = (tx: {
  receipt_urls?: string[] | null
  latest_receipt_urls?: string[] | null
}) => {
  const urls = (
    tx.latest_receipt_urls?.length
      ? tx.latest_receipt_urls
      : (tx.receipt_urls ?? [])
  )
    .map((url) => String(url ?? "").trim())
    .filter(Boolean)
  return urls
}

const getWebstoreHistoricalPaymentAmount = (request: {
  billing_option?: "full" | "monthly" | null
  subscription_fee?: number | null
  effective_monthly?: number | null
}) => {
  const subscriptionFee = Number(request.subscription_fee ?? 0)
  const effectiveMonthly = Number(request.effective_monthly ?? 0)
  if (request.billing_option === "monthly") {
    return Number.isFinite(effectiveMonthly) && effectiveMonthly > 0
      ? effectiveMonthly
      : subscriptionFee
  }
  return Number.isFinite(subscriptionFee) && subscriptionFee > 0
    ? subscriptionFee
    : effectiveMonthly
}

const getWebstoreSubscriptionExpiry = (tx: {
  plan?: string | null
  plan_term?: string | null
  plan_term_months?: number | null
  billing_option?: string | null
  status?: string | null
  reviewed_at?: string | null
  created_at?: string | null
  receipt_items?: Array<{
    type?: string | null
    approval_status?: string | null
    approved_at?: string | null
  }> | null
}): Date | null => {
  const mappedReceipts = (tx.receipt_items ?? []).map((r) => ({
    type: r.type ?? null,
    approvalStatus: r.approval_status ?? null,
    approvedAt: r.approved_at ?? null,
  }))
  return computeEndDateRaw(
    tx.reviewed_at?.trim() || tx.created_at?.trim() || null,
    tx.billing_option ?? null,
    tx.plan ?? null,
    tx.plan_term ?? null,
    tx.status ?? null,
    mappedReceipts,
    tx.plan_term_months ?? null
  )
}

const getWebstoreHistoryRows = (
  requests: Array<WebstoreRequest | null | undefined>
) => {
  const rows: Array<WebstoreRequest & { row_label?: string | null }> = []
  const seenRequestKeys = new Set<string>()
  const seenRowKeys = new Set<string>()

  for (const request of requests) {
    if (!request) continue

    const requestSignature = [
      request.reference_no,
      request.status,
      request.created_at,
      request.reviewed_at,
      request.checkout_id || request.base_checkout_id || "",
      request.payment_reference || request.base_payment_reference || "",
      request.payment_intent_id || request.base_payment_intent_id || "",
    ]
      .map((value) => String(value ?? "").trim())
      .join("|")
    if (seenRequestKeys.has(requestSignature)) {
      continue
    }
    seenRequestKeys.add(requestSignature)

    const receiptItems = request.receipt_items?.length
      ? request.receipt_items
      : null
    const paymentAmount = getWebstoreHistoricalPaymentAmount(request)
    const subscriptionFee = Number(request.subscription_fee ?? 0)

    if (!receiptItems) {
      rows.push({
        ...request,
        id: request.id,
        row_label: "Request",
        total_paid_amount:
          request.status === "pending_review"
            ? paymentAmount
            : Number(request.total_paid_amount ?? paymentAmount),
        remaining_balance:
          request.status === "pending_review"
            ? subscriptionFee
            : Number(
                request.remaining_balance ??
                  Math.max(
                    0,
                    subscriptionFee -
                      Number(request.total_paid_amount ?? paymentAmount)
                  )
              ),
      })
      continue
    }

    let runningPaid = 0
    let runningRemaining = subscriptionFee

    receiptItems.forEach((item, index) => {
      const itemApproval = String(item.approval_status ?? "")
        .trim()
        .toLowerCase()
      const rowStatus =
        index === 0
          ? request.status
          : itemApproval === "approved" || itemApproval === "rejected"
            ? itemApproval
            : "pending_review"
      const receiptUrl = String(item.receipt_urls?.[0] ?? "").trim()
      const rowSignature = [
        request.reference_no,
        request.status,
        rowStatus,
        item.checkout_id || request.checkout_id || "",
        item.payment_reference || request.payment_reference || "",
        item.payment_intent_id || request.payment_intent_id || "",
        item.submitted_at || request.created_at || "",
        receiptUrl,
      ]
        .map((value) => String(value ?? "").trim())
        .join("|")

      if (seenRowKeys.has(rowSignature)) {
        return
      }
      seenRowKeys.add(rowSignature)

      const isCountedPayment = rowStatus === "approved"
      if (isCountedPayment) {
        runningPaid = Math.min(
          subscriptionFee || runningPaid + paymentAmount,
          runningPaid + paymentAmount
        )
        runningRemaining = Math.max(0, subscriptionFee - runningPaid)
      }

      rows.push({
        ...request,
        id: item.id,
        status: rowStatus as WebstoreRequest["status"],
        billing_option:
          (item.billing_option as "full" | "monthly" | null | undefined) ??
          request.billing_option ??
          null,
        payment_method:
          (item.payment_method as WebstoreRequest["payment_method"]) ??
          request.payment_method ??
          null,
        payment_reference:
          item.payment_reference || request.payment_reference || null,
        checkout_id: item.checkout_id || request.checkout_id || null,
        payment_intent_id:
          item.payment_intent_id || request.payment_intent_id || null,
        receipt_urls: item.receipt_urls ?? request.receipt_urls ?? null,
        latest_receipt_status: rowStatus as
          | "pending_review"
          | "approved"
          | "rejected",
        latest_receipt_submitted_at:
          item.submitted_at ??
          request.latest_receipt_submitted_at ??
          request.created_at ??
          null,
        latest_receipt_urls: item.receipt_urls ?? null,
        created_at: item.submitted_at ?? request.created_at ?? null,
        reviewed_at: item.approved_at ?? request.reviewed_at ?? null,
        total_paid_amount: paymentAmount,
        remaining_balance:
          rowStatus === "approved" ? runningRemaining : runningRemaining,
        row_label: item.label ?? `Receipt ${index + 1}`,
      })
    })
  }

  const dedupedRows: Array<WebstoreRequest & { row_label?: string | null }> = []
  const seenFinalKeys = new Set<string>()

  for (const row of rows) {
    const finalKey = [
      row.reference_no,
      row.row_label ?? "",
      row.created_at ?? "",
      row.reviewed_at ?? "",
      row.payment_reference ?? "",
      row.checkout_id ?? "",
      row.payment_intent_id ?? "",
      row.status ?? "",
      row.total_paid_amount ?? "",
      row.remaining_balance ?? "",
      ...(row.latest_receipt_urls ?? row.receipt_urls ?? []),
    ]
      .map((value) => String(value ?? "").trim())
      .join("|")

    if (seenFinalKeys.has(finalKey)) {
      continue
    }
    seenFinalKeys.add(finalKey)
    dedupedRows.push(row)
  }

  return dedupedRows.sort((a, b) => {
    const aTime = new Date(
      a.latest_receipt_submitted_at ?? a.reviewed_at ?? a.created_at ?? 0
    ).getTime()
    const bTime = new Date(
      b.latest_receipt_submitted_at ?? b.reviewed_at ?? b.created_at ?? 0
    ).getTime()
    return bTime - aTime
  })
}

const LOCAL_PAYMENT_MODE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

const resolveWebstorePaymentMode = (): "test" | "live" => {
  if (typeof window === "undefined") return "live"
  const host = window.location.hostname.trim().toLowerCase()
  return LOCAL_PAYMENT_MODE_HOSTS.has(host) || host.endsWith(".local")
    ? "test"
    : "live"
}

const resolveTabFromSearchParams = (value: string | null): Tab => {
  if (value && PROFILE_TABS.includes(value as Tab)) return value as Tab
  return "profile"
}

type ProfilePageProps = {
  initialProfile?: MeResponse | null
  initialCategories?: any[]
}

const QrSkeleton = ({ sizeClass }: { sizeClass: string }) => (
  <div
    className={`relative overflow-hidden rounded-xl border border-purple-200 dark:border-purple-800 dark:bg-gray-800 ${sizeClass}`}
  >
    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-purple-100 via-white to-indigo-100 dark:from-purple-900/20 dark:via-gray-800 dark:to-indigo-900/20" />
    <div className="absolute inset-[18%] rounded-lg border border-dashed border-purple-200/80 dark:border-purple-700/50" />
    <div className="absolute inset-x-[24%] top-[24%] h-2 rounded-full bg-purple-200/70 dark:bg-purple-700/50" />
    <div className="absolute inset-x-[18%] top-[40%] h-2 rounded-full bg-purple-100/90 dark:bg-purple-800/40" />
    <div className="absolute inset-x-[28%] top-[56%] h-2 rounded-full bg-indigo-100/90 dark:bg-indigo-800/40" />
  </div>
)

type ReferralShareCardProps = {
  title: string
  description: string
  badge: string
  link: string
  qrUrl: string
  onCopy: () => void
  onShare: () => void
  message: AlertMsg | null
  emptyText: string
  linkLabel: string
  qrAlt: string
  compact?: boolean
}

const ReferralShareCard = ({
  title,
  description,
  badge,
  link,
  qrUrl,
  onCopy,
  onShare,
  message,
  emptyText,
  linkLabel,
  qrAlt,
  compact = false,
}: ReferralShareCardProps) => {
  const [qrStatus, setQrStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle")

  useEffect(() => {
    if (!qrUrl) {
      setQrStatus("idle")
      return
    }

    let isCancelled = false
    setQrStatus("loading")

    const preloadImage = new window.Image()
    preloadImage.decoding = "async"
    preloadImage.src = qrUrl

    if (preloadImage.complete) {
      setQrStatus("ready")
      return
    }

    preloadImage.onload = () => {
      if (!isCancelled) setQrStatus("ready")
    }

    preloadImage.onerror = () => {
      if (!isCancelled) setQrStatus("error")
    }

    return () => {
      isCancelled = true
      preloadImage.onload = null
      preloadImage.onerror = null
    }
  }, [qrUrl])

  const qrWrapperClass = compact ? "h-24 w-24" : "h-36 w-36"
  const qrImageClass = compact
    ? "h-24 w-24 rounded-xl border border-sky-200 dark:border-sky-800 dark:bg-gray-800 p-1.5"
    : "h-36 w-36 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-gray-800 p-2"

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-gray-800">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-700 dark:text-gray-300">
            {title}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] leading-none font-semibold whitespace-nowrap text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
          {badge}
        </span>
      </div>

      {link ? (
        <>
          <div
            className={`my-3 flex ${compact ? "items-start gap-4" : "justify-center"}`}
          >
            <div className={`relative ${qrWrapperClass} shrink-0`}>
              {qrStatus !== "ready" && (
                <QrSkeleton
                  sizeClass={`${qrWrapperClass} ${compact ? "p-1.5 shadow-sm" : "p-2"}`}
                />
              )}
              {qrStatus === "error" ? (
                <div
                  className={`flex ${qrWrapperClass} items-center justify-center rounded-xl border border-sky-200 p-3 text-center dark:border-sky-800 dark:bg-sky-900/30`}
                >
                  <p
                    className={`leading-snug font-medium text-sky-700 ${compact ? "text-[9px]" : "text-[11px]"}`}
                  >
                    QR is still loading.
                  </p>
                </div>
              ) : (
                <img
                  src={qrUrl}
                  alt={qrAlt}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className={`${qrImageClass} transition-opacity duration-300 ${qrStatus === "ready" ? "opacity-100" : "opacity-0"}`}
                />
              )}
            </div>

            {compact && (
              <div className="min-w-0 flex-1">
                <div className="mb-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-gray-800">
                  <p className="mb-0.5 text-[10px] font-medium text-slate-400 dark:text-gray-500">
                    {linkLabel}
                  </p>
                  <p className="text-[11px] leading-relaxed break-all text-slate-600 dark:text-gray-300">
                    {link}
                  </p>
                </div>
                {message && (
                  <p
                    className={`mb-2 text-xs font-medium ${message.type === "success" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {message.text}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onCopy}
                    className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    <span className="truncate">Copy Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={onShare}
                    className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-600 dark:hover:bg-sky-700"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                    </svg>
                    <span className="truncate">Share</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {!compact && (
            <>
              <div className="mb-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-gray-800">
                <p className="mb-0.5 text-[10px] font-medium text-slate-400 dark:text-gray-500">
                  {linkLabel}
                </p>
                <p className="text-[11px] leading-relaxed font-medium break-all text-slate-600 dark:text-gray-300">
                  {link}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onShare}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-600 dark:hover:bg-sky-700"
                >
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                  </svg>
                  Share
                </button>
                <button
                  type="button"
                  onClick={onCopy}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy Link
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <p className="py-2 text-xs text-[#2c5f4f]/70">{emptyText}</p>
      )}
    </div>
  )
}

const ProfilePage = ({
  initialProfile = null,
  initialCategories = [],
}: ProfilePageProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status, update: updateSession } = useSession()
  const partnerSlug = useMemo(
    () => extractPartnerSlugFromPath(pathname),
    [pathname]
  )
  const profileBasePath = partnerSlug ? `/${partnerSlug}/profile` : "/profile"
  const levelUpBasePath = partnerSlug
    ? `/${partnerSlug}/profile/level-up`
    : "/profile/level-up"
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    resolveTabFromSearchParams(searchParams.get("tab"))
  )
  const isWebstoreTab = activeTab === "webstore"
  const { data: partnerStorefrontData } = useGetPublicWebPageItemsQuery(
    "partner-storefront",
    {
      skip: !partnerSlug,
    }
  )
  const { data: publicTermsData } = useGetPublicWebPageItemsQuery(
    "terms-and-conditions",
    {
      skip: !isWebstoreTab,
    }
  )
  const partnerStorefront = useMemo(() => {
    if (!partnerSlug) return null
    const storefrontItems = partnerStorefrontData?.items ?? []
    const matched = storefrontItems.find(
      (item) => getPartnerStorefrontConfig(item)?.slug === partnerSlug
    )
    return getPartnerStorefrontConfig(matched)
  }, [partnerSlug, partnerStorefrontData?.items])
  const webstoreTermsTitle = useMemo(() => {
    const items = publicTermsData?.items ?? []
    const webstore = items.find(
      (item) =>
        String(item.key ?? "")
          .trim()
          .toLowerCase() === "webstore"
    )
    const general = items.find(
      (item) =>
        String(item.key ?? "")
          .trim()
          .toLowerCase() === "general"
    )
    const selected = webstore ?? general ?? items[0]
    return (
      String(selected?.title ?? "").trim() || "Webstore Terms and Conditions"
    )
  }, [publicTermsData?.items])
  const webstoreTermsBody = useMemo(() => {
    const items = publicTermsData?.items ?? []
    const webstore = items.find(
      (item) =>
        String(item.key ?? "")
          .trim()
          .toLowerCase() === "webstore"
    )
    const general = items.find(
      (item) =>
        String(item.key ?? "")
          .trim()
          .toLowerCase() === "general"
    )
    const selected = webstore ?? general ?? items[0]
    const body = String(selected?.body ?? "").trim()
    return body || "No published terms yet. Please contact admin."
  }, [publicTermsData?.items])
  const partnerLogoUrl = partnerStorefront?.logoUrl
    ? `${partnerStorefront.logoUrl}${partnerStorefront.logoUrl.includes("?") ? "&" : "?"}v=${partnerStorefront.logoVersion || "1"}`
    : undefined
  const partnerHomeHref = partnerSlug ? `/shop/${partnerSlug}` : "/shop"
  const role = String(session?.user?.role ?? "").toLowerCase()
  const accessToken = String(
    (session?.user as { accessToken?: string } | undefined)?.accessToken ?? ""
  )
  const apiBaseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL || "").trim()
  const passkeySupported =
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials
  const isCustomerSession =
    status === "authenticated" && (role === "customer" || role === "")
  const isActivityTab = activeTab === "activity"
  const isSecurityTab = activeTab === "security"
  const isReferralTab = activeTab === "referrals" || activeTab === "levels"
  const isUsernameTab = activeTab === "change-username"
  const { data, refetch: refetchMe } = useMeQuery(undefined, {
    skip: !isCustomerSession,
  })
  const { data: accountSnapshot, isLoading: isSnapshotLoading, refetch: refetchAccountSnapshot } =
    useAccountSnapshotQuery(undefined, {
      skip: !isCustomerSession,
    })
  const {
    data: referralTree,
    isLoading: isReferralTreeLoading,
    refetch: refetchReferralTree,
  } = useReferralTreeQuery(undefined, {
    skip: !isCustomerSession,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  })
  const { data: usernameChangeLatest, refetch: refetchUsernameChangeLatest } =
    useUsernameChangeLatestQuery(undefined, {
      skip: !isCustomerSession || !isUsernameTab,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    })
  const { data: webstoreRequestLatest, refetch: refetchWebstoreRequestLatest } =
    useWebstoreRequestLatestQuery(undefined, {
      skip: !isCustomerSession || !isWebstoreTab,
      pollingInterval: 15000,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    })
  const { data: webstoreHistoryData, isLoading: isWebstoreHistoryLoading } =
    useWebstoreRequestHistoryQuery(undefined, {
      skip: !isCustomerSession || !isWebstoreTab,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    })

  const { data: activityData, isLoading: isActivityLoading } =
    useMemberActivityQuery(undefined, {
      skip: !isCustomerSession || !isActivityTab,
    })
  const { data: sessionsData, isLoading: isSessionsLoading } =
    useMemberSessionsQuery(undefined, {
      skip: !isCustomerSession || !isActivityTab,
    })
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation()
  const [uploadAvatar] = useUploadAvatarMutation()
  const [dismissProfileRewardModalRequest] =
    useDismissProfileRewardModalMutation()
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation()
  const [sendUsernameChangeOtp, { isLoading: isSendingUsernameOtp }] =
    useSendUsernameChangeOtpMutation()
  const [
    submitUsernameChangeRequest,
    { isLoading: isSubmittingUsernameChange },
  ] = useSubmitUsernameChangeRequestMutation()
  const [submitWebstoreRequest, { isLoading: isSubmittingWebstoreRequest }] =
    useSubmitWebstoreRequestMutation()
  const [uploadWebstoreReceipt] = useUploadWebstoreReceiptMutation()
  const [
    createWebstorePaymentSession,
    { isLoading: isCreatingWebstorePaymentSession },
  ] = useCreateWebstorePaymentSessionMutation()
  const [verifyWebstorePaymentSession] =
    useLazyVerifyWebstorePaymentSessionQuery()
  const [syncWebstorePartnerAccount, { isLoading: isSyncingWebstoreAccount }] =
    useSyncWebstorePartnerAccountMutation()
  const [revokeMemberSession, { isLoading: isRevokingSession }] =
    useRevokeMemberSessionMutation()
  const { data: linkedAccountsData, refetch: refetchLinkedAccounts } =
    useLinkedAccountsQuery(undefined, {
      skip: !isCustomerSession || !isSecurityTab,
    })
  const [linkGoogleAccount, { isLoading: isLinkingGoogle }] =
    useLinkGoogleAccountMutation()
  const [unlinkGoogleAccount, { isLoading: isUnlinkingGoogle }] =
    useUnlinkGoogleAccountMutation()
  const [linkFacebookAccount, { isLoading: isLinkingFacebook }] =
    useLinkFacebookAccountMutation()
  const [unlinkFacebookAccount, { isLoading: isUnlinkingFacebook }] =
    useUnlinkFacebookAccountMutation()
  const [setupTotp] = useSetupTotpMutation()
  const [enableTotp] = useEnableTotpMutation()
  const [disableTotp] = useDisableTotpMutation()

  const isGoogleLinked = useMemo(() => {
    return (
      linkedAccountsData?.accounts?.some(
        (account: LinkedAccount) => account.provider === "google"
      ) ?? false
    )
  }, [linkedAccountsData])

  const isFacebookLinked = useMemo(() => {
    return (
      linkedAccountsData?.accounts?.some(
        (account: LinkedAccount) => account.provider === "facebook"
      ) ?? false
    )
  }, [linkedAccountsData])

  const [googleLinkSuccess, setGoogleLinkSuccess] = useState(false)
  const [facebookLinkSuccess, setFacebookLinkSuccess] = useState(false)
  const profileDraftDirtyRef = useRef(false)
  const slideDir = useRef(1)
  const [isMobile, setIsMobile] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  const [form, setForm] = useState<ProfileFormState>({
    name: "",
    email: "",
    phone: "",
    username: "",
    middle_name: "",
    birth_date: "",
    gender: "",
    occupation: "",
    work_location: "local",
    country: "Philippines",
  })
  const [usernameRequest, setUsernameRequest] = useState("")
  const [usernameOtp, setUsernameOtp] = useState("")
  const [usernameOtpToken, setUsernameOtpToken] = useState<string | null>(null)
  const [usernameOtpSentTo, setUsernameOtpSentTo] = useState<string | null>(
    null
  )
  const [isUsernamePendingLocal, setIsUsernamePendingLocal] = useState(false)
  const [bio, setBio] = useState("")
  const [webstoreForm, setWebstoreForm] = useState<WebstoreRequestFormState>({
    fullName: "",
    username: "",
    email: "",
    slugName: "",
    displayName: "",
  })
  const [webstoreAcceptedTerms, setWebstoreAcceptedTerms] = useState(false)
  const [webstoreRenewalEnabled, setWebstoreRenewalEnabled] = useState(false)
  const [webstoreTermsOpen, setWebstoreTermsOpen] = useState(false)
  const [webstoreTermsScrolledEnough, setWebstoreTermsScrolledEnough] = useState(false)
  const [webstoreMsg, setWebstoreMsg] = useState<AlertMsg | null>(null)
  const [showWebstoreTutorial, setShowWebstoreTutorial] = useState(false)
  const [showWebstoreLearnMore, setShowWebstoreLearnMore] = useState(false)
  const [webstoreHistoryPage, setWebstoreHistoryPage] = useState(1)
  const [webstoreReceiptCarouselIdx, setWebstoreReceiptCarouselIdx] = useState<
    Record<string, number>
  >({})
  useEffect(() => {
    if (!webstoreMsg || webstoreMsg.type !== "success") return

    const timeoutId = window.setTimeout(() => {
      setWebstoreMsg((current) =>
        current?.type === "success" ? null : current
      )
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [webstoreMsg])
  useEffect(() => {
    if (!webstoreMsg || webstoreMsg.type !== "error") return
    if (!webstoreMsg.text.toLowerCase().includes("receipt under review")) return

    const timeoutId = window.setTimeout(() => {
      setWebstoreMsg((current) =>
        current?.type === "error" &&
        current.text.toLowerCase().includes("receipt under review")
          ? null
          : current
      )
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [webstoreMsg])
  const [webstoreSyncSuccessOpen, setWebstoreSyncSuccessOpen] = useState(false)
  const [showPartnerLoginShortcut, setShowPartnerLoginShortcut] =
    useState(false)
  const [selectedWebstorePlan, setSelectedWebstorePlan] = useState<
    "test" | "quarterly" | "semiAnnual" | "annual" | null
  >(null)
  const [selectedBillingOption, setSelectedBillingOption] = useState<
    "full" | "monthly" | null
  >(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<WebstorePaymentMethod | null>(null)
  const [webstorePaymentMethodSnapshot, setWebstorePaymentMethodSnapshot] =
    useState<WebstorePaymentMethod | null>(null)
  const [webstorePaymentPlanSnapshot, setWebstorePaymentPlanSnapshot] =
    useState<string | null>(null)
  const [webstorePaymentBillingSnapshot, setWebstorePaymentBillingSnapshot] =
    useState<string | null>(null)
  const [webstorePaymentProofUrl, setWebstorePaymentProofUrl] = useState<
    string | null
  >(null)
  const [webstorePaymentReferenceId, setWebstorePaymentReferenceId] = useState<
    string | null
  >(null)
  const [webstorePaymentIntentId, setWebstorePaymentIntentId] = useState<
    string | null
  >(null)
  const [webstorePaymentCheckoutId, setWebstorePaymentCheckoutId] = useState<
    string | null
  >(null)
  const [
    webstorePaymentSubmissionSnapshot,
    setWebstorePaymentSubmissionSnapshot,
  ] = useState<{
    webstoreForm: WebstoreRequestFormState
    selectedWebstorePlan: "test" | "quarterly" | "semiAnnual" | "annual" | null
    selectedBillingOption: "full" | "monthly" | null
    selectedPaymentMethod: WebstorePaymentMethod | null
    webstoreAcceptedTerms: boolean
    webstoreRenewalEnabled: boolean
  } | null>(null)
  const [webstoreSuccessModalOpen, setWebstoreSuccessModalOpen] =
    useState(false)
  const [webstoreReceiptUploadModalOpen, setWebstoreReceiptUploadModalOpen] =
    useState(false)
  const [profileRewardModalOpen, setProfileRewardModalOpen] = useState(false)
  const [webstoreReceiptFiles, setWebstoreReceiptFiles] = useState<
    Array<{ name: string; preview: string; file: File }>
  >([])
  const [webstoreReceiptPreview, setWebstoreReceiptPreview] = useState<{
    name: string
    urls: string[]
    idx: number
  } | null>(null)
  const [isDraggingReceipt, setIsDraggingReceipt] = useState(false)
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false)
  const [dismissedRejectedReceiptKeys, setDismissedRejectedReceiptKeys] =
    useState<string[]>([])
  const [webstoreInvalidFields, setWebstoreInvalidFields] = useState<
    Record<string, boolean>
  >({})
  const processedWebstoreCheckoutRef = useRef<string | null>(null)
  const webstorePaymentMethodTouchedRef = useRef(false)
  const webstoreDraftHydratedRef = useRef(false)
  const webstoreStorefrontFieldsEditedRef = useRef(false)
  const [webstoreLatestRequestPreview, setWebstoreLatestRequestPreview] =
    useState<
      | (WebstoreRequest & {
          webstoreRenewalEnabled?: boolean
        })
      | null
    >(null)
  const webstoreReceiptInputRef = useRef<HTMLInputElement | null>(null)
  const webstorePlanSectionRef = useRef<HTMLDivElement | null>(null)
  const webstoreSlugInputRef = useRef<HTMLInputElement | null>(null)
  const webstoreDisplayInputRef = useRef<HTMLInputElement | null>(null)
  const webstoreBillingSelectRef = useRef<HTMLSelectElement | null>(null)
  const webstorePaymentSelectRef = useRef<HTMLSelectElement | null>(null)
  const webstoreTermsSectionRef = useRef<HTMLDivElement | null>(null)

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([])
  const [passkeyName, setPasskeyName] = useState("")
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false)
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false)
  const [removingPasskeyId, setRemovingPasskeyId] = useState<number | null>(
    null
  )
  const [passkeyToRemove, setPasskeyToRemove] = useState<{
    id: number
    name: string
  } | null>(null)

  const [totpEnabled, setTotpEnabled] = useState(false)
  const [totpStep, setTotpStep] = useState<"idle" | "confirm-disable">("idle")
  const [totpSetupData, setTotpSetupData] = useState<SetupTotpResponse | null>(
    null
  )
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpCode, setTotpCode] = useState("")
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpError, setTotpError] = useState<string | null>(null)

  const [prefs, setPrefs] = useState<PreferencesState>({
    marketingEmails: true,
    smsUpdates: false,
    orderUpdates: true,
    pushNotifications: true,
    twoFactorEnabled: false,
    language: "en",
    currency: "PHP",
  })
  const [isUpdatingTwoFactor, setIsUpdatingTwoFactor] = useState(false)

  const [profileMsg, setProfileMsg] = useState<AlertMsg | null>(null)
  const [usernameMsg, setUsernameMsg] = useState<AlertMsg | null>(null)
  const [referralMsg, setReferralMsg] = useState<AlertMsg | null>(null)
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<
    Record<number, boolean>
  >({})
  const [treeSearchQuery, setTreeSearchQuery] = useState("")
  const [treeStatusFilter, setTreeStatusFilter] =
    useState<TreeStatusFilter>("all")
  const [referralPage, setReferralPage] = useState(1)
  const REFERRAL_PAGE_SIZE = 10
  const ACTIVITY_PAGE_SIZE = 6
  const [activityPage, setActivityPage] = useState(1)
  const [sessionPage, setSessionPage] = useState(1)
  const [clockNow, setClockNow] = useState<number>(() => Date.now())
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [avatarOriginalPreviewUrl, setAvatarOriginalPreviewUrl] = useState<
    string | null
  >(null)
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false)
  const [avatarZoom, setAvatarZoom] = useState(1)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isSavingAddressDetails, setIsSavingAddressDetails] = useState(false)
  const [revokingTokenId, setRevokingTokenId] = useState<number | null>(null)
  const [addressForm, setAddressForm] = useState<AddressFormState>({
    address: "",
    zipCode: "",
  })
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usernameMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const referralMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mainContentRef = useRef<HTMLDivElement | null>(null)
  const avatarSectionRef = useRef<HTMLDivElement | null>(null)
  const completeInformationRef = useRef<HTMLDivElement | null>(null)
  const phAddress = usePhAddress({ source: "auto" })
  const profileData = data ?? initialProfile
  const normalizeAvatarUrl = useCallback((value?: string | null) => {
    const raw = String(value ?? "").trim()
    if (!raw) return ""
    const unquoted = raw.replace(/^['"]|['"]$/g, "")
    const unescaped = unquoted
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&")
      .trim()

    if (!unescaped) return ""

    if (unescaped.startsWith("//")) {
      return `https:${unescaped}`
    }

    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      unescaped.startsWith("http://")
    ) {
      return `https://${unescaped.slice("http://".length)}`
    }

    return unescaped
  }, [])
  const sessionAvatarUrl = normalizeAvatarUrl(
    (session?.user as { image?: string | null } | undefined)?.image || ""
  )
  const snapshotAvatarUrl = normalizeAvatarUrl(
    accountSnapshot?.profile?.avatar_url || ""
  )
  const profileAvatarUrl = normalizeAvatarUrl(profileData?.avatar_url || "")
  const profileAvatarOriginalUrl = normalizeAvatarUrl(
    profileData?.avatar_original_url || ""
  )
  const effectiveAvatarUrl = normalizeAvatarUrl(
    avatarPreviewUrl ||
      profileAvatarUrl ||
      snapshotAvatarUrl ||
      sessionAvatarUrl ||
      ""
  )
  const effectiveAvatarViewUrl = normalizeAvatarUrl(
    avatarOriginalPreviewUrl || profileAvatarOriginalUrl || effectiveAvatarUrl
  )
  const effectiveRank = profileData?.rank ?? accountSnapshot?.loyalty?.rank ?? 0
  const loyaltyTier: MemberTier = rankToTier(effectiveRank)
  const referralSummary = useMemo(() => {
    const countNodes = (nodes: ReferralTreeNode[]): number =>
      nodes.reduce((acc, node) => acc + 1 + countNodes(node.children ?? []), 0)

    const countSecondLevel = (nodes: ReferralTreeNode[]): number =>
      nodes.reduce((acc, node) => acc + (node.children?.length ?? 0), 0)

    const snapshotDirectReferrals =
      accountSnapshot?.loyalty?.direct_referrals ?? []
    const referralTreeChildren = referralTree?.children ?? []
    const referralTreeCount = countNodes(referralTreeChildren)
    const snapshotTreeCount = countNodes(snapshotDirectReferrals)

    const directCount = Math.max(
      referralTree?.summary?.direct_count ?? 0,
      accountSnapshot?.loyalty?.referral_count ?? 0,
      snapshotDirectReferrals.length
    )
    const secondLevelCount = Math.max(
      referralTree?.summary?.second_level_count ?? 0,
      countSecondLevel(referralTreeChildren),
      countSecondLevel(snapshotDirectReferrals)
    )
    const totalNetwork = Math.max(
      referralTree?.summary?.total_network ?? 0,
      directCount + secondLevelCount,
      referralTreeCount,
      snapshotTreeCount
    )
    const networkPv =
      (referralTree?.summary as { total_pv?: number } | undefined)?.total_pv ??
      0
    const personalPv = accountSnapshot?.loyalty?.personal_pv ?? 0
    const totalPv = personalPv + networkPv

    return {
      directCount,
      secondLevelCount,
      totalNetwork,
      totalPv,
    }
  }, [
    accountSnapshot?.loyalty?.direct_referrals,
    accountSnapshot?.loyalty?.personal_pv,
    accountSnapshot?.loyalty?.referral_count,
    referralTree?.summary,
    referralTree?.children,
  ])
  const referralChildren = useMemo(() => {
    const treeChildren = referralTree?.children ?? []
    if (treeChildren.length > 0) return treeChildren

    return accountSnapshot?.loyalty?.direct_referrals ?? []
  }, [accountSnapshot?.loyalty?.direct_referrals, referralTree?.children])
  const celebrateLevelUp = searchParams.get("celebrate") === "level-up"
  const celebrateRank = Number(searchParams.get("rank") ?? effectiveRank ?? 0)
  const celebrateTier: MemberTier = rankToTier(
    Number.isFinite(celebrateRank) ? celebrateRank : effectiveRank
  )

  const setPasskeyError = useCallback((text: string) => {
    setProfileMsg({ type: "error", text })
    showErrorToast(text)
  }, [])

  const setPasskeySuccess = useCallback((text: string) => {
    setProfileMsg({ type: "success", text })
    showSuccessToast(text)
  }, [])

  const buildProfileFormState = useCallback(
    (): ProfileFormState => ({
      name: profileData?.name ?? session?.user?.name ?? "",
      email: profileData?.email ?? session?.user?.email ?? "",
      phone: profileData?.phone ?? "",
      username: profileData?.username ?? "",
      middle_name: profileData?.middle_name ?? "",
      birth_date: profileData?.birth_date ?? "",
      gender: (profileData?.gender as ProfileFormState["gender"]) ?? "",
      occupation: profileData?.occupation ?? "",
      work_location:
        (profileData?.work_location as ProfileFormState["work_location"]) ??
        "local",
      country: profileData?.country ?? "Philippines",
    }),
    [profileData, session]
  )

  useEffect(() => {
    setWebstoreForm((prev) => ({
      ...prev,
      fullName:
        prev.fullName || (profileData?.name ?? session?.user?.name ?? ""),
      username: prev.username || (profileData?.username ?? ""),
      email: prev.email || (profileData?.email ?? session?.user?.email ?? ""),
    }))
  }, [
    profileData?.name,
    profileData?.username,
    profileData?.email,
    session?.user?.name,
    session?.user?.email,
  ])

  useEffect(() => {
    if (!celebrateLevelUp) return

    const rankParam = searchParams.get("rank")
    const nextParams = new URLSearchParams()
    if (rankParam) {
      nextParams.set("rank", rankParam)
    }
    router.replace(
      `${levelUpBasePath}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
      { scroll: false }
    )
  }, [celebrateLevelUp, levelUpBasePath, router, searchParams])

  useEffect(() => {
    if (!profileData && !session) return
    if (!profileDraftDirtyRef.current) {
      setForm(buildProfileFormState())
    }
    setUsernameRequest(profileData?.username ?? "")
  }, [buildProfileFormState, profileData, session])

  useEffect(() => {
    if (!profileData) return
    setPrefs((prev) => ({
      ...prev,
      twoFactorEnabled: Boolean(profileData.two_factor_enabled),
    }))
    setTotpEnabled(Boolean(profileData.totp_enabled))
  }, [profileData?.two_factor_enabled, profileData?.totp_enabled, profileData])

  useEffect(() => {
    if (!isAddressModalOpen) return
    setAddressForm({
      address: profileData?.address ?? "",
      zipCode: profileData?.zip_code ?? "",
    })
  }, [profileData?.address, profileData?.zip_code, isAddressModalOpen])

  useEffect(() => {
    if (
      !isAddressModalOpen ||
      !profileData?.region ||
      phAddress.regions.length === 0 ||
      phAddress.regionCode
    )
      return
    const region = phAddress.regions.find(
      (item) => item.name === profileData.region
    )
    if (region) {
      phAddress.setRegion(region.code, region.name)
    }
  }, [
    profileData?.region,
    isAddressModalOpen,
    phAddress,
    phAddress.regions,
    phAddress.regionCode,
  ])

  useEffect(() => {
    if (
      !isAddressModalOpen ||
      !profileData?.province ||
      phAddress.noProvince ||
      phAddress.provinces.length === 0 ||
      phAddress.provinceCode
    )
      return
    const province = phAddress.provinces.find(
      (item) => item.name === profileData.province
    )
    if (province) {
      phAddress.setProvince(province.code, province.name)
    }
  }, [
    profileData?.province,
    isAddressModalOpen,
    phAddress,
    phAddress.provinces,
    phAddress.provinceCode,
    phAddress.noProvince,
  ])

  useEffect(() => {
    if (
      !isAddressModalOpen ||
      !profileData?.city ||
      phAddress.cities.length === 0 ||
      phAddress.cityCode
    )
      return
    const city = phAddress.cities.find((item) => item.name === profileData.city)
    if (city) {
      phAddress.setCity(city.code, city.name)
    }
  }, [
    profileData?.city,
    isAddressModalOpen,
    phAddress,
    phAddress.cities,
    phAddress.cityCode,
  ])

  useEffect(() => {
    if (
      !isAddressModalOpen ||
      !profileData?.barangay ||
      phAddress.address.barangay
    )
      return
    const barangay = phAddress.barangays.find(
      (item) => item.name === profileData.barangay
    )
    if (barangay) {
      phAddress.setBarangay(barangay.name)
    }
  }, [
    profileData?.barangay,
    isAddressModalOpen,
    phAddress,
    phAddress.barangays,
    phAddress.address.barangay,
  ])

  useEffect(() => {
    const requestedTab = resolveTabFromSearchParams(searchParams.get("tab"))
    setActiveTab((current) =>
      current === requestedTab ? current : requestedTab
    )
  }, [searchParams])

  const passwordChangeRequired = Boolean(
    session?.user?.passwordChangeRequired ||
    profileData?.password_change_required
  )
  const passwordChangeRequiredFromQuery =
    searchParams.get("password-change-required") === "1"

  // Auto-dismiss alert messages
  useEffect(() => {
    if (!profileMsg) return
    if (msgTimer.current) clearTimeout(msgTimer.current)
    msgTimer.current = setTimeout(() => setProfileMsg(null), 5000)
    return () => {
      if (msgTimer.current) clearTimeout(msgTimer.current)
    }
  }, [profileMsg])

  useEffect(() => {
    if (!usernameMsg) return
    if (usernameMsgTimer.current) clearTimeout(usernameMsgTimer.current)
    usernameMsgTimer.current = setTimeout(() => setUsernameMsg(null), 5000)
    return () => {
      if (usernameMsgTimer.current) clearTimeout(usernameMsgTimer.current)
    }
  }, [usernameMsg])

  useEffect(() => {
    if (!isAvatarPreviewOpen) return
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAvatarPreviewOpen(false)
        setAvatarZoom(1)
      }
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [isAvatarPreviewOpen])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
      if (avatarOriginalPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarOriginalPreviewUrl)
      }
    }
  }, [avatarPreviewUrl, avatarOriginalPreviewUrl])

  useEffect(() => {
    if (!referralMsg) return
    if (referralMsgTimer.current) clearTimeout(referralMsgTimer.current)
    referralMsgTimer.current = setTimeout(() => setReferralMsg(null), 3500)
    return () => {
      if (referralMsgTimer.current) clearTimeout(referralMsgTimer.current)
    }
  }, [referralMsg])

  useEffect(() => {
    const directChildren = referralChildren
    if (!directChildren.length) return
    const next: Record<number, boolean> = {}
    directChildren.forEach((node) => {
      next[node.id] = true
    })
    setExpandedTreeNodes(next)
  }, [referralChildren])

  const hasChanges = useMemo(
    () =>
      form.name !== (profileData?.name ?? session?.user?.name ?? "") ||
      form.phone !== (profileData?.phone ?? "") ||
      form.middle_name !== (profileData?.middle_name ?? "") ||
      form.birth_date !== (profileData?.birth_date ?? "") ||
      form.gender !==
        ((profileData?.gender as ProfileFormState["gender"]) ?? "") ||
      form.occupation !== (profileData?.occupation ?? "") ||
      form.work_location !==
        ((profileData?.work_location as ProfileFormState["work_location"]) ??
          "local") ||
      form.country !== (profileData?.country ?? "Philippines"),
    [
      profileData?.birth_date,
      profileData?.country,
      profileData?.gender,
      profileData?.middle_name,
      profileData?.name,
      profileData?.occupation,
      profileData?.phone,
      profileData?.work_location,
      form.birth_date,
      form.country,
      form.gender,
      form.middle_name,
      form.name,
      form.occupation,
      form.phone,
      form.work_location,
      session?.user?.name,
    ]
  )

  const verificationStatus = profileData?.verification_status ?? "not_verified"
  const isVerified =
    verificationStatus === "verified" || profileData?.account_status === 1
  const configuredAppUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "")
    .trim()
    .replace(/\/+$/, "")
  const runtimeOrigin = (
    typeof window !== "undefined" ? window.location.origin : ""
  )
    .trim()
    .replace(/\/+$/, "")
  const runtimeHostname =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase() : ""
  const isLocalHost =
    runtimeHostname === "localhost" ||
    runtimeHostname === "127.0.0.1" ||
    runtimeHostname === "[::1]"
  const siteOrigin = isLocalHost
    ? runtimeOrigin || "http://localhost:3000"
    : configuredAppUrl || runtimeOrigin || "http://localhost:3000"
  const referralCode = ((profileData?.username ?? form.username) || "").trim()
  const encodedReferralCode = encodeURIComponent(referralCode)
  const memberReferralLink = referralCode
    ? partnerSlug
      ? `${siteOrigin}/${partnerSlug}/login?mode=signup&ref=${encodedReferralCode}`
      : `${siteOrigin}/ref/${encodedReferralCode}`
    : ""
  const shoppingReferralLink = referralCode
    ? partnerSlug
      ? `${siteOrigin}/shop/${partnerSlug}?ref=${encodedReferralCode}`
      : `${siteOrigin}/shop?ref=${encodedReferralCode}`
    : ""
  const memberReferralQrUrl = useMemo(
    () =>
      memberReferralLink
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(memberReferralLink)}`
        : "",
    [memberReferralLink]
  )
  const shoppingReferralQrUrl = useMemo(
    () =>
      shoppingReferralLink
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shoppingReferralLink)}`
        : "",
    [shoppingReferralLink]
  )
  const profileActionStatus = isUploadingAvatar
    ? "Uploading profile photo..."
    : isSaving
      ? "Saving profile changes..."
      : isChangingPassword
        ? "Updating password..."
        : isUpdatingTwoFactor
          ? "Updating security settings..."
          : isSendingUsernameOtp
            ? "Sending username OTP..."
            : isSubmittingUsernameChange
              ? "Submitting username request..."
              : isRevokingSession
                ? "Signing out session..."
                : null
  const isProfileActionPending = Boolean(profileActionStatus)
  const verificationBadgeClass = (status?: string) => {
    if (status === "verified") return "bg-emerald-100 text-emerald-700"
    if (status === "pending_review") return "bg-sky-100 text-sky-700"
    if (status === "blocked") return "bg-red-100 text-red-700"
    return "bg-slate-100 text-slate-600"
  }

  const completion = useMemo(() => {
    return getProfileCompletion(
      profileData ?? {
        ...form,
        email: form.email,
        username: form.username,
        phone: form.phone,
        gender: form.gender || null,
      }
    ).percentage
  }, [form, isVerified, profileData])

  const profileRewardModalStorageKey = useMemo(() => {
    const profileId = profileData?.id
    return profileId
      ? `apsara.profileCompletionRewardModal.dismissed.${profileId}`
      : null
  }, [profileData?.id])

  useEffect(() => {
    if (
      completion < 100 ||
      !profileRewardModalStorageKey ||
      typeof window === "undefined"
    )
      return
    // Server-side flag is the source of truth so the modal never reappears on
    // any device once seen. localStorage is kept as an offline/legacy fallback.
    if (profileData?.profile_reward_modal_seen) return
    if (window.localStorage.getItem(profileRewardModalStorageKey) === "1")
      return

    const timeoutId = window.setTimeout(() => {
      setProfileRewardModalOpen(true)
    }, 550)

    return () => window.clearTimeout(timeoutId)
  }, [
    completion,
    profileRewardModalStorageKey,
    profileData?.profile_reward_modal_seen,
  ])

  const completionItems = useMemo(
    () => [
      {
        label: "Full Name",
        done: Boolean(form.name.trim()),
        hint: "Shown on your account and address records.",
      },
      {
        label: "Profile Photo",
        done: Boolean(effectiveAvatarUrl),
        hint: "Upload a clear photo so your account and referrals are easy to recognize.",
      },
      {
        label: "Username",
        done: Boolean((profileData?.username ?? form.username).trim()),
        hint: "Used for your referral links and account identity.",
      },
      {
        label: "Email Address",
        done: Boolean(form.email.trim()),
        hint: "This comes from your account registration.",
      },
      {
        label: "Phone Number",
        done: hasRealPhoneNumber(form.phone),
        hint: "Used for shipping and contact updates.",
      },
      {
        label: "Address",
        done: Boolean(
          profileData?.address?.trim() &&
          profileData?.barangay?.trim() &&
          profileData?.city?.trim() &&
          profileData?.province?.trim() &&
          profileData?.region?.trim() &&
          profileData?.zip_code?.trim()
        ),
        hint: "Street, region, city, barangay, and ZIP code.",
      },
      {
        label: "Personal Details",
        done: Boolean(
          form.birth_date.trim() &&
          form.gender &&
          form.occupation.trim() &&
          form.work_location &&
          (form.work_location === "local" || form.country.trim())
        ),
        hint: "Birth date, gender, occupation, work location, and country.",
      },
    ],
    [
      form.birth_date,
      form.country,
      form.email,
      form.gender,
      form.middle_name,
      form.name,
      form.occupation,
      form.phone,
      form.username,
      form.work_location,
      effectiveAvatarUrl,
      profileData?.address,
      profileData?.barangay,
      profileData?.city,
      profileData?.province,
      profileData?.region,
      profileData?.zip_code,
      profileData?.username,
    ]
  )

  const onChange =
    (field: keyof ProfileFormState) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => {
        profileDraftDirtyRef.current = true
        return { ...prev, [field]: e.target.value }
      })

  const onOptionalChange =
    (field: keyof ProfileFormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => {
        profileDraftDirtyRef.current = true
        return {
          ...prev,
          [field]: e.target.value as ProfileFormState[typeof field],
        }
      })

  const onWorkLocationChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextWorkLocation = e.target.value as ProfileFormState["work_location"]

    setForm((prev) => {
      profileDraftDirtyRef.current = true
      return {
        ...prev,
        work_location: nextWorkLocation,
        country:
          nextWorkLocation === "local"
            ? "Philippines"
            : prev.country === "Philippines"
              ? ""
              : prev.country,
      }
    })
  }

  const togglePref = (field: keyof PreferencesState) =>
    setPrefs((prev) =>
      typeof prev[field] === "boolean"
        ? { ...prev, [field]: !prev[field] }
        : prev
    )

  const handleToggleTwoFactor = async () => {
    const nextEnabled = !prefs.twoFactorEnabled
    const previousEnabled = prefs.twoFactorEnabled
    setPrefs((prev) => ({ ...prev, twoFactorEnabled: nextEnabled }))
    setIsUpdatingTwoFactor(true)
    setProfileMsg(null)

    try {
      await updateProfile({
        name:
          form.name.trim() ||
          profileData?.name ||
          session?.user?.name ||
          "AF Home User",
        phone: form.phone.trim() || undefined,
        two_factor_enabled: nextEnabled,
      }).unwrap()

      setProfileMsg({
        type: "success",
        text: `Two-factor authentication ${nextEnabled ? "enabled" : "disabled"} successfully.`,
      })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setPrefs((prev) => ({ ...prev, twoFactorEnabled: previousEnabled }))
      setProfileMsg({
        type: "error",
        text:
          apiError?.data?.message ||
          "Failed to update two-factor authentication.",
      })
    } finally {
      setIsUpdatingTwoFactor(false)
    }
  }

  const handleInitiateTotpSetup = async () => {
    setTotpError(null)
    setTotpLoading(true)
    try {
      const data = await setupTotp().unwrap()
      setTotpSetupData(data)
      setTotpCode("")
      setTotpModalOpen(true)
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setTotpError(
        apiError?.data?.message || "Failed to initiate authenticator setup."
      )
    } finally {
      setTotpLoading(false)
    }
  }

  const handleVerifyTotp = async () => {
    if (totpCode.length !== 6) {
      setTotpError("Please enter the 6-digit code from your authenticator app.")
      return
    }
    setTotpError(null)
    setTotpLoading(true)
    try {
      await enableTotp({ code: totpCode }).unwrap()
      setTotpEnabled(true)
      setTotpModalOpen(false)
      setTotpSetupData(null)
      setTotpCode("")
      showSuccessToast("Authenticator app enabled successfully.")
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setTotpError(apiError?.data?.message || "Invalid code. Please try again.")
    } finally {
      setTotpLoading(false)
    }
  }

  const handleDisableTotp = async () => {
    if (totpCode.length !== 6) {
      setTotpError("Please enter the 6-digit code from your authenticator app.")
      return
    }
    setTotpError(null)
    setTotpLoading(true)
    try {
      await disableTotp({ code: totpCode }).unwrap()
      setTotpEnabled(false)
      setTotpStep("idle")
      setTotpCode("")
      showSuccessToast("Authenticator app removed successfully.")
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setTotpError(apiError?.data?.message || "Invalid code. Please try again.")
    } finally {
      setTotpLoading(false)
    }
  }

  const handleConnectGoogle = async () => {
    setProfileMsg(null)
    const result = await openGoogleAuthPopup(form.email.toLowerCase().trim())

    if (!result.success) {
      setProfileMsg({ type: "error", text: result.error })
      return
    }

    try {
      await linkGoogleAccount({
        provider_id: result.provider_id,
        token: result.token,
        email: result.email,
        name: result.name,
      }).unwrap()

      await refetchLinkedAccounts()
      setGoogleLinkSuccess(true)
      setTimeout(() => setGoogleLinkSuccess(false), 3000)
      setProfileMsg({
        type: "success",
        text: "Google account linked successfully. You can now log in with Google.",
      })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string }; status?: number }
      if (apiError?.status === 409) {
        setProfileMsg({
          type: "error",
          text: "This Google account is already linked to another user.",
        })
      } else {
        setProfileMsg({
          type: "error",
          text: apiError?.data?.message || "Failed to link Google account.",
        })
      }
    }
  }

  const handleUnlinkGoogle = async () => {
    setProfileMsg(null)
    try {
      await unlinkGoogleAccount().unwrap()
      await refetchLinkedAccounts()
      setProfileMsg({
        type: "success",
        text: "Google account unlinked successfully.",
      })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setProfileMsg({
        type: "error",
        text: apiError?.data?.message || "Failed to unlink Google account.",
      })
    }
  }

  const handleConnectFacebook = async () => {
    setProfileMsg(null)
    const result = await openFacebookAuthPopup()

    if (!result.success) {
      setProfileMsg({ type: "error", text: result.error })
      return
    }

    try {
      await linkFacebookAccount({
        provider_id: result.provider_id,
        token: result.token,
        email: result.email,
        name: result.name,
      }).unwrap()

      await refetchLinkedAccounts()
      setFacebookLinkSuccess(true)
      setTimeout(() => setFacebookLinkSuccess(false), 3000)
      setProfileMsg({
        type: "success",
        text: "Facebook account linked successfully. You can now log in with Facebook.",
      })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string }; status?: number }
      if (apiError?.status === 409) {
        setProfileMsg({
          type: "error",
          text: "This Facebook account is already linked to another user.",
        })
      } else {
        setProfileMsg({
          type: "error",
          text: apiError?.data?.message || "Failed to link Facebook account.",
        })
      }
    }
  }

  const handleUnlinkFacebook = async () => {
    setProfileMsg(null)
    try {
      await unlinkFacebookAccount().unwrap()
      await refetchLinkedAccounts()
      setProfileMsg({
        type: "success",
        text: "Facebook account unlinked successfully.",
      })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setProfileMsg({
        type: "error",
        text: apiError?.data?.message || "Failed to unlink Facebook account.",
      })
    }
  }

  const handleCopyReferralLink = async (type: "member" | "shopping") => {
    const link = type === "member" ? memberReferralLink : shoppingReferralLink
    if (!link) {
      setReferralMsg({
        type: "error",
        text: "Referral link is unavailable. Set your username first.",
      })
      return
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea")
        textarea.value = link
        textarea.setAttribute("readonly", "")
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        textarea.style.pointerEvents = "none"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()

        const copied = document.execCommand("copy")
        document.body.removeChild(textarea)

        if (!copied) {
          throw new Error("Copy command failed")
        }
      } else {
        throw new Error("Clipboard unavailable")
      }

      setReferralMsg({
        type: "success",
        text:
          type === "member"
            ? "Signup referral link copied."
            : "Shopping referral link copied.",
      })
    } catch {
      setReferralMsg({ type: "error", text: "Failed to copy referral link." })
    }
  }

  const handleShareReferralLink = async (type: "member" | "shopping") => {
    const link = type === "member" ? memberReferralLink : shoppingReferralLink
    if (!link) {
      setReferralMsg({
        type: "error",
        text: "Referral link is unavailable. Set your username first.",
      })
      return
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title:
            type === "member"
              ? "Join AF Home"
              : "Shop with my AF Home referral link",
          text:
            type === "member"
              ? "Register using my affiliate referral link."
              : "Use my shopping referral link so your checkout already carries my affiliate code.",
          url: link,
        })
        return
      } catch {
        // no-op; fallback to copy
      }
    }

    await handleCopyReferralLink(type)
  }

  const toggleTreeNode = (id: number) => {
    setExpandedTreeNodes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const formatJoinedAt = (value?: string) => {
    if (!value) return "Joined date unavailable"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Joined date unavailable"
    return `Joined ${date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`
  }

  const collectTreeNodeIds = (nodes: ReferralTreeNode[]): number[] => {
    const ids: number[] = []
    nodes.forEach((node) => {
      ids.push(node.id)
      if ((node.children?.length ?? 0) > 0) {
        ids.push(...collectTreeNodeIds(node.children ?? []))
      }
    })
    return ids
  }

  const hasTreeFilters =
    treeSearchQuery.trim() !== "" || treeStatusFilter !== "all"

  const filteredReferralChildren = useMemo(() => {
    const sourceNodes = referralChildren
    const normalizedSearch = treeSearchQuery.trim().toLowerCase()

    const matchesNode = (node: ReferralTreeNode) => {
      const statusMatch =
        treeStatusFilter === "all" ||
        node.verification_status === treeStatusFilter
      if (!statusMatch) return false
      if (!normalizedSearch) return true
      const haystack =
        `${node.name} ${node.username} ${node.email}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    }

    const filterNodes = (nodes: ReferralTreeNode[]): ReferralTreeNode[] => {
      return nodes.reduce<ReferralTreeNode[]>((acc, node) => {
        const filteredChildren = filterNodes(node.children ?? [])
        const selfMatch = matchesNode(node)
        if (!selfMatch && filteredChildren.length === 0) return acc

        acc.push({
          ...node,
          children: filteredChildren,
          children_count: filteredChildren.length,
        })
        return acc
      }, [])
    }

    return filterNodes(sourceNodes)
  }, [referralChildren, treeSearchQuery, treeStatusFilter])

  const handleExpandAllTreeNodes = () => {
    const allIds = collectTreeNodeIds(filteredReferralChildren)
    if (!allIds.length) return
    const next: Record<number, boolean> = {}
    allIds.forEach((id) => {
      next[id] = true
    })
    setExpandedTreeNodes(next)
  }

  const handleCollapseAllTreeNodes = () => {
    setExpandedTreeNodes({})
  }

  const renderReferralNode = (
    node: ReferralTreeNode,
    level = 0
  ): React.ReactNode => {
    const children = node.children ?? []
    const hasChildren = children.length > 0
    const nodePv = node.total_pv ?? node.total_earnings ?? 0
    const isExpanded = hasTreeFilters
      ? true
      : (expandedTreeNodes[node.id] ?? level < 1)
    const levelClass =
      level === 0
        ? "border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800"
        : "border-purple-100 dark:border-purple-800 bg-slate-50/60 dark:bg-gray-800/60"
    const nameClass =
      level === 0
        ? "text-slate-800 dark:text-gray-200"
        : "text-slate-700 dark:text-gray-300"

    return (
      <div key={`${node.id}-${level}`} className="relative">
        {level > 0 && (
          <span className="pointer-events-none absolute top-5 -left-3 h-px w-3 bg-purple-200" />
        )}
        <div className={`rounded-xl border px-3 py-2.5 ${levelClass}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`truncate text-xs font-semibold ${nameClass}`}>
                {node.name}
                {node.username ? ` (@${node.username})` : ""}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400 dark:text-gray-500">
                {node.email || "No email"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400 dark:text-gray-500">
                {formatJoinedAt(node.joined_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${verificationBadgeClass(node.verification_status)}`}
              >
                {node.verification_status}
              </span>
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => toggleTreeNode(node.id)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-purple-200 bg-white text-purple-600 transition-colors hover:bg-purple-50 dark:border-purple-700 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
                  aria-label={
                    isExpanded
                      ? "Collapse referral node"
                      : "Expand referral node"
                  }
                >
                  <Icon.ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-[10px]">
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700">
              PV {Number(nodePv).toLocaleString()}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">
              {node.children_count ?? children.length} downline
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="relative mt-2 ml-3 space-y-2 border-l border-purple-200 pl-3">
            {children.map((child) => renderReferralNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const verificationColor = (status?: string) => {
    if (status === "verified")
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-400",
      }
    if (status === "pending_review")
      return {
        bg: "bg-sky-50",
        text: "text-sky-700",
        border: "border-sky-200",
        dot: "bg-sky-400",
      }
    if (status === "blocked")
      return {
        bg: "bg-red-50",
        text: "text-red-600",
        border: "border-red-200",
        dot: "bg-red-400",
      }
    return {
      bg: "bg-slate-100",
      text: "text-slate-500",
      border: "border-slate-200",
      dot: "bg-slate-400",
    }
  }

  const getNodeInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? "")
      .join("")

  const renderReferralNodeFull = (
    node: ReferralTreeNode,
    level = 0
  ): React.ReactNode => {
    const children = node.children ?? []
    const hasChildren = children.length > 0
    const nodePv = node.total_pv ?? node.total_earnings ?? 0
    const isExpanded = hasTreeFilters
      ? true
      : (expandedTreeNodes[node.id] ?? level < 1)
    const vc = verificationColor(node.verification_status)
    const nodeInitials = getNodeInitials(node.name || "AF")
    const avatarUrl = node.avatar_url?.trim()
    const avatarGradients = [
      "from-violet-500 to-purple-600",
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-rose-500 to-pink-600",
    ]
    const avatarGradient = avatarGradients[level % avatarGradients.length]

    const statusLabel =
      node.verification_status === "pending_review"
        ? "Pending"
        : node.verification_status === "not_verified"
          ? "Unverified"
          : node.verification_status === "verified"
            ? "Verified"
            : node.verification_status === "blocked"
              ? "Blocked"
              : "Unverified"

    return (
      <motion.div
        key={`full-${node.id}-${level}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative"
      >
        {level > 0 && (
          <span className="pointer-events-none absolute top-7 -left-4 h-px w-4 bg-purple-200 dark:bg-purple-900/50" />
        )}
        <div
          className={`group rounded-2xl border transition-all duration-200 hover:shadow-md ${level === 0 ? "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800" : "border-slate-100 bg-slate-50/70 dark:border-slate-700 dark:bg-gray-800/70"}`}
        >
          <div className="flex items-center gap-3 p-3.5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={
                    node.name
                      ? `${node.name} profile photo`
                      : "Referral profile photo"
                  }
                  className="h-11 w-11 rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white ${avatarGradient} shadow-sm`}
                >
                  {nodeInitials}
                </div>
              )}
              <span
                className={`absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${vc.dot}`}
              />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-gray-200">
                      {node.name || "Unknown"}
                    </p>
                    {node.username && (
                      <span className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-gray-500">
                        @{node.username}
                      </span>
                    )}
                    {level > 0 && (
                      <span className="shrink-0 rounded-full border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-500">
                        L{level + 1}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-gray-500">
                    {node.email || "No email"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${vc.bg} ${vc.text} ${vc.border}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${vc.dot}`} />
                    {statusLabel}
                  </span>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => toggleTreeNode(node.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-500 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:border-purple-600 dark:hover:bg-purple-900/30 dark:hover:text-purple-400"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      <Icon.ChevronRight
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                  PV {Number(nodePv).toLocaleString()}
                </span>
                {(node.children_count ?? children.length) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-purple-100 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-600">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {node.children_count ?? children.length} downline
                  </span>
                )}
                {node.joined_at && (
                  <span className="text-[11px] text-slate-400">
                    {new Date(node.joined_at).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {hasChildren && isExpanded && (
            <motion.div
              key={`children-${node.id}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="relative mt-1.5 ml-6 space-y-1.5 border-l-2 border-purple-100 pt-1 pl-4 dark:border-purple-900/40">
                {children.map((child) =>
                  renderReferralNodeFull(child, level + 1)
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    try {
      await updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        middle_name: form.middle_name.trim() || undefined,
        birth_date: form.birth_date.trim() || undefined,
        gender: form.gender || undefined,
        occupation: form.occupation.trim() || undefined,
        work_location: form.work_location || undefined,
        country: form.country.trim() || undefined,
      }).unwrap()
      profileDraftDirtyRef.current = false
      const successMessage =
        "Profile updated successfully. Your complete information was saved."
      setProfileMsg({ type: "success", text: successMessage })
      showSuccessToast(successMessage)
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setProfileMsg({
        type: "error",
        text: apiError?.data?.message || "Failed to update profile.",
      })
    }
  }

  const handleOpenAddressModal = () => {
    setProfileMsg(null)
    phAddress.reset()
    setIsAddressModalOpen(true)
  }

  const handleCloseAddressModal = () => {
    phAddress.reset()
    setIsAddressModalOpen(false)
  }

  const handleSaveAddress = async (e: FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      middle_name: form.middle_name.trim() || undefined,
      birth_date: form.birth_date.trim() || undefined,
      gender: form.gender || undefined,
      occupation: form.occupation.trim() || undefined,
      work_location: form.work_location || undefined,
      country: form.country.trim() || undefined,
      address: addressForm.address.trim() || undefined,
      barangay: phAddress.address.barangay || undefined,
      city: phAddress.address.city || undefined,
      province: phAddress.noProvince
        ? phAddress.address.region || undefined
        : phAddress.address.province || undefined,
      region: phAddress.address.region || undefined,
      zip_code: addressForm.zipCode.trim() || undefined,
    }

    setIsSavingAddressDetails(true)
    setIsAddressModalOpen(false)

    try {
      await updateProfile(payload).unwrap()

      profileDraftDirtyRef.current = false
      const successMessage =
        "Address updated successfully. Your profile information was saved too."
      setProfileMsg({ type: "success", text: successMessage })
      showSuccessToast(successMessage)
      phAddress.reset()
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setProfileMsg({
        type: "error",
        text: apiError?.data?.message || "Failed to update address.",
      })
    } finally {
      setIsSavingAddressDetails(false)
    }
  }

  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setAvatarOriginalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current)
      return objectUrl
    })
    setCropSrc(objectUrl)
    e.target.value = ""
  }

  const handleCropConfirm = useCallback(
    async (blob: Blob) => {
      setCropSrc(null)
      setProfileMsg(null)
      const localPreviewUrl = URL.createObjectURL(blob)
      setAvatarPreviewUrl((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current)
        return localPreviewUrl
      })
      setIsUploadingAvatar(true)
      try {
        const formData = new FormData()
        formData.append("file", blob, "avatar.jpg")
        if (partnerSlug) {
          formData.append("require_cloudinary", "1")
        }
        const uploadResult = await uploadAvatar(formData).unwrap()
        setAvatarPreviewUrl((current) => {
          if (current?.startsWith("blob:")) URL.revokeObjectURL(current)
          return normalizeAvatarUrl(uploadResult.avatar_url || null) || null
        })
        setAvatarOriginalPreviewUrl((current) => {
          if (current?.startsWith("blob:")) URL.revokeObjectURL(current)
          return (
            normalizeAvatarUrl(
              uploadResult.avatar_original_url ||
                uploadResult.avatar_url ||
                null
            ) || null
          )
        })
        await Promise.allSettled([
          refetchMe(),
          refetchAccountSnapshot(),
          refetchReferralTree(),
        ])
        profileDraftDirtyRef.current = false
        setProfileMsg({
          type: "success",
          text: uploadResult.message || "Profile photo updated successfully.",
        })
      } catch (err: unknown) {
        setAvatarPreviewUrl((current) => {
          if (current?.startsWith("blob:")) URL.revokeObjectURL(current)
          return null
        })
        setAvatarOriginalPreviewUrl((current) => {
          if (current?.startsWith("blob:")) URL.revokeObjectURL(current)
          return null
        })
        const error = err as {
          message?: string
          error?: string
          data?: { message?: string; errors?: Record<string, string[]> }
        }
        const firstValidation = error?.data?.errors
          ? Object.values(error.data.errors)[0]?.[0]
          : undefined
        const errorText =
          firstValidation ||
          error?.data?.message ||
          error?.error?.replace(/^TypeError:\s*/i, "") ||
          error?.message ||
          "Failed to upload profile photo."
        setProfileMsg({ type: "error", text: errorText })
      } finally {
        setIsUploadingAvatar(false)
      }
    },
    [
      avatarOriginalPreviewUrl,
      normalizeAvatarUrl,
      refetchAccountSnapshot,
      refetchMe,
      refetchReferralTree,
      uploadAvatar,
    ]
  )

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setAvatarOriginalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current)
      return null
    })
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (!security.currentPassword)
      return setPwError("Please enter your current password.")
    if (security.newPassword.length < 8)
      return setPwError("New password must be at least 8 characters.")
    if (
      !/[A-Z]/.test(security.newPassword) ||
      !/[a-z]/.test(security.newPassword) ||
      !/[0-9]/.test(security.newPassword) ||
      !/[^A-Za-z0-9]/.test(security.newPassword)
    ) {
      return setPwError(
        "New password must include uppercase, lowercase, number, and special character."
      )
    }
    if (security.newPassword !== security.confirmPassword)
      return setPwError("Passwords do not match.")

    try {
      await changePassword({
        current_password: security.currentPassword,
        new_password: security.newPassword,
        new_password_confirmation: security.confirmPassword,
      }).unwrap()

      await updateSession?.({ passwordChangeRequired: false })
      setPwSuccess(true)
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" })

      if (passwordChangeRequired || passwordChangeRequiredFromQuery) {
        setTimeout(() => {
          setPwSuccess(false)
          router.replace("/shop")
        }, 1200)
        return
      }

      setTimeout(() => setPwSuccess(false), 5000)
    } catch (err: unknown) {
      const apiError = err as {
        data?: { message?: string; errors?: Record<string, string[]> }
      }
      const firstFieldError = Object.values(
        apiError?.data?.errors ?? {}
      )[0]?.[0]
      setPwError(
        firstFieldError ||
          apiError?.data?.message ||
          "Failed to update password."
      )
    }
  }

  const webstoreDraftStorageKey = "afhome:webstore-payment-draft:v1"
  const webstorePaymentSessionStorageKey = "afhome:webstore-payment-session:v1"
  const webstorePaymentContextStorageKey = "afhome:webstore-payment-context:v1"
  const webstorePaymentStatus = (
    searchParams.get("webstore_payment") || ""
  ).toLowerCase()
  const webstoreCheckoutId = searchParams.get("checkout_id") || ""
  const webstorePaymentMode = (
    searchParams.get("payment_mode") || ""
  ).toLowerCase()

  const latestWebstoreRequest = useMemo(() => {
    const backendRequest = webstoreRequestLatest?.request ?? null
    if (!backendRequest) return webstoreLatestRequestPreview ?? null
    if (!webstoreLatestRequestPreview) return backendRequest

    return {
      ...webstoreLatestRequestPreview,
      ...backendRequest,
      slug_name:
        backendRequest.slug_name ||
        webstoreLatestRequestPreview.slug_name ||
        null,
      display_name:
        backendRequest.display_name ||
        webstoreLatestRequestPreview.display_name ||
        null,
      billing_option:
        backendRequest.billing_option ||
        webstoreLatestRequestPreview.billing_option ||
        null,
      payment_method:
        normalizeWebstorePaymentMethod(backendRequest.payment_method) ??
        webstoreLatestRequestPreview.payment_method ??
        selectedPaymentMethod ??
        null,
    }
  }, [
    selectedPaymentMethod,
    webstoreLatestRequestPreview,
    webstoreRequestLatest?.request,
  ])

  const latestUsernameRequest = usernameChangeLatest?.request ?? null
  const activeWebstoreRequest =
    latestWebstoreRequest?.status === "pending_review" ||
    latestWebstoreRequest?.status === "approved"
      ? latestWebstoreRequest
      : null
  const isDeletedWebstoreRequest = latestWebstoreRequest?.status === "deleted"
  const hasExistingWebstoreRequest = Boolean(activeWebstoreRequest)
  const shouldPrefillWebstoreStorefrontFields = hasExistingWebstoreRequest
  const shouldHydrateWebstoreDraft =
    hasExistingWebstoreRequest || Boolean(webstoreLatestRequestPreview)

  const webstoreTransactions = useMemo(() => {
    const fromHistory = webstoreHistoryData?.requests ?? []
    if (fromHistory.length > 0) return getWebstoreHistoryRows(fromHistory)
    if (activeWebstoreRequest)
      return getWebstoreHistoryRows([activeWebstoreRequest])
    return []
  }, [webstoreHistoryData?.requests, activeWebstoreRequest])
  const WEBSTORE_HISTORY_PAGE_SIZE = 3
  const webstoreHistoryTotalPages = Math.max(
    1,
    Math.ceil(webstoreTransactions.length / WEBSTORE_HISTORY_PAGE_SIZE)
  )
  const webstoreHistoryPageRows = useMemo(
    () =>
      webstoreTransactions.slice(
        (webstoreHistoryPage - 1) * WEBSTORE_HISTORY_PAGE_SIZE,
        webstoreHistoryPage * WEBSTORE_HISTORY_PAGE_SIZE
      ),
    [webstoreHistoryPage, webstoreTransactions]
  )
  useEffect(() => {
    setWebstoreHistoryPage((current) =>
      Math.min(current, webstoreHistoryTotalPages)
    )
  }, [webstoreHistoryTotalPages])
  const isApprovedWebstoreRequest = activeWebstoreRequest?.status === "approved"
  const isWebstoreExpired =
    isApprovedWebstoreRequest &&
    (() => {
      const expiry = getWebstoreSubscriptionExpiry(activeWebstoreRequest!)
      return expiry !== null && expiry < new Date()
    })()
  const storedWebstorePaymentContext = useMemo<{
    checkoutId?: string | null
    paymentMethod?: WebstorePaymentMethod | null
    fullName?: string | null
    username?: string | null
    email?: string | null
    slugName?: string | null
    displayName?: string | null
    selectedWebstorePlan?: "test" | "quarterly" | "semiAnnual" | "annual" | null
    selectedBillingOption?: "full" | "monthly" | null
    webstoreRenewalEnabled?: boolean
  } | null>(() => {
    if (typeof window === "undefined") return null
    if (isDeletedWebstoreRequest) return null
    const candidates = [
      window.sessionStorage.getItem(webstorePaymentContextStorageKey),
      window.localStorage.getItem(webstorePaymentContextStorageKey),
    ].filter(Boolean) as string[]

    for (const raw of candidates) {
      try {
        const parsed = JSON.parse(raw) as {
          checkoutId?: string | null
          paymentMethod?: WebstorePaymentMethod | null
          fullName?: string | null
          username?: string | null
          email?: string | null
          slugName?: string | null
          displayName?: string | null
          selectedWebstorePlan?:
            | "test"
            | "quarterly"
            | "semiAnnual"
            | "annual"
            | null
          selectedBillingOption?: "full" | "monthly" | null
          webstoreRenewalEnabled?: boolean
        }
        const storedCheckoutId = String(parsed.checkoutId ?? "").trim()
        const currentCheckoutId = String(
          webstoreCheckoutId ||
            window.sessionStorage.getItem("last_checkout_id") ||
            window.localStorage.getItem("last_checkout_id") ||
            ""
        ).trim()
        if (
          storedCheckoutId &&
          currentCheckoutId &&
          storedCheckoutId !== currentCheckoutId
        )
          continue
        return parsed
      } catch {
        // ignore bad cache
      }
    }

    return null
  }, [
    isDeletedWebstoreRequest,
    webstoreCheckoutId,
    webstorePaymentContextStorageKey,
  ])
  const requestPlan =
    latestWebstoreRequest?.plan === "semi_annual"
      ? "semiAnnual"
      : latestWebstoreRequest?.plan === "quarterly" ||
          latestWebstoreRequest?.plan === "annual" ||
          latestWebstoreRequest?.plan === "test"
        ? latestWebstoreRequest.plan
        : null

  const resolvedWebstorePlan =
    selectedWebstorePlan ??
    webstorePaymentSubmissionSnapshot?.selectedWebstorePlan ??
    storedWebstorePaymentContext?.selectedWebstorePlan ??
    requestPlan ??
    null
  const resolvedWebstoreBillingOption =
    selectedBillingOption ??
    webstorePaymentSubmissionSnapshot?.selectedBillingOption ??
    storedWebstorePaymentContext?.selectedBillingOption ??
    activeWebstoreRequest?.billing_option ??
    null
  const resolvedWebstorePaymentMethod =
    normalizeWebstorePaymentMethod(activeWebstoreRequest?.payment_method) ??
    webstorePaymentMethodSnapshot ??
    storedWebstorePaymentContext?.paymentMethod ??
    selectedPaymentMethod ??
    null
  const webstoreContactFullName =
    activeWebstoreRequest?.full_name?.trim() ||
    webstoreForm.fullName.trim() ||
    profileData?.name?.trim() ||
    session?.user?.name?.trim() ||
    ""
  const webstoreContactUsername =
    activeWebstoreRequest?.username?.trim() ||
    webstoreForm.username.trim() ||
    profileData?.username?.trim() ||
    ""
  const webstoreContactEmail =
    activeWebstoreRequest?.email?.trim() ||
    webstoreForm.email.trim() ||
    profileData?.email?.trim() ||
    session?.user?.email?.trim() ||
    ""
  const latestWebstoreRejectionMessage =
    latestWebstoreRequest?.status === "rejected"
      ? latestWebstoreRequest.latest_receipt_message ||
        "Your payment has been rejected by the admin due to mismatch ID."
      : null
  const isWebstoreRequestPendingReview =
    activeWebstoreRequest?.status === "pending_review"
  const isWebstoreReceiptPendingReview =
    isWebstoreRequestPendingReview ||
    activeWebstoreRequest?.latest_receipt_status === "pending_review"
  const isWebstoreReceiptRejected =
    activeWebstoreRequest?.latest_receipt_status === "rejected"
  const isWebstoreReceiptRetryFlow =
    isWebstoreReceiptPendingReview || isWebstoreReceiptRejected
  const rejectedWebstoreReceiptUrls =
    activeWebstoreRequest?.latest_receipt_status === "rejected"
      ? (
          activeWebstoreRequest.latest_receipt_urls ??
          activeWebstoreRequest.receipt_urls ??
          []
        )
          .map((url) => String(url).trim())
          .filter(Boolean)
      : []
  const webstoreReceiptGalleryItems = useMemo(() => {
    const rejectedItems = rejectedWebstoreReceiptUrls.map((url, index) => ({
      key: `rejected-${index}-${url}`,
      name: `Rejected receipt ${index + 1}`,
      src: url,
      kind: "rejected" as const,
    }))
    const selectedItems = webstoreReceiptFiles.map((file, index) => ({
      key: `selected-${index}-${file.preview}`,
      name: file.name,
      src: file.preview,
      kind: "selected" as const,
      fileIndex: index,
    }))
    const hiddenRejected = new Set(dismissedRejectedReceiptKeys)
    return [...rejectedItems, ...selectedItems].filter(
      (item) => !hiddenRejected.has(item.key)
    )
  }, [
    dismissedRejectedReceiptKeys,
    rejectedWebstoreReceiptUrls,
    webstoreReceiptFiles,
  ])
  const hasRejectedWebstoreReceipts = webstoreReceiptGalleryItems.some(
    (item) => item.kind === "rejected"
  )
  const hiddenWebstoreHistoryRequest = useMemo(() => {
    if (activeWebstoreRequest) return null
    const currentSlug = webstoreForm.slugName.trim().toLowerCase()
    const currentDisplay = webstoreForm.displayName.trim().toLowerCase()
    if (!currentSlug && !currentDisplay) return null
    return (
      (webstoreHistoryData?.requests ?? []).find((request) => {
        if (
          !request ||
          (request.status !== "deleted" && request.status !== "rejected")
        )
          return false
        const requestSlug = String(request.slug_name ?? "")
          .trim()
          .toLowerCase()
        const requestDisplay = String(request.display_name ?? "")
          .trim()
          .toLowerCase()
        return (
          (currentSlug && requestSlug === currentSlug) ||
          (currentDisplay && requestDisplay === currentDisplay)
        )
      }) ?? null
    )
  }, [
    activeWebstoreRequest,
    webstoreForm.displayName,
    webstoreForm.slugName,
    webstoreHistoryData?.requests,
  ])
  const shouldHideDeletedWebstoreFields = Boolean(hiddenWebstoreHistoryRequest)

  useEffect(() => {
    if (!latestWebstoreRequest) return

    if (
      latestWebstoreRequest.status === "deleted" ||
      latestWebstoreRequest.status === "rejected"
    ) {
      setWebstoreForm((prev) => ({
        ...prev,
        slugName: "",
        displayName: "",
      }))
      setSelectedWebstorePlan(null)
      setSelectedBillingOption(null)
      setSelectedPaymentMethod(null)
      setWebstorePaymentMethodSnapshot(null)
      setWebstoreAcceptedTerms(false)
      setWebstoreRenewalEnabled(false)
      setWebstoreLatestRequestPreview(null)
      setWebstorePaymentSubmissionSnapshot(null)
      setWebstoreMsg(null)
      setWebstoreInvalidFields({})
      setWebstorePaymentProofUrl(null)
      setWebstorePaymentReferenceId(null)
      setWebstorePaymentIntentId(null)
      setWebstorePaymentCheckoutId(null)
      setWebstoreSuccessModalOpen(false)
      setWebstoreReceiptUploadModalOpen(false)
      setWebstoreReceiptPreview(null)
      setWebstoreReceiptFiles((prev) => {
        prev.forEach((file) => {
          if (file.preview.startsWith("blob:")) {
            URL.revokeObjectURL(file.preview)
          }
        })
        return []
      })
      setDismissedRejectedReceiptKeys([])
      webstorePaymentMethodTouchedRef.current = false
      webstoreStorefrontFieldsEditedRef.current = false
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(webstorePaymentSessionStorageKey)
        window.localStorage.removeItem(webstoreDraftStorageKey)
        window.sessionStorage.removeItem(webstorePaymentContextStorageKey)
        window.localStorage.removeItem(webstorePaymentContextStorageKey)
      }
      return
    }

    setWebstoreForm((prev) => ({
      ...prev,
      fullName: latestWebstoreRequest.full_name || prev.fullName,
      username: latestWebstoreRequest.username || prev.username,
      email: latestWebstoreRequest.email || prev.email,
      slugName: latestWebstoreRequest.slug_name || prev.slugName,
      displayName: latestWebstoreRequest.display_name || prev.displayName,
    }))

    if (!selectedWebstorePlan && requestPlan) {
      setSelectedWebstorePlan(requestPlan)
    }
    if (
      !selectedBillingOption &&
      (latestWebstoreRequest.billing_option === "full" ||
        latestWebstoreRequest.billing_option === "monthly")
    ) {
      setSelectedBillingOption(latestWebstoreRequest.billing_option)
    }
    const normalizedRequestMethod = normalizeWebstorePaymentMethod(
      latestWebstoreRequest.payment_method
    )
    if (!webstorePaymentMethodTouchedRef.current && normalizedRequestMethod) {
      setSelectedPaymentMethod(normalizedRequestMethod)
    }
    if (latestWebstoreRequest.status === "approved") {
      setWebstoreAcceptedTerms(true)
    }
  }, [
    latestWebstoreRequest,
    requestPlan,
    selectedBillingOption,
    selectedPaymentMethod,
    selectedWebstorePlan,
  ])

  useEffect(() => {
    if (!storedWebstorePaymentContext) return
    if (!shouldPrefillWebstoreStorefrontFields) return

    setWebstoreForm((prev) => ({
      ...prev,
      fullName: storedWebstorePaymentContext.fullName || prev.fullName,
      username: storedWebstorePaymentContext.username || prev.username,
      email: storedWebstorePaymentContext.email || prev.email,
      slugName: shouldPrefillWebstoreStorefrontFields
        ? storedWebstorePaymentContext.slugName || prev.slugName
        : "",
      displayName: shouldPrefillWebstoreStorefrontFields
        ? storedWebstorePaymentContext.displayName || prev.displayName
        : "",
    }))

    if (storedWebstorePaymentContext.selectedWebstorePlan) {
      setSelectedWebstorePlan(storedWebstorePaymentContext.selectedWebstorePlan)
    }
    if (storedWebstorePaymentContext.selectedBillingOption) {
      setSelectedBillingOption(
        storedWebstorePaymentContext.selectedBillingOption
      )
    }
    if (
      typeof storedWebstorePaymentContext.webstoreRenewalEnabled === "boolean"
    ) {
      setWebstoreRenewalEnabled(
        storedWebstorePaymentContext.webstoreRenewalEnabled
      )
    }
    if (storedWebstorePaymentContext.paymentMethod) {
      setSelectedPaymentMethod(storedWebstorePaymentContext.paymentMethod)
      setWebstorePaymentMethodSnapshot(
        storedWebstorePaymentContext.paymentMethod
      )
    }
    setWebstoreAcceptedTerms(true)
  }, [shouldPrefillWebstoreStorefrontFields, storedWebstorePaymentContext])

  const hasPendingUsernameRequest =
    isUsernamePendingLocal || latestUsernameRequest?.status === "pending_review"
  const pendingRequestedUsername =
    latestUsernameRequest?.requested_username || usernameRequest.trim()
  const selectedWebstorePaymentAmount = useMemo(() => {
    const planAmounts: Record<
      "test" | "quarterly" | "semiAnnual" | "annual",
      { full: number; monthly: number }
    > = {
      test: { full: 1, monthly: 1 },
      quarterly: { full: 48000, monthly: 16000 },
      semiAnnual: { full: 90000, monthly: 15000 },
      annual: { full: 150000, monthly: 12500 },
    }
    if (!resolvedWebstorePlan || !resolvedWebstoreBillingOption) return null
    const baseAmount =
      planAmounts[resolvedWebstorePlan]?.[
        resolvedWebstoreBillingOption === "monthly" ? "monthly" : "full"
      ]
    const requestRemaining = Number(
      activeWebstoreRequest?.remaining_balance ?? NaN
    )
    if (
      activeWebstoreRequest?.status === "approved" &&
      resolvedWebstoreBillingOption === "full" &&
      Number.isFinite(requestRemaining) &&
      requestRemaining > 0
    ) {
      return requestRemaining
    }
    return typeof baseAmount === "number" ? baseAmount : null
  }, [
    activeWebstoreRequest?.remaining_balance,
    activeWebstoreRequest?.status,
    resolvedWebstoreBillingOption,
    resolvedWebstorePlan,
  ])
  const selectedWebstoreSubscriptionFee = useMemo(() => {
    const fullFees: Record<
      "test" | "quarterly" | "semiAnnual" | "annual",
      number
    > = {
      test: 1,
      quarterly: 48000,
      semiAnnual: 90000,
      annual: 150000,
    }
    if (!resolvedWebstorePlan) return null
    return fullFees[resolvedWebstorePlan] ?? null
  }, [resolvedWebstorePlan])
  const webstoreRemainingBalance = useMemo(() => {
    // For expired subscriptions with renewal enabled, ignore the old paid balance and use the new plan's fee.
    if (!(isWebstoreExpired && webstoreRenewalEnabled)) {
      const requestRemaining = Number(
        activeWebstoreRequest?.remaining_balance ?? NaN
      )
      if (Number.isFinite(requestRemaining)) {
        return Math.max(0, requestRemaining)
      }
    }
    if (selectedWebstoreSubscriptionFee != null) {
      return Math.max(0, selectedWebstoreSubscriptionFee)
    }
    return 0
  }, [
    isWebstoreExpired,
    webstoreRenewalEnabled,
    activeWebstoreRequest?.remaining_balance,
    selectedWebstoreSubscriptionFee,
  ])
  const webstorePlanLabel =
    resolvedWebstorePlan === "test"
      ? "Test"
      : resolvedWebstorePlan === "quarterly"
        ? "Quarterly"
        : resolvedWebstorePlan === "semiAnnual"
          ? "Semi-Annual"
          : resolvedWebstorePlan === "annual"
            ? "Annual"
            : "-"
  const webstoreTermLabel =
    resolvedWebstorePlan === "test"
      ? "2 days"
      : resolvedWebstorePlan === "quarterly"
        ? "3 months"
        : resolvedWebstorePlan === "semiAnnual"
          ? "6 months"
          : resolvedWebstorePlan === "annual"
            ? "Yearly"
            : "-"
  const webstoreMonthlyPay = useMemo(() => {
    const monthlyFees: Record<
      "test" | "quarterly" | "semiAnnual" | "annual",
      number
    > = {
      test: 1,
      quarterly: 16000,
      semiAnnual: 15000,
      annual: 12500,
    }
    if (!resolvedWebstorePlan) return null
    return monthlyFees[resolvedWebstorePlan] ?? null
  }, [resolvedWebstorePlan])
  const webstorePaymentBreakdownLabel =
    resolvedWebstoreBillingOption === "monthly"
      ? "Monthly Pay"
      : resolvedWebstoreBillingOption === "full"
        ? "Amount Due"
        : "Payment Due"
  const webstorePaymentBreakdownValue =
    resolvedWebstoreBillingOption === "full"
      ? webstoreRemainingBalance
      : webstoreMonthlyPay
  const webstoreBillingLabel =
    resolvedWebstoreBillingOption === "monthly"
      ? "Monthly Installment"
      : resolvedWebstoreBillingOption === "full"
        ? "Full Payment"
        : "-"
  const webstorePaymentMethodLabel = resolvedWebstorePaymentMethod
    ? getWebstorePaymentMethodConfig(resolvedWebstorePaymentMethod).label
    : "-"
  const isAfuser =
    (profileData?.username ?? "").trim().toLowerCase() === "afuser"
  const webstorePaymentCompleted = Boolean(
    webstorePaymentReferenceId || webstorePaymentProofUrl
  )
  const isRenewalToggleLocked = hasExistingWebstoreRequest && !isWebstoreExpired
  const isWebstoreSubscriptionLocked =
    hasExistingWebstoreRequest && !(isWebstoreExpired && webstoreRenewalEnabled)
  const currentPlanKey =
    activeWebstoreRequest?.plan === "semi_annual"
      ? ("semiAnnual" as const)
      : ((activeWebstoreRequest?.plan ?? null) as
          | "test"
          | "quarterly"
          | "annual"
          | null)
  const isRenewalMode = Boolean(isWebstoreExpired && webstoreRenewalEnabled)
  const isSamePlanRenewal =
    isRenewalMode &&
    Boolean(currentPlanKey) &&
    resolvedWebstorePlan === currentPlanKey
  const isPlanChangeRenewal =
    isRenewalMode &&
    resolvedWebstorePlan !== null &&
    resolvedWebstorePlan !== currentPlanKey
  const planDisplayName = (key: string | null) => {
    if (key === "test") return "Test"
    if (key === "quarterly") return "Quarterly"
    if (key === "semiAnnual") return "Semi-Annual"
    if (key === "annual") return "Annual"
    return key ?? "-"
  }
  const hasWebstorePaymentHistory =
    Number(activeWebstoreRequest?.payment_count ?? 0) > 0 ||
    Number(activeWebstoreRequest?.total_paid_amount ?? 0) > 0
  const resolvedWebstoreSubmissionForm = useMemo<WebstoreRequestFormState>(
    () => ({
      fullName: (
        webstoreContactFullName ||
        storedWebstorePaymentContext?.fullName ||
        webstoreForm.fullName ||
        ""
      ).trim(),
      username: (
        webstoreContactUsername ||
        storedWebstorePaymentContext?.username ||
        webstoreForm.username ||
        ""
      ).trim(),
      email: (
        webstoreContactEmail ||
        storedWebstorePaymentContext?.email ||
        webstoreForm.email ||
        ""
      ).trim(),
      slugName: (
        activeWebstoreRequest?.slug_name ||
        webstoreForm.slugName ||
        ""
      )
        .trim()
        .toLowerCase(),
      displayName: (
        activeWebstoreRequest?.display_name ||
        webstoreForm.displayName ||
        ""
      ).trim(),
    }),
    [
      activeWebstoreRequest?.display_name,
      activeWebstoreRequest?.slug_name,
      webstoreContactEmail,
      webstoreContactFullName,
      webstoreContactUsername,
      webstoreForm.displayName,
      webstoreForm.email,
      webstoreForm.fullName,
      webstoreForm.slugName,
      webstoreForm.username,
    ]
  )

  const openWebstoreReceiptUpload = () => {
    if (activeWebstoreRequest?.latest_receipt_status === "pending_review")
      return
    setIsDraggingReceipt(false)
    setWebstoreReceiptUploadModalOpen(true)
  }

  const saveWebstoreDraft = useCallback(
    (overrides?: {
      selectedPaymentMethod?: WebstorePaymentMethod | null
      webstoreForm?: WebstoreRequestFormState
      webstoreRenewalEnabled?: boolean
    }) => {
      if (typeof window === "undefined") return
      const draft = {
        webstoreForm: overrides?.webstoreForm ?? resolvedWebstoreSubmissionForm,
        selectedWebstorePlan,
        selectedBillingOption,
        selectedPaymentMethod:
          overrides?.selectedPaymentMethod ?? selectedPaymentMethod,
        webstoreAcceptedTerms,
        webstoreRenewalEnabled:
          overrides?.webstoreRenewalEnabled ?? webstoreRenewalEnabled,
      }
      window.localStorage.setItem(
        webstoreDraftStorageKey,
        JSON.stringify(draft)
      )
    },
    [
      resolvedWebstoreSubmissionForm,
      selectedBillingOption,
      selectedPaymentMethod,
      selectedWebstorePlan,
      webstoreAcceptedTerms,
      webstoreRenewalEnabled,
    ]
  )

  const saveWebstorePaymentContext = useCallback(
    (context: {
      checkoutId?: string | null
      paymentMethod?: WebstorePaymentMethod | null
      fullName?: string | null
      username?: string | null
      email?: string | null
      slugName?: string | null
      displayName?: string | null
      selectedWebstorePlan?:
        | "test"
        | "quarterly"
        | "semiAnnual"
        | "annual"
        | null
      selectedBillingOption?: "full" | "monthly" | null
      webstoreRenewalEnabled?: boolean
    }) => {
      if (typeof window === "undefined") return
      const payload = JSON.stringify(context)
      window.sessionStorage.setItem(webstorePaymentContextStorageKey, payload)
      window.localStorage.setItem(webstorePaymentContextStorageKey, payload)
    },
    [webstorePaymentContextStorageKey]
  )

  const uploadSelectedWebstoreReceiptUrls = useCallback(async () => {
    const uploadedUrls: string[] = []

    for (const receipt of webstoreReceiptFiles) {
      const formData = new FormData()
      formData.append("file", receipt.file)

      const response = await uploadWebstoreReceipt(formData).unwrap()
      if (response?.url) {
        uploadedUrls.push(response.url)
      }
    }

    return uploadedUrls
  }, [uploadWebstoreReceipt, webstoreReceiptFiles])

  const finalizeWebstorePaymentSubmission = useCallback(
    async (params: {
      resolvedCheckoutId: string
      verified: {
        payment_reference?: string | null
        payment_intent_id?: string | null
        checkout_id?: string | null
        proof_url?: string | null
        plan?: string | null
        billing_option?: string | null
      }
      receiptUrls: string[]
      showPaymentSuccessModal?: boolean
      successMessage?: string
    }) => {
      if (typeof window === "undefined") {
        throw new Error(
          "Webstore payment could not be finalized in this environment."
        )
      }

      const {
        resolvedCheckoutId,
        verified,
        receiptUrls,
        showPaymentSuccessModal = true,
        successMessage = "Webstore Payment Success.",
      } = params
      const storedDraftRaw =
        window.sessionStorage.getItem(webstorePaymentSessionStorageKey) ||
        window.localStorage.getItem(webstoreDraftStorageKey)
      let storedDraft: {
        webstoreForm?: WebstoreRequestFormState
        selectedWebstorePlan?:
          | "test"
          | "quarterly"
          | "semiAnnual"
          | "annual"
          | null
        selectedBillingOption?: "full" | "monthly" | null
        selectedPaymentMethod?: WebstorePaymentMethod | null
        webstoreAcceptedTerms?: boolean
        webstoreRenewalEnabled?: boolean
      } | null = null
      if (storedDraftRaw) {
        try {
          storedDraft = JSON.parse(storedDraftRaw) as {
            webstoreForm?: WebstoreRequestFormState
            selectedWebstorePlan?:
              | "test"
              | "quarterly"
              | "semiAnnual"
              | "annual"
              | null
            selectedBillingOption?: "full" | "monthly" | null
            selectedPaymentMethod?: WebstorePaymentMethod | null
            webstoreAcceptedTerms?: boolean
            webstoreRenewalEnabled?: boolean
          }
        } catch {
          storedDraft = null
        }
      }

      const submissionSnapshot = webstorePaymentSubmissionSnapshot ?? {
        webstoreForm: {
          fullName:
            webstoreLatestRequestPreview?.full_name ||
            activeWebstoreRequest?.full_name ||
            webstoreContactFullName ||
            "",
          username:
            webstoreLatestRequestPreview?.username ||
            activeWebstoreRequest?.username ||
            webstoreContactUsername ||
            "",
          email:
            webstoreLatestRequestPreview?.email ||
            activeWebstoreRequest?.email ||
            webstoreContactEmail ||
            "",
          slugName:
            webstoreLatestRequestPreview?.slug_name ||
            activeWebstoreRequest?.slug_name ||
            webstoreForm.slugName ||
            "",
          displayName:
            webstoreLatestRequestPreview?.display_name ||
            activeWebstoreRequest?.display_name ||
            webstoreForm.displayName ||
            "",
        },
        selectedWebstorePlan: selectedWebstorePlan,
        selectedBillingOption:
          selectedBillingOption ??
          webstoreLatestRequestPreview?.billing_option ??
          null,
        selectedPaymentMethod:
          normalizeWebstorePaymentMethod(
            webstoreLatestRequestPreview?.payment_method
          ) ??
          selectedPaymentMethod ??
          null,
        webstoreAcceptedTerms,
        webstoreRenewalEnabled,
      }

      const draftForm = {
        fullName: (
          storedDraft?.webstoreForm?.fullName ||
          submissionSnapshot.webstoreForm.fullName ||
          ""
        ).trim(),
        username: (
          storedDraft?.webstoreForm?.username ||
          submissionSnapshot.webstoreForm.username ||
          ""
        ).trim(),
        email: (
          storedDraft?.webstoreForm?.email ||
          submissionSnapshot.webstoreForm.email ||
          ""
        ).trim(),
        slugName: (
          storedDraft?.webstoreForm?.slugName ||
          submissionSnapshot.webstoreForm.slugName ||
          ""
        )
          .trim()
          .toLowerCase(),
        displayName: (
          storedDraft?.webstoreForm?.displayName ||
          submissionSnapshot.webstoreForm.displayName ||
          ""
        ).trim(),
      }
      const verifiedPlanRaw = String(verified.plan ?? "").trim()
      const verifiedPlanKey = verifiedPlanRaw === "semi_annual" ? "semiAnnual" : verifiedPlanRaw
      const validPlanKeys = ["test", "quarterly", "semiAnnual", "annual"]
      const draftPlan = (
        validPlanKeys.includes(verifiedPlanKey)
          ? verifiedPlanKey
          : null
      ) as "test" | "quarterly" | "semiAnnual" | "annual" | null ??
        storedDraft?.selectedWebstorePlan ??
        submissionSnapshot.selectedWebstorePlan ??
        null

      const verifiedBilling = String(verified.billing_option ?? "").trim()
      const draftBilling = (
        verifiedBilling === "full" || verifiedBilling === "monthly"
          ? verifiedBilling
          : null
      ) as "full" | "monthly" | null ??
        storedDraft?.selectedBillingOption ??
        submissionSnapshot.selectedBillingOption ??
        null

      const verifiedMethod = String(verified.payment_method ?? "").trim()
      const draftPaymentMethod =
        normalizeWebstorePaymentMethod(
          ["gcash", "grab_pay", "maya", "card"].includes(verifiedMethod) ? verifiedMethod : null
        ) ??
        normalizeWebstorePaymentMethod(storedDraft?.selectedPaymentMethod) ??
        submissionSnapshot.selectedPaymentMethod ??
        "gcash"
      const draftAcceptedTerms =
        storedDraft?.webstoreAcceptedTerms ??
        submissionSnapshot.webstoreAcceptedTerms
      const draftRenewalEnabled =
        storedDraft?.webstoreRenewalEnabled ??
        submissionSnapshot.webstoreRenewalEnabled

      const missingSubmissionFields = [
        !draftPlan ? "plan" : null,
        !draftBilling ? "billing_option" : null,
        !draftForm.fullName ? "full_name" : null,
        !draftForm.username ? "username" : null,
        !draftForm.email ? "email" : null,
        !draftForm.slugName ? "slug_name" : null,
        !draftForm.displayName ? "display_name" : null,
        !draftPaymentMethod ? "payment_method" : null,
      ].filter(Boolean) as string[]

      if (missingSubmissionFields.length > 0) {
        const sourceState = storedDraftRaw
          ? "stored_draft_or_session"
          : webstorePaymentSubmissionSnapshot
            ? "in_memory_snapshot"
            : "fallback_profile_state"
        const detailMessage = `Webstore submission details are incomplete. Missing: ${missingSubmissionFields.join(", ")}. Source: ${sourceState}.`
        console.error(detailMessage, {
          storedDraftRaw,
          submissionSnapshot,
          draftForm,
          draftPlan,
          draftBilling,
          draftPaymentMethod,
          draftAcceptedTerms,
          draftRenewalEnabled,
        })
        throw new Error(detailMessage)
      }

      const submissionPlan = draftPlan as NonNullable<typeof draftPlan>
      const submissionBilling = draftBilling as NonNullable<typeof draftBilling>
      const submissionPaymentMethod = draftPaymentMethod as NonNullable<
        typeof draftPaymentMethod
      >

      setWebstorePaymentMethodSnapshot(submissionPaymentMethod)
      saveWebstorePaymentContext({
        checkoutId: resolvedCheckoutId,
        paymentMethod: submissionPaymentMethod,
        fullName: draftForm.fullName,
        username: draftForm.username,
        email: draftForm.email,
        slugName: draftForm.slugName,
        displayName: draftForm.displayName,
        selectedWebstorePlan: submissionPlan,
        selectedBillingOption: submissionBilling,
        webstoreRenewalEnabled: draftRenewalEnabled,
      })

      const planMap: Record<
        "test" | "quarterly" | "semiAnnual" | "annual",
        "test" | "quarterly" | "semi_annual" | "annual"
      > = {
        test: "test",
        quarterly: "quarterly",
        semiAnnual: "semi_annual",
        annual: "annual",
      }

      const paymentReference = String(
        verified.payment_reference ||
          verified.payment_intent_id ||
          verified.checkout_id ||
          resolvedCheckoutId
      ).trim()

      const receiptPayloadUrls =
        receiptUrls.length > 0 ? receiptUrls : [window.location.href]

      const submitResponse = await submitWebstoreRequest({
        full_name: draftForm.fullName.trim(),
        username: draftForm.username.trim(),
        email: draftForm.email.trim(),
        slug_name: draftForm.slugName.trim().toLowerCase(),
        display_name: draftForm.displayName.trim(),
        plan: planMap[submissionPlan],
        billing_option: submissionBilling,
        payment_method: submissionPaymentMethod,
        receipt_urls: receiptPayloadUrls,
        checkout_id: resolvedCheckoutId,
        payment_reference: paymentReference || `WEB-${Date.now()}`,
        payment_intent_id: verified.payment_intent_id || null,
        accepted_terms: draftAcceptedTerms,
        renewal_enabled: draftRenewalEnabled,
      }).unwrap()

      setWebstorePaymentReferenceId(paymentReference || null)
      setWebstorePaymentProofUrl(receiptUrls[0] || verified.proof_url || null)
      setWebstorePaymentIntentId(verified.payment_intent_id || null)
      setWebstorePaymentCheckoutId(verified.checkout_id || resolvedCheckoutId)
      setWebstoreLatestRequestPreview({
        id: Number(submitResponse?.request?.id ?? Date.now()),
        reference_no:
          submitResponse?.request?.reference_no ??
          (submitResponse?.request?.id
            ? `WR-${submitResponse.request.id}`
            : `WEB-${Date.now()}`),
        status:
          (submitResponse?.request?.status as
            | "pending_review"
            | "approved"
            | "rejected"
            | undefined) ?? "pending_review",
        slug_name: draftForm.slugName.trim().toLowerCase(),
        display_name: draftForm.displayName.trim(),
        created_at:
          submitResponse?.request?.created_at ??
          submitResponse?.request?.submitted_at ??
          new Date().toISOString(),
        billing_option: draftBilling,
        payment_method: draftPaymentMethod,
        full_name: draftForm.fullName.trim(),
        username: draftForm.username.trim(),
        email: draftForm.email.trim(),
        webstoreRenewalEnabled: draftRenewalEnabled,
      })
      setWebstorePaymentSubmissionSnapshot(null)

      if (showPaymentSuccessModal) {
        setWebstoreSuccessModalOpen(true)
        setWebstoreMsg({ type: "success", text: successMessage })
        showSuccessToast("Webstore Payment Success")
      } else {
        setWebstoreMsg({ type: "success", text: successMessage })
        showSuccessToast(successMessage)
      }
      processedWebstoreCheckoutRef.current = resolvedCheckoutId

      window.sessionStorage.removeItem(webstorePaymentSessionStorageKey)
      window.localStorage.removeItem(webstoreDraftStorageKey)

      await refetchWebstoreRequestLatest()
      router.replace("/profile?tab=webstore")

      if (webstoreReceiptFiles.length > 0) {
        setWebstoreReceiptFiles((prev) => {
          prev.forEach((file) => {
            if (file.preview.startsWith("blob:")) {
              URL.revokeObjectURL(file.preview)
            }
          })
          return []
        })
      }

      return submitResponse
    },
    [
      activeWebstoreRequest?.display_name,
      activeWebstoreRequest?.email,
      activeWebstoreRequest?.full_name,
      activeWebstoreRequest?.slug_name,
      activeWebstoreRequest?.username,
      refetchWebstoreRequestLatest,
      router,
      selectedBillingOption,
      selectedPaymentMethod,
      selectedWebstorePlan,
      submitWebstoreRequest,
      webstoreAcceptedTerms,
      webstoreLatestRequestPreview?.billing_option,
      webstoreLatestRequestPreview?.display_name,
      webstoreLatestRequestPreview?.email,
      webstoreLatestRequestPreview?.full_name,
      webstoreLatestRequestPreview?.payment_method,
      webstoreLatestRequestPreview?.slug_name,
      webstoreLatestRequestPreview?.username,
      webstorePaymentSubmissionSnapshot,
      webstoreRenewalEnabled,
      webstoreContactEmail,
      webstoreContactFullName,
      webstoreContactUsername,
      webstoreForm.displayName,
      webstoreForm.slugName,
      webstoreReceiptFiles.length,
    ]
  )

  useEffect(() => {
    if (!webstoreDraftHydratedRef.current || shouldHideDeletedWebstoreFields)
      return
    saveWebstoreDraft()
  }, [saveWebstoreDraft, shouldHideDeletedWebstoreFields])

  useEffect(() => {
    if (!shouldHideDeletedWebstoreFields) return

    setWebstoreForm((prev) => ({
      ...prev,
      slugName: "",
      displayName: "",
    }))
    setSelectedWebstorePlan(null)
    setSelectedBillingOption(null)
    setSelectedPaymentMethod(null)
    setWebstorePaymentMethodSnapshot(null)
    setWebstoreAcceptedTerms(false)
    setWebstoreRenewalEnabled(false)
    setWebstoreLatestRequestPreview(null)
    setWebstorePaymentSubmissionSnapshot(null)
    setWebstoreMsg(null)
    setWebstoreInvalidFields({})
    setWebstorePaymentProofUrl(null)
    setWebstorePaymentReferenceId(null)
    setWebstorePaymentIntentId(null)
    setWebstorePaymentCheckoutId(null)
    setWebstoreSuccessModalOpen(false)
    setWebstoreReceiptUploadModalOpen(false)
    setWebstoreReceiptPreview(null)
    setWebstoreReceiptFiles((prev) => {
      prev.forEach((file) => {
        if (file.preview.startsWith("blob:")) {
          URL.revokeObjectURL(file.preview)
        }
      })
      return []
    })
    setDismissedRejectedReceiptKeys([])
    webstorePaymentMethodTouchedRef.current = false
    webstoreStorefrontFieldsEditedRef.current = false
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(webstorePaymentSessionStorageKey)
      window.localStorage.removeItem(webstoreDraftStorageKey)
      window.sessionStorage.removeItem(webstorePaymentContextStorageKey)
      window.localStorage.removeItem(webstorePaymentContextStorageKey)
    }
  }, [
    shouldHideDeletedWebstoreFields,
    webstoreDraftStorageKey,
    webstorePaymentContextStorageKey,
    webstorePaymentSessionStorageKey,
  ])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!shouldHydrateWebstoreDraft) {
      webstoreDraftHydratedRef.current = true
      return
    }
    try {
      const raw = window.localStorage.getItem(webstoreDraftStorageKey)
      if (!raw) return
      const draft = JSON.parse(raw) as {
        webstoreForm?: WebstoreRequestFormState
        selectedWebstorePlan?:
          | "test"
          | "quarterly"
          | "semiAnnual"
          | "annual"
          | null
        selectedBillingOption?: "full" | "monthly" | null
        selectedPaymentMethod?: WebstorePaymentMethod | null
        webstoreAcceptedTerms?: boolean
        webstoreRenewalEnabled?: boolean
      }
      if (draft.webstoreForm) {
        const draftWebstoreForm = draft.webstoreForm
        setWebstoreForm((prev) => ({
          ...prev,
          ...draftWebstoreForm,
          slugName: shouldHideDeletedWebstoreFields
            ? ""
            : (draftWebstoreForm.slugName ?? prev.slugName),
          displayName: shouldHideDeletedWebstoreFields
            ? ""
            : (draftWebstoreForm.displayName ?? prev.displayName),
        }))
      }
      if (draft.selectedWebstorePlan)
        setSelectedWebstorePlan(draft.selectedWebstorePlan)
      if (draft.selectedBillingOption)
        setSelectedBillingOption(draft.selectedBillingOption)
      if (typeof draft.webstoreAcceptedTerms === "boolean")
        setWebstoreAcceptedTerms(draft.webstoreAcceptedTerms)
      if (typeof draft.webstoreRenewalEnabled === "boolean")
        setWebstoreRenewalEnabled(draft.webstoreRenewalEnabled)
    } catch {
      // ignore invalid draft cache
    } finally {
      webstoreDraftHydratedRef.current = true
    }
  }, [shouldHydrateWebstoreDraft])

  useEffect(() => {
    const storedCheckoutId =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("last_checkout_id") ||
          window.localStorage.getItem("last_checkout_id") ||
          ""
        : ""
    const resolvedCheckoutId = webstoreCheckoutId || storedCheckoutId

    if (webstorePaymentStatus !== "success" || !resolvedCheckoutId) return

    let isMounted = true

    const finalizePaymongoWebstorePayment = async () => {
      try {
        const requestedMode =
          webstorePaymentMode === "test" || webstorePaymentMode === "live"
            ? webstorePaymentMode
            : resolveWebstorePaymentMode()

        let verified = await verifyWebstorePaymentSession({
          checkoutId: resolvedCheckoutId,
          paymentMode: requestedMode,
        }).unwrap()

        if (!verified?.payment_reference && requestedMode) {
          verified = await verifyWebstorePaymentSession({
            checkoutId: resolvedCheckoutId,
          }).unwrap()
        }

        if (!isMounted) return
        if (processedWebstoreCheckoutRef.current === resolvedCheckoutId) return
        const proofUrl = String(verified.proof_url || "").trim() || null
        const isContinuationPayment = isApprovedWebstoreRequest
        const requiresReceiptUpload = !isContinuationPayment

        setWebstorePaymentReferenceId(
          String(
            verified.payment_reference ||
              verified.payment_intent_id ||
              verified.checkout_id ||
              resolvedCheckoutId
          ).trim() || null
        )
        setWebstorePaymentProofUrl(proofUrl)
        setWebstorePaymentIntentId(verified.payment_intent_id || null)
        setWebstorePaymentCheckoutId(verified.checkout_id || resolvedCheckoutId)
        setWebstorePaymentPlanSnapshot(String(verified.plan ?? "").trim() || null)
        setWebstorePaymentBillingSnapshot(String(verified.billing_option ?? "").trim() || null)

        if (isContinuationPayment) {
          setWebstoreSuccessModalOpen(true)
          setWebstoreMsg({
            type: "success",
            text: "Continuation payment confirmed. Please upload your receipt and submit the request.",
          })
          showSuccessToast("Continuation payment confirmed")
          processedWebstoreCheckoutRef.current = resolvedCheckoutId
          await refetchWebstoreRequestLatest()
          router.replace("/profile?tab=webstore")
          return
        }

        setWebstoreSuccessModalOpen(true)
        setWebstoreMsg({
          type: "success",
          text: "Webstore Payment Success. Please upload your receipt before submitting the request.",
        })
        showSuccessToast("Webstore Payment Success")
        processedWebstoreCheckoutRef.current = resolvedCheckoutId
        await refetchWebstoreRequestLatest()
        router.replace("/profile?tab=webstore")
        return
      } catch (error) {
        if (!isMounted) return
        const apiErr = error as {
          data?: { message?: string }
          message?: string
        }
        const message =
          apiErr?.data?.message ||
          apiErr?.message ||
          "Failed to verify webstore payment session."
        setWebstoreMsg({ type: "error", text: message })
        showErrorToast(message)
      }
    }

    void finalizePaymongoWebstorePayment()

    return () => {
      isMounted = false
    }
  }, [
    finalizeWebstorePaymentSubmission,
    refetchWebstoreRequestLatest,
    router,
    selectedPaymentMethod,
    isApprovedWebstoreRequest,
    uploadSelectedWebstoreReceiptUrls,
    webstoreAcceptedTerms,
    webstoreCheckoutId,
    webstoreDraftStorageKey,
    webstorePaymentMode,
    webstorePaymentSessionStorageKey,
    webstorePaymentStatus,
    verifyWebstorePaymentSession,
  ])

  const handleDownloadWebstoreSuccessImage = useCallback(async () => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    const escapeXml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")

    const checkoutId = webstorePaymentCheckoutId || webstoreCheckoutId || "-"
    const paymentReference = webstorePaymentReferenceId || "-"
    const paymentIntent = webstorePaymentIntentId || "-"
    const paymentMethod = webstorePaymentMethodLabel
    const customerName = webstoreForm.fullName?.trim() || "-"
    const email = webstoreForm.email?.trim() || "-"
    const total =
      selectedWebstorePaymentAmount != null
        ? `PHP ${selectedWebstorePaymentAmount.toLocaleString()}`
        : "-"
    const subscriptionFee =
      selectedWebstoreSubscriptionFee != null
        ? `PHP ${selectedWebstoreSubscriptionFee.toLocaleString()}`
        : "-"

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
        <defs>
          <linearGradient id="header" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#06b6a0"/>
            <stop offset="100%" stop-color="#10b981"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.12"/>
          </filter>
        </defs>

        <rect width="1200" height="1500" fill="#f8fbff"/>
        <rect x="40" y="40" width="1120" height="1420" rx="34" fill="#ffffff" filter="url(#shadow)"/>
        <rect x="40" y="40" width="1120" height="220" rx="34" fill="url(#header)"/>
        <rect x="40" y="226" width="1120" height="34" fill="#ffffff"/>

        <g transform="translate(600 122)">
          <circle r="46" fill="rgba(255,255,255,0.22)"/>
          <circle r="32" fill="#ffffff" opacity="0.18"/>
          <path d="M -16 0 L -4 12 L 20 -12" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </g>

        <text x="600" y="198" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800" fill="#ffffff">Webstore Payment Success</text>
        <text x="600" y="244" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="rgba(255,255,255,0.92)">Your payment is confirmed. Upload your receipt to submit the request, unless this is an approved continuation payment.</text>

        <g transform="translate(76 300)">
          <rect x="0" y="0" width="1048" height="94" rx="22" fill="#f8fafc" stroke="#e5e7eb"/>
          <text x="24" y="34" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#94a3b8">CHECKOUT ID</text>
          <text x="24" y="66" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(checkoutId)}</text>

          <rect x="516" y="0" width="532" height="94" rx="22" fill="#f8fafc" stroke="#e5e7eb"/>
          <text x="540" y="34" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#94a3b8">STATUS</text>
          <rect x="540" y="46" width="78" height="34" rx="17" fill="#d1fae5"/>
          <text x="579" y="68" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="#047857">Paid</text>
        </g>

        <g transform="translate(76 414)">
          <rect x="0" y="0" width="1048" height="94" rx="22" fill="#f8fafc" stroke="#e5e7eb"/>
          <text x="24" y="34" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#94a3b8">PAYMENT REFERENCE</text>
          <text x="24" y="66" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(paymentReference)}</text>
        </g>

        <g transform="translate(76 528)">
          <rect x="0" y="0" width="1048" height="94" rx="22" fill="#f8fafc" stroke="#e5e7eb"/>
          <text x="24" y="34" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#94a3b8">PAYMENT INTENT</text>
          <text x="24" y="66" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(paymentIntent)}</text>
        </g>

        <g transform="translate(76 664)">
          <rect x="0" y="0" width="334" height="96" rx="22" fill="#ffffff" stroke="#e5e7eb"/>
          <text x="24" y="33" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#94a3b8">CUSTOMER</text>
          <text x="24" y="64" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(customerName)}</text>
        </g>
        <g transform="translate(432 664)">
          <rect x="0" y="0" width="334" height="96" rx="22" fill="#ffffff" stroke="#e5e7eb"/>
          <text x="24" y="33" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#94a3b8">EMAIL</text>
          <text x="24" y="64" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(email)}</text>
        </g>
        <g transform="translate(788 664)">
          <rect x="0" y="0" width="336" height="96" rx="22" fill="#ffffff" stroke="#e5e7eb"/>
          <text x="24" y="33" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#94a3b8">PAYMENT METHOD</text>
          <text x="24" y="64" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(paymentMethod)}</text>
        </g>

        <g transform="translate(76 780)">
          <rect x="0" y="0" width="1048" height="178" rx="22" fill="#ffffff" stroke="#e5e7eb"/>
          <text x="24" y="33" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#94a3b8">ORDER SUMMARY</text>

          <g transform="translate(24 62)">
            <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#94a3b8">PLAN</text>
            <text x="0" y="32" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(webstorePlanLabel)}</text>
          </g>
          <g transform="translate(392 62)">
            <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#94a3b8">BILLING</text>
            <text x="0" y="32" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(webstoreBillingLabel)}</text>
          </g>
          <g transform="translate(760 62)">
            <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#94a3b8">SUBSCRIPTION FEE</text>
            <text x="0" y="32" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(subscriptionFee)}</text>
          </g>
          <g transform="translate(760 112)">
            <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#94a3b8">TOTAL</text>
            <text x="0" y="32" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(total)}</text>
          </g>
        </g>

        <g transform="translate(76 982)">
          <rect x="0" y="0" width="1048" height="128" rx="22" fill="#effaf3" stroke="#86efac"/>
          <text x="24" y="48" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#047857">This PNG is generated locally from your confirmed payment details.</text>
          <text x="24" y="82" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#064e3b">Use it as your payment confirmation snapshot.</text>
        </g>
      </svg>`

    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(svgBlob)
    try {
      const image = new Image()
      image.decoding = "async"
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () =>
          reject(new Error("Unable to render success image."))
      })
      image.src = svgUrl
      await loaded

      const scale = 2
      const canvas = document.createElement("canvas")
      canvas.width = 1200 * scale
      canvas.height = 1500 * scale
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Canvas is not available.")
      context.scale(scale, scale)
      context.drawImage(image, 0, 0, 1200, 1500)

      const pngUrl = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.href = pngUrl
      const fileRef = (
        webstorePaymentReferenceId ||
        checkoutId ||
        "receipt"
      ).replace(/[^a-zA-Z0-9_\-]/g, "-")
      const fileName = `webstore-payment-success-${fileRef}`
      downloadLink.download = fileName
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
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
  }, [
    selectedWebstorePaymentAmount,
    webstoreBillingLabel,
    webstoreForm.email,
    webstoreForm.fullName,
    webstorePaymentCheckoutId,
    webstorePaymentIntentId,
    webstorePaymentMethodLabel,
    webstorePaymentReferenceId,
    webstoreCheckoutId,
    webstorePlanLabel,
    selectedWebstoreSubscriptionFee,
  ])

  const handleSendUsernameOtp = async () => {
    setUsernameMsg(null)
    const nextUsername = usernameRequest.replace(/\s+/g, "").trim()
    if (nextUsername !== usernameRequest) {
      setUsernameRequest(nextUsername)
    }
    if (!nextUsername) {
      setUsernameMsg({ type: "error", text: "Username is required." })
      return
    }
    if (!/^[A-Za-z0-9]+$/.test(nextUsername)) {
      setUsernameMsg({
        type: "error",
        text: "Username must contain letters and numbers only.",
      })
      return
    }
    if (containsBlockedWord(nextUsername)) {
      setUsernameMsg({
        type: "error",
        text: "Please choose a different username.",
      })
      return
    }

    if (nextUsername === (profileData?.username ?? "").trim()) {
      setUsernameMsg({
        type: "error",
        text: "This is already your current username.",
      })
      return
    }

    try {
      const response = await sendUsernameChangeOtp({
        username: nextUsername,
      }).unwrap()
      setUsernameOtpToken(response.verification_token)
      setUsernameOtpSentTo(response.email)
      setUsernameOtp("")
      setUsernameMsg({
        type: "success",
        text: "We sent a 4-digit OTP to your email. Enter it below to submit your request.",
      })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setUsernameMsg({
        type: "error",
        text: apiError?.data?.message || "Failed to send OTP.",
      })
    }
  }

  const handleSubmitUsernameChange = async (e: FormEvent) => {
    e.preventDefault()
    setUsernameMsg(null)
    if (!usernameOtpToken) {
      setUsernameMsg({ type: "error", text: "Please request an OTP first." })
      return
    }
    if (usernameOtp.trim().length !== 4) {
      setUsernameMsg({
        type: "error",
        text: "Enter the 4-digit OTP from your email.",
      })
      return
    }

    try {
      await submitUsernameChangeRequest({
        verification_token: usernameOtpToken,
        otp: usernameOtp.trim(),
      }).unwrap()
      setUsernameMsg({
        type: "success",
        text: "Request submitted. Please wait for admin approval.",
      })
      setUsernameOtpToken(null)
      setUsernameOtp("")
      setUsernameOtpSentTo(null)
      setIsUsernamePendingLocal(true)
      setUsernameRequest((prev) => prev.trim())
      refetchUsernameChangeLatest()
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setUsernameMsg({
        type: "error",
        text: apiError?.data?.message || "Failed to submit request.",
      })
    }
  }

  const handleStartWebstorePayment = async (
    paymentMethodOverride?: WebstorePaymentMethod
  ) => {
    const paymentMethod = paymentMethodOverride ?? selectedPaymentMethod

    const validation = validateWebstoreFields(paymentMethod)
    if (!validation.isValid) {
      setWebstoreInvalidFields(validation.invalid)
      setWebstoreMsg({
        type: "error",
        text:
          validation.firstInvalidMessage ||
          "Please complete the required fields first.",
      })
      if (validation.firstInvalidField) {
        focusWebstoreInvalidField(validation.firstInvalidField)
      }
      return
    }

    if (!selectedWebstorePlan || !selectedBillingOption || !paymentMethod) {
      setWebstoreMsg({
        type: "error",
        text: "Please complete the plan, billing option, and payment method first.",
      })
      showErrorToast(
        "Please complete the plan, billing option, and payment method first."
      )
      return
    }

    const checkoutPlan = selectedWebstorePlan
    const checkoutBillingOption = selectedBillingOption
    const checkoutPaymentMethod = paymentMethod

    const planMap: Record<
      "test" | "quarterly" | "semiAnnual" | "annual",
      "test" | "quarterly" | "semi_annual" | "annual"
    > = {
      test: "test",
      quarterly: "quarterly",
      semiAnnual: "semi_annual",
      annual: "annual",
    }

    try {
      if (paymentMethod) {
        setWebstorePaymentMethodSnapshot(paymentMethod)
      }
      setWebstorePaymentSubmissionSnapshot({
        webstoreForm: resolvedWebstoreSubmissionForm,
        selectedWebstorePlan: checkoutPlan,
        selectedBillingOption: checkoutBillingOption,
        selectedPaymentMethod: checkoutPaymentMethod,
        webstoreAcceptedTerms,
        webstoreRenewalEnabled,
      })
      saveWebstorePaymentContext({
        paymentMethod: checkoutPaymentMethod,
        fullName: resolvedWebstoreSubmissionForm.fullName,
        username: resolvedWebstoreSubmissionForm.username,
        email: resolvedWebstoreSubmissionForm.email,
        slugName: resolvedWebstoreSubmissionForm.slugName,
        displayName: resolvedWebstoreSubmissionForm.displayName,
        selectedWebstorePlan: checkoutPlan,
        selectedBillingOption: checkoutBillingOption,
        webstoreRenewalEnabled,
      })

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          webstorePaymentSessionStorageKey,
          JSON.stringify({
            webstoreForm: resolvedWebstoreSubmissionForm,
            selectedWebstorePlan: checkoutPlan,
            selectedBillingOption: checkoutBillingOption,
            selectedPaymentMethod: checkoutPaymentMethod,
            webstoreAcceptedTerms,
            webstoreRenewalEnabled,
          })
        )
      }

      const data = await createWebstorePaymentSession({
        plan: planMap[checkoutPlan],
        billing_option: checkoutBillingOption,
        payment_method: checkoutPaymentMethod,
        payment_mode: resolveWebstorePaymentMode(),
      }).unwrap()

      if (!data.checkout_url) {
        setWebstoreMsg({
          type: "error",
          text: "Failed to create PayMongo checkout session.",
        })
        showErrorToast("Failed to create PayMongo checkout session.")
        return
      }

      if (data.checkout_id) {
        setWebstorePaymentCheckoutId(data.checkout_id)
        setWebstorePaymentReferenceId(null)
        setWebstorePaymentIntentId(null)
        setWebstorePaymentProofUrl(null)
        if (typeof window !== "undefined") {
          const mode = data.payment_mode || resolveWebstorePaymentMode()
          window.localStorage.setItem("last_checkout_id", data.checkout_id)
          window.sessionStorage.setItem("last_checkout_id", data.checkout_id)
          window.localStorage.setItem("last_checkout_payment_mode", mode)
          window.sessionStorage.setItem("last_checkout_payment_mode", mode)
        }
      }

      window.location.href = data.checkout_url
    } catch (error) {
      const apiErr = error as { data?: { message?: string }; message?: string }
      const message =
        apiErr?.data?.message ||
        apiErr?.message ||
        "Failed to start PayMongo checkout."
      setWebstoreMsg({ type: "error", text: message })
      showErrorToast(message)
    }
  }

  const focusWebstoreInvalidField = (
    field: keyof typeof webstoreInvalidFields
  ) => {
    const focusCheckbox = () => {
      const checkbox =
        webstoreTermsSectionRef.current?.querySelector<HTMLInputElement>(
          'input[type="checkbox"]'
        )
      checkbox?.focus()
    }

    const fieldFocusMap: Record<string, () => void> = {
      plan: () =>
        webstorePlanSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        }),
      slugName: () => {
        webstoreSlugInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
        webstoreSlugInputRef.current?.focus()
      },
      displayName: () => {
        webstoreDisplayInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
        webstoreDisplayInputRef.current?.focus()
      },
      billingOption: () => {
        webstoreBillingSelectRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
        webstoreBillingSelectRef.current?.focus()
      },
      paymentMethod: () => {
        webstorePaymentSelectRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
        webstorePaymentSelectRef.current?.focus()
      },
      terms: () => {
        webstoreTermsSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
        focusCheckbox()
      },
    }

    fieldFocusMap[field]?.()
  }

  const getWebstoreValidationError = (
    field: keyof typeof webstoreInvalidFields
  ) => {
    switch (field) {
      case "plan":
        return "Please select a subscription plan."
      case "slugName":
        return "Please provide a valid slug name before submitting."
      case "displayName":
        return "Please provide a valid display name before submitting."
      case "billingOption":
        return "Please select a billing option."
      case "paymentMethod":
        return "Please select a payment method."
      case "terms":
        return "Please accept the Terms and Conditions first."
      default:
        return ""
    }
  }

  const validateWebstoreFields = (
    paymentMethodOverride?: WebstorePaymentMethod | null
  ) => {
    const slugName = (
      latestWebstoreRequest?.slug_name ||
      webstoreForm.slugName ||
      ""
    )
      .trim()
      .toLowerCase()
    const displayName = (
      latestWebstoreRequest?.display_name ||
      webstoreForm.displayName ||
      ""
    ).trim()
    const paymentMethod = paymentMethodOverride ?? selectedPaymentMethod
    const invalid: Record<string, boolean> = {}
    const order: Array<keyof typeof webstoreInvalidFields> = []

    if (!selectedWebstorePlan) {
      invalid.plan = true
      order.push("plan")
    }
    if (!slugName || slugName === "-") {
      invalid.slugName = true
      order.push("slugName")
    }
    if (!displayName || displayName === "-") {
      invalid.displayName = true
      order.push("displayName")
    }
    if (!selectedBillingOption) {
      invalid.billingOption = true
      order.push("billingOption")
    }
    if (!paymentMethod) {
      invalid.paymentMethod = true
      order.push("paymentMethod")
    }
    if (!webstoreAcceptedTerms) {
      invalid.terms = true
      order.push("terms")
    }

    return {
      isValid: order.length === 0,
      invalid,
      firstInvalidField: order[0] ?? null,
      firstInvalidMessage: order[0] ? getWebstoreValidationError(order[0]) : "",
    }
  }

  const handleSubmitWebstoreRequest = async (e: FormEvent) => {
    e.preventDefault()
    setWebstoreMsg(null)
    setWebstoreInvalidFields({})

    const validation = validateWebstoreFields()
    if (!validation.isValid) {
      setWebstoreInvalidFields(validation.invalid)
      setWebstoreMsg({ type: "error", text: validation.firstInvalidMessage })
      if (validation.firstInvalidField) {
        focusWebstoreInvalidField(validation.firstInvalidField)
      }
      return
    }

    await handleStartWebstorePayment(selectedPaymentMethod ?? undefined)
  }

  const handleSubmitWebstoreReceiptUpload = async () => {
    if (isWebstoreReceiptPendingReview) {
      const message =
        "Receipt under review. Please wait before submitting another."
      setWebstoreMsg({ type: "error", text: message })
      showErrorToast(message)
      return
    }

    if (webstoreReceiptFiles.length === 0) {
      const message =
        "Please upload your payment receipt before submitting the webstore request."
      setWebstoreMsg({ type: "error", text: message })
      showErrorToast(message)
      return
    }

    setIsSubmittingReceipt(true)
    try {
      const uploadedReceiptUrls = await uploadSelectedWebstoreReceiptUrls()

      if (uploadedReceiptUrls.length === 0) {
        throw new Error(
          "Please upload your payment receipt before submitting the webstore request."
        )
      }

      // For a rejection re-upload, find the original PayMongo reference (pay_/pi_/cs_)
      // so a WEB-timestamp is never used as the payment_reference.
      // Priority: real PayMongo ref from receipt_items > base fields > request fields.
      const existingReceiptItems = activeWebstoreRequest?.receipt_items ?? []
      const isPayMongoRef = (v?: string | null) =>
        Boolean(v && /^(pay_|pi_|cs_)/.test(v.trim()))

      let latestItemRef: string | null = null
      let existingCheckoutId: string | null = null
      let existingIntentId: string | null = null

      if (isWebstoreReceiptRejected) {
        // Collect all candidate refs in preference order, prefer pay_/pi_/cs_ over WEB-
        const refCandidates = [
          ...([...existingReceiptItems]
            .reverse()
            .map((r) => r.payment_reference)
            .filter(Boolean) as string[]),
          activeWebstoreRequest?.base_payment_reference,
          activeWebstoreRequest?.payment_reference,
        ].filter(Boolean) as string[]

        latestItemRef =
          refCandidates.find(isPayMongoRef) || refCandidates[0] || null

        const intentCandidates = [
          ...([...existingReceiptItems]
            .reverse()
            .map((r) => r.payment_intent_id)
            .filter(Boolean) as string[]),
          activeWebstoreRequest?.payment_intent_id,
        ].filter(Boolean) as string[]
        existingIntentId = intentCandidates[0] || null

        existingCheckoutId =
          activeWebstoreRequest?.base_checkout_id ||
          activeWebstoreRequest?.checkout_id ||
          null
      }

      const resolvedRef = isWebstoreReceiptRejected
        ? latestItemRef || existingCheckoutId || `WEB-${Date.now()}`
        : webstorePaymentCheckoutId ||
          webstoreCheckoutId ||
          webstorePaymentReferenceId ||
          `WEB-${Date.now()}`

      await finalizeWebstorePaymentSubmission({
        resolvedCheckoutId: resolvedRef,
        verified: {
          payment_reference: isWebstoreReceiptRejected
            ? latestItemRef
            : webstorePaymentReferenceId ||
              webstorePaymentIntentId ||
              webstorePaymentCheckoutId ||
              webstoreCheckoutId,
          payment_intent_id: isWebstoreReceiptRejected
            ? existingIntentId
            : webstorePaymentIntentId,
          checkout_id: isWebstoreReceiptRejected
            ? existingCheckoutId
            : webstorePaymentCheckoutId || webstoreCheckoutId || null,
          proof_url: webstorePaymentProofUrl,
          plan: isWebstoreReceiptRejected ? null : webstorePaymentPlanSnapshot,
          billing_option: isWebstoreReceiptRejected ? null : webstorePaymentBillingSnapshot,
        },
        receiptUrls: uploadedReceiptUrls,
        showPaymentSuccessModal: false,
        successMessage: isApprovedWebstoreRequest
          ? "Continuation payment submitted successfully."
          : isWebstoreReceiptRejected
            ? "Receipt reuploaded and webstore request submitted successfully."
            : "Receipt uploaded and webstore request submitted successfully.",
      })

      setWebstoreReceiptUploadModalOpen(false)
    } catch (error) {
      const apiErr = error as { data?: { message?: string }; message?: string }
      const message =
        apiErr?.data?.message ||
        apiErr?.message ||
        "Failed to submit the webstore request."
      setWebstoreMsg({ type: "error", text: message })
      showErrorToast(message)
    } finally {
      setIsSubmittingReceipt(false)
    }
  }

  const processWebstoreReceiptFiles = (files: File[]) => {
    if (files.length === 0) return
    const maxSizeBytes = 10 * 1024 * 1024
    const allowed = files.filter(
      (file) => file.type.startsWith("image/") && file.size <= maxSizeBytes
    )
    if (allowed.length !== files.length) {
      setWebstoreMsg({
        type: "error",
        text: "Some files were skipped. Only image files up to 10MB are allowed.",
      })
    }
    setWebstoreReceiptFiles((prev) => [
      ...prev,
      ...allowed.map((file) => ({
        name: file.name,
        preview: URL.createObjectURL(file),
        file,
      })),
    ])
    if (webstoreReceiptInputRef.current) {
      webstoreReceiptInputRef.current.value = ""
    }
  }

  const handleWebstoreReceiptUpload = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    processWebstoreReceiptFiles(Array.from(event.target.files ?? []))
  }

  const handleWebstoreReceiptDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingReceipt(false)
    processWebstoreReceiptFiles(
      Array.from(event.dataTransfer.files ?? []).filter((file) =>
        file.type.startsWith("image/")
      )
    )
  }

  const handleSyncWebstoreAccount = async () => {
    setWebstoreMsg(null)
    setShowPartnerLoginShortcut(false)
    try {
      const response = await syncWebstorePartnerAccount().unwrap()
      setWebstoreMsg({
        type: "success",
        text: response?.message || "Partner account synced successfully.",
      })
      showSuccessToast("Partner account synced.")
      setWebstoreSyncSuccessOpen(true)
      refetchWebstoreRequestLatest()
    } catch (error) {
      const apiErr = error as { data?: { message?: string } }
      const rawMessage =
        apiErr?.data?.message || "Failed to sync partner account."
      if (
        rawMessage
          .toLowerCase()
          .includes("unable to map request slug to a partner storefront")
      ) {
        setShowPartnerLoginShortcut(true)
        setWebstoreMsg({
          type: "error",
          text: `Your request slug "${latestWebstoreRequest?.slug_name || "-"}" is not linked to a partner storefront yet. Please ask admin to map this slug in Partner Storefront settings.`,
        })
      } else {
        setWebstoreMsg({ type: "error", text: rawMessage })
      }
    }
  }

  const accountStats = [
    {
      label: "Orders",
      value: String(accountSnapshot?.orders?.total ?? 0),
      Icon: Icon.Package,
      onClick: () =>
        router.push(partnerSlug ? `/${partnerSlug}/orders` : "/orders"),
    },
    {
      label: "Wishlist",
      value: String(accountSnapshot?.wishlist?.total_items ?? 0),
      Icon: Icon.Heart,
      onClick: () =>
        router.push(partnerSlug ? `/${partnerSlug}/wishlist` : "/wishlist"),
    },
    {
      label: "Reviews",
      value: String(accountSnapshot?.reviews?.total ?? 0),
      Icon: Icon.Activity,
      onClick: () => {},
    },
    {
      label: "Loyalty",
      value: loyaltyTier,
      Icon: Icon.Shield,
      onClick: () => {},
    },
  ]
  const normalizeLocationLabel = (value?: string | null) => {
    const text = String(value ?? "").trim()
    if (!text) return ""
    return text.toLowerCase() === "national capital region"
      ? "Metro Manila"
      : text
  }

  const addresses = useMemo(() => {
    const fullAddress = [
      profileData?.address,
      profileData?.barangay,
      profileData?.city,
      profileData?.province,
      normalizeLocationLabel(profileData?.region),
      profileData?.zip_code,
    ]
      .filter(Boolean)
      .join(", ")

    if (!fullAddress) return []

    return [
      {
        id: "default",
        label: "Default Shipping",
        recipient: form.name || "AF Home User",
        phone: form.phone || "No phone provided",
        full: fullAddress,
        isDefault: true,
      },
    ]
  }, [
    profileData?.address,
    profileData?.barangay,
    profileData?.city,
    profileData?.province,
    profileData?.region,
    profileData?.zip_code,
    form.name,
    form.phone,
  ])

  const formatRelativeTime = (value?: string | null) => {
    if (!value) return "Unknown time"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Unknown time"
    const diffMs = clockNow - date.getTime()
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  const formatOnlineDuration = (value?: string | null) => {
    if (!value) return "Unknown"
    const start = new Date(value)
    if (Number.isNaN(start.getTime())) return "Unknown"
    const diffMs = Math.max(0, clockNow - start.getTime())
    const totalMinutes = Math.floor(diffMs / (1000 * 60))
    if (totalMinutes < 1) return "just now"
    if (totalMinutes < 60) return `${totalMinutes} min`
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    const days = Math.floor(hours / 24)
    const remHours = hours % 24
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
  }

  const recentActivity = [...(activityData?.items ?? [])]
    .sort((a, b) => {
      const ta = new Date(a.created_at ?? 0).getTime()
      const tb = new Date(b.created_at ?? 0).getTime()
      return tb - ta
    })
    .slice(0, 5)
    .map((item) => ({
      title: item.title || item.description || "Account activity",
      time: formatRelativeTime(item.created_at ?? null),
      rawTime: item.created_at ?? null,
    }))

  const sortedSessionItems = [...(sessionsData?.items ?? [])].sort((a, b) => {
    if (a.is_current && !b.is_current) return -1
    if (!a.is_current && b.is_current) return 1
    const ta = new Date(a.last_active_at ?? a.created_at ?? 0).getTime()
    const tb = new Date(b.last_active_at ?? b.created_at ?? 0).getTime()
    return tb - ta
  })
  const fallbackCurrentSession = {
    id: 0,
    token_id: 0,
    device: "Current Device",
    platform: "Unknown OS",
    browser: "Unknown Browser",
    location: "",
    ip_address: "",
    user_agent: "",
    created_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
    is_current: true,
  }
  const sessionItems =
    sortedSessionItems.length > 0
      ? sortedSessionItems
      : [fallbackCurrentSession]
  const fallbackProfileLocation = [
    profileData?.city,
    profileData?.province,
    normalizeLocationLabel(profileData?.region),
    profileData?.country,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(", ")
  const parseUserAgentInfo = (ua: string) => {
    const source = ua.toLowerCase()
    let platform = "Unknown OS"
    let browser = "Unknown Browser"

    if (source.includes("windows")) platform = "Windows"
    else if (source.includes("mac os x") || source.includes("macintosh"))
      platform = "macOS"
    else if (source.includes("android")) platform = "Android"
    else if (
      source.includes("iphone") ||
      source.includes("ipad") ||
      source.includes("ios")
    )
      platform = "iOS"
    else if (source.includes("linux")) platform = "Linux"

    if (source.includes("edg/")) browser = "Edge"
    else if (source.includes("opr/") || source.includes("opera"))
      browser = "Opera"
    else if (source.includes("chrome/") && !source.includes("edg/"))
      browser = "Chrome"
    else if (source.includes("safari/") && !source.includes("chrome/"))
      browser = "Safari"
    else if (source.includes("firefox/")) browser = "Firefox"

    return { platform, browser }
  }
  const resolvePlatformBrowser = (session: {
    platform?: string
    browser?: string
    user_agent?: string
    is_current?: boolean
  }) => {
    const platformRaw = String(session.platform ?? "").trim()
    const browserRaw = String(session.browser ?? "").trim()

    const platformUnknown =
      !platformRaw || platformRaw.toLowerCase() === "unknown os"
    const browserUnknown =
      !browserRaw || browserRaw.toLowerCase() === "unknown browser"
    if (!platformUnknown && !browserUnknown) {
      return { platform: platformRaw, browser: browserRaw }
    }

    const sessionUa = String(session.user_agent ?? "").trim()
    if (sessionUa) {
      const parsed = parseUserAgentInfo(sessionUa)
      return {
        platform: platformUnknown ? parsed.platform : platformRaw,
        browser: browserUnknown ? parsed.browser : browserRaw,
      }
    }

    if (session.is_current && typeof window !== "undefined") {
      const parsed = parseUserAgentInfo(window.navigator.userAgent || "")
      return {
        platform: platformUnknown ? parsed.platform : platformRaw,
        browser: browserUnknown ? parsed.browser : browserRaw,
      }
    }

    return {
      platform: platformUnknown ? "Unknown OS" : platformRaw,
      browser: browserUnknown ? "Unknown Browser" : browserRaw,
    }
  }
  const resolveSessionDeviceType = (session: {
    device?: string
    user_agent?: string
    is_current?: boolean
  }) => {
    const rawDevice = String(session.device ?? "").trim()
    const normalizedRaw = rawDevice.toLowerCase()
    const isGenericDeviceLabel =
      normalizedRaw === "current device" ||
      normalizedRaw === "unknown device" ||
      normalizedRaw === "device"
    if (rawDevice && normalizedRaw !== "desktop" && !isGenericDeviceLabel) {
      return rawDevice
    }

    const ua = String(session.user_agent ?? "").toLowerCase()
    if (ua) {
      if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet"
      if (
        ua.includes("mobi") ||
        ua.includes("android") ||
        ua.includes("iphone")
      )
        return "Mobile"
      return "Desktop"
    }

    if (session.is_current && typeof window !== "undefined") {
      const navUa = (window.navigator.userAgent || "").toLowerCase()
      if (navUa.includes("ipad") || navUa.includes("tablet")) return "Tablet"
      if (
        navUa.includes("mobi") ||
        navUa.includes("android") ||
        navUa.includes("iphone")
      )
        return "Mobile"
      return "Desktop"
    }

    return isGenericDeviceLabel ? "Desktop" : rawDevice || "Desktop"
  }
  const resolveSessionLocation = (session: {
    location?: string
    ip_address?: string
  }) => {
    const rawLocation = String(session.location ?? "").trim()
    if (rawLocation && rawLocation.toLowerCase() !== "current location") {
      const cleanedParts = rawLocation
        .split(",")
        .map((part) => normalizeLocationLabel(part))
        .map((part) => part.trim())
        .filter(Boolean)

      const seen = new Set<string>()
      const uniqueParts = cleanedParts.filter((part) => {
        const key = part.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      return uniqueParts.join(", ")
    }
    if (fallbackProfileLocation) {
      return fallbackProfileLocation
    }
    const ipAddress = String(session.ip_address ?? "").trim()
    if (ipAddress) {
      return `IP ${ipAddress}`
    }
    return "Location unavailable"
  }
  const resolvePasskeyMethod = (
    item: PasskeyListItem
  ): "fingerprint" | "faceid" | "pin" | "key" => {
    const extraMetadata = Object.entries(item as Record<string, unknown>)
      .filter(
        ([key]) =>
          key !== "id" &&
          key !== "sign_count" &&
          key !== "created_at" &&
          key !== "last_used_at" &&
          key !== "transports"
      )
      .map(([, value]) => {
        if (Array.isArray(value)) return value.join(" ")
        if (value && typeof value === "object") return JSON.stringify(value)
        return String(value ?? "")
      })
      .join(" ")

    const combined = [
      item.name,
      item.authenticator_type,
      item.authenticator_attachment,
      Array.isArray(item.transports) ? item.transports.join(" ") : "",
      extraMetadata,
    ]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ")

    if (
      combined.includes("face") ||
      combined.includes("face id") ||
      combined.includes("facial")
    ) {
      return "faceid"
    }
    if (
      combined.includes("finger") ||
      combined.includes("touch id") ||
      combined.includes("touchid") ||
      combined.includes("biometric") ||
      combined.includes("windows hello fingerprint")
    ) {
      return "fingerprint"
    }
    if (
      combined.includes("pin") ||
      combined.includes("passcode") ||
      combined.includes("passwordless") ||
      combined.includes("security key pin") ||
      combined.includes("windows hello") ||
      combined.includes("platform")
    ) {
      return "pin"
    }
    return "key"
  }
  const PasskeyMethodIcon = ({
    method,
  }: {
    method: "fingerprint" | "faceid" | "pin" | "key"
  }) => {
    if (method === "faceid") {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-4 w-4"
        >
          <path d="M8 3H6a3 3 0 0 0-3 3v2M16 3h2a3 3 0 0 1 3 3v2M3 16v2a3 3 0 0 0 3 3h2M21 16v2a3 3 0 0 1-3 3h-2" />
          <circle cx="9" cy="10" r="1" />
          <circle cx="15" cy="10" r="1" />
          <path d="M8.5 14c.8.8 1.9 1.2 3.5 1.2s2.7-.4 3.5-1.2" />
        </svg>
      )
    }
    if (method === "fingerprint") {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-4 w-4"
        >
          <path d="M12 3a6 6 0 0 0-6 6v2" />
          <path d="M18 11V9a6 6 0 1 0-12 0v1" />
          <path d="M6 13v1a6 6 0 0 0 6 6" />
          <path d="M12 8a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2" />
          <path d="M15 10v4a3 3 0 0 1-3 3" />
        </svg>
      )
    }
    if (method === "pin") {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <circle cx="8" cy="15" r="3" />
          <path d="M10.5 13.5l4-4a2.5 2.5 0 1 1 3.5 3.5l-4 4" />
          <path d="M14 7l3 3" />
        </svg>
      )
    }
    return (
      <span className="text-sm leading-none" aria-hidden="true">
        🔑
      </span>
    )
  }
  const activityTotalPages = 1
  const sessionTotalPages = Math.max(
    1,
    Math.ceil(sessionItems.length / ACTIVITY_PAGE_SIZE)
  )
  const paginatedRecentActivity = recentActivity
  const paginatedSessionItems = sessionItems.slice(
    (sessionPage - 1) * ACTIVITY_PAGE_SIZE,
    sessionPage * ACTIVITY_PAGE_SIZE
  )

  useEffect(() => {
    setActivityPage(1)
  }, [recentActivity.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(Date.now())
    }, 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setSessionPage((prev) => Math.min(prev, sessionTotalPages))
  }, [sessionTotalPages])

  const TABS: {
    key: Tab
    label: string
    Icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement
  }[] = [
    { key: "profile", label: "Profile", Icon: Icon.User },
    { key: "security", label: "Security", Icon: Icon.Shield },
    { key: "preferences", label: "Preferences", Icon: Icon.Bell },
    { key: "wallet", label: "Wallet", Icon: Icon.Wallet },
    { key: "pv", label: "AF-Voucher", Icon: Icon.Star },
    { key: "encashment", label: "Encashment", Icon: Icon.Bag },
    {
      key: "interior-requests",
      label: "Interior Requests",
      Icon: Icon.Package,
    },
    { key: "activity", label: "Activity", Icon: Icon.Activity },
    { key: "change-username", label: "Change Username", Icon: Icon.Edit },
    { key: "webstore", label: "Webstore", Icon: Icon.Package },
    { key: "referrals", label: "Referrals", Icon: Icon.Network },
    { key: "levels", label: "My Level", Icon: Icon.Trophy },
  ]

  const initials = (form.name || session?.user?.name || "A")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")

  const pwStrength = getPasswordStrength(security.newPassword)
  const activeTabLabel =
    TABS.find((item) => item.key === activeTab)?.label ?? "Profile"

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1280)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (isMobile && mobilePanelOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobile, mobilePanelOpen])

  const tabMotionProps = {
    initial: { opacity: 0, x: slideDir.current * 48 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, transition: { duration: 0.1 } },
    transition: { duration: 0.22, ease: "easeOut" as const },
  }

  const handleMobileBack = () => {
    setMobilePanelOpen(false)
  }

  const handleTabChange = (tab: Tab, options?: { focus?: string }) => {
    const currentIndex = TABS.findIndex((t) => t.key === activeTab)
    const nextIndex = TABS.findIndex((t) => t.key === tab)
    slideDir.current = nextIndex >= currentIndex ? 1 : -1
    setActiveTab(tab)
    if (isMobile) setMobilePanelOpen(true)
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set("tab", tab)
    if (options?.focus) {
      nextParams.set("focus", options.focus)
    } else {
      nextParams.delete("focus")
    }
    router.replace(
      `${profileBasePath}?${nextParams.toString()}${options?.focus ? "#verification-form" : ""}`,
      { scroll: false }
    )
  }

  const dismissProfileRewardModal = (nextTab?: Tab) => {
    if (profileRewardModalStorageKey && typeof window !== "undefined") {
      window.localStorage.setItem(profileRewardModalStorageKey, "1")
    }
    setProfileRewardModalOpen(false)
    // Persist the dismissal server-side so it never reappears on other devices.
    if (!profileData?.profile_reward_modal_seen) {
      dismissProfileRewardModalRequest()
        .unwrap()
        .catch(() => {
          // Non-blocking: localStorage already prevents re-show on this device.
        })
    }
    if (nextTab) {
      handleTabChange(nextTab)
    }
  }

  const dismissLevelUpCelebration = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete("celebrate")
    nextParams.delete("rank")
    router.replace(
      `${profileBasePath}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
      { scroll: false }
    )
  }, [profileBasePath, router, searchParams])

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/")
  }

  const handleRevokeSession = async (tokenId: number, isCurrent: boolean) => {
    if (isCurrent && !tokenId) {
      await signOut({ callbackUrl: "/login" })
      return
    }
    if (!tokenId) return
    setRevokingTokenId(tokenId)
    try {
      const result = await revokeMemberSession(tokenId).unwrap()
      if (isCurrent || result.is_current) {
        await signOut({ callbackUrl: "/login" })
        return
      }
      setProfileMsg({
        type: "success",
        text: "Device signed out successfully.",
      })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setProfileMsg({
        type: "error",
        text: apiError?.data?.message || "Failed to sign out this device.",
      })
    } finally {
      setRevokingTokenId(null)
    }
  }

  const resolveCustomerAccessToken = useCallback(async (): Promise<string> => {
    if (accessToken) return accessToken

    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      })
      const sessionPayload = await response.json().catch(() => null)
      const token = String(
        (sessionPayload?.user as { accessToken?: string } | undefined)
          ?.accessToken ?? ""
      )
      return token
    } catch {
      return ""
    }
  }, [accessToken])

  const loadPasskeys = useCallback(async () => {
    if (!isCustomerSession) return
    if (!apiBaseUrl) {
      setPasskeyError("API URL is not configured for passkeys.")
      return
    }

    const token = await resolveCustomerAccessToken()
    if (!token) {
      setPasskeyError("Your session token is missing. Please sign in again.")
      return
    }

    setIsLoadingPasskeys(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/passkeys`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(String(payload?.message || "Failed to load passkeys."))
      }
      const rows = Array.isArray(payload?.passkeys) ? payload.passkeys : []
      setPasskeys(rows)
    } catch (err: unknown) {
      setPasskeys([])
      setPasskeyError(
        err instanceof Error ? err.message : "Failed to load passkeys."
      )
    } finally {
      setIsLoadingPasskeys(false)
    }
  }, [
    apiBaseUrl,
    isCustomerSession,
    resolveCustomerAccessToken,
    setPasskeyError,
  ])

  const handleRegisterPasskey = async () => {
    if (!isCustomerSession) {
      setPasskeyError("You need to be signed in to add a passkey.")
      return
    }
    if (!apiBaseUrl) {
      setPasskeyError("API URL is not configured for passkeys.")
      return
    }
    const token = await resolveCustomerAccessToken()
    if (!token) {
      setPasskeyError("Your session token is missing. Please sign in again.")
      return
    }
    if (!passkeySupported) {
      setPasskeyError("Passkeys are not supported on this browser/device.")
      return
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setPasskeyError("Passkeys require a secure context (HTTPS or localhost).")
      return
    }

    setIsRegisteringPasskey(true)
    try {
      const startResponse = await fetch(
        `${apiBaseUrl}/api/auth/passkeys/register/options`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: passkeyName.trim() || undefined,
          }),
        }
      )
      const startPayload = await startResponse.json().catch(() => null)
      if (!startResponse.ok) {
        throw new Error(
          String(
            startPayload?.message || "Failed to start passkey registration."
          )
        )
      }

      const publicKey = startPayload?.public_key
      if (
        !publicKey?.challenge ||
        !publicKey?.user?.id ||
        !publicKey?.rp?.id ||
        !publicKey?.rp?.name
      ) {
        throw new Error("Invalid passkey options from server.")
      }

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64UrlToUint8Array(String(publicKey.challenge)),
          rp: {
            id: String(publicKey.rp.id),
            name: String(publicKey.rp.name),
          },
          user: {
            id: base64UrlToUint8Array(String(publicKey.user.id)),
            name: String(publicKey.user.name),
            displayName: String(publicKey.user.displayName),
          },
          pubKeyCredParams: Array.isArray(publicKey.pubKeyCredParams)
            ? publicKey.pubKeyCredParams
            : [],
          timeout: Number(publicKey.timeout ?? 60000),
          attestation: "none",
          authenticatorSelection: publicKey.authenticatorSelection ?? undefined,
          excludeCredentials: Array.isArray(publicKey.excludeCredentials)
            ? (
                publicKey.excludeCredentials as PasskeyCredentialDescriptor[]
              ).map((item) => ({
                type: "public-key",
                id: base64UrlToUint8Array(String(item?.id ?? "")),
                transports: Array.isArray(item?.transports)
                  ? item.transports
                  : undefined,
              }))
            : undefined,
        },
      })

      if (!credential || !(credential instanceof PublicKeyCredential)) {
        throw new Error("No passkey credential returned by device.")
      }

      const attestationResponse =
        credential.response as AuthenticatorAttestationResponse & {
          getPublicKey?: () => ArrayBuffer | null
          getPublicKeyAlgorithm?: () => number
          getTransports?: () => string[]
        }
      const publicKeyBuffer = attestationResponse.getPublicKey
        ? attestationResponse.getPublicKey()
        : null
      if (!publicKeyBuffer) {
        throw new Error(
          "This browser does not expose passkey public key bytes. Try latest Chrome/Safari/Edge."
        )
      }

      const verifyResponse = await fetch(
        `${apiBaseUrl}/api/auth/passkeys/register/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            challenge_token: String(startPayload.challenge_token || ""),
            name: passkeyName.trim() || undefined,
            credential: {
              id: credential.id,
              rawId: uint8ArrayToBase64Url(credential.rawId),
              type: credential.type,
              response: {
                clientDataJSON: uint8ArrayToBase64Url(
                  attestationResponse.clientDataJSON
                ),
                attestationObject: uint8ArrayToBase64Url(
                  attestationResponse.attestationObject
                ),
                publicKey: uint8ArrayToBase64Url(publicKeyBuffer),
                publicKeyAlgorithm:
                  typeof attestationResponse.getPublicKeyAlgorithm ===
                  "function"
                    ? attestationResponse.getPublicKeyAlgorithm()
                    : undefined,
                transports:
                  typeof attestationResponse.getTransports === "function"
                    ? attestationResponse.getTransports()
                    : undefined,
              },
            },
          }),
        }
      )
      const verifyPayload = await verifyResponse.json().catch(() => null)
      if (!verifyResponse.ok) {
        const errorMessage = String(
          verifyPayload?.message ||
            verifyPayload?.errors?.credential?.[0] ||
            verifyPayload?.errors?.challenge_token?.[0] ||
            "Failed to register passkey."
        )
        throw new Error(errorMessage)
      }

      setPasskeyName("")
      setPasskeySuccess(
        String(verifyPayload?.message || "Passkey added successfully.")
      )
      await loadPasskeys()
    } catch (err: unknown) {
      const message =
        err instanceof DOMException
          ? err.name === "NotAllowedError"
            ? "Passkey registration was cancelled or timed out."
            : err.name === "SecurityError"
              ? "Passkey is unavailable for this website origin/domain."
              : "Passkey registration failed."
          : err instanceof Error
            ? err.message
            : "Failed to register passkey."
      setPasskeyError(message)
    } finally {
      setIsRegisteringPasskey(false)
    }
  }

  const handleRemovePasskey = async (id: number) => {
    if (!isCustomerSession) {
      setPasskeyError("You need to be signed in to remove a passkey.")
      return
    }
    if (!apiBaseUrl) {
      setPasskeyError("API URL is not configured for passkeys.")
      return
    }
    const token = await resolveCustomerAccessToken()
    if (!token) {
      setPasskeyError("Your session token is missing. Please sign in again.")
      return
    }
    setRemovingPasskeyId(id)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/passkeys/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(String(payload?.message || "Failed to remove passkey."))
      }
      setPasskeySuccess(String(payload?.message || "Passkey removed."))
      await loadPasskeys()
    } catch (err: unknown) {
      setPasskeyError(
        err instanceof Error ? err.message : "Failed to remove passkey."
      )
    } finally {
      setRemovingPasskeyId(null)
      setPasskeyToRemove(null)
    }
  }

  useEffect(() => {
    if (activeTab !== "security") return
    void loadPasskeys()
  }, [activeTab, loadPasskeys])

  const incompleteProfileItems = completionItems.filter((item) => !item.done)

  return (
    <>
      {!partnerSlug && <TopBar />}
      <Navbar
        initialCategories={initialCategories}
        logoSrc={partnerLogoUrl ?? "/Images/af_home_logo.png"}
        logoAlt={partnerStorefront?.displayName || "AF Home"}
        logoHref={partnerHomeHref}
        categoryOnlyNav={Boolean(partnerSlug)}
        showGuestCartWishlist={Boolean(partnerSlug)}
        stickToTop={Boolean(partnerSlug)}
      />
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative min-h-screen bg-gray-50 dark:bg-gray-900"
      >
        <div className="container mx-auto max-w-[1400px] px-4 py-8 md:py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <span>Account</span>
              <Icon.ChevronRight className="h-3 w-3" />
              <span className="font-medium text-gray-600 dark:text-gray-300">
                Profile
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-white">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your personal information, security, and preferences.
            </p>
          </div>

          <AnimatePresence initial={false}>
            {isProfileActionPending && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="sticky top-16 z-30 -mx-4 mb-4 border-b border-sky-100 bg-white/95 px-4 py-2 backdrop-blur-sm dark:border-sky-900/40 dark:bg-gray-800/95"
              >
                <div className="mx-auto flex max-w-[1400px] items-center gap-3">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-900/40">
                    <motion.div
                      className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-500"
                      animate={{ x: ["-120%", "320%"] }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {profileActionStatus}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab navigation bar */}
          <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-md dark:border-gray-700/60 dark:bg-gray-900/95">
            {/* Mobile/tablet horizontal scroll (hidden on xl+) */}
            <nav className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-3 py-2 xl:hidden [&::-webkit-scrollbar]:hidden">
              {(() => {
                const shortLabel: Record<Tab, string> = {
                  profile: "Profile",
                  security: "Security",
                  preferences: "Prefs",
                  wallet: "Wallet",
                  pv: "Voucher",
                  encashment: "Encash",
                  "interior-requests": "Requests",
                  activity: "Activity",
                  "change-username": "Username",
                  webstore: "Webstore",
                  referrals: "Referrals",
                  levels: "My Level",
                }
                return TABS.map(({ key, Icon: TabIcon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTabChange(key)}
                    className={`inline-flex shrink-0 flex-col items-center gap-1 rounded-xl px-3.5 py-2 text-[10px] font-semibold transition-all ${
                      activeTab === key
                        ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm ring-1 shadow-sky-200/60 ring-white/25 dark:shadow-sky-900/40"
                        : "text-gray-500 hover:bg-slate-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-slate-800/60 dark:hover:text-gray-200"
                    }`}
                  >
                    <span
                      className={`relative grid h-8 w-8 place-items-center rounded-xl transition-all ${
                        activeTab === key
                          ? "bg-white/20 ring-1 ring-white/30 backdrop-blur"
                          : "bg-white/60 ring-1 ring-slate-200/70 group-hover:ring-sky-200/70 dark:bg-gray-800/60 dark:ring-slate-700/60 dark:group-hover:ring-sky-700/60"
                      }`}
                      aria-hidden="true"
                    >
                      <TabIcon
                        className={`h-4 w-4 transition-colors ${
                          activeTab === key
                            ? "text-white"
                            : "text-slate-500 group-hover:text-sky-600 dark:text-gray-400 dark:group-hover:text-sky-400"
                        }`}
                      />
                    </span>
                    <span className="leading-tight">{shortLabel[key]}</span>
                  </button>
                ))
              })()}
            </nav>

            {/* Desktop horizontal bar (hidden below xl) */}
            <nav className="hidden [scrollbar-width:none] overflow-x-auto px-4 py-2 xl:block [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center justify-between gap-1">
                {TABS.map(({ key, label, Icon: TabIcon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTabChange(key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                      activeTab === key
                        ? "bg-sky-500 text-white shadow-sm shadow-sky-200/60 dark:bg-sky-600 dark:shadow-sky-900/40"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
                    }`}
                  >
                    <TabIcon
                      className={`h-3.5 w-3.5 shrink-0 ${activeTab === key ? "text-white" : "text-gray-400 dark:text-gray-500"}`}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </nav>
          </div>

          {celebrateLevelUp && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br ${TIER_COVER[celebrateTier].gradient} text-white shadow-xl`}
            >
              <div className="relative p-5 md:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.14),transparent_30%)]" />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl border border-white/35 bg-white/15 p-2.5 backdrop-blur-sm">
                      <img
                        src={TIER_BADGE_IMAGE[celebrateTier]}
                        alt={celebrateTier}
                        className="h-16 w-16 object-contain drop-shadow-lg"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold tracking-[0.22em] text-white/80 uppercase">
                        New Level
                      </p>
                      <h3 className="mt-1 text-2xl font-bold">
                        {celebrateTier}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm text-white/90">
                        Congratulations! Your account has been upgraded and your
                        new badge is now active.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleTabChange("profile")}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                    >
                      View My Badge
                    </button>
                    <button
                      type="button"
                      onClick={dismissLevelUpCelebration}
                      className="rounded-2xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            {/* Sidebar */}
            <aside className="space-y-4 xl:col-span-4">
              {/* Profile Card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-gray-900"
              >
                {/* Cover banner - tier-specific gradient */}
                <div
                  className={`h-44 bg-gradient-to-br ${TIER_COVER[loyaltyTier].gradient} relative overflow-hidden`}
                >
                  {/* Layered shine overlays */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "radial-gradient(ellipse at 20% 70%, rgba(255,255,255,0.32) 0%, transparent 55%), radial-gradient(ellipse at 80% 15%, rgba(255,255,255,0.22) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.15) 0%, transparent 60%)",
                    }}
                  />
                  {/* Decorative blobs */}
                  <div className="pointer-events-none absolute -bottom-14 -left-14 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                  <div className="pointer-events-none absolute -top-8 right-1/4 h-32 w-32 rounded-full bg-white/8 blur-2xl" />
                  <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-32 bg-black/10 blur-2xl" />
                  {/* Subtle grid pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.5) 30px, rgba(255,255,255,0.5) 31px), repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(255,255,255,0.5) 30px, rgba(255,255,255,0.5) 31px)",
                    }}
                  />

                  {/* Rank label - top left */}
                  <div className="absolute top-3.5 left-4">
                    <span className="text-[10px] font-black tracking-[0.25em] text-white/70 uppercase">
                      Member Profile
                    </span>
                  </div>

                  {/* Badge - top right with glass frame */}
                  <div className="absolute top-3 right-3 flex flex-col items-center gap-1.5">
                    <div className="rounded-2xl border border-white/35 bg-white/20 p-2 shadow-2xl backdrop-blur-lg">
                      <img
                        src={TIER_BADGE_IMAGE[loyaltyTier]}
                        alt={loyaltyTier}
                        className="h-16 w-16 object-contain drop-shadow-xl"
                      />
                    </div>
                    <span className="rounded-full border border-white/20 bg-black/30 px-2.5 py-0.5 text-[9px] font-black tracking-[0.2em] text-white uppercase shadow-sm backdrop-blur-sm">
                      {loyaltyTier}
                    </span>
                  </div>
                </div>

                {/* Avatar - centered, floating over banner */}
                <div className="-mt-14 flex flex-col items-center px-5 pb-5">
                  <div ref={avatarSectionRef} className="relative mb-4">
                    {/* Tier-colored ring behind avatar */}
                    <div
                      className={`absolute -inset-1 rounded-full bg-gradient-to-br ${TIER_COVER[loyaltyTier].gradient} opacity-80 blur-[2px]`}
                    />

                    {/* Spin ring while uploading */}
                    {isUploadingAvatar && (
                      <span className="pointer-events-none absolute -inset-2 z-20 animate-spin rounded-full border-[3px] border-transparent border-t-white border-r-white/60" />
                    )}

                    {/* Avatar image or initials */}
                    {effectiveAvatarUrl ? (
                      <button
                        type="button"
                        onClick={() => setIsAvatarPreviewOpen(true)}
                        className="group relative block cursor-zoom-in"
                        aria-label="View profile photo"
                      >
                        <img
                          src={effectiveAvatarUrl}
                          alt={form.name || "Profile photo"}
                          className="relative z-10 h-28 w-28 rounded-full object-cover shadow-2xl ring-4 ring-white dark:ring-gray-900"
                        />
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/35">
                          <svg
                            className="h-6 w-6 text-white opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0zm0 0l2 2"
                            />
                          </svg>
                        </div>
                      </button>
                    ) : (
                      <div
                        className={`relative h-28 w-28 rounded-full bg-gradient-to-br ${TIER_COVER[loyaltyTier].gradient} z-10 flex items-center justify-center text-3xl font-black text-white shadow-2xl ring-4 ring-white dark:ring-gray-900`}
                      >
                        {initials}
                      </div>
                    )}

                    {/* Edit badge — always visible, bottom-right */}
                    <label
                      className="absolute right-0 bottom-0 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 bg-white shadow-lg transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:bg-gray-800 dark:hover:bg-slate-700"
                      title="Change profile photo"
                      aria-label="Change profile photo"
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <Icon.Camera className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </label>
                  </div>

                  {/* User info - centered */}
                  <h2 className="text-center text-xl leading-tight font-black tracking-tight text-slate-900 dark:text-white">
                    {form.name || "AF Home User"}
                  </h2>
                  <p className="mt-1 text-center text-xs text-slate-400 dark:text-slate-500">
                    {form.email}
                  </p>
                  {form.username && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      @{form.username}
                    </span>
                  )}

                  {/* Tier pill - premium version */}
                  <div
                    className={`mt-3 flex items-center gap-2 rounded-full bg-gradient-to-r px-3.5 py-1.5 ${TIER_COVER[loyaltyTier].gradient} shadow-md`}
                    style={{
                      boxShadow: `0 4px 14px ${TIER_COVER[loyaltyTier].glow}`,
                    }}
                  >
                    <img
                      src={TIER_BADGE_IMAGE[loyaltyTier]}
                      alt={loyaltyTier}
                      className="h-4 w-4 shrink-0 object-contain drop-shadow"
                    />
                    <span className="text-[11px] font-black tracking-wide text-white">
                      {loyaltyTier}
                    </span>
                    <span className="text-[10px] font-bold text-white/70">
                      • Rank {effectiveRank}
                    </span>
                  </div>

                  {/* Account micro-stats */}
                  <div className="mt-4 flex w-full items-center divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                    {accountSnapshot?.loyalty?.join_date && (
                      <div className="flex-1 px-3 py-2 text-center">
                        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                          Joined
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                          {formatExactJoinedDate(
                            accountSnapshot.loyalty.join_date
                          )}
                        </p>
                      </div>
                    )}
                    <div className="flex-1 px-3 py-2 text-center">
                      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                        Referrals
                      </p>
                      <p className="mt-0.5 text-sm font-black text-slate-700 dark:text-slate-200">
                        {accountSnapshot?.loyalty?.referral_count ?? 0}
                      </p>
                    </div>
                    <div className="flex-1 px-3 py-2 text-center">
                      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                        Rank
                      </p>
                      <p className="mt-0.5 text-sm font-black text-slate-700 dark:text-slate-200">
                        {effectiveRank}
                      </p>
                    </div>
                  </div>

                  {isUploadingAvatar && (
                    <p className="mt-2 animate-pulse text-xs font-semibold text-sky-500">
                      Uploading photo…
                    </p>
                  )}
                  {effectiveAvatarUrl && !isUploadingAvatar && (
                    <button
                      type="button"
                      onClick={() => setIsAvatarPreviewOpen(true)}
                      className="mt-1.5 text-xs font-semibold text-sky-500 hover:text-sky-600 hover:underline dark:hover:text-sky-400"
                    >
                      View Photo
                    </button>
                  )}

                  {/* Profile completion */}
                  <div className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="mb-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Profile Completion
                        </span>
                        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                          {completion >= 100
                            ? "Fully verified account."
                            : completion < 60
                              ? "Fill in your details to unlock all features."
                              : "Almost there — just a few fields left."}
                        </p>
                      </div>
                      <span
                        className={`text-xl font-black tabular-nums ${completion >= 100 ? "text-emerald-500" : "text-sky-600 dark:text-sky-400"}`}
                      >
                        {completion}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <motion.div
                        className={`h-full rounded-full ${completion >= 100 ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-sky-400 to-indigo-500"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${completion}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Level Progress Teaser */}
                  {(() => {
                    const nextRank = Math.min(5, effectiveRank + 1)
                    const nextTier = rankToTier(nextRank)
                    const reqs = NEXT_TIER_REQUIREMENTS[effectiveRank]
                    const nextCover = TIER_COVER[nextTier]
                    const pvNow = accountSnapshot?.loyalty?.personal_pv ?? 0
                    const refsNow =
                      accountSnapshot?.loyalty?.referral_count ?? 0
                    const amNow =
                      accountSnapshot?.loyalty?.active_members_count ?? 0
                    const abNow =
                      accountSnapshot?.loyalty?.active_builders_count ?? 0
                    const alNow =
                      accountSnapshot?.loyalty?.active_leaders_count ?? 0

                    const rows =
                      reqs && effectiveRank < 5
                        ? [
                            { current: pvNow, target: reqs.pv },
                            { current: refsNow, target: reqs.referrals },
                            ...(reqs.activeMembers
                              ? [{ current: amNow, target: reqs.activeMembers }]
                              : []),
                            ...(reqs.activeBuilders
                              ? [
                                  {
                                    current: abNow,
                                    target: reqs.activeBuilders,
                                  },
                                ]
                              : []),
                            ...(reqs.activeLeaders
                              ? [{ current: alNow, target: reqs.activeLeaders }]
                              : []),
                          ]
                        : []

                    const overallPct =
                      rows.length > 0
                        ? Math.round(
                            rows.reduce(
                              (acc, r) =>
                                acc +
                                Math.min(
                                  100,
                                  r.target > 0
                                    ? (r.current / r.target) * 100
                                    : 100
                                ),
                              0
                            ) / rows.length
                          )
                        : 100

                    const activeCover =
                      effectiveRank >= 5
                        ? TIER_COVER["Lifestyle Elite"]
                        : nextCover

                    return (
                      <div className="mt-4 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
                        {/* Header */}
                        <div
                          className={`relative bg-gradient-to-r ${activeCover.gradient} flex items-center justify-between overflow-hidden px-4 py-3`}
                        >
                          <div
                            className="absolute inset-0 opacity-10"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 8px)",
                            }}
                          />
                          <div className="relative flex items-center gap-2">
                            <svg
                              className="h-3.5 w-3.5 text-white/90"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                              <path d="M4 22h16" />
                              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                              <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
                            </svg>
                            <span className="text-xs font-black tracking-wide text-white uppercase">
                              Rank Progress
                            </span>
                          </div>
                          {effectiveRank >= 5 ? (
                            <span className="relative rounded-full border border-white/30 bg-white/25 px-2.5 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">
                              MAX RANK
                            </span>
                          ) : (
                            <span className="relative text-[10px] font-bold text-white/80">
                              {overallPct}% to next
                            </span>
                          )}
                        </div>

                        <div className="p-4">
                          {/* Badge comparison */}
                          <div className="mb-4 flex items-center justify-center gap-4">
                            <div className="flex flex-col items-center gap-1.5">
                              <div
                                className={`rounded-2xl bg-gradient-to-br ${TIER_COVER[loyaltyTier].gradient} p-2 opacity-80 shadow-md`}
                              >
                                <img
                                  src={TIER_BADGE_IMAGE[loyaltyTier]}
                                  alt={loyaltyTier}
                                  className="h-11 w-11 object-contain"
                                />
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                  Current
                                </p>
                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                  Rank {effectiveRank}
                                </p>
                              </div>
                            </div>

                            {effectiveRank < 5 && (
                              <>
                                <div className="flex flex-col items-center gap-1">
                                  <div
                                    className={`h-8 w-8 rounded-full bg-gradient-to-br ${nextCover.gradient} flex shrink-0 items-center justify-center shadow-lg`}
                                    style={{
                                      boxShadow: `0 4px 12px ${nextCover.glow}`,
                                    }}
                                  >
                                    <svg
                                      className="h-4 w-4 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                  </div>
                                  <div className="h-1 w-8 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                    <motion.div
                                      className={`h-full rounded-full bg-gradient-to-r ${nextCover.gradient}`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${overallPct}%` }}
                                      transition={{
                                        duration: 0.9,
                                        ease: "easeOut",
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col items-center gap-1.5">
                                  <div
                                    className={`rounded-2xl bg-gradient-to-br ${nextCover.gradient} p-2 shadow-lg`}
                                    style={{
                                      boxShadow: `0 6px 16px ${nextCover.glow}`,
                                    }}
                                  >
                                    <img
                                      src={TIER_BADGE_IMAGE[nextTier]}
                                      alt={nextTier}
                                      className="h-11 w-11 object-contain drop-shadow"
                                    />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[9px] font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                      Next
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                      Rank {nextRank}
                                    </p>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Overall progress bar */}
                          {effectiveRank < 5 && (
                            <div className="mb-4">
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                  Overall Progress
                                </span>
                                <span
                                  className={`text-[11px] font-black tabular-nums ${overallPct >= 100 ? "text-emerald-500" : "text-slate-700 dark:text-slate-300"}`}
                                >
                                  {overallPct}%
                                </span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <motion.div
                                  className={`h-full rounded-full ${overallPct >= 100 ? "bg-gradient-to-r from-emerald-400 to-teal-500" : `bg-gradient-to-r ${nextCover.gradient}`}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${overallPct}%` }}
                                  transition={{
                                    duration: 0.9,
                                    ease: "easeOut",
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* View details button */}
                          <button
                            type="button"
                            onClick={() => handleTabChange("levels")}
                            className={`w-full rounded-xl bg-gradient-to-r ${activeCover.gradient} flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-black text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98]`}
                            style={{
                              boxShadow: `0 4px 14px ${activeCover.glow}`,
                            }}
                          >
                            View My Level Details
                            <svg
                              className="h-3.5 w-3.5 text-white/80"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Referral section */}
                {
                  <div className="px-5 pb-5">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/60">
                      {/* Header */}
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30">
                            <svg
                              className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="18" cy="5" r="3" />
                              <circle cx="6" cy="12" r="3" />
                              <circle cx="18" cy="19" r="3" />
                              <line
                                x1="8.59"
                                y1="13.51"
                                x2="15.42"
                                y2="17.49"
                              />
                              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                          </div>
                          <p className="text-xs font-bold text-slate-700 dark:text-gray-300">
                            Affiliate Referral QR
                          </p>
                        </div>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-400">
                          Ready to Share
                        </span>
                      </div>

                      <div className="space-y-3">
                        <ReferralShareCard
                          title="Invite Members"
                          description="Use this link when someone wants to register as your referral."
                          badge="Signup"
                          link={memberReferralLink}
                          qrUrl={memberReferralQrUrl}
                          onCopy={() => handleCopyReferralLink("member")}
                          onShare={() => handleShareReferralLink("member")}
                          message={referralMsg}
                          emptyText="Set your username first to generate your signup referral link."
                          linkLabel="Member signup link"
                          qrAlt="Signup referral QR code"
                        />
                        <ReferralShareCard
                          title="Share Shopping Link"
                          description="Use this link for non-members who only want to shop. Their checkout will carry your referral automatically."
                          badge="Shopping"
                          link={shoppingReferralLink}
                          qrUrl={shoppingReferralQrUrl}
                          onCopy={() => handleCopyReferralLink("shopping")}
                          onShare={() => handleShareReferralLink("shopping")}
                          message={referralMsg}
                          emptyText="Set your username first to generate your shopping referral link."
                          linkLabel="Shopping referral link"
                          qrAlt="Shopping referral QR code"
                        />
                      </div>

                      {referralMsg && (
                        <p
                          className={`mt-2 text-xs font-medium ${referralMsg.type === "success" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {referralMsg.text}
                        </p>
                      )}

                      {/* Network stats */}
                      <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-700">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-700 dark:text-gray-300">
                            Affiliate Network
                          </p>
                          {!isReferralTreeLoading && (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                              {referralSummary.totalNetwork} members
                            </span>
                          )}
                        </div>
                        <div className="mb-3 grid grid-cols-3 gap-2">
                          <div className="rounded-xl border border-slate-200 px-2 py-2.5 text-center dark:border-slate-700 dark:bg-gray-900">
                            <p className="mb-0.5 text-[10px] font-medium text-slate-500 dark:text-gray-400">
                              Direct
                            </p>
                            <p className="text-base font-bold text-slate-800 dark:text-gray-200">
                              {referralSummary.directCount}
                            </p>
                          </div>
                          <div className="rounded-xl border border-sky-200 px-2 py-2.5 text-center dark:border-sky-800 dark:bg-sky-900/30">
                            <p className="mb-0.5 text-[10px] font-medium text-sky-500 dark:text-sky-400">
                              Level 2
                            </p>
                            <p className="text-base font-bold text-sky-700 dark:text-sky-300">
                              {referralSummary.secondLevelCount}
                            </p>
                          </div>
                          <div className="rounded-xl border border-emerald-200 px-2 py-2.5 text-center dark:border-emerald-800 dark:bg-emerald-900/30">
                            <p className="mb-0.5 text-[10px] font-medium text-emerald-500 dark:text-emerald-400">
                              Total
                            </p>
                            <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                              {referralSummary.totalNetwork}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTabChange("referrals")}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-600"
                        >
                          <svg
                            className="h-3.5 w-3.5 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                          View Full Referral Tree
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </motion.div>

              {/* Account stats */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-gray-900"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase dark:text-slate-500">
                    Account Snapshot
                  </h3>
                  <div className="ml-3 h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {accountStats.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-left transition-all duration-200 hover:border-sky-200 hover:bg-sky-50/80 active:scale-[0.97] dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:border-sky-700 dark:hover:bg-sky-900/20"
                    >
                      <item.Icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-sky-500 dark:text-slate-500" />
                      <p className="mt-2 text-xl leading-none font-black text-slate-800 tabular-nums dark:text-slate-100">
                        {item.value}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                        {item.label}
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Quick actions */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-gray-900"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase dark:text-slate-500">
                    Quick Actions
                  </h3>
                  <div className="ml-3 h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-1.5">
                  {[
                    {
                      label: "View My Orders",
                      Icon: Icon.Bag,
                      href: partnerSlug ? `/${partnerSlug}/orders` : "/orders",
                      color: "group-hover:text-violet-500",
                    },
                    {
                      label: "Saved Wishlist",
                      Icon: Icon.Heart,
                      href: partnerSlug
                        ? `/${partnerSlug}/wishlist`
                        : "/wishlist",
                      color: "group-hover:text-rose-500",
                    },
                    {
                      label: "Manage Addresses",
                      Icon: Icon.MapPin,
                      href: partnerSlug
                        ? `/${partnerSlug}/profile`
                        : "/profile",
                      color: "group-hover:text-emerald-500",
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className="group flex w-full items-center justify-between gap-2.5 rounded-xl bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-100 active:scale-[0.98] dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <item.Icon
                          className={`h-4 w-4 text-slate-400 transition-colors dark:text-slate-500 ${item.color}`}
                        />
                        {item.label}
                      </div>
                      <svg
                        className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-slate-400 dark:text-slate-600 dark:group-hover:text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              </motion.div>
            </aside>

            {/* --- Main content --- */}
            <motion.div
              ref={mainContentRef}
              className={
                isMobile
                  ? "fixed inset-0 z-[100] flex flex-col overflow-hidden bg-white dark:bg-gray-900"
                  : "space-y-5 xl:col-span-8"
              }
              initial={false}
              animate={{ x: isMobile && !mobilePanelOpen ? "100%" : 0 }}
              transition={{
                type: "tween",
                duration: 0.32,
                ease: [0.32, 0.72, 0, 1],
              }}
            >
              {/* Mobile header with back button */}
              {isMobile && (
                <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                  <button
                    type="button"
                    onClick={handleMobileBack}
                    className="flex items-center gap-1.5 rounded-lg p-1 text-sky-600 transition active:bg-sky-50 dark:text-sky-400"
                    aria-label="Back"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {activeTabLabel}
                  </span>
                </div>
              )}

              <div
                className={
                  isMobile
                    ? "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain"
                    : "overflow-visible"
                }
              >
                <div className="space-y-5 overflow-x-hidden pb-6">
                  <AnimatePresence mode="wait">
                    {/* --- Profile tab --- */}
                    {activeTab === "profile" && (
                      <motion.div
                        key="profile"
                        {...tabMotionProps}
                        className="space-y-5"
                      >
                        <div
                          className={`rounded-2xl border p-5 md:p-6 ${
                            completion >= 100
                              ? "border-sky-100 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/20"
                              : "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p
                                className={`text-xs font-semibold tracking-[0.22em] uppercase ${
                                  completion >= 100
                                    ? "text-sky-600 dark:text-sky-400"
                                    : "text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                Profile completion
                              </p>
                              <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                                {completion >= 100
                                  ? "Your profile is complete"
                                  : "Action needed: complete your profile"}
                              </h3>
                              <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                                {completion >= 100
                                  ? "Your account details are ready for login, contact, and delivery."
                                  : `${incompleteProfileItems.length} section${incompleteProfileItems.length === 1 ? "" : "s"} still need attention before your profile reaches 100%.`}
                              </p>
                            </div>
                            <div
                              className={`rounded-2xl border bg-white px-4 py-3 text-center dark:bg-slate-900/60 ${
                                completion >= 100
                                  ? "border-sky-200 dark:border-sky-800"
                                  : "border-amber-200 dark:border-amber-800"
                              }`}
                            >
                              <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-gray-500">
                                Completion
                              </p>
                              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                                {completion}%
                              </p>
                            </div>
                          </div>

                          <AnimatePresence mode="wait">
                            {completion >= 100 ? (
                              <motion.div
                                key="profile-reward-achieved"
                                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className="relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
                              >
                                {/* Decorative rays top-right */}
                                <span
                                  aria-hidden="true"
                                  className="absolute top-3 right-4 flex flex-col items-end gap-0.5"
                                >
                                  {[14, 10, 7].map((w, i) => (
                                    <span
                                      key={i}
                                      className="block h-0.5 rounded-full bg-emerald-400/70"
                                      style={{ width: w }}
                                    />
                                  ))}
                                </span>

                                <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                                  {/* Left: text */}
                                  <div className="min-w-0 flex-1">
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black tracking-[0.16em] text-emerald-700 uppercase dark:bg-emerald-900/50 dark:text-emerald-300">
                                      <Icon.Trophy className="h-3.5 w-3.5" />
                                      Rewards achieved
                                    </div>
                                    <h4 className="mt-3 text-xl leading-snug font-black text-slate-900 dark:text-white">
                                      Profile complete
                                      <br />
                                      reward unlocked 🎉
                                    </h4>
                                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                      You qualified for the one-time profile
                                      completion reward. Check your wallet and
                                      AF-Voucher activity after rewards are
                                      credited.
                                    </p>
                                  </div>

                                  {/* Right: reward cards */}
                                  <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
                                    {[
                                      {
                                        label: "E-VOUCHER",
                                        value: "50",
                                        unit: "Credits",
                                        labelColor: "text-amber-500",
                                        border:
                                          "border-amber-200 dark:border-amber-900/50",
                                        bg: "bg-amber-50/80 dark:bg-amber-950/20",
                                        iconBg:
                                          "bg-amber-100 dark:bg-amber-900/40",
                                        iconColor: "text-amber-500",
                                        badgeBg: "bg-white dark:bg-slate-900",
                                        badgeColor: "text-amber-400",
                                        dotColor:
                                          "bg-amber-200/70 dark:bg-amber-800/40",
                                        mainIcon: (
                                          <svg
                                            className="h-5 w-5"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            aria-hidden="true"
                                          >
                                            <path d="M20 12a2 2 0 0 0-2-2V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2zm-2 5H4v-2.268A2 2 0 0 0 4 10.268V8h12v2.268A2 2 0 0 0 16 14.732V17z" />
                                            <polygon points="9,9 10.5,12 9,15 15,12" />
                                          </svg>
                                        ),
                                        badgeIcon: (
                                          <svg
                                            className="h-3.5 w-3.5"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                          >
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                          </svg>
                                        ),
                                      },
                                      {
                                        label: "PV REWARD",
                                        value: "20",
                                        unit: "Points",
                                        labelColor: "text-sky-500",
                                        border:
                                          "border-sky-200 dark:border-sky-900/50",
                                        bg: "bg-sky-50/80 dark:bg-sky-950/20",
                                        iconBg: "bg-sky-500",
                                        iconColor: "text-white",
                                        badgeBg: "bg-white dark:bg-slate-900",
                                        badgeColor: "text-sky-400",
                                        dotColor:
                                          "bg-sky-200/70 dark:bg-sky-800/40",
                                        mainIcon: (
                                          <svg
                                            className="h-5 w-5"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                          >
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                          </svg>
                                        ),
                                        badgeIcon: (
                                          <svg
                                            className="h-3.5 w-3.5"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                          >
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                          </svg>
                                        ),
                                      },
                                    ].map((reward, index) => (
                                      <motion.div
                                        key={reward.label}
                                        initial={{
                                          opacity: 0,
                                          y: 12,
                                          scale: 0.94,
                                        }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{
                                          delay: 0.15 + index * 0.1,
                                          duration: 0.35,
                                          type: "spring",
                                          stiffness: 180,
                                          damping: 18,
                                        }}
                                        className={`relative overflow-hidden rounded-2xl border ${reward.border} ${reward.bg} p-4 shadow-sm`}
                                      >
                                        {/* Top row: main icon + badge icon */}
                                        <div className="flex items-start justify-between">
                                          <div
                                            className={`flex h-11 w-11 items-center justify-center rounded-full ${reward.iconBg} ${reward.iconColor} shadow-sm`}
                                          >
                                            {reward.mainIcon}
                                          </div>
                                          <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-full ${reward.badgeBg} ${reward.badgeColor} shadow-sm`}
                                          >
                                            {reward.badgeIcon}
                                          </div>
                                        </div>
                                        {/* Label */}
                                        <p
                                          className={`mt-3 text-[11px] font-black tracking-widest uppercase ${reward.labelColor}`}
                                        >
                                          {reward.label}
                                        </p>
                                        {/* Number */}
                                        <motion.p
                                          initial={{ scale: 0.8 }}
                                          animate={{ scale: [1, 1.08, 1] }}
                                          transition={{
                                            delay: 0.35 + index * 0.1,
                                            duration: 0.45,
                                          }}
                                          className="mt-0.5 text-4xl font-black text-slate-900 tabular-nums dark:text-white"
                                        >
                                          {reward.value}
                                        </motion.p>
                                        {/* Unit */}
                                        <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                                          {reward.unit}
                                        </p>
                                        {/* Decorative dots bottom-right */}
                                        <span
                                          aria-hidden="true"
                                          className="absolute right-2 bottom-2 grid grid-cols-3 gap-0.5 opacity-50"
                                        >
                                          {Array.from({ length: 9 }).map(
                                            (_, i) => (
                                              <span
                                                key={i}
                                                className={`h-1 w-1 rounded-full ${reward.dotColor}`}
                                              />
                                            )
                                          )}
                                        </span>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="profile-reward-preview"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.22 }}
                                className="mt-5 rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-amber-800 dark:border-amber-900/50 dark:bg-slate-900/50 dark:text-amber-200"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-xs font-black tracking-[0.18em] uppercase">
                                      Profile completion reward
                                    </p>
                                    <p className="mt-1 text-sm leading-6 font-semibold">
                                      Complete all required sections to qualify
                                      for a one-time 50 AF-Voucher and 20 PV
                                      reward.
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-2">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm dark:bg-slate-950 dark:text-amber-200">
                                      50 AF-Voucher
                                    </span>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm dark:bg-slate-950 dark:text-sky-200">
                                      20 PV
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="mt-5 grid gap-3 md:grid-cols-2">
                            {completionItems.map((item) => {
                              const isSavingAddressItem =
                                item.label === "Address" &&
                                isSavingAddressDetails

                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  disabled={isSavingAddressItem}
                                  onClick={() => {
                                    if (item.label === "Address")
                                      setIsAddressModalOpen(true)
                                    if (item.label === "Profile Photo") {
                                      avatarSectionRef.current?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                      })
                                    }
                                    if (item.label === "Username")
                                      setActiveTab("change-username")
                                    if (item.label === "Personal Details") {
                                      completeInformationRef.current?.scrollIntoView(
                                        { behavior: "smooth", block: "start" }
                                      )
                                    }
                                  }}
                                  className={`rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-wait ${
                                    isSavingAddressItem
                                      ? "border-sky-200 bg-sky-50/80 text-slate-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-white"
                                      : item.done
                                        ? "border-emerald-200 bg-white text-slate-700 dark:border-emerald-900/40 dark:bg-slate-900/60 dark:text-gray-200"
                                        : "border-amber-200 bg-white text-slate-900 shadow-sm shadow-amber-100/60 hover:border-amber-300 hover:bg-amber-50/80 dark:border-amber-900/50 dark:bg-slate-900/60 dark:text-white dark:shadow-none dark:hover:border-amber-700 dark:hover:bg-amber-950/30"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold">
                                          {item.label}
                                        </p>
                                        {isSavingAddressItem ? (
                                          <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-sky-700 uppercase dark:bg-sky-900/40 dark:text-sky-300">
                                            Saving
                                          </span>
                                        ) : (
                                          !item.done && (
                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 uppercase dark:bg-amber-900/40 dark:text-amber-300">
                                              Required
                                            </span>
                                          )
                                        )}
                                      </div>
                                      <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                                        {item.hint}
                                      </p>
                                      {isSavingAddressItem ? (
                                        <p className="mt-1.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                                          Saving your address details...
                                        </p>
                                      ) : (
                                        !item.done && (
                                          <p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                            Please complete this section to
                                            finish your profile.
                                          </p>
                                        )
                                      )}
                                    </div>
                                    <span
                                      className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                                        isSavingAddressItem
                                          ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                                          : item.done
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                      }`}
                                    >
                                      {isSavingAddressItem ? (
                                        <Loading
                                          size={12}
                                          className="border-sky-200 border-t-sky-700 dark:border-sky-800 dark:border-t-sky-300"
                                        />
                                      ) : item.done ? (
                                        "✓"
                                      ) : (
                                        <Icon.Warning className="h-3.5 w-3.5" />
                                      )}
                                    </span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Personal info form */}
                        <form
                          onSubmit={handleSaveProfile}
                          className="rounded-2xl border border-slate-200 p-5 md:p-6 dark:border-slate-700 dark:bg-gray-800"
                        >
                          <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Personal Information
                              </h3>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                                Update your name and contact details. Username
                                changes require approval.
                              </p>
                            </div>
                            <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-sky-600">
                              Editable
                            </span>
                          </div>

                          <AnimatePresence>
                            {profileMsg && (
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className={`mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
                                  profileMsg.type === "success"
                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                {profileMsg.type === "success" ? (
                                  <Icon.Check className="mt-0.5 h-4 w-4 shrink-0" />
                                ) : (
                                  <Icon.Warning className="mt-0.5 h-4 w-4 shrink-0" />
                                )}
                                {profileMsg.text}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {[
                              {
                                field: "name" as const,
                                label: "Full Name",
                                required: true,
                                type: "text",
                                placeholder: "Enter your full name",
                                disabled: false,
                              },
                              {
                                field: "username" as const,
                                label: "Username",
                                type: "text",
                                placeholder: "Change in the Username tab",
                                disabled: true,
                              },
                              {
                                field: "email" as const,
                                label: "Email Address",
                                required: true,
                                type: "email",
                                placeholder: "Email",
                                disabled: true,
                                isEmail: true,
                              },
                              {
                                field: "phone" as const,
                                label: "Phone Number",
                                required: true,
                                type: "tel",
                                placeholder: "09XXXXXXXXX",
                                disabled: false,
                              },
                            ].map(
                              ({
                                field,
                                label,
                                type,
                                placeholder,
                                disabled,
                                isEmail,
                                required,
                              }) => (
                                <div key={field} className="space-y-1.5">
                                  <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                    {label}
                                    {required && (
                                      <span className="text-red-500">*</span>
                                    )}
                                    {isEmail &&
                                      (profileData?.email_verified ? (
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-normal text-emerald-600 normal-case dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                          &#10003; Verified
                                        </span>
                                      ) : (
                                        <span className="rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-normal text-sky-600 normal-case dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-400">
                                          &#9888; Not Verified
                                        </span>
                                      ))}
                                    {disabled && !isEmail && (
                                      <span className="ml-1 text-[11px] font-normal tracking-normal text-slate-400 normal-case dark:text-gray-500">
                                        (cannot change)
                                      </span>
                                    )}
                                  </label>
                                  <input
                                    type={type}
                                    value={form[field]}
                                    onChange={
                                      disabled ? undefined : onChange(field)
                                    }
                                    disabled={disabled}
                                    placeholder={placeholder}
                                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:border-sky-600 dark:focus:ring-sky-800/50 ${
                                      disabled
                                        ? "cursor-not-allowed border-slate-200 text-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-500"
                                        : "border-slate-200 text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-slate-600"
                                    }`}
                                  />
                                  {field === "username" && (
                                    <p className="text-[11px] text-slate-400 dark:text-gray-500">
                                      Go to the Change Username tab to submit a
                                      request.
                                    </p>
                                  )}
                                  {field === "email" && (
                                    <p className="text-[11px] text-slate-400 dark:text-gray-500">
                                      To link social accounts, go to the
                                      Security tab.
                                    </p>
                                  )}
                                </div>
                              )
                            )}

                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                Bio
                              </label>
                              <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                maxLength={200}
                                className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                                placeholder="Tell us something about your style, home setup, or shopping preferences"
                              />
                              <p className="text-right text-[11px] text-slate-400 dark:text-gray-500">
                                {bio.length}/200
                              </p>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                Invited By
                              </label>
                              <div className="w-full cursor-not-allowed rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-300">
                                {profileData?.referrer_id ? (
                                  <>
                                    {profileData.referrer_name ||
                                      profileData.referrer_username ||
                                      "—"}
                                    {profileData.referrer_name &&
                                      profileData.referrer_username && (
                                        <span className="ml-1.5 text-slate-400 dark:text-gray-500">
                                          (@{profileData.referrer_username})
                                        </span>
                                      )}
                                  </>
                                ) : (
                                  <span className="text-slate-500 dark:text-gray-400">
                                    Your previous sponsor is no longer
                                    available. Please contact support if this
                                    needs to be updated.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            ref={completeInformationRef}
                            className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5 dark:border-slate-700 dark:bg-gray-700/20"
                          >
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                  Complete Information
                                </h4>
                                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-gray-400">
                                  These fields match the older profile layout
                                  and help complete your account details.
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                  Middle Name
                                </label>
                                <input
                                  type="text"
                                  value={form.middle_name}
                                  onChange={onOptionalChange("middle_name")}
                                  placeholder="Middle name"
                                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 hover:border-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-slate-600 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                  Birth Date{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  value={form.birth_date}
                                  onChange={onOptionalChange("birth_date")}
                                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 hover:border-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-slate-600 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                  Gender <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={form.gender}
                                  onChange={onOptionalChange("gender")}
                                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 hover:border-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-slate-600 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                                >
                                  <option value="">Select Gender</option>
                                  <option value="male">Male</option>
                                  <option value="female">Female</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                  Occupation{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={form.occupation}
                                  onChange={onOptionalChange("occupation")}
                                  placeholder="Occupation"
                                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 hover:border-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-slate-600 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                  Work Location{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={form.work_location}
                                  onChange={onWorkLocationChange}
                                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 hover:border-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-slate-600 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                                >
                                  <option value="local">Local</option>
                                  <option value="overseas">Overseas</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                  Country{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={form.country}
                                  onChange={onOptionalChange("country")}
                                  disabled={form.work_location === "local"}
                                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:border-sky-600 dark:focus:ring-sky-800/50 ${
                                    form.work_location === "local"
                                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-500"
                                      : "border-slate-200 text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-slate-600"
                                  }`}
                                >
                                  {form.work_location === "local" ? (
                                    <option value="Philippines">
                                      Philippines
                                    </option>
                                  ) : (
                                    <>
                                      <option value="">Select country</option>
                                      {OVERSEAS_COUNTRIES.map((country) => (
                                        <option key={country} value={country}>
                                          {country}
                                        </option>
                                      ))}
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-end gap-3">
                            {hasChanges && (
                              <button
                                type="button"
                                onClick={() => {
                                  setForm(buildProfileFormState())
                                  profileDraftDirtyRef.current = false
                                }}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Discard
                              </button>
                            )}
                            <button
                              type="submit"
                              disabled={isSaving || !hasChanges}
                              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-sky-700"
                            >
                              {isSaving ? (
                                <>
                                  <Loading
                                    size={14}
                                    className="border border-white/30 border-t-white"
                                  />
                                  Saving...
                                </>
                              ) : (
                                "Save Changes"
                              )}
                            </button>
                          </div>
                        </form>

                        {/* Saved Addresses */}
                        <div className="rounded-2xl border border-slate-200 p-5 md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-5 flex items-center justify-between">
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Saved Addresses
                              </h3>
                              <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-500">
                                Your shipping and billing locations.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleOpenAddressModal}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-sky-400 transition-colors hover:bg-sky-500/10 hover:text-sky-300 dark:text-sky-500 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
                            >
                              {addresses.length
                                ? "+ Edit Address"
                                : "+ Add Address"}
                            </button>
                          </div>

                          {addresses.length ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              {addresses.map((addr) => (
                                <div
                                  key={addr.id}
                                  className="group relative rounded-xl border border-slate-200 p-4 transition-colors hover:border-sky-200 dark:border-slate-700 dark:bg-gray-800 dark:hover:border-sky-600 dark:hover:bg-sky-900/30"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-semibold tracking-wide text-sky-600 uppercase dark:text-sky-400">
                                        {addr.label}
                                      </p>
                                      {addr.isDefault && (
                                        <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button
                                        type="button"
                                        onClick={handleOpenAddressModal}
                                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-sky-100 hover:text-sky-600 dark:text-gray-500 dark:hover:bg-sky-900/30 dark:hover:text-sky-400"
                                      >
                                        <Icon.Edit className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="mt-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                                    {addr.recipient}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-gray-400">
                                    {addr.phone}
                                  </p>
                                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-gray-400">
                                    {addr.full}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center dark:border-slate-700 dark:bg-gray-800/70">
                              <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                                No saved address yet
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                                Add your default shipping address so checkout
                                and verification can be filled faster.
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* --- Security tab --- */}
                    {activeTab === "security" && (
                      <motion.div
                        key="security"
                        {...tabMotionProps}
                        className="space-y-4"
                      >
                        <form
                          onSubmit={handleChangePassword}
                          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-gray-800"
                        >
                          <div className="mb-5 flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-sky-900/30 dark:text-sky-400">
                              <Icon.Shield className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Change Password
                              </h3>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                                Use a strong, unique password for your account.
                              </p>
                            </div>
                            {(passwordChangeRequired ||
                              passwordChangeRequiredFromQuery) && (
                              <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                                Your account was signed in using a legacy
                                password. Change it now to continue to the shop
                                page.
                              </div>
                            )}
                          </div>

                          <AnimatePresence>
                            {pwError && (
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                              >
                                <Icon.Warning className="h-4 w-4 shrink-0" />
                                {pwError}
                              </motion.div>
                            )}
                            {pwSuccess && (
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              >
                                <Icon.Check className="h-4 w-4 shrink-0" />
                                Password changed successfully.
                                {passwordChangeRequired ||
                                passwordChangeRequiredFromQuery
                                  ? " Redirecting you to the shop..."
                                  : ""}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-600 dark:text-gray-400">
                                Current Password
                              </label>
                              <PasswordInput
                                value={security.currentPassword}
                                onChange={(e) =>
                                  setSecurity((p) => ({
                                    ...p,
                                    currentPassword: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-600 dark:text-gray-400">
                                New Password
                              </label>
                              <PasswordInput
                                value={security.newPassword}
                                onChange={(e) =>
                                  setSecurity((p) => ({
                                    ...p,
                                    newPassword: e.target.value,
                                  }))
                                }
                                placeholder="Min. 8 characters"
                              />
                              {/* Password strength bar */}
                              {pwStrength && (
                                <div className="mt-2 space-y-1">
                                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700">
                                    <motion.div
                                      className={`h-full rounded-full ${pwStrength.color}`}
                                      initial={{ width: 0 }}
                                      animate={{ width: pwStrength.pct }}
                                      transition={{ duration: 0.3 }}
                                    />
                                  </div>
                                  <p className="text-right text-[11px] text-slate-500 dark:text-gray-400">
                                    Password strength:{" "}
                                    <span className="font-semibold text-slate-700 dark:text-gray-300">
                                      {pwStrength.label}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-600 dark:text-gray-400">
                                Confirm New Password
                              </label>
                              <PasswordInput
                                value={security.confirmPassword}
                                onChange={(e) =>
                                  setSecurity((p) => ({
                                    ...p,
                                    confirmPassword: e.target.value,
                                  }))
                                }
                              />
                              {security.confirmPassword &&
                                security.newPassword !==
                                  security.confirmPassword && (
                                  <p className="mt-1 text-[11px] text-red-500">
                                    Passwords do not match.
                                  </p>
                                )}
                            </div>
                          </div>

                          <div className="mt-5 flex justify-end">
                            <button
                              type="submit"
                              disabled={
                                !security.currentPassword ||
                                !security.newPassword ||
                                !security.confirmPassword ||
                                isChangingPassword
                              }
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isChangingPassword
                                ? "Updating Password..."
                                : "Update Password"}
                            </button>
                          </div>
                        </form>

                        {/* 2FA */}
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-sky-900/30 dark:text-sky-400">
                                <Icon.Shield className="h-4 w-4" />
                              </div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Two-Factor Authentication
                              </h3>
                            </div>
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-600 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-400">
                              Recommended
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3.5 dark:border-slate-700 dark:bg-gray-800">
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${prefs.twoFactorEnabled ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-gray-700 dark:text-gray-500"}`}
                              >
                                <Icon.Shield className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                                  New Device Approval (MFA)
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                                  {prefs.twoFactorEnabled
                                    ? "New device logins need email approval: Yes, it is me / No, it is not me."
                                    : "Require email approval whenever your account signs in from a new device."}
                                </p>
                                {isUpdatingTwoFactor ? (
                                  <p className="mt-1 text-[11px] text-sky-600 dark:text-sky-400">
                                    Updating 2FA setting...
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <Toggle
                              checked={prefs.twoFactorEnabled}
                              onChange={handleToggleTwoFactor}
                              disabled={isUpdatingTwoFactor}
                            />
                          </div>
                        </div>

                        {/* Authenticator App (TOTP) */}
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-sky-900/30 dark:text-sky-400">
                                <Icon.Activity className="h-4 w-4" />
                              </div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Authenticator App (TOTP)
                              </h3>
                              {/* Info icon inline next to label */}
                              <div className="group relative">
                                <button
                                  type="button"
                                  aria-label="Learn about TOTP"
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:bg-gray-700 dark:text-gray-400 dark:hover:border-sky-700 dark:hover:text-sky-400"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-2.5 w-2.5"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                  </svg>
                                </button>
                                {/* Tooltip panel */}
                                <div className="pointer-events-none absolute top-7 left-0 z-50 w-72 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-gray-800 dark:shadow-black/40">
                                    <p className="text-xs font-semibold text-sky-700 dark:text-sky-400">
                                      What is a TOTP / Authenticator App?
                                    </p>
                                    <p className="text-xs leading-relaxed text-slate-600 dark:text-gray-400">
                                      A{" "}
                                      <span className="font-medium text-slate-700 dark:text-gray-300">
                                        Time-based One-Time Password (TOTP)
                                      </span>{" "}
                                      is a 6-digit code your app generates every
                                      30 seconds. Because it changes constantly,
                                      it cannot be reused or stolen.
                                    </p>
                                    <div>
                                      <p className="mb-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
                                        Why is it better than SMS?
                                      </p>
                                      <ul className="space-y-1.5 text-xs leading-relaxed text-slate-600 dark:text-gray-400">
                                        <li className="flex gap-2">
                                          <span className="shrink-0 text-emerald-500">
                                            ✓
                                          </span>
                                          <span>
                                            <span className="font-medium text-slate-700 dark:text-gray-300">
                                              Works offline
                                            </span>{" "}
                                            — no signal needed.
                                          </span>
                                        </li>
                                        <li className="flex gap-2">
                                          <span className="shrink-0 text-emerald-500">
                                            ✓
                                          </span>
                                          <span>
                                            <span className="font-medium text-slate-700 dark:text-gray-300">
                                              SIM-swap proof
                                            </span>{" "}
                                            — can&apos;t be hijacked via your
                                            phone number.
                                          </span>
                                        </li>
                                        <li className="flex gap-2">
                                          <span className="shrink-0 text-emerald-500">
                                            ✓
                                          </span>
                                          <span>
                                            <span className="font-medium text-slate-700 dark:text-gray-300">
                                              No interception
                                            </span>{" "}
                                            — codes never travel over the
                                            network.
                                          </span>
                                        </li>
                                        <li className="flex gap-2">
                                          <span className="shrink-0 text-emerald-500">
                                            ✓
                                          </span>
                                          <span>
                                            <span className="font-medium text-slate-700 dark:text-gray-300">
                                              Expires in 30 s
                                            </span>{" "}
                                            — useless moments after it&apos;s
                                            seen.
                                          </span>
                                        </li>
                                      </ul>
                                    </div>
                                    <p className="text-[11px] text-slate-400 dark:text-gray-500">
                                      Apps: Google Authenticator · Authy ·
                                      Microsoft Authenticator · 1Password
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                              Use Google Authenticator, Authy, or any
                              TOTP-compatible app to generate sign-in codes.
                            </p>
                          </div>

                          <AnimatePresence mode="wait">
                            {totpError && (
                              <motion.div
                                key="totp-error"
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                              >
                                <Icon.Warning className="h-4 w-4 shrink-0" />
                                {totpError}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {totpStep === "idle" && !totpEnabled && (
                            <button
                              type="button"
                              onClick={handleInitiateTotpSetup}
                              disabled={totpLoading}
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {totpLoading ? (
                                <>
                                  <svg
                                    className="h-4 w-4 animate-spin"
                                    xmlns="http://www.w3.org/2000/svg"
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
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                  Setting up...
                                </>
                              ) : (
                                <>
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  >
                                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
                                    <path d="M15 14h2v2h-2zM19 14h1v1h-1zM19 17h1v1h-1zM17 16h1v1h-1zM15 18h1v1h-1zM16 19h2v1h-2zM18 20h2v-2h-1" />
                                  </svg>
                                  Set Up Authenticator App
                                </>
                              )}
                            </button>
                          )}

                          {totpStep === "idle" && totpEnabled && (
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                                  <Icon.Shield className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                    Authenticator App Active
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-gray-400">
                                    Your account is protected with TOTP codes.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setTotpStep("confirm-disable")
                                  setTotpCode("")
                                  setTotpError(null)
                                }}
                                className="flex-shrink-0 text-xs font-semibold text-slate-500 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                              >
                                Remove
                              </button>
                            </div>
                          )}

                          {totpStep === "confirm-disable" && (
                            <motion.div
                              key="totp-disable"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-4"
                            >
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                  Enter 6-digit code to confirm
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={totpCode}
                                  onChange={(e) => {
                                    const v = e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6)
                                    setTotpCode(v)
                                    setTotpError(null)
                                  }}
                                  placeholder="Enter 6-digit code"
                                  maxLength={6}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm tracking-widest text-slate-800 transition-colors focus:border-red-300 focus:ring-2 focus:ring-red-200 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-red-600 dark:focus:ring-red-800/50"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={handleDisableTotp}
                                  disabled={
                                    totpLoading || totpCode.length !== 6
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {totpLoading ? (
                                    <>
                                      <svg
                                        className="h-4 w-4 animate-spin"
                                        xmlns="http://www.w3.org/2000/svg"
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
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                      </svg>
                                      Removing...
                                    </>
                                  ) : (
                                    "Confirm Remove"
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTotpStep("idle")
                                    setTotpCode("")
                                    setTotpError(null)
                                  }}
                                  disabled={totpLoading}
                                  className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* TOTP Setup Modal — fixed to top of viewport */}
                        <AnimatePresence>
                          {totpModalOpen && totpSetupData && (
                            <>
                              <motion.div
                                key="totp-modal-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
                                onClick={() => {
                                  if (!totpLoading) {
                                    setTotpModalOpen(false)
                                    setTotpSetupData(null)
                                    setTotpCode("")
                                    setTotpError(null)
                                  }
                                }}
                              />
                              <motion.div
                                key="totp-modal-panel"
                                initial={{ opacity: 0, y: -32 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -32 }}
                                transition={{
                                  type: "spring",
                                  damping: 28,
                                  stiffness: 280,
                                }}
                                className="fixed inset-x-0 top-0 z-[301] mx-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-2xl bg-white shadow-2xl shadow-slate-900/20 dark:bg-gray-800"
                              >
                                {/* Modal header */}
                                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                                  <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                      Set Up Authenticator App
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                                      Follow the steps below to link your app.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!totpLoading) {
                                        setTotpModalOpen(false)
                                        setTotpSetupData(null)
                                        setTotpCode("")
                                        setTotpError(null)
                                      }
                                    }}
                                    disabled={totpLoading}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="h-4 w-4"
                                    >
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                </div>

                                {/* Modal body */}
                                <div className="space-y-6 px-5 py-5">
                                  {/* Error */}
                                  <AnimatePresence>
                                    {totpError && (
                                      <motion.div
                                        key="totp-modal-error"
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                                      >
                                        <Icon.Warning className="h-4 w-4 shrink-0" />
                                        {totpError}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {/* Step 1 */}
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                      Step 1 — Install an authenticator app
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">
                                      Download any of these free apps:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        {
                                          name: "Google Authenticator",
                                          android:
                                            "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2",
                                          ios: "https://apps.apple.com/app/google-authenticator/id388497605",
                                        },
                                        {
                                          name: "Authy",
                                          android:
                                            "https://play.google.com/store/apps/details?id=com.authy.authy",
                                          ios: "https://apps.apple.com/app/authy/id494168017",
                                        },
                                        {
                                          name: "Microsoft Authenticator",
                                          android:
                                            "https://play.google.com/store/apps/details?id=com.azure.authenticator",
                                          ios: "https://apps.apple.com/app/microsoft-authenticator/id983156458",
                                        },
                                      ].map((app) => (
                                        <div
                                          key={app.name}
                                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-gray-900"
                                        >
                                          <span className="text-xs font-medium text-slate-700 dark:text-gray-300">
                                            {app.name}
                                          </span>
                                          <a
                                            href={app.android}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
                                          >
                                            Android
                                          </a>
                                          <span className="text-[10px] text-slate-300 dark:text-slate-600">
                                            ·
                                          </span>
                                          <a
                                            href={app.ios}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
                                          >
                                            iOS
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Step 2 */}
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                      Step 2 — Scan the QR code
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">
                                      Open your authenticator app and scan the
                                      QR code to link your account.
                                    </p>
                                    <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={totpSetupData.qr_code_url}
                                        alt="TOTP QR Code"
                                        className="h-40 w-40 object-contain"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                        Or enter this key manually
                                      </label>
                                      <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-gray-900">
                                        <code className="flex-1 font-mono text-sm tracking-widest break-all text-slate-800 select-all dark:text-gray-200">
                                          {totpSetupData.secret}
                                        </code>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Step 3 */}
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                      Step 3 — Enter the 6-digit code
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={totpCode}
                                      onChange={(e) => {
                                        const v = e.target.value
                                          .replace(/\D/g, "")
                                          .slice(0, 6)
                                        setTotpCode(v)
                                        setTotpError(null)
                                      }}
                                      placeholder="Enter 6-digit code"
                                      maxLength={6}
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm tracking-widest text-slate-800 transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                                    />
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-3 pb-1">
                                    <button
                                      type="button"
                                      onClick={handleVerifyTotp}
                                      disabled={
                                        totpLoading || totpCode.length !== 6
                                      }
                                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {totpLoading ? (
                                        <>
                                          <svg
                                            className="h-4 w-4 animate-spin"
                                            xmlns="http://www.w3.org/2000/svg"
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
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                          </svg>
                                          Verifying...
                                        </>
                                      ) : (
                                        "Verify & Enable"
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!totpLoading) {
                                          setTotpModalOpen(false)
                                          setTotpSetupData(null)
                                          setTotpCode("")
                                          setTotpError(null)
                                        }
                                      }}
                                      disabled={totpLoading}
                                      className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-4 flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-sky-900/30 dark:text-sky-400">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                className="h-4 w-4"
                              >
                                <circle cx="8" cy="15" r="3" />
                                <path d="M10.5 13.5l4-4a2.5 2.5 0 1 1 3.5 3.5l-4 4" />
                                <path d="M14 7l3 3" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Passkeys
                              </h3>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                                Add a passkey to sign in with Face ID,
                                fingerprint, or device PIN.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              value={passkeyName}
                              onChange={(event) =>
                                setPasskeyName(event.target.value)
                              }
                              placeholder="Passkey name (optional, e.g. My iPhone)"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                            />
                            <button
                              type="button"
                              onClick={handleRegisterPasskey}
                              disabled={isRegisteringPasskey}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[132px]"
                            >
                              {isRegisteringPasskey
                                ? "Adding..."
                                : "Add Passkey"}
                            </button>
                          </div>
                          {!passkeySupported ? (
                            <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                              Passkeys are not supported in this browser.
                            </p>
                          ) : null}

                          <div className="mt-4 space-y-2">
                            {isLoadingPasskeys ? (
                              <p className="text-sm text-slate-500 dark:text-gray-400">
                                Loading passkeys...
                              </p>
                            ) : passkeys.length > 0 ? (
                              passkeys.map((item) => {
                                const method = resolvePasskeyMethod(item)
                                const methodLabel =
                                  method === "faceid"
                                    ? "Face ID"
                                    : method === "fingerprint"
                                      ? "Fingerprint"
                                      : method === "pin"
                                        ? "PIN"
                                        : "Passkey"
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-gray-800"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                                        <PasskeyMethodIcon method={method} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-gray-200">
                                          {item.name || "My Passkey"}
                                        </p>
                                        <p className="truncate text-xs text-slate-500 dark:text-gray-400">
                                          {methodLabel} · Last used:{" "}
                                          {item.last_used_at
                                            ? formatRelativeTime(
                                                item.last_used_at
                                              )
                                            : "Never"}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPasskeyToRemove({
                                          id: item.id,
                                          name: item.name || "My Passkey",
                                        })
                                      }
                                      disabled={removingPasskeyId === item.id}
                                      aria-label={`Remove passkey ${item.name || "My Passkey"}`}
                                      title="Remove passkey"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                    >
                                      {removingPasskeyId === item.id ? (
                                        <svg
                                          className="h-4 w-4 animate-spin"
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                        >
                                          <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                          />
                                          <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"
                                          />
                                        </svg>
                                      ) : (
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                          className="h-4 w-4"
                                          aria-hidden="true"
                                        >
                                          <path d="M3 6h18" />
                                          <path d="M8 6V4h8v2" />
                                          <path d="M19 6l-1 14H6L5 6" />
                                          <path d="M10 11v6M14 11v6" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                )
                              })
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-gray-400">
                                No passkeys registered yet.
                              </p>
                            )}
                          </div>
                          <AnimatePresence>
                            {passkeyToRemove && (
                              <motion.div
                                key="passkey-remove-modal"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
                                onClick={() => {
                                  if (!removingPasskeyId)
                                    setPasskeyToRemove(null)
                                }}
                              >
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                  transition={{ duration: 0.18 }}
                                  className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-gray-900"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                      >
                                        <path d="M3 6h18" />
                                        <path d="M8 6V4h8v2" />
                                        <path d="M19 6l-1 14H6L5 6" />
                                        <path d="M10 11v6M14 11v6" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                        Remove passkey?
                                      </h4>
                                      <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                                        This will remove{" "}
                                        <span className="font-semibold text-slate-800 dark:text-gray-100">
                                          {passkeyToRemove.name}
                                        </span>{" "}
                                        from your account.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-5 flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPasskeyToRemove(null)}
                                      disabled={Boolean(removingPasskeyId)}
                                      className="inline-flex items-center rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-gray-800"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemovePasskey(passkeyToRemove.id)
                                      }
                                      disabled={Boolean(removingPasskeyId)}
                                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                    >
                                      {removingPasskeyId ===
                                      passkeyToRemove.id ? (
                                        <>
                                          <svg
                                            className="h-4 w-4 animate-spin"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="3"
                                            />
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"
                                            />
                                          </svg>
                                          Removing...
                                        </>
                                      ) : (
                                        "Remove"
                                      )}
                                    </button>
                                  </div>
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Connected Accounts */}
                        {isCustomerSession && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 dark:border-slate-700 dark:bg-gray-800">
                            <div className="mb-4">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Connected Accounts
                              </h3>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                                Link social accounts to sign in without a
                                password.
                              </p>
                            </div>

                            <div className="space-y-3">
                              {/* Google */}
                              {isGoogleLinked ? (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                                  <div className="flex items-center gap-3">
                                    <svg
                                      className="h-5 w-5 shrink-0"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                      />
                                      <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                      />
                                      <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                      />
                                      <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                      />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                        Google Connected
                                      </p>
                                      <p className="text-xs text-slate-500 dark:text-gray-400">
                                        You can sign in with your Google
                                        account.
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleUnlinkGoogle}
                                    disabled={isUnlinkingGoogle}
                                    className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:text-red-400"
                                  >
                                    {isUnlinkingGoogle && (
                                      <svg
                                        className="h-3.5 w-3.5 animate-spin"
                                        xmlns="http://www.w3.org/2000/svg"
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
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                      </svg>
                                    )}
                                    {isUnlinkingGoogle
                                      ? "Unlinking..."
                                      : "Unlink"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleConnectGoogle}
                                  disabled={
                                    isLinkingGoogle || googleLinkSuccess
                                  }
                                  className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                                    googleLinkSuccess
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                  }`}
                                >
                                  {isLinkingGoogle ? (
                                    <svg
                                      className="h-5 w-5 animate-spin text-slate-400"
                                      xmlns="http://www.w3.org/2000/svg"
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
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      />
                                    </svg>
                                  ) : googleLinkSuccess ? (
                                    <svg
                                      className="h-5 w-5 text-emerald-500"
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
                                  ) : (
                                    <svg
                                      className="h-5 w-5 shrink-0"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                      />
                                      <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                      />
                                      <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                      />
                                      <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                      />
                                    </svg>
                                  )}
                                  {isLinkingGoogle
                                    ? "Connecting..."
                                    : googleLinkSuccess
                                      ? "Google linked successfully!"
                                      : "Link with Google"}
                                </button>
                              )}

                              {/* Facebook */}
                              {isFacebookLinked ? (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                                  <div className="flex items-center gap-3">
                                    <svg
                                      className="h-5 w-5 shrink-0"
                                      viewBox="0 0 24 24"
                                      fill="#1877F2"
                                    >
                                      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                        Facebook Connected
                                      </p>
                                      <p className="text-xs text-slate-500 dark:text-gray-400">
                                        You can sign in with your Facebook
                                        account.
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleUnlinkFacebook}
                                    disabled={isUnlinkingFacebook}
                                    className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:text-red-400"
                                  >
                                    {isUnlinkingFacebook && (
                                      <svg
                                        className="h-3.5 w-3.5 animate-spin"
                                        xmlns="http://www.w3.org/2000/svg"
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
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                      </svg>
                                    )}
                                    {isUnlinkingFacebook
                                      ? "Unlinking..."
                                      : "Unlink"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleConnectFacebook}
                                  disabled={
                                    isLinkingFacebook || facebookLinkSuccess
                                  }
                                  className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                                    facebookLinkSuccess
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                  }`}
                                >
                                  {isLinkingFacebook ? (
                                    <svg
                                      className="h-5 w-5 animate-spin text-slate-400"
                                      xmlns="http://www.w3.org/2000/svg"
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
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      />
                                    </svg>
                                  ) : facebookLinkSuccess ? (
                                    <svg
                                      className="h-5 w-5 text-emerald-500"
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
                                  ) : (
                                    <svg
                                      className="h-5 w-5 shrink-0"
                                      viewBox="0 0 24 24"
                                      fill="#1877F2"
                                    >
                                      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                                    </svg>
                                  )}
                                  {isLinkingFacebook
                                    ? "Connecting..."
                                    : facebookLinkSuccess
                                      ? "Facebook linked successfully!"
                                      : "Link with Facebook"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Danger zone */}
                        <div className="rounded-2xl border border-red-100 bg-white p-5 md:p-6 dark:border-red-900/30 dark:bg-gray-800">
                          <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-red-600 dark:text-red-400">
                            <Icon.Warning className="h-4 w-4" />
                            Danger Zone
                          </h3>
                          <p className="mb-4 text-xs text-slate-500 dark:text-gray-400">
                            These actions are irreversible. Please be certain
                            before proceeding.
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-700">
                              <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                                  Sign Out
                                </p>
                                <p className="text-xs text-slate-500 dark:text-gray-400">
                                  Sign out from your account on this device.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof window !== "undefined") {
                                    window.sessionStorage.setItem(
                                      "afhome-skip-login-redirect",
                                      "1"
                                    )
                                  }
                                  signOut({ callbackUrl: "/login" })
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-gray-300 dark:hover:border-red-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                              >
                                <Icon.LogOut className="h-3.5 w-3.5" />
                                Sign Out
                              </button>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 dark:border-red-900/30 dark:bg-red-900/20">
                              <div>
                                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                  Delete Account
                                </p>
                                <p className="text-xs text-red-400 dark:text-red-500">
                                  Permanently remove your account and all data.
                                </p>
                              </div>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:border-red-700 dark:hover:bg-red-700"
                              >
                                <Icon.Trash className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* --- Preferences tab --- */}
                    {activeTab === "preferences" && (
                      <motion.div
                        key="preferences"
                        {...tabMotionProps}
                        className="space-y-5"
                      >
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-5 flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-sky-900/30 dark:text-sky-400">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.9}
                                className="h-5 w-5"
                                aria-hidden="true"
                              >
                                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 0 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                                <path d="M10 17a2 2 0 0 0 4 0" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-2lg leading-none font-bold tracking-tight text-slate-900 dark:text-white">
                                Notifications
                              </h3>
                              <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
                                Choose how you&apos;d like to be updated.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {[
                              {
                                key: "orderUpdates" as const,
                                label: "Order Status Updates",
                                desc: "Get notified when your order ships, arrives, or has issues.",
                                icon: (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.8}
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  >
                                    <path d="M3 8l9-5 9 5-9 5-9-5z" />
                                    <path d="M3 8v8l9 5 9-5V8" />
                                    <path d="M12 13v8" />
                                  </svg>
                                ),
                              },
                              {
                                key: "marketingEmails" as const,
                                label: "Marketing Emails",
                                desc: "Receive newsletters, promotions, and product highlights.",
                                icon: (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.8}
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  >
                                    <rect
                                      x="3"
                                      y="5"
                                      width="18"
                                      height="14"
                                      rx="2.5"
                                    />
                                    <path d="M3 8l9 6 9-6" />
                                  </svg>
                                ),
                              },
                              {
                                key: "smsUpdates" as const,
                                label: "SMS Notifications",
                                desc: "Get text messages for urgent updates and delivery alerts.",
                                icon: (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.8}
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  >
                                    <path d="M20 12a8 8 0 0 1-8 8H7l-3 3v-6a8 8 0 1 1 16-5z" />
                                    <circle cx="9" cy="12" r="1" />
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="15" cy="12" r="1" />
                                  </svg>
                                ),
                              },
                              {
                                key: "pushNotifications" as const,
                                label: "Push Notifications",
                                desc: "Browser notifications for real-time activity.",
                                icon: (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.9}
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  >
                                    <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 0 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                                    <path d="M10 17a2 2 0 0 0 4 0" />
                                  </svg>
                                ),
                              },
                            ].map((item) => (
                              <div
                                key={item.key}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-700 dark:bg-gray-800"
                              >
                                <div className="flex min-w-0 items-center gap-4">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-blue-600 dark:bg-gray-700 dark:text-sky-400">
                                    {item.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-l leading-none font-semibold tracking-tight text-slate-900 dark:text-gray-100">
                                      {item.label}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                                      {item.desc}
                                    </p>
                                  </div>
                                </div>
                                <Toggle
                                  checked={prefs[item.key]}
                                  onChange={() => togglePref(item.key)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-5 flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-sky-900/30 dark:text-sky-400">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.8}
                                className="h-5 w-5"
                                aria-hidden="true"
                              >
                                <circle cx="12" cy="12" r="9" />
                                <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-2xl leading-none font-bold tracking-tight text-slate-900 dark:text-white">
                                Display & Regional
                              </h3>
                              <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
                                Customize your language and currency experience.
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                                Language
                              </label>
                              <div className="relative">
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.9}
                                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                                  aria-hidden="true"
                                >
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                                </svg>
                                <select
                                  value={prefs.language}
                                  onChange={(e) =>
                                    setPrefs((p) => ({
                                      ...p,
                                      language: e.target.value as "en" | "fil",
                                    }))
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-10 text-sm text-slate-800 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                                >
                                  <option value="en">English</option>
                                  <option value="fil">Filipino</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                                Currency
                              </label>
                              <div className="relative">
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.9}
                                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                                  aria-hidden="true"
                                >
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" />
                                  <path d="M12 6v12" />
                                </svg>
                                <select
                                  value={prefs.currency}
                                  onChange={(e) =>
                                    setPrefs((p) => ({
                                      ...p,
                                      currency: e.target.value as "PHP" | "USD",
                                    }))
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-10 text-sm text-slate-800 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                                >
                                  <option value="PHP">
                                    ₱ Philippine Peso (PHP)
                                  </option>
                                  <option value="USD">$ US Dollar (USD)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 flex justify-end">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 dark:shadow-sky-900/30"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.9}
                                className="h-4 w-4"
                                aria-hidden="true"
                              >
                                <path d="M5 4h11l3 3v13H5z" />
                                <path d="M8 4v6h8V4" />
                                <path d="M9 17h6" />
                              </svg>
                              Save Preferences
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* --- Activity tab --- */}
                    {activeTab === "wallet" && (
                      <motion.div key="wallet" {...tabMotionProps}>
                        <WalletTab isVerified={isVerified} />
                      </motion.div>
                    )}

                    {activeTab === "pv" && (
                      <motion.div key="pv" {...tabMotionProps}>
                        <WalletTab
                          isVerified={isVerified}
                          initialWalletType="pv"
                        />
                      </motion.div>
                    )}

                    {activeTab === "encashment" && (
                      <motion.div key="encashment" {...tabMotionProps}>
                        <EncashmentTab />
                      </motion.div>
                    )}

                    {activeTab === "interior-requests" && (
                      <motion.div key="interior-requests" {...tabMotionProps}>
                        <InteriorRequestsTab />
                      </motion.div>
                    )}

                    {activeTab === "referrals" && (
                      <motion.div
                        key="referrals"
                        {...tabMotionProps}
                        className="space-y-5"
                      >
                        {/* Header card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Referral Network
                              </h3>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                                Your affiliate tree, referral link, and
                                commission overview.
                              </p>
                            </div>
                            {isVerified && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold whitespace-nowrap text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                &#10003; Verified Affiliate
                              </span>
                            )}
                          </div>

                          {/* Stats row */}
                          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {[
                              {
                                label: "Direct Referrals",
                                value: referralSummary.directCount,
                                loading: isSnapshotLoading && !accountSnapshot,
                                border: "border-sky-200 dark:border-sky-800",
                                text: "text-sky-600 dark:text-sky-400",
                                dbg: "dark:bg-sky-900/30",
                                val: "text-sky-800 dark:text-sky-300",
                              },
                              {
                                label: "Level 2",
                                value: referralSummary.secondLevelCount,
                                loading: isReferralTreeLoading && !referralTree,
                                border: "border-sky-200 dark:border-sky-800",
                                text: "text-sky-600 dark:text-sky-400",
                                dbg: "dark:bg-sky-900/30",
                                val: "text-sky-800 dark:text-sky-300",
                              },
                              {
                                label: "Total Network",
                                value: referralSummary.totalNetwork,
                                loading: isReferralTreeLoading && !referralTree,
                                border:
                                  "border-emerald-200 dark:border-emerald-800",
                                text: "text-emerald-600 dark:text-emerald-400",
                                dbg: "dark:bg-emerald-900/30",
                                val: "text-emerald-800 dark:text-emerald-300",
                              },
                              {
                                label: "Total PV Earned",
                                value: referralSummary.totalPv,
                                loading: isSnapshotLoading && !accountSnapshot,
                                border: "border-sky-200 dark:border-sky-800",
                                text: "text-sky-600 dark:text-sky-400",
                                dbg: "dark:bg-sky-900/30",
                                val: "text-sky-800 dark:text-sky-300",
                              },
                            ].map((stat) => (
                              <div
                                key={stat.label}
                                className={`rounded-xl border ${stat.border} ${stat.dbg} px-4 py-3`}
                              >
                                <p
                                  className={`text-[11px] font-medium ${stat.text} mb-1`}
                                >
                                  {stat.label}
                                </p>
                                {stat.loading ? (
                                  <div className="mt-1 h-6 w-16 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
                                ) : (
                                  <p className={`text-xl font-bold ${stat.val}`}>
                                    {stat.value.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="mb-5 grid gap-4 lg:grid-cols-2">
                            <ReferralShareCard
                              title="Invite Members"
                              description="Best for people who want to sign up under your network."
                              badge="Signup"
                              link={memberReferralLink}
                              qrUrl={memberReferralQrUrl}
                              onCopy={() => handleCopyReferralLink("member")}
                              onShare={() => handleShareReferralLink("member")}
                              message={referralMsg}
                              emptyText="Set your username first to generate your signup referral link."
                              linkLabel="Member signup link"
                              qrAlt="Signup referral QR"
                              compact
                            />
                            <ReferralShareCard
                              title="Share Shopping Link"
                              description="Best for buyers who want a smoother checkout with your referral already attached."
                              badge="Shopping"
                              link={shoppingReferralLink}
                              qrUrl={shoppingReferralQrUrl}
                              onCopy={() => handleCopyReferralLink("shopping")}
                              onShare={() =>
                                handleShareReferralLink("shopping")
                              }
                              message={referralMsg}
                              emptyText="Set your username first to generate your shopping referral link."
                              linkLabel="Shopping referral link"
                              qrAlt="Shopping referral QR"
                              compact
                            />
                          </div>

                          {/* Search + filter + controls */}
                          {isReferralTreeLoading ? (
                            <div className="animate-pulse space-y-3">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="h-20 rounded-2xl bg-slate-100 dark:bg-gray-700"
                                />
                              ))}
                            </div>
                          ) : (
                            <>
                              {/* Search + expand toggle */}
                              <div className="mb-3 flex items-center gap-2">
                                <div className="relative flex-1">
                                  <svg
                                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    viewBox="0 0 24 24"
                                  >
                                    <circle cx="11" cy="11" r="8" />
                                    <line
                                      x1="21"
                                      y1="21"
                                      x2="16.65"
                                      y2="16.65"
                                    />
                                  </svg>
                                  <input
                                    type="text"
                                    value={treeSearchQuery}
                                    onChange={(e) => {
                                      setTreeSearchQuery(e.target.value)
                                      setReferralPage(1)
                                    }}
                                    placeholder="Search name, username, email..."
                                    className="w-full rounded-xl border border-slate-200 py-2.5 pr-9 pl-9 text-sm placeholder-slate-400 transition-colors focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder-gray-500"
                                  />
                                  {treeSearchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTreeSearchQuery("")
                                        setReferralPage(1)
                                      }}
                                      className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-gray-300"
                                    >
                                      <svg
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2.5}
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  title={
                                    Object.keys(expandedTreeNodes).length > 0
                                      ? "Collapse all"
                                      : "Expand all"
                                  }
                                  onClick={
                                    Object.keys(expandedTreeNodes).length > 0
                                      ? handleCollapseAllTreeNodes
                                      : handleExpandAllTreeNodes
                                  }
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:text-gray-400 dark:hover:text-emerald-400"
                                >
                                  {Object.keys(expandedTreeNodes).length > 0 ? (
                                    <svg
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                                      />
                                    </svg>
                                  )}
                                </button>
                              </div>

                              {/* Status pill filters */}
                              {(() => {
                                const statusPills: {
                                  key: TreeStatusFilter
                                  label: string
                                  active: string
                                  inactive: string
                                }[] = [
                                  {
                                    key: "all",
                                    label: "All",
                                    active:
                                      "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200",
                                    inactive:
                                      "bg-white dark:bg-gray-900 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500",
                                  },
                                  {
                                    key: "verified",
                                    label: "Verified",
                                    active:
                                      "bg-emerald-500 text-white border-emerald-500",
                                    inactive:
                                      "bg-white dark:bg-gray-900 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400",
                                  },
                                  {
                                    key: "pending_review",
                                    label: "Pending",
                                    active:
                                      "bg-sky-500 text-white border-sky-500",
                                    inactive:
                                      "bg-white dark:bg-gray-900 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400",
                                  },
                                  {
                                    key: "not_verified",
                                    label: "Not Verified",
                                    active:
                                      "bg-amber-500 text-white border-amber-500",
                                    inactive:
                                      "bg-white dark:bg-gray-900 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400",
                                  },
                                  {
                                    key: "blocked",
                                    label: "Blocked",
                                    active:
                                      "bg-rose-500 text-white border-rose-500",
                                    inactive:
                                      "bg-white dark:bg-gray-900 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400",
                                  },
                                ]
                                return (
                                  <div className="scrollbar-hide mb-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                                    {statusPills.map((pill) => (
                                      <button
                                        key={pill.key}
                                        type="button"
                                        onClick={() => {
                                          setTreeStatusFilter(pill.key)
                                          setReferralPage(1)
                                        }}
                                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${treeStatusFilter === pill.key ? pill.active : pill.inactive}`}
                                      >
                                        {pill.label}
                                      </button>
                                    ))}
                                  </div>
                                )
                              })()}

                              {(() => {
                                const totalPages = Math.ceil(
                                  filteredReferralChildren.length /
                                    REFERRAL_PAGE_SIZE
                                )
                                const pageStart =
                                  (referralPage - 1) * REFERRAL_PAGE_SIZE
                                const pageEnd = pageStart + REFERRAL_PAGE_SIZE
                                const pageItems =
                                  filteredReferralChildren.slice(
                                    pageStart,
                                    pageEnd
                                  )
                                return (
                                  <>
                                    <div className="mb-4 flex items-center justify-between">
                                      <p className="text-xs text-slate-500 dark:text-gray-400">
                                        {filteredReferralChildren.length > 0 ? (
                                          <>
                                            Showing{" "}
                                            <span className="font-semibold text-slate-700 dark:text-gray-300">
                                              {pageStart + 1}-
                                              {Math.min(
                                                pageEnd,
                                                filteredReferralChildren.length
                                              )}
                                            </span>{" "}
                                            of{" "}
                                            <span className="font-semibold text-slate-700 dark:text-gray-300">
                                              {filteredReferralChildren.length}
                                            </span>{" "}
                                            referral
                                            {filteredReferralChildren.length !==
                                            1
                                              ? "s"
                                              : ""}
                                          </>
                                        ) : (
                                          "No referrals found"
                                        )}
                                      </p>
                                      {(treeSearchQuery ||
                                        treeStatusFilter !== "all") && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setTreeSearchQuery("")
                                            setTreeStatusFilter("all")
                                            setReferralPage(1)
                                          }}
                                          className="text-xs font-medium text-[#2c5f4f] hover:text-[#234d40]"
                                        >
                                          Clear filters
                                        </button>
                                      )}
                                    </div>

                                    {pageItems.length > 0 ? (
                                      <>
                                        <AnimatePresence mode="wait">
                                          <motion.div
                                            key={
                                              treeStatusFilter +
                                              treeSearchQuery +
                                              referralPage
                                            }
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{
                                              duration: 0.18,
                                              ease: "easeOut",
                                            }}
                                            className="space-y-2"
                                          >
                                            {pageItems.map((node) =>
                                              renderReferralNodeFull(node)
                                            )}
                                          </motion.div>
                                        </AnimatePresence>

                                        {totalPages > 1 && (
                                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
                                            <button
                                              type="button"
                                              disabled={referralPage <= 1}
                                              onClick={() =>
                                                setReferralPage((p) =>
                                                  Math.max(1, p - 1)
                                                )
                                              }
                                              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#2c5f4f]/40 hover:text-[#2c5f4f] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-gray-700"
                                            >
                                              <svg
                                                className="h-3.5 w-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={2.5}
                                                viewBox="0 0 24 24"
                                              >
                                                <polyline points="15 18 9 12 15 6" />
                                              </svg>
                                              Prev
                                            </button>
                                            <p className="text-xs font-medium text-slate-500 dark:text-gray-400">
                                              Page{" "}
                                              <span className="font-bold text-slate-800 dark:text-gray-300">
                                                {referralPage}
                                              </span>{" "}
                                              / {totalPages}
                                            </p>
                                            <button
                                              type="button"
                                              disabled={
                                                referralPage >= totalPages
                                              }
                                              onClick={() =>
                                                setReferralPage((p) =>
                                                  Math.min(totalPages, p + 1)
                                                )
                                              }
                                              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#2c5f4f]/40 hover:text-[#2c5f4f] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-gray-700"
                                            >
                                              Next
                                              <svg
                                                className="h-3.5 w-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={2.5}
                                                viewBox="0 0 24 24"
                                              >
                                                <polyline points="9 18 15 12 9 6" />
                                              </svg>
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="py-12 text-center">
                                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-700">
                                          <Icon.Network className="h-6 w-6 text-slate-400 dark:text-gray-500" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                                          {referralChildren.length > 0
                                            ? "No matches found"
                                            : "No referrals yet"}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
                                          {referralChildren.length > 0
                                            ? "Try a different search or filter"
                                            : "Share your referral link to start building your network"}
                                        </p>
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "activity" && (
                      <motion.div
                        key="activity"
                        {...tabMotionProps}
                        className="space-y-5"
                      >
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              Recent Activity
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                              A log of your recent account actions.
                            </p>
                          </div>
                          <div className="space-y-2">
                            {isActivityLoading ? (
                              <div className="animate-pulse space-y-2">
                                {[1, 2, 3].map((i) => (
                                  <div
                                    key={i}
                                    className="h-14 rounded-xl bg-slate-100 dark:bg-gray-700"
                                  />
                                ))}
                              </div>
                            ) : recentActivity.length > 0 ? (
                              paginatedRecentActivity.map((item, i) => (
                                <motion.div
                                  key={`${item.title}-${(activityPage - 1) * ACTIVITY_PAGE_SIZE + i}`}
                                  variants={fadeUp}
                                  initial="hidden"
                                  animate="visible"
                                  custom={i}
                                  className="flex items-start gap-3.5 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 transition-colors hover:border-slate-200 dark:border-slate-700 dark:bg-gray-800/50 dark:hover:border-slate-600"
                                >
                                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-500 dark:bg-sky-900/30 dark:text-sky-400">
                                    {getActivityIcon(item.title)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800 dark:text-gray-200">
                                      {item.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-500">
                                      {item.time}
                                    </p>
                                  </div>
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-gray-400">
                                No recent activity yet.
                              </p>
                            )}
                          </div>
                          {recentActivity.length > ACTIVITY_PAGE_SIZE && (
                            <div className="mt-4 flex items-center justify-center gap-3">
                              <button
                                type="button"
                                disabled={activityPage <= 1}
                                onClick={() =>
                                  setActivityPage((p) => Math.max(1, p - 1))
                                }
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#2c5f4f]/40 hover:text-[#2c5f4f] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  viewBox="0 0 24 24"
                                >
                                  <polyline points="15 18 9 12 15 6" />
                                </svg>
                                Prev
                              </button>
                              <p className="text-xs font-medium text-slate-500 dark:text-gray-400">
                                Page{" "}
                                <span className="font-bold text-slate-800 dark:text-gray-300">
                                  {activityPage}
                                </span>{" "}
                                / {activityTotalPages}
                              </p>
                              <button
                                type="button"
                                disabled={activityPage >= activityTotalPages}
                                onClick={() =>
                                  setActivityPage((p) =>
                                    Math.min(activityTotalPages, p + 1)
                                  )
                                }
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#2c5f4f]/40 hover:text-[#2c5f4f] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Next
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  viewBox="0 0 24 24"
                                >
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Login sessions */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-4">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              Active Sessions
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                              Devices currently logged into your account.
                            </p>
                          </div>
                          <div className="space-y-2">
                            {isSessionsLoading ? (
                              <div className="animate-pulse space-y-2">
                                {[1, 2].map((i) => (
                                  <div
                                    key={i}
                                    className="h-16 rounded-xl bg-slate-100 dark:bg-gray-700"
                                  />
                                ))}
                              </div>
                            ) : sessionItems.length > 0 ? (
                              paginatedSessionItems.map((session) => {
                                const resolved = resolvePlatformBrowser(session)
                                const deviceType =
                                  resolveSessionDeviceType(session)
                                return (
                                  <div
                                    key={session.token_id || session.id}
                                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 dark:border-slate-700 dark:bg-gray-800"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${session.is_current ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-sky-100 text-sky-500 dark:bg-sky-900/30 dark:text-sky-400"}`}
                                      >
                                        <Icon.Shield className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-gray-200">
                                          {session.is_current
                                            ? `This device (${deviceType})`
                                            : `Other device (${deviceType})`}
                                        </p>
                                        <p className="truncate text-xs text-slate-500 dark:text-gray-400">
                                          {resolved.platform} -{" "}
                                          {resolved.browser} -{" "}
                                          {resolveSessionLocation(session)}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-gray-500">
                                          {session.is_current
                                            ? `Online: ${formatOnlineDuration(session.created_at ?? null)}`
                                            : `Last active: ${formatRelativeTime(session.last_active_at ?? session.created_at ?? null)}`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {session.is_current ? (
                                        <span className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-emerald-600 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                          Active now
                                        </span>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRevokeSession(
                                            session.token_id,
                                            session.is_current
                                          )
                                        }
                                        disabled={
                                          (!session.is_current &&
                                            session.token_id <= 0) ||
                                          (isRevokingSession &&
                                            revokingTokenId ===
                                              session.token_id)
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-700"
                                      >
                                        <Icon.LogOut className="h-3.5 w-3.5" />
                                        {isRevokingSession &&
                                        revokingTokenId === session.token_id
                                          ? "Signing out..."
                                          : "Sign out"}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-gray-400">
                                No active sessions found.
                              </p>
                            )}
                          </div>
                          {sessionItems.length > ACTIVITY_PAGE_SIZE && (
                            <div className="mt-4 flex items-center justify-center gap-3">
                              <button
                                type="button"
                                disabled={sessionPage <= 1}
                                onClick={() =>
                                  setSessionPage((p) => Math.max(1, p - 1))
                                }
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#2c5f4f]/40 hover:text-[#2c5f4f] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  viewBox="0 0 24 24"
                                >
                                  <polyline points="15 18 9 12 15 6" />
                                </svg>
                                Prev
                              </button>
                              <p className="text-xs font-medium text-slate-500 dark:text-gray-400">
                                Page{" "}
                                <span className="font-bold text-slate-800 dark:text-gray-300">
                                  {sessionPage}
                                </span>{" "}
                                / {sessionTotalPages}
                              </p>
                              <button
                                type="button"
                                disabled={sessionPage >= sessionTotalPages}
                                onClick={() =>
                                  setSessionPage((p) =>
                                    Math.min(sessionTotalPages, p + 1)
                                  )
                                }
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#2c5f4f]/40 hover:text-[#2c5f4f] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Next
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  viewBox="0 0 24 24"
                                >
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "change-username" && (
                      <motion.div
                        key="change-username"
                        {...tabMotionProps}
                        className="space-y-5"
                      >
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 dark:border-slate-700 dark:bg-gray-800">
                          <div className="mb-4">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              Change Username
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                              Update the username used for your profile and
                              referral link.
                            </p>
                          </div>

                          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-gray-800">
                            <p className="text-xs text-slate-500 dark:text-gray-400">
                              Current username
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-gray-200">
                              {profileData?.username
                                ? `@${profileData.username}`
                                : "Not set"}
                            </p>
                          </div>

                          {usernameMsg && (
                            <div
                              className={`mb-4 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${usernameMsg.type === "success" ? "border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "border border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}
                            >
                              {usernameMsg.text}
                            </div>
                          )}

                          {latestUsernameRequest && (
                            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-gray-700/40">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-gray-400">
                                    Latest request
                                  </p>
                                  <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-gray-200">
                                    @{latestUsernameRequest.requested_username}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    latestUsernameRequest.status === "approved"
                                      ? "border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : latestUsernameRequest.status ===
                                          "rejected"
                                        ? "border border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                                        : "border border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-400"
                                  }`}
                                >
                                  {latestUsernameRequest.status ===
                                  "pending_review"
                                    ? "Pending"
                                    : latestUsernameRequest.status}
                                </span>
                              </div>
                              {latestUsernameRequest.review_notes && (
                                <p className="mt-2 text-[11px] text-slate-500 dark:text-gray-400">
                                  {latestUsernameRequest.review_notes}
                                </p>
                              )}
                            </div>
                          )}
                          {hasPendingUsernameRequest && (
                            <p className="mb-4 text-xs text-sky-700 dark:text-sky-400">
                              You already have a pending request. Please wait
                              for admin approval before submitting another.
                            </p>
                          )}

                          <form
                            onSubmit={handleSubmitUsernameChange}
                            className="space-y-4"
                          >
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-gray-400">
                                New Username
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-400 dark:text-gray-500">
                                  @
                                </span>
                                <input
                                  type="text"
                                  value={
                                    hasPendingUsernameRequest
                                      ? pendingRequestedUsername
                                      : usernameRequest
                                  }
                                  onChange={(e) => {
                                    const normalizedUsername =
                                      e.target.value.replace(
                                        /[^A-Za-z0-9]/g,
                                        ""
                                      )
                                    setUsernameRequest(normalizedUsername)
                                    if (usernameOtpToken) {
                                      setUsernameOtpToken(null)
                                      setUsernameOtp("")
                                    }
                                  }}
                                  placeholder="your.username"
                                  disabled={hasPendingUsernameRequest}
                                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:ring-sky-900/50 ${
                                    hasPendingUsernameRequest
                                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-gray-700/40 dark:text-gray-500"
                                      : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-gray-900 dark:text-white"
                                  }`}
                                />
                              </div>
                              <p className="text-[11px] text-slate-400 dark:text-gray-500">
                                Letters only (A-Z). Changing your username will
                                update your referral link after approval.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={handleSendUsernameOtp}
                                disabled={
                                  hasPendingUsernameRequest ||
                                  isSendingUsernameOtp
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-700"
                              >
                                {isSendingUsernameOtp ? (
                                  <>
                                    <Loading
                                      size={14}
                                      className="border border-white/30 border-t-white"
                                    />
                                    Sending OTP...
                                  </>
                                ) : (
                                  <>
                                    <Icon.Edit className="h-4 w-4" />
                                    Send OTP
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUsernameRequest(
                                    profileData?.username ?? ""
                                  )
                                  setUsernameOtp("")
                                  setUsernameOtpToken(null)
                                  setUsernameOtpSentTo(null)
                                }}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Reset
                              </button>
                            </div>

                            {usernameOtpToken && !hasPendingUsernameRequest && (
                              <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 dark:border-sky-800 dark:bg-sky-900/20">
                                <div>
                                  <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                                    Enter OTP
                                  </p>
                                  <p className="text-[11px] text-sky-600 dark:text-sky-400">
                                    {usernameOtpSentTo
                                      ? `We sent the code to ${usernameOtpSentTo}.`
                                      : "Check your email for the 4-digit code."}
                                  </p>
                                </div>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={4}
                                  value={usernameOtp}
                                  onChange={(e) =>
                                    setUsernameOtp(
                                      e.target.value.replace(/\\D/g, "")
                                    )
                                  }
                                  className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-sky-800 dark:bg-gray-900 dark:text-white dark:focus:ring-sky-900/50"
                                  placeholder="4-digit code"
                                />
                                <button
                                  type="submit"
                                  disabled={isSubmittingUsernameChange}
                                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
                                >
                                  {isSubmittingUsernameChange ? (
                                    <>
                                      <Loading
                                        size={14}
                                        className="border border-white/30 border-t-white"
                                      />
                                      Submitting...
                                    </>
                                  ) : (
                                    "Submit Request"
                                  )}
                                </button>
                              </div>
                            )}
                          </form>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "webstore" && (
                      <motion.div
                        key="webstore"
                        {...tabMotionProps}
                        className="space-y-5"
                      >
                        <div className="overflow-hidden rounded-3xl border border-[#dfe8fb] bg-white shadow-[0_16px_45px_rgba(30,64,175,0.08)]">
                          <div className="relative border-b border-[#e6edfb] bg-gradient-to-r from-[#f8fbff] to-[#f4f8ff] px-6 py-6 md:px-8">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7ed7f7] to-[#3b82f6] shadow-sm">
                                  <Icon.Package className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold tracking-tight text-[#0f1f44]">
                                    Launch Your Partner Webstore
                                  </h3>
                                  <p className="mt-1 text-lg text-[#60739b]">
                                    Create and manage your branded online
                                    storefront.
                                  </p>
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowWebstoreTutorial(true)
                                      }
                                      className="inline-flex items-center gap-2 rounded-xl border border-[#3b82f6] bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2563eb]"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="currentColor"
                                        aria-hidden="true"
                                      >
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                      </svg>
                                      Watch Tutorial
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowWebstoreLearnMore(true)
                                      }
                                      className="inline-flex items-center gap-2 rounded-xl border border-[#dce8ff] bg-white px-4 py-2 text-sm font-semibold text-[#3b82f6] transition hover:border-[#3b82f6] hover:bg-[#f0f5ff]"
                                    >
                                      Learn More
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                      </svg>
                                    </button>
                                  </div>
                                  <p className="mt-2 flex items-center gap-1.5 text-xs text-[#8a9ec0]">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-3.5 w-3.5 shrink-0 text-[#f59e0b]"
                                      fill="currentColor"
                                      aria-hidden="true"
                                    >
                                      <path d="M12 2a7 7 0 0 1 7 7c0 2.76-1.57 5.15-3.86 6.38L14 17H10l-.14-1.62C7.57 14.15 6 11.76 6 9a6 6 0 0 1 6-7zm-1 16h2v2h-2v-2z" />
                                    </svg>
                                    New to webstore? Watch our tutorial to get
                                    started in minutes.
                                  </p>
                                </div>
                              </div>
                              <div className="relative hidden h-24 w-44 md:block">
                                <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-[#e7efff] to-[#f3f7ff]" />
                                <div className="absolute bottom-1 -left-3 h-10 w-10 rounded-full bg-[#d9e7ff]" />
                                <div className="absolute bottom-3 left-2 h-7 w-5 rounded-t-full bg-gradient-to-b from-[#5fd0c6] to-[#7be2d8]" />
                                <div className="absolute bottom-3 left-5 h-10 w-6 rounded-t-full bg-gradient-to-b from-[#4ac1b7] to-[#70d9cf]" />
                                <div className="absolute top-4 right-5 h-16 w-24 rounded-xl border border-[#d9e6ff] bg-white shadow-[0_8px_18px_rgba(80,120,220,0.16)]">
                                  <div className="flex h-5 items-center gap-1.5 rounded-t-xl bg-[#cfdcff] px-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#f38cab]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#8db5ff]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#b7cbff]" />
                                  </div>
                                  <div className="px-2 py-1.5">
                                    <div className="mb-1.5 flex items-end justify-between">
                                      <div className="h-2.5 w-10 rounded bg-[#eef3ff]" />
                                      <div className="h-2.5 w-3.5 rounded bg-[#e3ecff]" />
                                    </div>
                                    <div className="h-5 rounded-md bg-gradient-to-r from-[#4f86ff] to-[#79a5ff]" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="px-6 py-6 md:px-8">
                            {latestWebstoreRejectionMessage ? (
                              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-4.5 w-4.5"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M12 9v4" />
                                      <path d="M12 17h.01" />
                                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0Z" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-rose-800">
                                      Payment Rejected
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-rose-700">
                                      {latestWebstoreRejectionMessage}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {isWebstoreReceiptRejected ? (
                              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M12 9v4" />
                                      <path d="M12 17h.01" />
                                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0Z" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-rose-800">
                                      Receipt Rejected
                                    </p>
                                    <p className="mt-0.5 text-xs leading-5 text-rose-700">
                                      {activeWebstoreRequest?.latest_receipt_message ||
                                        "Your payment receipt was rejected. Please upload a new receipt to continue."}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openWebstoreReceiptUpload()
                                      }
                                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="M4 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
                                        <path d="m12 11v5" />
                                        <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
                                      </svg>
                                      Re-upload Receipt
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : isWebstoreExpired ? (
                              <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <circle cx="12" cy="12" r="10" />
                                      <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-orange-800">
                                      Your subscription has expired.
                                    </p>
                                    <p className="mt-0.5 text-xs leading-5 text-orange-700">
                                      Renew your plan to maintain uninterrupted
                                      access to your account and services.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {webstoreMsg && (
                              <div
                                className={`mb-4 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${webstoreMsg.type === "success" ? "border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "border border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}
                              >
                                {webstoreMsg.text}
                              </div>
                            )}

                            <div
                              ref={webstorePlanSectionRef}
                              className={`mb-5 overflow-hidden rounded-2xl border bg-gradient-to-br from-[#f8fbff] via-[#f3f8ff] to-[#eef4ff] shadow-[0_10px_28px_rgba(37,99,235,0.12)] ${
                                webstoreInvalidFields.plan &&
                                !selectedWebstorePlan
                                  ? "border-rose-300 ring-2 ring-rose-100"
                                  : isWebstoreSubscriptionLocked
                                    ? "border-[#dbe6fb] opacity-80"
                                    : "border-[#cfe0ff]"
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dce8ff] px-4 py-4 md:px-5">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dbeafe] text-[#1d4ed8]">
                                    <Icon.Activity className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-extrabold tracking-wide text-[#0f1f44]">
                                      Webstore Subscription
                                    </p>
                                    <p className="text-xs text-[#5f739d]">
                                      Fixed duration plan for partner storefront
                                      access.
                                    </p>
                                    {isWebstoreSubscriptionLocked ? (
                                      <p className="mt-1 text-xs font-medium text-sky-700">
                                        This subscription is locked because your
                                        storefront already exists.
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <div
                                  className={`min-w-[170px] rounded-2xl border bg-white/90 px-4 py-3 text-right shadow-[0_8px_18px_rgba(80,120,220,0.08)] ${
                                    activeWebstoreRequest &&
                                    webstoreRemainingBalance <= 0
                                      ? "border-emerald-200"
                                      : "border-[#d9e6ff]"
                                  }`}
                                >
                                  <p
                                    className={`text-center text-[10px] font-extrabold tracking-[0.18em] uppercase ${
                                      activeWebstoreRequest &&
                                      webstoreRemainingBalance <= 0
                                        ? "text-emerald-600"
                                        : "text-[#6d82ab]"
                                    }`}
                                  >
                                    {activeWebstoreRequest &&
                                    webstoreRemainingBalance <= 0
                                      ? "Paid"
                                      : "Remaining Balance"}
                                  </p>
                                  <p
                                    className={`mt-1 text-center text-lg font-black tracking-tight ${
                                      activeWebstoreRequest &&
                                      webstoreRemainingBalance <= 0
                                        ? "text-emerald-700"
                                        : "text-[#0f1f44]"
                                    }`}
                                  >
                                    {activeWebstoreRequest &&
                                    webstoreRemainingBalance <= 0
                                      ? "Paid"
                                      : activeWebstoreRequest
                                        ? `PHP ${webstoreRemainingBalance.toLocaleString()}`
                                        : "PHP 0"}
                                  </p>
                                </div>
                              </div>
                              <div className="px-4 py-4 md:px-5">
                                <div className="overflow-hidden rounded-2xl border border-[#d9e6ff] bg-white">
                                  <div className="grid grid-cols-4 gap-0 border-b border-[#e7efff] bg-[#f4f8ff] px-4 py-3 text-[11px] font-extrabold tracking-[0.16em] text-[#6d82ab] uppercase">
                                    <div>Plan</div>
                                    <div>Term</div>
                                    <div>Subscription Fee</div>
                                    <div>Effective Monthly</div>
                                  </div>
                                  <div className="divide-y divide-[#edf2ff]">
                                    {isAfuser ? (
                                      <button
                                        type="button"
                                        disabled={isWebstoreSubscriptionLocked}
                                        onClick={() => {
                                          if (isWebstoreSubscriptionLocked)
                                            return
                                          setSelectedWebstorePlan("test")
                                          setWebstoreInvalidFields((prev) => ({
                                            ...prev,
                                            plan: false,
                                          }))
                                          setWebstoreMsg(null)
                                        }}
                                        className={`grid w-full grid-cols-2 gap-2 px-4 py-4 text-left transition md:grid-cols-4 md:divide-x md:divide-[#edf2ff] md:px-0 md:py-0 ${
                                          selectedWebstorePlan === "test"
                                            ? "bg-[#f4f8ff]"
                                            : "bg-white"
                                        }`}
                                      >
                                        <div className="md:px-4 md:py-4">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${selectedWebstorePlan === "test" ? "border-[#2f5bd8]" : "border-[#c2d3f5]"}`}
                                            >
                                              <span
                                                className={`h-2 w-2 rounded-full ${selectedWebstorePlan === "test" ? "bg-[#2f5bd8]" : "bg-transparent"}`}
                                              />
                                            </span>
                                            <div>
                                              <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                                Plan
                                              </p>
                                              <p className="text-sm font-bold text-[#163060]">
                                                Test
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="md:px-4 md:py-4">
                                          <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                            Term
                                          </p>
                                          <p className="text-sm font-semibold text-[#163060]">
                                            2 days
                                          </p>
                                        </div>
                                        <div className="md:px-4 md:py-4">
                                          <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                            Subscription Fee
                                          </p>
                                          <p className="text-sm font-semibold text-[#163060]">
                                            ₱1
                                          </p>
                                        </div>
                                        <div className="md:px-4 md:py-4">
                                          <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                            Effective Monthly
                                          </p>
                                          <p className="text-sm font-semibold text-[#163060]">
                                            ₱1
                                          </p>
                                        </div>
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      disabled={isWebstoreSubscriptionLocked}
                                      onClick={() => {
                                        if (isWebstoreSubscriptionLocked) return
                                        setSelectedWebstorePlan("quarterly")
                                        setWebstoreInvalidFields((prev) => ({
                                          ...prev,
                                          plan: false,
                                        }))
                                        setWebstoreMsg(null)
                                      }}
                                      className={`grid w-full grid-cols-2 gap-2 px-4 py-4 text-left transition md:grid-cols-4 md:divide-x md:divide-[#edf2ff] md:px-0 md:py-0 ${
                                        selectedWebstorePlan === "quarterly"
                                          ? "bg-[#f4f8ff]"
                                          : "bg-white"
                                      }`}
                                    >
                                      <div className="md:px-4 md:py-4">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${selectedWebstorePlan === "quarterly" ? "border-[#2f5bd8]" : "border-[#c2d3f5]"}`}
                                          >
                                            <span
                                              className={`h-2 w-2 rounded-full ${selectedWebstorePlan === "quarterly" ? "bg-[#2f5bd8]" : "bg-transparent"}`}
                                            />
                                          </span>
                                          <div>
                                            <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                              Plan
                                            </p>
                                            <div className="flex items-center gap-1.5">
                                              <p className="text-sm font-bold text-[#163060]">
                                                Quarterly
                                              </p>
                                              {isRenewalMode &&
                                                currentPlanKey ===
                                                  "quarterly" && (
                                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
                                                    Current
                                                  </span>
                                                )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="md:px-4 md:py-4">
                                        <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                          Term
                                        </p>
                                        <p className="text-sm font-semibold text-[#163060]">
                                          3 months
                                        </p>
                                      </div>
                                      <div className="md:px-4 md:py-4">
                                        <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                          Subscription Fee
                                        </p>
                                        <p className="text-sm font-semibold text-[#163060]">
                                          ₱48,000
                                        </p>
                                      </div>
                                      <div className="md:px-4 md:py-4">
                                        <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                          Effective Monthly
                                        </p>
                                        <p className="text-sm font-semibold text-[#163060]">
                                          ₱16,000
                                        </p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isWebstoreSubscriptionLocked}
                                      onClick={() => {
                                        if (isWebstoreSubscriptionLocked) return
                                        setSelectedWebstorePlan("semiAnnual")
                                        setWebstoreInvalidFields((prev) => ({
                                          ...prev,
                                          plan: false,
                                        }))
                                        setWebstoreMsg(null)
                                      }}
                                      className={`grid w-full grid-cols-2 gap-2 px-4 py-4 text-left transition md:grid-cols-4 md:divide-x md:divide-[#edf2ff] md:px-0 md:py-0 ${
                                        selectedWebstorePlan === "semiAnnual"
                                          ? "bg-[#f4f8ff]"
                                          : "bg-white"
                                      }`}
                                    >
                                      <div className="md:px-4 md:py-4">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${selectedWebstorePlan === "semiAnnual" ? "border-[#2f5bd8]" : "border-[#c2d3f5]"}`}
                                          >
                                            <span
                                              className={`h-2 w-2 rounded-full ${selectedWebstorePlan === "semiAnnual" ? "bg-[#2f5bd8]" : "bg-transparent"}`}
                                            />
                                          </span>
                                          <div>
                                            <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                              Plan
                                            </p>
                                            <div className="flex items-center gap-1.5">
                                              <p className="text-sm font-bold text-[#163060]">
                                                Semi-Annual
                                              </p>
                                              {isRenewalMode &&
                                                currentPlanKey ===
                                                  "semiAnnual" && (
                                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
                                                    Current
                                                  </span>
                                                )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="md:px-4 md:py-4">
                                        <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                          Term
                                        </p>
                                        <p className="text-sm font-semibold text-[#163060]">
                                          6 months
                                        </p>
                                      </div>
                                      <div className="md:px-4 md:py-4">
                                        <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                          Subscription Fee
                                        </p>
                                        <p className="text-sm font-semibold text-[#163060]">
                                          ₱90,000
                                        </p>
                                      </div>
                                      <div className="md:px-4 md:py-4">
                                        <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                          Effective Monthly
                                        </p>
                                        <p className="text-sm font-semibold text-[#163060]">
                                          ₱15,000
                                        </p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isWebstoreSubscriptionLocked}
                                      onClick={() => {
                                        if (isWebstoreSubscriptionLocked) return
                                        setSelectedWebstorePlan("annual")
                                        setWebstoreInvalidFields((prev) => ({
                                          ...prev,
                                          plan: false,
                                        }))
                                        setWebstoreMsg(null)
                                      }}
                                      className={`grid w-full grid-cols-2 gap-2 px-4 py-4 text-left transition md:grid-cols-4 md:divide-x md:divide-[#edf2ff] md:px-0 md:py-0 ${
                                        selectedWebstorePlan === "annual"
                                          ? "bg-[#eef4ff]"
                                          : "bg-white"
                                      }`}
                                    >
                                      <div className="md:px-4 md:py-4">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${selectedWebstorePlan === "annual" ? "border-[#2f5bd8]" : "border-[#c2d3f5]"}`}
                                          >
                                            <span
                                              className={`h-2 w-2 rounded-full ${selectedWebstorePlan === "annual" ? "bg-[#2f5bd8]" : "bg-transparent"}`}
                                            />
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <div>
                                              <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                                Plan
                                              </p>
                                              <p className="text-sm font-bold text-[#163060]">
                                                Annual
                                              </p>
                                            </div>
                                            <span className="rounded-full bg-[#e8f0ff] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#2f5bd8] uppercase">
                                              Best Value
                                            </span>
                                            {isRenewalMode &&
                                              currentPlanKey === "annual" && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
                                                  Current
                                                </span>
                                              )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="md:px-4 md:py-4">
                                        <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                          Term
                                        </p>
                                        <p className="text-sm font-semibold text-[#163060]">
                                          Yearly
                                        </p>
                                      </div>
                                      <div className="md:px-4 md:py-4">
                                        <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                          Subscription Fee
                                        </p>
                                        <p className="text-sm font-semibold text-[#163060]">
                                          ₱150,000
                                        </p>
                                      </div>
                                      <div className="md:px-4 md:py-4">
                                        <p className="text-[11px] font-semibold tracking-wide text-[#6d82ab] uppercase md:hidden">
                                          Effective Monthly
                                        </p>
                                        <p className="text-sm font-semibold text-[#163060]">
                                          ₱12,500
                                        </p>
                                      </div>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="border-t border-[#dce8ff] bg-white/80 px-4 py-3 md:px-5">
                                <p className="mt-1 text-xs font-semibold text-[#2f5bd8]">
                                  {isSamePlanRenewal
                                    ? `Renewing: ${planDisplayName(selectedWebstorePlan)}`
                                    : isPlanChangeRenewal
                                      ? `Changing: ${planDisplayName(currentPlanKey)} → ${planDisplayName(selectedWebstorePlan)}`
                                      : `Selected plan: ${selectedWebstorePlan ? planDisplayName(selectedWebstorePlan) : "None selected"}`}
                                </p>
                                <div className="mt-3 rounded-2xl border border-[#d7e4fb] bg-[#f8fbff] px-4 py-3">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-[#163060]">
                                        Renewal
                                      </p>
                                      <p className="text-xs text-[#7d8fb0]">
                                        {isRenewalMode
                                          ? "Select the same plan to renew, or choose a different plan to change your subscription."
                                          : webstoreRenewalEnabled
                                            ? "Enabled for the next term when renewal is available."
                                            : "Disabled. You can turn it on for future renewal tracking."}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isRenewalToggleLocked}
                                      onClick={() => {
                                        if (isRenewalToggleLocked) return
                                        const next = !webstoreRenewalEnabled
                                        setWebstoreRenewalEnabled(next)
                                        saveWebstoreDraft({
                                          webstoreRenewalEnabled: next,
                                        })
                                      }}
                                      className={`relative inline-flex h-8 w-14 items-center rounded-full px-1 transition ${
                                        isRenewalToggleLocked
                                          ? "cursor-not-allowed bg-slate-200 opacity-70"
                                          : webstoreRenewalEnabled
                                            ? "bg-emerald-500"
                                            : "bg-slate-300"
                                      }`}
                                      aria-pressed={webstoreRenewalEnabled}
                                      aria-label={
                                        isRenewalToggleLocked
                                          ? "Renewal locked while request is under review"
                                          : webstoreRenewalEnabled
                                            ? "Disable renewal"
                                            : "Enable renewal"
                                      }
                                    >
                                      <span
                                        className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                                          isRenewalToggleLocked
                                            ? "translate-x-0"
                                            : webstoreRenewalEnabled
                                              ? "translate-x-6"
                                              : "translate-x-0"
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {isSamePlanRenewal && (
                              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                <svg
                                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M21 2v6h-6" />
                                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                                  <path d="M3 22v-6h6" />
                                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                                </svg>
                                <div>
                                  <p className="text-sm font-bold text-emerald-800">
                                    Renewing your current subscription
                                  </p>
                                  <p className="mt-0.5 text-xs text-emerald-700">
                                    Your{" "}
                                    <strong>
                                      {planDisplayName(currentPlanKey)}
                                    </strong>{" "}
                                    plan will be extended for another term once
                                    payment is confirmed.
                                  </p>
                                </div>
                              </div>
                            )}
                            {isPlanChangeRenewal && (
                              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                <svg
                                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="m7 16 4-4-4-4" />
                                  <path d="m11 16 4-4-4-4" />
                                </svg>
                                <div>
                                  <p className="text-sm font-bold text-amber-800">
                                    Plan change detected
                                  </p>
                                  <p className="mt-0.5 text-xs text-amber-700">
                                    Changing from{" "}
                                    <strong>
                                      {planDisplayName(currentPlanKey)}
                                    </strong>{" "}
                                    to{" "}
                                    <strong>
                                      {planDisplayName(selectedWebstorePlan)}
                                    </strong>
                                    . Your subscription record will be updated
                                    when the renewal payment is processed.
                                  </p>
                                </div>
                              </div>
                            )}

                            <form
                              onSubmit={handleSubmitWebstoreRequest}
                              className="space-y-5"
                            >
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                  <label className="text-sm font-semibold text-[#1f3763]">
                                    Full Name
                                  </label>
                                  <input
                                    type="text"
                                    value={webstoreContactFullName}
                                    onChange={(e) =>
                                      setWebstoreForm((prev) => ({
                                        ...prev,
                                        fullName: e.target.value,
                                      }))
                                    }
                                    className={`w-full rounded-xl border px-4 py-3 text-sm ${
                                      hasExistingWebstoreRequest
                                        ? "border-[#d5def1] bg-slate-50 text-slate-500"
                                        : "border-[#d5def1] bg-white text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                                    }`}
                                    placeholder="Enter full name"
                                    readOnly
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-sm font-semibold text-[#1f3763]">
                                    Username
                                  </label>
                                  <input
                                    type="text"
                                    value={webstoreContactUsername}
                                    onChange={(e) =>
                                      setWebstoreForm((prev) => ({
                                        ...prev,
                                        username: e.target.value,
                                      }))
                                    }
                                    className={`w-full rounded-xl border px-4 py-3 text-sm ${
                                      hasExistingWebstoreRequest
                                        ? "border-[#d5def1] bg-slate-50 text-slate-500"
                                        : "border-[#d5def1] bg-white text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                                    }`}
                                    placeholder="Enter username"
                                    readOnly
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                  <label className="text-sm font-semibold text-[#1f3763]">
                                    Email
                                  </label>
                                  <input
                                    type="email"
                                    value={webstoreContactEmail}
                                    onChange={(e) =>
                                      setWebstoreForm((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                      }))
                                    }
                                    className={`w-full rounded-xl border px-4 py-3 text-sm ${
                                      hasExistingWebstoreRequest
                                        ? "border-[#d5def1] bg-slate-50 text-slate-500"
                                        : "border-[#d5def1] bg-white text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                                    }`}
                                    placeholder="Enter email"
                                    readOnly
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-sm font-semibold text-[#1f3763]">
                                    Slug Name
                                  </label>
                                  <input
                                    type="text"
                                    ref={webstoreSlugInputRef}
                                    value={
                                      shouldHideDeletedWebstoreFields ||
                                      isDeletedWebstoreRequest
                                        ? ""
                                        : resolvedWebstoreSubmissionForm.slugName ||
                                          webstoreForm.slugName
                                    }
                                    onChange={(e) => {
                                      webstoreStorefrontFieldsEditedRef.current = true
                                      setWebstoreInvalidFields((prev) => ({
                                        ...prev,
                                        slugName: false,
                                      }))
                                      setWebstoreForm((prev) => ({
                                        ...prev,
                                        slugName: e.target.value
                                          .toLowerCase()
                                          .replace(/[^a-z0-9-]/g, ""),
                                      }))
                                    }}
                                    disabled={hasExistingWebstoreRequest}
                                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${
                                      webstoreInvalidFields.slugName
                                        ? "border-rose-300 bg-rose-50 text-rose-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                        : hasExistingWebstoreRequest
                                          ? "border-[#d5def1] bg-slate-50 text-slate-500 opacity-80"
                                          : "border-[#d5def1] bg-white text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                                    }`}
                                    placeholder="your-store-slug"
                                  />
                                  <p className="text-xs font-medium text-[#7d8fb0]">
                                    {hasExistingWebstoreRequest
                                      ? "Registered slug name for your store's unique URL."
                                      : "Set your store slug (letters, numbers, and hyphens only)."}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                  <label className="text-sm font-semibold text-[#1f3763]">
                                    Display Name
                                  </label>
                                  <input
                                    type="text"
                                    ref={webstoreDisplayInputRef}
                                    value={
                                      shouldHideDeletedWebstoreFields ||
                                      isDeletedWebstoreRequest
                                        ? ""
                                        : resolvedWebstoreSubmissionForm.displayName ||
                                          webstoreForm.displayName
                                    }
                                    onChange={(e) => {
                                      webstoreStorefrontFieldsEditedRef.current = true
                                      setWebstoreInvalidFields((prev) => ({
                                        ...prev,
                                        displayName: false,
                                      }))
                                      setWebstoreForm((prev) => ({
                                        ...prev,
                                        displayName: e.target.value,
                                      }))
                                    }}
                                    disabled={hasExistingWebstoreRequest}
                                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${
                                      webstoreInvalidFields.displayName
                                        ? "border-rose-300 bg-rose-50 text-rose-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                        : hasExistingWebstoreRequest
                                          ? "border-[#d5def1] bg-slate-50 text-slate-500 opacity-80"
                                          : "border-[#d5def1] bg-white text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                                    }`}
                                    placeholder="Storefront display name"
                                  />
                                  <p className="text-xs font-medium text-[#7d8fb0]">
                                    {hasExistingWebstoreRequest
                                      ? "Registered display name for your storefront."
                                      : "Set your storefront display name."}
                                  </p>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-sm font-semibold text-[#1f3763]">
                                    Billing Option
                                  </label>
                                  <div className="relative">
                                    <select
                                      ref={webstoreBillingSelectRef}
                                      value={
                                        shouldHideDeletedWebstoreFields ||
                                        isDeletedWebstoreRequest
                                          ? ""
                                          : (selectedBillingOption ?? "")
                                      }
                                      disabled={isWebstoreSubscriptionLocked}
                                      onChange={(event) => {
                                        if (isWebstoreSubscriptionLocked) return
                                        setSelectedBillingOption(
                                          (event.target.value || null) as
                                            | "full"
                                            | "monthly"
                                            | null
                                        )
                                        setWebstoreInvalidFields((prev) => ({
                                          ...prev,
                                          billingOption: false,
                                        }))
                                      }}
                                      className={`w-full appearance-none rounded-xl border bg-white px-4 py-3 pr-12 text-sm font-semibold text-[#163060] transition outline-none hover:border-[#9fb4ef] focus:border-[#4f7df0] focus:bg-[#fbfdff] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70 ${
                                        webstoreInvalidFields.billingOption
                                          ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                                          : "border-[#d5def1]"
                                      }`}
                                    >
                                      <option value="">
                                        Select billing option
                                      </option>
                                      <option value="full">Full Payment</option>
                                      <option value="monthly">
                                        Monthly Installment
                                      </option>
                                    </select>
                                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[#2457e7]">
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="m6 9 6 6 6-6" />
                                      </svg>
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-[#7d8fb0]">
                                    Choose how the subscription will be billed.
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-[#1f3763]">
                                  Payment Method
                                </label>
                                <div className="relative">
                                  <select
                                    ref={webstorePaymentSelectRef}
                                    value={
                                      shouldHideDeletedWebstoreFields ||
                                      isDeletedWebstoreRequest
                                        ? ""
                                        : (selectedPaymentMethod ?? "")
                                    }
                                    disabled={
                                      isCreatingWebstorePaymentSession ||
                                      isWebstoreSubscriptionLocked
                                    }
                                    onChange={(event) => {
                                      if (isWebstoreSubscriptionLocked) return
                                      const method = isWebstorePaymentMethod(
                                        event.target.value
                                      )
                                        ? event.target.value
                                        : null
                                      webstorePaymentMethodTouchedRef.current = true
                                      setSelectedPaymentMethod(method)
                                      setWebstoreInvalidFields((prev) => ({
                                        ...prev,
                                        paymentMethod: false,
                                      }))
                                      if (method) {
                                        saveWebstoreDraft({
                                          selectedPaymentMethod: method,
                                        })
                                      }
                                    }}
                                    className={`w-full appearance-none rounded-xl border bg-white px-4 py-3 pr-12 text-sm font-semibold text-[#163060] transition outline-none hover:border-[#9fb4ef] focus:border-[#4f7df0] focus:bg-[#fbfdff] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70 ${
                                      webstoreInvalidFields.paymentMethod
                                        ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                                        : "border-[#d5def1]"
                                    }`}
                                  >
                                    <option value="">
                                      Select payment method
                                    </option>
                                    {WEBSTORE_PAYMENT_METHODS.map((method) => (
                                      <option
                                        key={method.value}
                                        value={method.value}
                                      >
                                        {method.label}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[#2457e7]">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-5 w-5"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="m6 9 6 6 6-6" />
                                    </svg>
                                  </span>
                                </div>
                                <div className="mt-2 rounded-2xl border border-[#dbe4f7] bg-[#f8fbff] px-4 py-3">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <p className="mr-1 text-[11px] font-bold tracking-[0.18em] text-[#6d7fa6] uppercase">
                                      Available Payment Method:
                                    </p>
                                    {WEBSTORE_AVAILABLE_PAYMENT_METHODS.map(
                                      (method) => (
                                        <span
                                          key={method.label}
                                          className={`inline-flex items-center gap-1.5 rounded-xl border border-[#d5def1] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a2f57] shadow-[0_1px_0_rgba(255,255,255,0.7)] ${
                                            method.badgeClassName ?? ""
                                          }`}
                                        >
                                          {method.logo ? (
                                            <img
                                              src={method.logo}
                                              alt={method.label}
                                              className="h-4 w-auto shrink-0 object-contain"
                                            />
                                          ) : null}
                                          <span
                                            className={
                                              method.textClassName ?? ""
                                            }
                                          >
                                            {method.label}
                                          </span>
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>
                                {selectedWebstorePaymentAmount != null ? (
                                  <p className="mt-2 text-xs font-semibold text-[#4c638f]">
                                    {selectedBillingOption === "monthly"
                                      ? `Monthly installment amount: ₱${selectedWebstorePaymentAmount.toLocaleString()}`
                                      : activeWebstoreRequest?.status ===
                                            "approved" &&
                                          Number.isFinite(
                                            Number(
                                              activeWebstoreRequest?.remaining_balance ??
                                                NaN
                                            )
                                          )
                                        ? `Remaining balance due: ₱${selectedWebstorePaymentAmount.toLocaleString()}`
                                        : `Full payment amount: ₱${selectedWebstorePaymentAmount.toLocaleString()}`}
                                  </p>
                                ) : null}
                                {selectedPaymentMethod ? (
                                  <button
                                    type="button"
                                    disabled={
                                      isCreatingWebstorePaymentSession ||
                                      isWebstoreRequestPendingReview ||
                                      webstoreRemainingBalance <= 0
                                    }
                                    onClick={() => {
                                      if (
                                        isWebstoreRequestPendingReview ||
                                        webstoreRemainingBalance <= 0
                                      )
                                        return
                                      void handleStartWebstorePayment(
                                        selectedPaymentMethod
                                      )
                                    }}
                                    className={`mt-4 inline-flex items-center justify-center gap-3 rounded-[18px] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.38)] transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                      isSamePlanRenewal
                                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_12px_28px_rgba(5,150,105,0.35)] hover:from-emerald-600 hover:to-emerald-700"
                                        : isPlanChangeRenewal
                                          ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_12px_28px_rgba(217,119,6,0.35)] hover:from-amber-600 hover:to-orange-600"
                                          : "bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af]"
                                    }`}
                                  >
                                    {isSamePlanRenewal ? (
                                      <svg
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="M21 2v6h-6" />
                                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                                        <path d="M3 22v-6h6" />
                                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                                      </svg>
                                    ) : isPlanChangeRenewal ? (
                                      <svg
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="m7 16 4-4-4-4" />
                                        <path d="m11 16 4-4-4-4" />
                                      </svg>
                                    ) : (
                                      <Icon.Package className="h-5 w-5" />
                                    )}
                                    {isSamePlanRenewal
                                      ? `Renew Subscription`
                                      : isPlanChangeRenewal
                                        ? `Change Plan & Subscribe`
                                        : hasWebstorePaymentHistory
                                          ? `Pay Again with ${getWebstorePaymentMethodConfig(selectedPaymentMethod).label}`
                                          : `Pay with ${getWebstorePaymentMethodConfig(selectedPaymentMethod).label}`}
                                    <span aria-hidden>→</span>
                                  </button>
                                ) : null}
                              </div>

                              <div
                                ref={webstoreTermsSectionRef}
                                className={`rounded-xl border px-4 py-3 ${
                                  webstoreInvalidFields.terms &&
                                  !webstoreAcceptedTerms
                                    ? "border-rose-300 bg-rose-50"
                                    : "border-[#d5def1] bg-[#f8faff]"
                                }`}
                              >
                                <label className="inline-flex items-start gap-2 text-sm text-[#334b76]">
                                  <input
                                    type="checkbox"
                                    checked={
                                      isApprovedWebstoreRequest
                                        ? true
                                        : webstoreAcceptedTerms
                                    }
                                    disabled={isWebstoreSubscriptionLocked}
                                    onChange={(e) => {
                                      if (isWebstoreSubscriptionLocked) return
                                      const nextChecked = e.target.checked
                                      if (nextChecked) {
                                        // Don't mark as accepted yet — wait for "I Agree"
                                        setWebstoreTermsOpen(true)
                                      } else {
                                        setWebstoreAcceptedTerms(false)
                                        setWebstoreInvalidFields((prev) => ({
                                          ...prev,
                                          terms: false,
                                        }))
                                      }
                                    }}
                                    className={`mt-0.5 h-4 w-4 accent-blue-600 ${
                                      webstoreInvalidFields.terms &&
                                      !webstoreAcceptedTerms
                                        ? "ring-2 ring-rose-200 ring-offset-2"
                                        : ""
                                    }`}
                                  />
                                  <span>
                                    I agree to the{" "}
                                    <button
                                      type="button"
                                      onClick={() => setWebstoreTermsOpen(true)}
                                      className="font-semibold text-sky-600 hover:underline dark:text-sky-400"
                                    >
                                      Terms and Conditions
                                    </button>
                                    .{" "}
                                    <span className="text-rose-500">
                                      {isApprovedWebstoreRequest
                                        ? "(Already accepted)"
                                        : "(Required)"}
                                    </span>
                                  </span>
                                </label>
                              </div>

                              <div className="mt-2 flex flex-col gap-4 border-t border-[#e6edfb] pt-5 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                                    <Icon.Shield className="h-6 w-6 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[#1f3763]">
                                      Secure &amp; Verified
                                    </p>
                                    <p className="text-xs text-[#6e7fa3]">
                                      Your information is safe with us and will
                                      never be shared.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </form>

                            <div className="mt-6 rounded-[28px] border border-[#e6ebf8] bg-white p-5 shadow-[0_16px_40px_rgba(17,24,39,0.04)] md:p-7">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#eef1ff] text-[#2f5bff]">
                                    <Icon.Package className="h-7 w-7" />
                                  </div>
                                  <h4 className="text-[18px] font-extrabold tracking-tight text-[#162449] md:text-[20px]">
                                    Your Webstore Request
                                  </h4>
                                </div>
                                {activeWebstoreRequest?.status ? (
                                  <span
                                    className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-[11px] leading-none font-bold md:text-[12px] ${
                                      activeWebstoreRequest.status ===
                                      "approved"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : activeWebstoreRequest.status ===
                                            "rejected"
                                          ? "bg-rose-50 text-rose-700"
                                          : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    <span className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-current/15">
                                      <Icon.Check className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-xs md:text-sm">
                                      {activeWebstoreRequest.status ===
                                      "pending_review"
                                        ? "Pending Review"
                                        : activeWebstoreRequest.status ===
                                            "approved"
                                          ? "Approved"
                                          : "Rejected"}
                                    </span>
                                  </span>
                                ) : null}
                              </div>

                              {activeWebstoreRequest ? (
                                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <div className="rounded-3xl border border-[#e3e9f7] bg-white px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-2xl bg-[#edf3ff] text-[#2e63d6]">
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-4 w-4"
                                        >
                                          <path d="M6 2h8l4 4v16H6z" />
                                          <path d="M14 2v4h4" />
                                          <path d="M9 12h6M9 16h6" />
                                        </svg>
                                      </span>
                                      <p className="text-[11px] font-bold tracking-wide text-[#667293] uppercase md:text-xs">
                                        Reference
                                      </p>
                                    </div>
                                    <p className="mt-2.5 text-[17px] leading-tight font-extrabold break-words text-[#17264a] md:text-[18px]">
                                      {activeWebstoreRequest.reference_no ||
                                        "-"}
                                    </p>
                                  </div>
                                  <div className="rounded-3xl border border-[#e3e9f7] bg-white px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-2xl bg-[#edf3ff] text-[#2e63d6]">
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-4 w-4"
                                        >
                                          <rect
                                            x="3"
                                            y="5"
                                            width="18"
                                            height="16"
                                            rx="2"
                                          />
                                          <path d="M16 3v4M8 3v4M3 10h18" />
                                        </svg>
                                      </span>
                                      <p className="text-[11px] font-bold tracking-wide text-[#667293] uppercase md:text-xs">
                                        Submitted
                                      </p>
                                    </div>
                                    <p className="mt-2.5 text-[17px] leading-tight font-extrabold break-words text-[#17264a] md:text-[18px]">
                                      {activeWebstoreRequest.created_at
                                        ? new Date(
                                            activeWebstoreRequest.created_at
                                          ).toLocaleString("en-US", {
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                          })
                                        : "-"}
                                    </p>
                                  </div>
                                  <div className="rounded-3xl border border-[#e3e9f7] bg-white px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-2xl bg-[#edf3ff] text-[#2e63d6]">
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-4 w-4"
                                        >
                                          <path d="m20 12-8 8-8-8 8-8 8 8Z" />
                                          <circle cx="12" cy="12" r="2" />
                                        </svg>
                                      </span>
                                      <p className="text-[11px] font-bold tracking-wide text-[#667293] uppercase md:text-xs">
                                        Slug Name
                                      </p>
                                    </div>
                                    <p className="mt-2.5 text-[17px] leading-tight font-extrabold break-words text-[#17264a] md:text-[18px]">
                                      {activeWebstoreRequest.slug_name || "-"}
                                    </p>
                                  </div>
                                  <div className="rounded-3xl border border-[#e3e9f7] bg-white px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-2xl bg-[#edf3ff] text-[#2e63d6]">
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-4 w-4"
                                        >
                                          <rect
                                            x="3"
                                            y="4"
                                            width="18"
                                            height="13"
                                            rx="2"
                                          />
                                          <path d="M8 20h8M12 17v3" />
                                        </svg>
                                      </span>
                                      <p className="text-[11px] font-bold tracking-wide text-[#667293] uppercase md:text-xs">
                                        Display Name
                                      </p>
                                    </div>
                                    <p className="mt-2.5 text-[17px] leading-tight font-extrabold break-words text-[#17264a] md:text-[18px]">
                                      {activeWebstoreRequest.display_name ||
                                        "-"}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-6 text-sm text-[#6e7fa3]">
                                  No webstore request submitted yet.
                                </p>
                              )}

                              {activeWebstoreRequest?.status === "approved" ? (
                                <div className="mt-4 border-t border-[#e5ebfa] pt-4">
                                  {activeWebstoreRequest.partner_sync_status ===
                                  "synced" ? (
                                    <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                                        <Icon.Check className="h-3.5 w-3.5" />
                                      </span>
                                      Partner login account already synced.
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={handleSyncWebstoreAccount}
                                      disabled={
                                        isSyncingWebstoreAccount ||
                                        activeWebstoreRequest.can_sync_account ===
                                          false
                                      }
                                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition hover:from-[#1d4ed8] hover:to-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <Icon.Check className="h-4 w-4" />
                                      {isSyncingWebstoreAccount
                                        ? "Syncing account..."
                                        : "Sync Your Account"}
                                    </button>
                                  )}
                                  {showPartnerLoginShortcut ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        router.push("/partner/login")
                                      }
                                      className="ml-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#c7d8ff] bg-white px-5 py-2.5 text-sm font-semibold text-[#1f4fc9] hover:bg-[#f4f8ff]"
                                    >
                                      Go to Partner Login
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Transaction History */}
                        <div className="overflow-hidden rounded-3xl border border-[#dfe8fb] bg-white shadow-[0_16px_45px_rgba(30,64,175,0.08)]">
                          {/* Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6edfb] bg-gradient-to-r from-[#f8fbff] to-[#f4f8ff] px-6 py-5 md:px-8">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7ed7f7] to-[#3b82f6] shadow-sm">
                                <Icon.Activity className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold tracking-tight text-[#0f1f44]">
                                  Transaction History
                                </h3>
                                <p className="text-sm text-[#60739b]">
                                  All your webstore subscription payment
                                  records.
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full border border-[#dce8ff] bg-white px-3 py-1 text-xs font-bold text-[#1d4ed8] shadow-sm">
                              {isWebstoreHistoryLoading
                                ? "..."
                                : webstoreTransactions.length}{" "}
                              record
                              {webstoreTransactions.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {isWebstoreHistoryLoading ? (
                            <div className="flex items-center justify-center gap-3 py-12 text-sm text-[#8a9ec0]">
                              <svg
                                className="h-5 w-5 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
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
                                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                />
                              </svg>
                              Loading transactions…
                            </div>
                          ) : webstoreTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#6d82ab]">
                                <Icon.Activity className="h-6 w-6" />
                              </div>
                              <p className="text-sm font-semibold text-[#0f1f44]">
                                No transactions yet
                              </p>
                              <p className="text-xs text-[#8a9ec0]">
                                Your webstore subscription payments will appear
                                here.
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Table — horizontal scroll on small screens */}
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] border-collapse text-sm">
                                  <thead>
                                    <tr className="border-b border-[#e7efff] bg-[#f4f8ff]">
                                      {[
                                        "#",
                                        "Reference No.",
                                        "Start / End",
                                        "Plan / Term",
                                        "Payment Method",
                                        "Amount Paid",
                                        "Remaining",
                                        "Status",
                                        "Receipt",
                                      ].map((col) => (
                                        <th
                                          key={col}
                                          className="px-4 py-3 text-left text-[11px] font-extrabold tracking-[0.16em] text-[#6d82ab] uppercase first:pl-6 last:pr-6"
                                        >
                                          {col}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#edf2ff]">
                                    {webstoreHistoryPageRows.map((tx, idx) => (
                                      <tr
                                        key={tx.id}
                                        className="transition hover:bg-[#f8fbff]"
                                      >
                                        {/* # */}
                                        <td className="py-4 pr-4 pl-6 text-xs font-bold text-[#8a9ec0]">
                                          {(webstoreHistoryPage - 1) *
                                            WEBSTORE_HISTORY_PAGE_SIZE +
                                            idx +
                                            1}
                                        </td>
                                        {/* Reference No. */}
                                        <td className="px-4 py-4">
                                          <p className="font-mono text-xs font-semibold text-[#0f1f44]">
                                            {tx.reference_no || "—"}
                                          </p>
                                          {tx.payment_reference ? (
                                            <p className="mt-0.5 text-[10px] text-[#8a9ec0]">
                                              Ref: {tx.payment_reference}
                                            </p>
                                          ) : null}
                                        </td>
                                        {/* Start / End */}
                                        <td className="px-4 py-4">
                                          {tx.created_at ? (
                                            <>
                                              {(() => {
                                                const startRaw =
                                                  tx.reviewed_at?.trim() ||
                                                  tx.created_at
                                                const expiry =
                                                  computeEndDateRaw(
                                                    startRaw ?? null,
                                                    tx.billing_option ?? null,
                                                    tx.plan ?? null,
                                                    tx.plan_term ?? null,
                                                    tx.status ?? null,
                                                    null,
                                                    tx.plan_term_months ?? null
                                                  )
                                                const startLabel = new Date(
                                                  startRaw
                                                ).toLocaleDateString("en-PH", {
                                                  year: "numeric",
                                                  month: "short",
                                                  day: "numeric",
                                                })
                                                const endLabel = expiry
                                                  ? expiry.toLocaleDateString(
                                                      "en-PH",
                                                      {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                      }
                                                    )
                                                  : null
                                                return endLabel ? (
                                                  <p className="text-xs font-semibold text-[#0f1f44]">
                                                    {startLabel}
                                                    <span className="mx-1 text-[#8a9ec0]">
                                                      /
                                                    </span>
                                                    <span className="text-emerald-600">
                                                      {endLabel}
                                                    </span>
                                                  </p>
                                                ) : (
                                                  <p className="text-xs font-semibold text-[#0f1f44]">
                                                    {startLabel}
                                                  </p>
                                                )
                                              })()}
                                            </>
                                          ) : (
                                            <span className="text-xs text-[#8a9ec0]">
                                              —
                                            </span>
                                          )}
                                        </td>
                                        {/* Plan / Term */}
                                        <td className="px-4 py-4">
                                          <p className="text-xs font-semibold text-[#0f1f44]">
                                            {tx.plan === "test"
                                              ? "Test"
                                              : tx.plan === "quarterly"
                                                ? "Quarterly"
                                                : tx.plan === "semi_annual"
                                                  ? "Semi-Annual"
                                                  : tx.plan === "annual"
                                                    ? "Annual"
                                                    : "—"}
                                          </p>
                                          <p className="mt-0.5 text-[10px] text-[#8a9ec0]">
                                            {tx.plan === "test"
                                              ? "2 days"
                                              : tx.plan === "quarterly"
                                                ? "3 months"
                                                : tx.plan === "semi_annual"
                                                  ? "6 months"
                                                  : tx.plan === "annual"
                                                    ? "1 year"
                                                    : "—"}
                                          </p>
                                        </td>
                                        {/* Payment Method */}
                                        <td className="px-4 py-4">
                                          <span className="inline-flex items-center rounded-lg border border-[#dce8ff] bg-[#f4f8ff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
                                            {tx.payment_method === "gcash"
                                              ? "GCash"
                                              : tx.payment_method === "grab_pay"
                                                ? "GrabPay"
                                                : tx.payment_method === "maya"
                                                  ? "Maya"
                                                  : tx.payment_method === "card"
                                                    ? "Card"
                                                    : "—"}
                                          </span>
                                        </td>
                                        {/* Amount Paid */}
                                        <td className="px-4 py-4">
                                          <p className="text-sm font-extrabold text-[#0f1f44]">
                                            {tx.status === "pending_review"
                                              ? formatPhpAmount(
                                                  getWebstoreIntendedAmount(tx)
                                                )
                                              : formatPhpAmount(
                                                  tx.total_paid_amount ?? 0
                                                )}
                                          </p>
                                          {tx.billing_option ? (
                                            <p className="mt-0.5 text-[10px] text-[#8a9ec0]">
                                              {tx.billing_option === "full"
                                                ? "Full payment"
                                                : "Monthly installment"}
                                            </p>
                                          ) : (tx.payment_count ?? 0) > 0 ? (
                                            <p className="mt-0.5 text-[10px] text-[#8a9ec0]">
                                              {tx.payment_count} payment
                                              {tx.payment_count !== 1
                                                ? "s"
                                                : ""}
                                            </p>
                                          ) : null}
                                        </td>
                                        {/* Remaining */}
                                        <td className="px-4 py-4">
                                          <p
                                            className={`text-sm font-extrabold ${(tx.remaining_balance ?? 0) <= 0 ? "text-emerald-600" : "text-rose-600"}`}
                                          >
                                            {(tx.remaining_balance ?? 0) <= 0
                                              ? "Paid in full"
                                              : formatPhpAmount(
                                                  tx.remaining_balance ?? 0
                                                )}
                                          </p>
                                        </td>
                                        {/* Status */}
                                        <td className="px-4 py-4">
                                          {(() => {
                                            const isApproved =
                                              tx.status === "approved"
                                            const rowStart =
                                              tx.reviewed_at?.trim() ||
                                              tx.created_at?.trim() ||
                                              null
                                            const expiry = isApproved
                                              ? computeEndDateRaw(
                                                  rowStart,
                                                  tx.billing_option ?? null,
                                                  tx.plan ?? null,
                                                  tx.plan_term ?? null,
                                                  tx.status ?? null,
                                                  null,
                                                  tx.plan_term_months ?? null
                                                )
                                              : null
                                            const isExpired =
                                              isApproved &&
                                              expiry !== null &&
                                              expiry < new Date()
                                            const label = isExpired
                                              ? "Expired"
                                              : isApproved
                                                ? "Approved"
                                                : tx.status === "rejected"
                                                  ? "Rejected"
                                                  : "Pending"
                                            const cls = isExpired
                                              ? "bg-slate-100 text-slate-500"
                                              : isApproved
                                                ? "bg-emerald-100 text-emerald-700"
                                                : tx.status === "rejected"
                                                  ? "bg-rose-100 text-rose-700"
                                                  : "bg-amber-100 text-amber-700"
                                            return (
                                              <span
                                                className={`inline-flex min-w-[78px] items-center justify-center rounded-full px-3 py-1 text-center text-[11px] leading-none font-bold tracking-wide whitespace-nowrap uppercase ${cls}`}
                                              >
                                                {label}
                                              </span>
                                            )
                                          })()}
                                        </td>
                                        {/* Receipt */}
                                        <td className="py-4 pr-6 pl-4">
                                          {(() => {
                                            const receiptUrls =
                                              getWebstoreReceiptUrls(tx)
                                            if (receiptUrls.length === 0) {
                                              return (
                                                <span className="text-xs text-[#8a9ec0]">
                                                  —
                                                </span>
                                              )
                                            }
                                            const carouselKey = String(tx.id)
                                            const currentIdx = Math.min(
                                              webstoreReceiptCarouselIdx[
                                                carouselKey
                                              ] ?? 0,
                                              receiptUrls.length - 1
                                            )
                                            return (
                                              <div className="flex flex-col items-start gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setWebstoreReceiptPreview({
                                                      name:
                                                        tx.reference_no ||
                                                        String(tx.id),
                                                      urls: receiptUrls,
                                                      idx: currentIdx,
                                                    })
                                                  }
                                                  className="group relative overflow-hidden rounded-lg border border-[#d5def1] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                                  aria-label={`View receipt ${currentIdx + 1}`}
                                                >
                                                  <img
                                                    src={
                                                      receiptUrls[currentIdx]
                                                    }
                                                    alt={`Receipt ${currentIdx + 1}`}
                                                    className="h-12 w-12 object-cover"
                                                  />
                                                  <span className="absolute inset-x-0 bottom-0 bg-slate-950/60 px-1 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                                                    View
                                                  </span>
                                                </button>
                                                {receiptUrls.length > 1 && (
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setWebstoreReceiptCarouselIdx(
                                                          (prev) => ({
                                                            ...prev,
                                                            [carouselKey]:
                                                              Math.max(
                                                                0,
                                                                (prev[
                                                                  carouselKey
                                                                ] ?? 0) - 1
                                                              ),
                                                          })
                                                        )
                                                      }
                                                      disabled={
                                                        currentIdx === 0
                                                      }
                                                      className="flex h-4 w-4 items-center justify-center rounded-full bg-[#eef3ff] text-[10px] font-bold text-[#1d4ed8] transition hover:bg-[#dce8ff] disabled:opacity-30"
                                                      aria-label="Previous receipt"
                                                    >
                                                      ‹
                                                    </button>
                                                    <span className="text-[9px] text-[#8a9ec0]">
                                                      {currentIdx + 1}/
                                                      {receiptUrls.length}
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setWebstoreReceiptCarouselIdx(
                                                          (prev) => ({
                                                            ...prev,
                                                            [carouselKey]:
                                                              Math.min(
                                                                receiptUrls.length -
                                                                  1,
                                                                (prev[
                                                                  carouselKey
                                                                ] ?? 0) + 1
                                                              ),
                                                          })
                                                        )
                                                      }
                                                      disabled={
                                                        currentIdx ===
                                                        receiptUrls.length - 1
                                                      }
                                                      className="flex h-4 w-4 items-center justify-center rounded-full bg-[#eef3ff] text-[10px] font-bold text-[#1d4ed8] transition hover:bg-[#dce8ff] disabled:opacity-30"
                                                      aria-label="Next receipt"
                                                    >
                                                      ›
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          })()}
                                          {tx.latest_receipt_submitted_at ? (
                                            <p className="mt-0.5 text-[10px] text-[#8a9ec0]">
                                              {new Date(
                                                tx.latest_receipt_submitted_at
                                              ).toLocaleDateString("en-PH", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                              })}
                                            </p>
                                          ) : null}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {webstoreHistoryTotalPages > 1 ? (
                                <div className="flex flex-col gap-3 border-t border-[#e7efff] bg-[#f8fbff] px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
                                  <p className="text-[11px] text-[#8a9ec0]">
                                    Page {webstoreHistoryPage} of{" "}
                                    {webstoreHistoryTotalPages} · Showing{" "}
                                    {webstoreHistoryPageRows.length} record
                                    {webstoreHistoryPageRows.length !== 1
                                      ? "s"
                                      : ""}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setWebstoreHistoryPage((current) =>
                                          Math.max(1, current - 1)
                                        )
                                      }
                                      disabled={webstoreHistoryPage <= 1}
                                      className="inline-flex items-center rounded-full border border-[#dce8ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#f4f8ff] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Previous
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setWebstoreHistoryPage((current) =>
                                          Math.min(
                                            webstoreHistoryTotalPages,
                                            current + 1
                                          )
                                        )
                                      }
                                      disabled={
                                        webstoreHistoryPage >=
                                        webstoreHistoryTotalPages
                                      }
                                      className="inline-flex items-center rounded-full border border-[#dce8ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#f4f8ff] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="border-t border-[#e7efff] bg-[#f8fbff] px-6 py-3 md:px-8">
                                  <p className="text-[11px] text-[#8a9ec0]">
                                    Showing {webstoreHistoryPageRows.length}{" "}
                                    record
                                    {webstoreHistoryPageRows.length !== 1
                                      ? "s"
                                      : ""}{" "}
                                    · Sorted newest first
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {showWebstoreLearnMore && (
                      <WebstoreLearnMore
                        onClose={() => setShowWebstoreLearnMore(false)}
                      />
                    )}

                    {showWebstoreTutorial && (
                      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <button
                          type="button"
                          aria-label="Close tutorial"
                          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                          onClick={() => setShowWebstoreTutorial(false)}
                        />
                        <div className="relative z-[201] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-2xl">
                          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                            <p className="text-sm font-semibold text-white">
                              Partner Webstore Tutorial
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowWebstoreTutorial(false)}
                              aria-label="Close"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                aria-hidden="true"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                          <div className="aspect-video w-full bg-black">
                            <video
                              className="h-full w-full object-contain"
                              src="/loginpageVideo/ttrl.mp4"
                              controls
                              autoPlay
                              playsInline
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "levels" && (
                      <motion.div key="levels" {...tabMotionProps}>
                        <LevelsTab
                          effectiveRank={effectiveRank}
                          loyaltyTier={loyaltyTier}
                          snapshot={accountSnapshot}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {webstoreTermsOpen && (
            <motion.div
              key="terms-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/60 p-4 backdrop-blur-sm"
              onAnimationStart={() => setWebstoreTermsScrolledEnough(false)}
              onClick={() => {
                setWebstoreTermsOpen(false)
                if (!webstoreAcceptedTerms) setWebstoreAcceptedTerms(false)
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18 }}
                className="mx-auto mt-6 flex max-h-[calc(100vh-4rem)] max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#d8e2f6] bg-white shadow-[0_24px_50px_rgba(30,64,175,0.18)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="shrink-0 border-b border-[#e3eaf8] px-5 py-5 md:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e6efff] to-[#dbe8ff] md:flex">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-8 w-8 text-[#3b82f6]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                          <path d="M14 2v5h5" />
                          <path d="m9 13 2 2 4-4" />
                          <circle cx="18" cy="18" r="3" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-[#0f1f44] md:text-3xl">
                          {webstoreTermsTitle}
                        </h3>
                        <p className="mt-1 text-sm text-[#60739b] md:text-base">
                          By submitting a Partner Webstore Request, you agree to
                          the following terms and conditions:
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setWebstoreTermsOpen(false)
                        if (!webstoreAcceptedTerms) {
                          setWebstoreAcceptedTerms(false)
                        }
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6e0f5] text-[#5e6f93] hover:bg-[#f6f9ff]"
                      aria-label="Close terms modal"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col px-5 py-4 md:px-6">
                  <div
                    className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[#dbe4f6] bg-white p-5"
                    onScroll={(e) => {
                      const el = e.currentTarget
                      const scrolled = el.scrollTop + el.clientHeight
                      const half = el.scrollHeight * 0.5
                      if (scrolled >= half) setWebstoreTermsScrolledEnough(true)
                    }}
                  >
                    <div
                      className="prose prose-slate prose-headings:text-[#1c2f57] prose-strong:text-[#1c2f57] max-w-none text-[#42557e] [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
                      dangerouslySetInnerHTML={{ __html: webstoreTermsBody }}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e3eaf8] bg-[#fbfdff] px-5 py-4 md:px-6">
                  <button
                    type="button"
                    onClick={() => setWebstoreTermsOpen(false)}
                    className="rounded-xl border border-[#d6e0f5] bg-white px-6 py-2.5 text-base font-semibold text-[#2f3f62] hover:bg-[#f7faff]"
                  >
                    Close
                  </button>
                  {webstoreTermsScrolledEnough ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWebstoreAcceptedTerms(true)
                        setWebstoreTermsOpen(false)
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-6 py-2.5 text-base font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] hover:from-[#1d4ed8] hover:to-[#1e40af]"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/60 text-xs">
                        ✓
                      </span>
                      I Agree
                    </button>
                  ) : (
                    <span className="text-xs text-[#8fa3c8]">
                      Scroll to continue ↓
                    </span>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {webstoreSyncSuccessOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60 p-4 backdrop-blur-sm"
              onClick={() => setWebstoreSyncSuccessOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18 }}
                className="mx-auto mt-20 w-full max-w-md overflow-hidden rounded-3xl border border-[#d8e2f6] bg-white shadow-[0_24px_50px_rgba(30,64,175,0.18)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 pt-6 pb-4 text-center">
                  <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Icon.Check className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0f1f44]">
                    Account Connected
                  </h3>
                  <p className="mt-2 text-sm text-[#5f7298]">
                    Your account has been connected successfully. You can now
                    continue to Partner Login.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-[#e3eaf8] bg-[#fbfdff] px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setWebstoreSyncSuccessOpen(false)}
                    className="rounded-xl border border-[#d6e0f5] bg-white px-4 py-2.5 text-sm font-semibold text-[#2f3f62] hover:bg-[#f7faff]"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWebstoreSyncSuccessOpen(false)
                      router.push("/partner/login")
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] hover:from-[#1d4ed8] hover:to-[#1e40af]"
                  >
                    Go to Partner Login
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {profileRewardModalOpen && (
            <motion.div
              key="profile-reward-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/60 px-3 py-4 backdrop-blur-sm"
              onClick={() => dismissProfileRewardModal()}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 230, damping: 23 }}
                onClick={(event) => event.stopPropagation()}
                className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_rgba(15,23,42,0.25)] dark:bg-slate-950"
              >
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => dismissProfileRewardModal()}
                  className="absolute top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label="Close reward modal"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>

                {/* Confetti dots */}
                {[
                  {
                    className:
                      "absolute left-6 top-10 h-2.5 w-2.5 rounded-full bg-yellow-400",
                    delay: 0,
                  },
                  {
                    className:
                      "absolute left-14 top-6 h-2 w-2 rounded-full bg-emerald-400",
                    delay: 0.15,
                  },
                  {
                    className:
                      "absolute right-20 top-8 h-2 w-2 rounded-full bg-purple-400",
                    delay: 0.08,
                  },
                  {
                    className:
                      "absolute right-8 top-14 h-2.5 w-2.5 rounded-full bg-blue-400",
                    delay: 0.22,
                  },
                  {
                    className:
                      "absolute left-10 top-20 h-1.5 w-1.5 rounded-full bg-pink-400",
                    delay: 0.3,
                  },
                  {
                    className:
                      "absolute right-14 top-20 h-1.5 w-1.5 rounded-full bg-amber-400",
                    delay: 0.1,
                  },
                ].map((dot, i) => (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    className={dot.className}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0.6],
                      scale: [0, 1.2, 1, 1],
                      y: [0, -6, -3, 0],
                    }}
                    transition={{
                      delay: dot.delay,
                      duration: 0.6,
                      ease: "easeOut",
                    }}
                  />
                ))}

                {/* Header */}
                <div className="px-6 pt-10 pb-4 text-center">
                  {/* Checkmark circle */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: 0.1,
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
                  >
                    <svg
                      className="h-8 w-8 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                  <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    Profile Complete!
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    You did it! Your profile is 100% complete.
                  </p>
                </div>

                <div className="px-5 pb-5">
                  {/* Thank-you reward notice */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 12 20 22 4 22 4 12" />
                        <rect x="2" y="7" width="20" height="5" />
                        <line x1="12" y1="22" x2="12" y2="7" />
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                        As a thank you, here&apos;s your reward
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/70">
                        Your rewards have been added to your wallet.
                      </p>
                    </div>
                  </motion.div>

                  {/* Reward cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "E-VOUCHER REWARD",
                        value: "50",
                        unit: "Credits",
                        icon: (
                          <svg
                            className="h-6 w-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <rect
                              x="1"
                              y="4"
                              width="22"
                              height="16"
                              rx="2"
                              ry="2"
                            />
                            <line x1="1" y1="10" x2="23" y2="10" />
                          </svg>
                        ),
                        labelColor: "text-emerald-600 dark:text-emerald-400",
                        iconBg: "bg-emerald-500 text-white",
                        border: "border-slate-200 dark:border-slate-700",
                      },
                      {
                        label: "PV REWARD",
                        value: "20",
                        unit: "Points",
                        icon: (
                          <svg
                            className="h-6 w-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                        ),
                        labelColor: "text-sky-600 dark:text-sky-400",
                        iconBg: "bg-sky-500 text-white",
                        border: "border-slate-200 dark:border-slate-700",
                      },
                    ].map((reward, index) => (
                      <motion.div
                        key={reward.label}
                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          delay: 0.28 + index * 0.1,
                          type: "spring",
                          stiffness: 200,
                          damping: 20,
                        }}
                        className={`flex flex-col items-center rounded-2xl border ${reward.border} bg-white px-4 py-4 shadow-sm dark:bg-slate-900`}
                      >
                        <motion.div
                          className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${reward.iconBg} shadow-md`}
                          animate={{ rotate: [0, -6, 6, 0] }}
                          transition={{
                            delay: 0.5 + index * 0.1,
                            duration: 0.5,
                          }}
                        >
                          {reward.icon}
                        </motion.div>
                        <p
                          className={`text-[10px] font-black tracking-widest uppercase ${reward.labelColor}`}
                        >
                          {reward.label}
                        </p>
                        <motion.p
                          initial={{ scale: 0.7 }}
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{
                            delay: 0.4 + index * 0.1,
                            duration: 0.4,
                          }}
                          className="mt-1 text-4xl font-black text-slate-900 tabular-nums dark:text-white"
                        >
                          {reward.value}
                        </motion.p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                          {reward.unit}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Fine-print note */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      Reward credit is one-time only. You can review your
                      balance and transaction history in the AF-Voucher tab.
                    </p>
                  </motion.div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => dismissProfileRewardModal()}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Maybe Later
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissProfileRewardModal("wallet")}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 dark:shadow-emerald-900/30"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 12 20 22 4 22 4 12" />
                      <rect x="2" y="7" width="20" height="5" />
                      <line x1="12" y1="22" x2="12" y2="7" />
                      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                    </svg>
                    View My Rewards
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isAddressModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/80 p-4 backdrop-blur-md"
              onClick={handleCloseAddressModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18 }}
                className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.24em] text-sky-500 uppercase">
                      Address
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      Add or Update Address
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseAddressModal}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleSaveAddress} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Street / House No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addressForm.address}
                      onChange={(e) =>
                        setAddressForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-sky-600 dark:focus:ring-sky-800/50"
                      placeholder="House no., street, building, unit"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        Region <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={phAddress.regionCode}
                        onChange={(e) => {
                          const option =
                            e.target.options[e.target.selectedIndex]
                          phAddress.setRegion(e.target.value, option.text)
                        }}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-sky-600 dark:focus:ring-sky-800/50 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                      >
                        <option value="">
                          {phAddress.loadingRegions
                            ? "Loading regions..."
                            : "Select Region"}
                        </option>
                        {phAddress.regions.map((region) => (
                          <option key={region.code} value={region.code}>
                            {region.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!phAddress.noProvince ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                          Province <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={phAddress.provinceCode}
                          disabled={
                            !phAddress.regionCode || phAddress.loadingProvinces
                          }
                          onChange={(e) => {
                            const option =
                              e.target.options[e.target.selectedIndex]
                            phAddress.setProvince(e.target.value, option.text)
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="">
                            {phAddress.loadingProvinces
                              ? "Loading provinces..."
                              : "Select Province"}
                          </option>
                          {phAddress.provinces.map((province) => (
                            <option key={province.code} value={province.code}>
                              {province.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                          Province <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={phAddress.address.region}
                          disabled
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-500"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        City / Municipality{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={phAddress.cityCode}
                        disabled={
                          phAddress.noProvince
                            ? !phAddress.regionCode
                            : !phAddress.provinceCode || phAddress.loadingCities
                        }
                        onChange={(e) => {
                          const option =
                            e.target.options[e.target.selectedIndex]
                          phAddress.setCity(e.target.value, option.text)
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">
                          {phAddress.loadingCities || phAddress.loadingProvinces
                            ? "Loading cities..."
                            : "Select City / Municipality"}
                        </option>
                        {phAddress.cities.map((city) => (
                          <option key={city.code} value={city.code}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        Barangay <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={phAddress.address.barangay}
                        disabled={
                          !phAddress.cityCode || phAddress.loadingBarangays
                        }
                        onChange={(e) => phAddress.setBarangay(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">
                          {phAddress.loadingBarangays
                            ? "Loading barangays..."
                            : "Select Barangay"}
                        </option>
                        {phAddress.barangays.map((barangay) => (
                          <option key={barangay.code} value={barangay.name}>
                            {barangay.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        ZIP Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={addressForm.zipCode}
                        onChange={(e) =>
                          setAddressForm((prev) => ({
                            ...prev,
                            zipCode: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-sky-600 dark:focus:ring-sky-800/50 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                        placeholder="ZIP Code"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseAddressModal}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {cropSrc && (
            <AvatarCropModal
              src={cropSrc}
              onConfirm={handleCropConfirm}
              onCancel={handleCropCancel}
            />
          )}

          {isAvatarPreviewOpen && effectiveAvatarViewUrl && (
            <motion.div
              key="avatar-lightbox"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md"
              onClick={() => {
                setIsAvatarPreviewOpen(false)
                setAvatarZoom(1)
              }}
            >
              <motion.div
                initial={{ scale: 0.82, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.82, opacity: 0, y: 16 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="relative flex flex-col items-center gap-3"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => {
                  setAvatarZoom((prev) =>
                    Math.min(4, Math.max(1, prev - e.deltaY * 0.003))
                  )
                }}
              >
                <img
                  src={effectiveAvatarViewUrl}
                  alt={form.name || "Profile photo"}
                  draggable={false}
                  onClick={() =>
                    setAvatarZoom((prev) => (prev >= 2.5 ? 1 : prev + 0.5))
                  }
                  style={{
                    transform: `scale(${avatarZoom})`,
                    transition: "transform 0.22s cubic-bezier(0.32,0.72,0,1)",
                  }}
                  className="max-h-[72vh] max-w-[80vw] cursor-zoom-in rounded-2xl object-contain shadow-2xl select-none"
                />

                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setAvatarZoom((prev) => Math.max(1, prev - 0.5))
                    }
                    className="text-lg leading-none font-bold text-white/70 transition-colors hover:text-white"
                    aria-label="Zoom out"
                  >
                    −
                  </button>
                  <span className="min-w-[3rem] text-center text-sm font-semibold text-white">
                    {Math.round(avatarZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAvatarZoom((prev) => Math.min(4, prev + 0.5))
                    }
                    className="text-lg leading-none font-bold text-white/70 transition-colors hover:text-white"
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                  {avatarZoom > 1 && (
                    <button
                      type="button"
                      onClick={() => setAvatarZoom(1)}
                      className="ml-1 text-xs text-white/50 transition-colors hover:text-white/90"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </motion.div>

              <button
                type="button"
                onClick={() => {
                  setIsAvatarPreviewOpen(false)
                  setAvatarZoom(1)
                }}
                className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
                aria-label="Close"
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
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-white/40 select-none">
                Scroll or click to zoom · Click outside to close
              </p>
            </motion.div>
          )}

          {webstoreReceiptPreview ? (
            <motion.div
              key="webstore-receipt-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[210] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-md"
              onClick={() => setWebstoreReceiptPreview(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 12 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="w-full max-w-4xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur-sm">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-[0.22em] text-white/60 uppercase">
                      Receipt Preview
                    </p>
                    <p className="truncate text-sm font-bold">
                      {webstoreReceiptPreview.name}
                      {webstoreReceiptPreview.urls.length > 1 && (
                        <span className="ml-2 text-xs font-normal text-white/60">
                          {webstoreReceiptPreview.idx + 1} /{" "}
                          {webstoreReceiptPreview.urls.length}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {webstoreReceiptPreview.urls.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setWebstoreReceiptPreview((prev) =>
                              prev && prev.idx > 0
                                ? { ...prev, idx: prev.idx - 1 }
                                : prev
                            )
                          }
                          disabled={webstoreReceiptPreview.idx === 0}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white disabled:opacity-30"
                          aria-label="Previous receipt"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setWebstoreReceiptPreview((prev) =>
                              prev && prev.idx < prev.urls.length - 1
                                ? { ...prev, idx: prev.idx + 1 }
                                : prev
                            )
                          }
                          disabled={
                            webstoreReceiptPreview.idx ===
                            webstoreReceiptPreview.urls.length - 1
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white disabled:opacity-30"
                          aria-label="Next receipt"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setWebstoreReceiptPreview(null)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                      aria-label="Close receipt preview"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4.5 w-4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 18 18 6" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
                  <img
                    src={
                      webstoreReceiptPreview.urls[webstoreReceiptPreview.idx]
                    }
                    alt={`${webstoreReceiptPreview.name} — receipt ${webstoreReceiptPreview.idx + 1}`}
                    className="max-h-[78vh] w-full bg-[#f8fbff] object-contain"
                  />
                </div>
              </motion.div>
            </motion.div>
          ) : null}

          {webstoreReceiptUploadModalOpen ? (
            <motion.div
              key="webstore-receipt-upload-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm"
              onClick={(event) => event.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0.96, y: 18, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.96, y: 18, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                onClick={(event) => event.stopPropagation()}
                className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-sky-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.35)]"
              >
                <button
                  type="button"
                  aria-label="Close"
                  disabled={isSubmittingReceipt}
                  onClick={() => setWebstoreReceiptUploadModalOpen(false)}
                  className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/35 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
                <div className="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-8 text-center text-white md:px-10">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/18">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-9 w-9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
                      <path d="m12 11v5" />
                      <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-black tracking-tight">
                    Upload Payment Receipt
                  </h3>
                  <p className="mt-2 text-sm text-white/90 md:text-base">
                    Please add your receipt images here after downloading the
                    confirmation image.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto bg-white px-5 py-5 md:px-6 md:py-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[#1f3763]">
                      Receipt Upload
                    </label>
                    <div className="rounded-2xl border border-[#d5def1] bg-[#f8fbff] p-4">
                      <input
                        ref={webstoreReceiptInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={isWebstoreReceiptPendingReview}
                        onChange={handleWebstoreReceiptUpload}
                      />
                      <div
                        role="button"
                        tabIndex={isWebstoreReceiptPendingReview ? -1 : 0}
                        onClick={() => {
                          if (isWebstoreReceiptPendingReview) return
                          webstoreReceiptInputRef.current?.click()
                        }}
                        onKeyDown={(event) => {
                          if (isWebstoreReceiptPendingReview) return
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            webstoreReceiptInputRef.current?.click()
                          }
                        }}
                        onDragEnter={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setIsDraggingReceipt(true)
                        }}
                        onDragOver={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setIsDraggingReceipt(true)
                        }}
                        onDragLeave={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setIsDraggingReceipt(false)
                        }}
                        onDrop={
                          isWebstoreReceiptPendingReview
                            ? undefined
                            : handleWebstoreReceiptDrop
                        }
                        className={`rounded-[22px] border border-dashed bg-white p-5 transition outline-none focus-visible:ring-2 focus-visible:ring-sky-100 ${
                          isWebstoreReceiptPendingReview
                            ? "cursor-not-allowed border-[#d9e2f4] bg-[#f7f9fc] opacity-80"
                            : isDraggingReceipt
                              ? "border-[#4f7df0] bg-[#f5f9ff] shadow-[0_0_0_4px_rgba(37,99,235,0.08)]"
                              : "border-[#c6d4f7] hover:border-[#9fb4ef] hover:bg-[#fbfdff]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm font-semibold text-[#163060]">
                              Upload your payment receipt
                            </p>
                            <p className="text-xs text-[#7d8fb0]">
                              Click anywhere to add one or more images.
                            </p>
                            {isWebstoreRequestPendingReview ? (
                              <p className="text-xs font-medium text-sky-700">
                                This webstore request is still under review.
                                Please wait until it is approved or rejected
                                before uploading a new receipt.
                              </p>
                            ) : isWebstoreReceiptPendingReview ? (
                              <p className="text-xs font-medium text-sky-700">
                                The latest receipt is still under review. Please
                                wait until it is approved or rejected before
                                uploading a new receipt.
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-[#eff4ff] px-3 py-1 text-[11px] font-semibold text-[#4968c9]">
                              {isWebstoreReceiptPendingReview
                                ? "Locked while under review"
                                : webstoreReceiptFiles.length > 0
                                  ? `${webstoreReceiptFiles.length} selected`
                                  : "Click to upload"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5">
                          {webstoreReceiptGalleryItems.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {webstoreReceiptGalleryItems.map(
                                (item, index) => (
                                  <div
                                    key={item.key}
                                    onClick={() =>
                                      setWebstoreReceiptPreview({
                                        name: item.name,
                                        urls: [item.src],
                                        idx: 0,
                                      })
                                    }
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault()
                                        setWebstoreReceiptPreview({
                                          name: item.name,
                                          urls: [item.src],
                                          idx: 0,
                                        })
                                      }
                                    }}
                                    className={`overflow-hidden rounded-2xl text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:ring-2 focus:outline-none ${
                                      item.kind === "rejected"
                                        ? "border border-rose-200 bg-rose-50/70 focus:ring-rose-200"
                                        : "border border-[#d5def1] bg-[#f8fbff] focus:ring-sky-200"
                                    }`}
                                  >
                                    <div
                                      className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${
                                        item.kind === "rejected"
                                          ? "border-rose-100 bg-rose-50"
                                          : "border-[#e7eefb]"
                                      }`}
                                    >
                                      <p
                                        className={`truncate text-xs font-semibold ${
                                          item.kind === "rejected"
                                            ? "text-rose-700"
                                            : "text-[#5d739f]"
                                        }`}
                                      >
                                        {item.name}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        {item.kind === "rejected" ? (
                                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-rose-700 uppercase">
                                            Rejected
                                          </span>
                                        ) : null}
                                        {item.kind === "rejected" ? (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation()
                                              setDismissedRejectedReceiptKeys(
                                                (prev) =>
                                                  Array.from(
                                                    new Set([...prev, item.key])
                                                  )
                                              )
                                            }}
                                            className="rounded-full border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                                            aria-label={`Remove rejected receipt ${item.name}`}
                                          >
                                            X
                                          </button>
                                        ) : null}
                                        {item.kind === "selected" ? (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation()
                                              setWebstoreReceiptFiles(
                                                (prev) => {
                                                  const removed =
                                                    prev[
                                                      item.fileIndex ?? index
                                                    ]
                                                  if (
                                                    removed?.preview?.startsWith(
                                                      "blob:"
                                                    )
                                                  )
                                                    URL.revokeObjectURL(
                                                      removed.preview
                                                    )
                                                  return prev.filter(
                                                    (_, itemIndex) =>
                                                      itemIndex !==
                                                      (item.fileIndex ?? index)
                                                  )
                                                }
                                              )
                                            }}
                                            className="rounded-full border border-[#d5def1] bg-white px-2 py-1 text-[11px] font-semibold text-[#355289] hover:bg-[#f6f9ff]"
                                            aria-label={`Remove receipt ${item.name}`}
                                          >
                                            X
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="relative p-3">
                                      <img
                                        src={item.src}
                                        alt={item.name}
                                        className="h-40 w-full rounded-xl bg-white object-contain"
                                      />
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef3ff] text-[#2457e7] shadow-[0_10px_25px_rgba(37,99,235,0.12)]">
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-8 w-8"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M4 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
                                  <path d="m12 11v5" />
                                  <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
                                </svg>
                              </div>
                              <p className="text-sm font-semibold text-[#163060]">
                                No receipt image selected yet.
                              </p>
                              <p className="mt-1 text-xs text-[#7d8fb0]">
                                Drag and drop your receipt here, or click
                                anywhere to select images.
                              </p>
                              <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[#91a0c4]">
                                <span>JPG, PNG, WEBP</span>
                                <span>•</span>
                                <span>Max 10MB each</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-xs text-sky-800">
                      After downloading the confirmation image, upload the
                      receipt here to submit your payment.
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                  <p className="text-xs text-slate-500">
                    Upload your receipt to continue. This window will close
                    automatically after submission.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 transition"
                    >
                      Cannot close yet
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmitWebstoreReceiptUpload()}
                      disabled={
                        isWebstoreReceiptPendingReview ||
                        webstoreReceiptFiles.length === 0 ||
                        isSubmittingReceipt
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingReceipt ? (
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
                          Submitting…
                        </>
                      ) : (
                        "Submit Receipt"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}

          {webstoreSuccessModalOpen ? (
            <motion.div
              key="webstore-success-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm"
              onClick={() => setWebstoreSuccessModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.96, y: 18, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.96, y: 18, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                onClick={(event) => event.stopPropagation()}
                className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-emerald-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.35)]"
              >
                <button
                  type="button"
                  onClick={() => setWebstoreSuccessModalOpen(false)}
                  className="absolute top-4 right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30"
                  aria-label="Close success modal"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>

                <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-8 text-center text-white md:px-10">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/18">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-10 w-10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-black tracking-tight">
                    {isApprovedWebstoreRequest
                      ? "Continuation Payment Confirmed"
                      : "Webstore Payment Success"}
                  </h3>
                  <p className="mt-2 text-sm text-white/90 md:text-base">
                    {isApprovedWebstoreRequest
                      ? "Your continuation payment is confirmed. Download the image, then upload your receipt in the next step."
                      : "Your payment is confirmed. Download the image, then upload your receipt in the next step."}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto bg-white px-5 py-5 md:px-6 md:py-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Checkout ID
                      </p>
                      <p className="mt-1 text-sm font-semibold break-all text-slate-900">
                        {webstorePaymentCheckoutId || webstoreCheckoutId || "-"}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Status
                      </p>
                      <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        {webstorePaymentCompleted ? "Paid" : "Verifying"}
                      </span>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Payment Reference
                      </p>
                      <p className="mt-1 text-sm font-semibold break-all text-slate-900">
                        {webstorePaymentReferenceId || "-"}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Payment Intent
                      </p>
                      <p className="mt-1 text-sm font-semibold break-all text-slate-900">
                        {webstorePaymentIntentId || "-"}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Customer
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {webstoreForm.fullName || "-"}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Email
                      </p>
                      <p className="mt-1 text-sm font-semibold break-all text-slate-900">
                        {webstoreForm.email || "-"}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Plan
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {webstorePlanLabel}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Term
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {webstoreTermLabel}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Payment Method
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {webstorePaymentMethodLabel}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Billing
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {webstoreBillingLabel}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        Subscription Fee
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedWebstoreSubscriptionFee != null
                          ? `PHP ${selectedWebstoreSubscriptionFee.toLocaleString()}`
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        {webstorePaymentBreakdownLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {webstorePaymentBreakdownValue != null
                          ? `PHP ${webstorePaymentBreakdownValue.toLocaleString()}`
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                  <p className="text-xs text-slate-500">
                    You can download this confirmation as a PNG image. For
                    continuation payments, the receipt upload modal opens after
                    download.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const imageFile =
                        await handleDownloadWebstoreSuccessImage()
                      if (imageFile) {
                        processWebstoreReceiptFiles([imageFile])
                      }
                      setWebstoreSuccessModalOpen(false)
                      openWebstoreReceiptUpload()
                    }}
                    className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Download as Image
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>
      {partnerStorefront ? (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>
              Orders from{" "}
              <span className="font-semibold text-slate-800">
                {partnerStorefront.displayName}
              </span>{" "}
              are still processed through AF Home.
            </p>
            {partnerStorefront.notificationEmail ? (
              <p>
                Partner notifications: {partnerStorefront.notificationEmail}
              </p>
            ) : null}
          </div>
        </footer>
      ) : (
        <Footer />
      )}
    </>
  )
}

export default ProfilePage
