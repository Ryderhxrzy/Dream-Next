import { getNavbarCategories } from "@/libs/serverStorefront"
import Link from "next/link"

import Footer from "@/components/layout/Footer"
import Navbar from "@/components/layout/Navbar"
import TopBar from "@/components/layout/TopBar"

export default async function ProductNotFound() {
  const navbarCategories = await getNavbarCategories()
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopBar />
      <Navbar initialCategories={navbarCategories} />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <p className="text-sm font-semibold tracking-wide text-sky-600">
              PRODUCT NOT FOUND
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              This product is unavailable
            </h1>
            <p className="mt-3 text-slate-600">
              The item may be inactive, removed, or the link is incorrect.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/category"
                className="inline-flex items-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
              >
                Browse Products
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
