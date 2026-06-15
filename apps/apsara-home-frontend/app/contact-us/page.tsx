import { Mail, MapPin, Phone } from "lucide-react"
import Link from "next/link"

import Footer from "@/components/landing-page/Footer"
import Navbar from "@/components/layout/Navbar"
import TopBar from "@/components/layout/TopBar"
import { buildPageMetadata } from "@/app/seo"

import ContactForm from "./ContactForm"

export const metadata = buildPageMetadata({
  title: "Contact Us",
  description:
    "Get in touch with AF Home. Reach out for product inquiries, order support, or general questions.",
  path: "/contact-us",
})

const branches = [
  {
    name: "AF Home Head Office",
    label: "Meycauayan — Main Office",
    address: "50 Altoveros St., Corner Bagbaguin Road, Meycauayan, Bulacan",
    phone: "0917 638 8535",
  },
  {
    name: "AF Home Factory Outlet",
    label: "Antipolo City",
    address:
      "9023 Joyous Heights Subd New York Street Hinapao Barangay San Jose Antipolo City",
    phone: "0967 055 0854",
  },
  {
    name: "AF Home SM City North Edsa",
    label: "Quezon City",
    address:
      "Interior Zone, SM City North EDSA, Bagong Pag-asa, Quezon City, Metro Manila",
    phone: "0917 128 1921",
  },
  {
    name: "AF Home Factory Outlet",
    label: "San Pedro, Laguna",
    address:
      "KM 29 MMG Fojas Compound Brgy. San Antonio, San Pedro, Philippines",
    phone: "0917 128 1921",
  },
  {
    name: "AF Home Store",
    label: "SM Dasmariñas",
    address:
      "KM 29 MMG Fojas Compound Brgy. San Antonio, San Pedro, Philippines",
    phone: "0917 128 1921",
  },
  {
    name: "AF Home La Loma",
    label: "Quezon City",
    address:
      "KM 29 MMG Fojas Compound Brgy. San Antonio, San Pedro, Philippines",
    phone: "0917 128 1921",
  },
]

const quickStats = [
  { label: "Response Time", value: "Within 24 hrs" },
  { label: "Branches", value: `${branches.length} Locations` },
  { label: "Support", value: "Mon – Sat" },
]

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <TopBar />
      <Navbar />

      {/* Hero */}
      <div className="bg-linear-to-br from-sky-500 to-cyan-600 text-white">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <nav className="mb-5 flex items-center gap-1.5 text-xs text-white/60">
            <Link href="/shop" className="transition-colors hover:text-white">
              Home
            </Link>
            <span>/</span>
            <span className="text-white/90">Contact Us</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <Mail className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-widest uppercase opacity-70">
                  AF Home · Support
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
                  We&apos;re here to help.
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                  Share your questions, project ideas, or concerns and our team
                  will get back to you as soon as possible.
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3">
              {quickStats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-white/15 px-4 py-2.5 text-center"
                >
                  <p className="text-sm font-bold">{s.value}</p>
                  <p className="text-[10px] font-medium opacity-70">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-2 xl:gap-14">
          {/* Left — Contact form */}
          <div className="space-y-5">
            {/* Form header card */}
            <div className="overflow-hidden rounded-2xl border border-sky-200 bg-linear-to-br from-sky-50 to-cyan-50 p-5 dark:border-sky-900/40 dark:from-sky-950/30 dark:to-cyan-950/30">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Send us a message
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Tell us what you need and we&apos;ll reply with the best
                    next step. For urgent concerns, call a branch directly.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <ContactForm />
            </div>

            {/* Support contacts */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  <Phone className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Direct Support Contacts
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="px-5 py-4">
                  <p className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                    General Support
                  </p>
                  <a
                    href="mailto:afhome.team@gmail.com"
                    className="flex items-center gap-2.5 text-sm font-medium text-slate-700 transition-colors hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-sky-500" />
                    afhome.team@gmail.com
                  </a>
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                    We typically respond within 24 hours.
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                    Interior Projects &amp; Business
                  </p>
                  <div className="space-y-2">
                    <a
                      href="mailto:corpsol.apsara@gmail.com"
                      className="flex items-center gap-2.5 text-sm font-medium text-slate-700 transition-colors hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-sky-500" />
                      corpsol.apsara@gmail.com
                    </a>
                    <a
                      href="tel:09171623056"
                      className="flex items-center gap-2.5 text-sm font-medium text-slate-700 transition-colors hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-sky-500" />
                      0917 162 3056
                    </a>
                    <a
                      href="tel:09171282559"
                      className="flex items-center gap-2.5 text-sm font-medium text-slate-700 transition-colors hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-sky-500" />
                      0917 128 2559
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Branches */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                <MapPin className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Our Branches
              </h2>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                {branches.length} locations
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {branches.map((branch) => (
                <div
                  key={branch.name + branch.label}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-sky-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition group-hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {branch.name}
                      </p>
                      <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {branch.label}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="leading-relaxed">{branch.address}</span>
                    </div>
                    <a
                      href={`tel:${branch.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-2 text-xs font-medium text-slate-600 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {branch.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
