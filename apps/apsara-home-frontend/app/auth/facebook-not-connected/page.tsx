"use client"

import Link from "next/link"

import Footer from "@/components/landing-page/Footer"
import Header from "@/components/landing-page/Header"

export default function FacebookNotConnectedPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Light background section - force header to use dark text */}
      <section className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Force header to use scrolled/dark style by adding the same classes directly */}
        <header className="shadow-soft fixed top-0 right-0 left-0 z-50 bg-white/90 backdrop-blur-md dark:bg-gray-900/90">
          <div className="container mx-auto">
            <div className="flex h-20 items-center justify-between px-4">
              <a href="/" className="flex shrink-0 items-center">
                <img
                  src="/af_home_logo.png"
                  alt="AFhome Logo"
                  className="h-10 md:h-12"
                />
              </a>
              <div className="flex shrink-0 items-center gap-4">
                <a
                  href="/login"
                  className="text-sm font-medium text-gray-700 transition-colors hover:text-amber-500 dark:text-white"
                >
                  Sign In
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Spacer matching fixed header height */}
        <div className="h-20 shrink-0" />

        {/* Vertically centered card */}
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              {/* Error Icon */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>

              {/* Facebook Icon */}
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center">
                <svg className="h-10 w-10" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                </svg>
              </div>

              {/* Title */}
              <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                Facebook Account Not Connected
              </h1>

              {/* Description */}
              <p className="mb-8 text-gray-600 dark:text-gray-300">
                Your Facebook account is not linked to any AF Home account. To
                sign in with Facebook, you need to first link your Facebook
                account to your existing AF Home account.
              </p>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/profile"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                  </svg>
                  Link Facebook Account
                </Link>

                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600"
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
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  Use Email and Password
                </Link>
              </div>

              {/* Help Text */}
              <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  After linking your Facebook account on the profile page, you
                  can sign in with Facebook seamlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer is below the fold — visible only when scrolling */}
      <Footer />
    </div>
  )
}
