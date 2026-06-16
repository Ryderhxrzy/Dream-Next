"use client"

import { useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CreditCard,
  Info,
  LayoutDashboard,
  LayoutTemplate,
  LogIn,
  Monitor,
  Package,
  Palette,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react"

type Step = {
  n: number
  icon: React.ReactNode
  title: string
  description: string
  detail?: string
  badge?: string
  badgeColor?: string
  tips?: string[]
}

type Phase = {
  id: string
  phase: string
  title: string
  subtitle: string
  accentBg: string
  accentText: string
  accentBorder: string
  activePill: string
  numberBg: string
  icon: React.ReactNode
  steps: Step[]
}

const PHASES: Phase[] = [
  {
    id: "request",
    phase: "Phase 1",
    title: "Request Your Webstore",
    subtitle: "Start from your AF Home profile page.",
    accentBg: "bg-blue-50",
    accentText: "text-blue-600",
    accentBorder: "border-blue-200",
    activePill: "bg-blue-600 text-white border-blue-600",
    numberBg: "bg-blue-500",
    icon: <Store className="h-4 w-4" />,
    steps: [
      {
        n: 1,
        icon: <Users className="h-4 w-4" />,
        title: "Go to your Profile → Webstore Tab",
        description:
          'Log in to AF Home and navigate to your Profile. Click the "Webstore" tab to open the Partner Webstore section.',
        tips: [
          "You must be a registered AF Home member to request a webstore.",
        ],
      },
      {
        n: 2,
        icon: <ClipboardList className="h-4 w-4" />,
        title: "Choose a Subscription Plan",
        description:
          "Select from Quarterly (3 months), Semi-Annual (6 months), or Annual (1 year) plans. Each plan has a fixed subscription fee with a lower effective monthly cost for longer terms.",
        tips: ["Annual plans offer the lowest monthly rate."],
      },
      {
        n: 3,
        icon: <Package className="h-4 w-4" />,
        title: "Fill in Your Store Details",
        description:
          "Enter your Full Name, choose a unique Slug Name (this becomes your storefront URL), and set a Username for your partner account.",
        detail:
          "The slug name cannot be changed after approval — choose something that represents your brand.",
        tips: ["Slug format: lowercase letters, numbers, and hyphens only."],
      },
      {
        n: 4,
        icon: <CreditCard className="h-4 w-4" />,
        title: "Select Payment Method & Billing",
        description:
          "Choose your payment method: GCash, GrabPay, Maya, or Card. Then select your billing option — Full Payment or Monthly Installment.",
        tips: [
          "Full payment is required for Quarterly, Semi-Annual, and Annual plans.",
        ],
      },
      {
        n: 5,
        icon: <ReceiptText className="h-4 w-4" />,
        title: "Submit Payment Receipt",
        description:
          "After completing your payment, upload a screenshot or photo of your payment receipt. This will be reviewed by the admin team for verification.",
        detail:
          "Make sure the receipt clearly shows the transaction reference number and amount.",
        tips: [
          "Accepted formats: JPG, PNG.",
          "The reference number on your receipt must match your payment details.",
        ],
      },
    ],
  },
  {
    id: "review",
    phase: "Phase 2",
    title: "Review & Approval",
    subtitle: "The AF Home Super Admin reviews your submission.",
    accentBg: "bg-violet-50",
    accentText: "text-violet-600",
    accentBorder: "border-violet-200",
    activePill: "bg-violet-600 text-white border-violet-600",
    numberBg: "bg-violet-500",
    icon: <ShieldCheck className="h-4 w-4" />,
    steps: [
      {
        n: 6,
        icon: <ShieldCheck className="h-4 w-4" />,
        title: "Admin Receives Your Request",
        description:
          "Your request appears in the Super Admin dashboard under Inquiry → Webstore Requests with a unique Ticket Number. It is initially marked as Pending Review.",
        tips: [
          "You will receive a notification once the admin starts reviewing.",
        ],
      },
      {
        n: 7,
        icon: <BadgeCheck className="h-4 w-4" />,
        title: "Receipt Verification",
        description:
          "The admin checks your plan, billing, payment method, receipt image, and payment reference number. The reference is matched against your actual payment.",
        tips: [
          "If your receipt is rejected, you will be notified and can re-upload.",
          "Common rejection reasons: blurry image, wrong amount, missing reference.",
        ],
      },
      {
        n: 8,
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: "Request Approved",
        description:
          "Once verified and paid, the admin approves your request. Your subscription becomes Active and your storefront is automatically created.",
        badge: "APPROVED",
        badgeColor: "bg-emerald-100 text-emerald-700",
        tips: [
          "Approval typically takes 1–2 business days after receipt submission.",
        ],
      },
    ],
  },
  {
    id: "setup",
    phase: "Phase 3",
    title: "Storefront Setup",
    subtitle: "Your branded partner store is created automatically.",
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-600",
    accentBorder: "border-emerald-200",
    activePill: "bg-emerald-600 text-white border-emerald-600",
    numberBg: "bg-emerald-500",
    icon: <Monitor className="h-4 w-4" />,
    steps: [
      {
        n: 9,
        icon: <Store className="h-4 w-4" />,
        title: "Storefront Automatically Created",
        description:
          "The moment your request is approved, a partner storefront is automatically created using the slug name and display name you provided. No manual setup is needed — it goes live instantly.",
        badge: "AUTO",
        badgeColor: "bg-indigo-100 text-indigo-700",
        tips: ["Your storefront URL is ready as soon as approval is given."],
      },
      {
        n: 10,
        icon: <Users className="h-4 w-4" />,
        title: "Partner Account Auto-Synced",
        description:
          "Your partner user account is automatically synced when the storefront is created. If anything ever gets out of sync, you can trigger a manual re-sync from your profile page.",
        badge: "SYNC",
        badgeColor: "bg-sky-100 text-sky-700",
        tips: [
          'A "Sync Account" button is available on the profile page if you need to re-sync manually.',
        ],
      },
    ],
  },
  {
    id: "portal",
    phase: "Phase 4",
    title: "Partner Portal",
    subtitle: "Log in and start managing your store.",
    accentBg: "bg-amber-50",
    accentText: "text-amber-600",
    accentBorder: "border-amber-200",
    activePill: "bg-amber-500 text-white border-amber-500",
    numberBg: "bg-amber-500",
    icon: <LogIn className="h-4 w-4" />,
    steps: [
      {
        n: 11,
        icon: <LogIn className="h-4 w-4" />,
        title: "Log in to Partner Portal",
        description:
          "Use your partner username and password to sign in to the AF Home Partner Portal. Note: there is a Cloudflare verification step before you can log in.",
        tips: ["Contact admin if you forget your password."],
      },
      {
        n: 12,
        icon: <LayoutDashboard className="h-4 w-4" />,
        title: "Explore the Dashboard",
        description:
          "After logging in, you will see your Partner Dashboard — an overview of your storefront's orders, subscriptions, and key metrics at a glance.",
      },
      {
        n: 13,
        icon: <Palette className="h-4 w-4" />,
        title: "Customize Your Storefront",
        description:
          "Go to Storefronts → Storefront Studio to update your store. Set Identity, Brand Colors, Logo, Favicon, Hero Video, Referral Link, and Shop URL.",
        tips: [
          'Click "Save Storefront" after every change.',
          "Changes are reflected live on your storefront URL.",
        ],
      },
      {
        n: 14,
        icon: <LayoutTemplate className="h-4 w-4" />,
        title: "Build Your Landing Page",
        description:
          "In the Landing Page tab, choose from ready-made templates then customize sections: hero text, images, colors, buttons, and layout. Drag to reorder, click to edit, then save.",
        tips: [
          "You can switch templates at any time.",
          "Add new sections from the right-side panel.",
        ],
      },
      {
        n: 15,
        icon: <ShoppingBag className="h-4 w-4" />,
        title: "Track Your Orders",
        description:
          "In the Orders tab, see all orders placed through your storefront. Filter by status or category to stay on top of sales.",
      },
      {
        n: 16,
        icon: <ReceiptText className="h-4 w-4" />,
        title: "View Subscription Payments",
        description:
          "Under Subscriptions, review all your payment records — plan, billing period, payment method, amount, and receipt.",
      },
      {
        n: 17,
        icon: <Users className="h-4 w-4" />,
        title: "Manage Partner Users",
        description:
          "Add more team members under Partner Users — assign them to your storefront so they can help manage content and orders.",
      },
    ],
  },
  {
    id: "renewal",
    phase: "Phase 5",
    title: "Renewal",
    subtitle: "Keep your storefront active by renewing before expiry.",
    accentBg: "bg-rose-50",
    accentText: "text-rose-600",
    accentBorder: "border-rose-200",
    activePill: "bg-rose-500 text-white border-rose-500",
    numberBg: "bg-rose-500",
    icon: <RefreshCw className="h-4 w-4" />,
    steps: [
      {
        n: 18,
        icon: <RefreshCw className="h-4 w-4" />,
        title: "Renew Your Subscription",
        description:
          'Before your subscription expires, go to the Renewal page in the Partner Portal. Choose a new term, select billing and payment method, then click "Start renewal payment" and upload your receipt.',
        tips: ["Renew early to avoid any downtime on your storefront."],
      },
    ],
  },
]

function StepCard({
  step,
  isOpen,
  onToggle,
  numberBg,
  accentBg,
  accentText,
  accentBorder,
}: {
  step: Step
  isOpen: boolean
  onToggle: () => void
  numberBg: string
  accentBg: string
  accentText: string
  accentBorder: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow ${isOpen ? `${accentBorder} shadow-md` : "border-slate-200"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Number badge */}
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${numberBg}`}
        >
          {step.n}
        </span>

        {/* Icon */}
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accentBg} ${accentText}`}
        >
          {step.icon}
        </span>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-slate-800">{step.title}</p>
          {!isOpen && (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {step.description}
            </p>
          )}
        </div>

        {/* Chevron */}
        <span className="shrink-0 text-slate-400">
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-slate-100 px-4 pt-3 pb-4">
              <p className="text-[13px] leading-relaxed text-slate-600">
                {step.description}
              </p>

              {step.detail && (
                <div
                  className={`flex items-start gap-2.5 rounded-xl border ${accentBorder} ${accentBg} px-3 py-2.5`}
                >
                  <Info
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accentText}`}
                  />
                  <p className={`text-[12px] font-medium ${accentText}`}>
                    {step.detail}
                  </p>
                </div>
              )}

              {step.badge && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${step.badgeColor}`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {step.badge}
                </span>
              )}

              {step.tips && step.tips.length > 0 && (
                <div className="space-y-1.5">
                  {step.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${numberBg}`}
                      />
                      <p className="text-[12px] text-slate-500">{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function WebstoreLearnMore({
  onClose,
}: {
  onClose: () => void
}) {
  const totalSteps = PHASES.reduce((sum, p) => sum + p.steps.length, 0)
  const [openStep, setOpenStep] = useState<string | null>(null)
  const [activePhase, setActivePhase] = useState<string>(PHASES[0].id)

  const phaseRefs = useRef<Record<string, HTMLElement | null>>({})

  const toggleStep = (key: string) =>
    setOpenStep((prev) => (prev === key ? null : key))

  const navigateToPhase = (id: string) => {
    setActivePhase(id)
    phaseRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <div className="fixed inset-0 z-200 flex flex-col overflow-hidden">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-201 mx-auto mt-8 mb-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{ maxHeight: "calc(100vh - 64px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Partner Webstore Guide
                </h2>
                <p className="text-[11px] text-slate-400">
                  {PHASES.length} phases · {totalSteps} steps — from request to
                  live storefront
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Phase navigation pills */}
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigateToPhase(p.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 transition ${
                  activePhase === p.id
                    ? p.activePill
                    : `${p.accentBg} ${p.accentText} ${p.accentBorder} hover:opacity-80`
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-lg ${activePhase === p.id ? "bg-white/20" : ""}`}
                >
                  {p.icon}
                </span>
                <span className="text-[10px] leading-none font-bold">
                  {p.phase}
                </span>
                <span className="max-w-full truncate text-center text-[9px] leading-none font-medium opacity-75">
                  {p.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 scrollbar-none space-y-6 overflow-y-auto px-5 pt-4 pb-6">
          {PHASES.map((phase) => (
            <section
              key={phase.id}
              ref={(el) => {
                phaseRefs.current[phase.id] = el
              }}
              onMouseEnter={() => setActivePhase(phase.id)}
            >
              {/* Phase header */}
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${phase.accentBg} ${phase.accentText} border ${phase.accentBorder}`}
                >
                  {phase.icon}
                </span>
                <div>
                  <p
                    className={`text-[10px] font-extrabold tracking-[0.18em] uppercase ${phase.accentText}`}
                  >
                    {phase.phase}
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {phase.title}
                  </p>
                  <p className="text-[11px] text-slate-400">{phase.subtitle}</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2 border-l-2 border-slate-100 pl-3">
                {phase.steps.map((step) => {
                  const key = `${phase.id}-${step.n}`
                  return (
                    <StepCard
                      key={key}
                      step={step}
                      isOpen={openStep === key}
                      onToggle={() => toggleStep(key)}
                      numberBg={phase.numberBg}
                      accentBg={phase.accentBg}
                      accentText={phase.accentText}
                      accentBorder={phase.accentBorder}
                    />
                  )
                })}
              </div>
            </section>
          ))}

          {/* Footer CTA */}
          <div className="overflow-hidden rounded-2xl bg-linear-to-r from-blue-500 to-indigo-600 p-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Ready to launch?</p>
                <p className="text-xs text-white/75">
                  Request your partner webstore today.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/30"
              >
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
