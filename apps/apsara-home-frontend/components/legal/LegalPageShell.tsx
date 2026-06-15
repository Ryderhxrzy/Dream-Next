import type { ReactNode } from "react"
import { getNavbarCategories } from "@/libs/serverStorefront"
import Link from "next/link"

import Footer from "@/components/landing-page/Footer"
import Navbar from "@/components/layout/Navbar"
import TopBar from "@/components/layout/TopBar"

type LegalPageShellProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export default async function LegalPageShell({
  title,
  subtitle,
  children,
}: LegalPageShellProps) {
  const navbarCategories = await getNavbarCategories()
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 dark:bg-gray-950 dark:text-white">
      <TopBar />
      <Navbar initialCategories={navbarCategories} />

      {/* Page header band */}
      <div className="border-b border-slate-200 bg-slate-100 pt-8 pb-8 dark:border-slate-700 dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Link
              href="/shop"
              className="transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            >
              Home
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{title}</span>
          </nav>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl dark:text-white">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base dark:text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="py-12">
        <div className="container mx-auto px-4">
          <div className="prose prose-slate dark:prose-invert prose-headings:scroll-mt-24 prose-h2:text-xl prose-h2:font-semibold prose-h2:tracking-tight prose-p:leading-7 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-li:leading-6 prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-a:text-sky-600 hover:prose-a:text-sky-500 prose-strong:text-slate-800 dark:prose-strong:text-slate-100 max-w-none">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
