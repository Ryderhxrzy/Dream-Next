import Image from "next/image"
import Link from "next/link"
import {
  Boxes,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Route,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react"

import { buildPageMetadata } from "@/app/seo"
import Footer from "@/components/landing-page/Footer"
import Navbar from "@/components/layout/Navbar"
import TopBar from "@/components/layout/TopBar"

export const metadata = buildPageMetadata({
  title: "Merchant Partnership",
  description:
    "Review the AF Home merchant partnership scope, pilot status, platform features, and available demo flow.",
  path: "/merchant-partnership",
})

const scopeItems = [
  {
    icon: Store,
    title: "Merchant Onboarding",
    description:
      "Admin-assisted merchant account creation, secure login, company profile setup, user access, and warehouse information.",
  },
  {
    icon: Boxes,
    title: "Catalog Management",
    description:
      "Product creation, image uploads, category mapping, pricing, stock control, variants, bulk import, and approval workflow.",
  },
  {
    icon: ShoppingBag,
    title: "Order Management",
    description:
      "Merchant-facing tools for tracking incoming orders, fulfillment status, product activity, and delivery-related operations.",
  },
  {
    icon: ClipboardList,
    title: "Inquiry Tracking",
    description:
      "Merchant-specific inquiry records with status tracking for new, viewed, responded, and closed customer requests.",
  },
  {
    icon: Megaphone,
    title: "Promotion Channels",
    description:
      "Planned visibility through website storefronts, product pages, partner pages, and mobile app placements.",
  },
  {
    icon: Users,
    title: "Member Network Structure",
    description:
      "Referral and member network reporting designed to support future reach, discovery, and partner growth analysis.",
  },
]

const demoFlow = [
  "Merchant account and dashboard access",
  "Product upload and catalog management",
  "Order and inquiry management flow",
  "Storefront and promotional visibility preview",
  "Roadmap, pilot expectations, and next steps",
]

const roadmap = [
  {
    label: "Current Stage",
    title: "Platform development and internal validation",
    description:
      "Core merchant, catalog, order, inquiry, and storefront flows are being prepared for pilot review.",
  },
  {
    label: "Pilot Stage",
    title: "Early merchant walkthrough and feedback",
    description:
      "Selected partners can review the platform, validate the workflow, and align commercial requirements before public launch.",
  },
  {
    label: "Launch Stage",
    title: "Verified metrics and success reporting",
    description:
      "Traffic, active users, inquiry volume, and partner case studies will be reported after real platform activity is recorded.",
  },
]

export default function MerchantPartnershipPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      <TopBar />
      <Navbar />

      <main>
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <Image
            src="/Images/HeroSection/sofas.jpg"
            alt="AF Home furniture showroom"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-950/88 to-slate-900/50" />
          <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col justify-end px-4 py-14 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
                <Handshake className="h-3.5 w-3.5" />
                Early merchant partnership scope
              </div>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                AF Home Merchant Partnership
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
                A platform overview for merchants who want to evaluate AF
                Home&apos;s upcoming ecommerce, storefront, order, inquiry, and
                partner visibility flow before full public launch.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/merchant-demo"
                  className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
                >
                  View merchant demo
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
                <a
                  href="mailto:afhome.team@gmail.com?subject=AF%20Home%20Merchant%20Partnership%20Demo"
                  className="inline-flex items-center gap-2 rounded-md border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Request walkthrough
                  <CalendarCheck className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-amber-200 bg-amber-50">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
            <div className="flex items-center gap-3 text-amber-900">
              <ShieldCheck className="h-6 w-6" />
              <p className="text-sm font-black uppercase tracking-wider">
                Transparency Note
              </p>
            </div>
            <p className="text-sm leading-7 text-amber-950">
              The platform is currently under development and has not yet been
              fully launched for public merchant activity. Website traffic,
              active users, inquiry volume, and case studies will be shared only
              once verified activity is available. This page presents the pilot
              scope, planned merchant experience, and demo-ready workflow.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-wider text-sky-700">
              Partnership Scope
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              What merchants can review during the pilot
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scopeItems.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <item.icon className="h-7 w-7 text-sky-700" />
                <h3 className="mt-5 text-lg font-black text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white py-14">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-emerald-700">
                Demo Format
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Deck first, live walkthrough next
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                For management review, AF Home can provide a short overview deck
                covering the platform status, merchant benefits, workflow, and
                pilot opportunity. A live demo can follow so decision-makers can
                see the actual merchant experience.
              </p>
            </div>

            <div className="grid gap-3">
              {demoFlow.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-lg border border-slate-200 bg-stone-50 px-5 py-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-950 text-xs font-black text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm font-bold text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
            <div>
              <Route className="h-8 w-8 text-sky-700" />
              <h2 className="mt-4 text-3xl font-black tracking-tight">
                Development roadmap
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The offer is best positioned as an early partner or pilot
                opportunity. Performance reporting becomes available after
                launch, once real usage can be measured.
              </p>
            </div>
            <div className="grid gap-4">
              {roadmap.map((item) => (
                <article
                  key={item.label}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-sky-700">
                    {item.label}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-sky-300">
                Evaluation Ready
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                Suggested next step for interested merchants
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                Schedule a walkthrough, review the pilot scope, and align the
                exact metrics management wants to see once the platform begins
                collecting verified activity.
              </p>
            </div>
            <div className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-5">
              {[
                "No unverified traffic or user claims",
                "Clear development and pilot status",
                "Demo-ready merchant workflow",
                "Verified reporting after launch",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                  <span className="text-sm font-semibold text-white/82">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
