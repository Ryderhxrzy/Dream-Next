"use client"

import { useEffect, useState } from "react"
import { useHeartbeatAdminPresenceMutation } from "@/store/api/adminUsersApi"
import { useGetAdminMeQuery } from "@/store/api/authApi"
import { AnimatePresence, motion } from "framer-motion"
import { signOut, useSession } from "next-auth/react"
import { usePathname } from "next/navigation"

import Header from "./Header"
import Sidebar from "./Sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const isBanned =
    (session?.user as { isBanned?: boolean } | undefined)?.isBanned === true
  const sessionAccessToken = String(
    (session?.user as { accessToken?: string } | undefined)?.accessToken ?? ""
  )
  const adminIdentityKey = sessionAccessToken
    ? `${String((session?.user as { id?: string | number } | undefined)?.id ?? "unknown")}:${sessionAccessToken}`
    : undefined
  const [heartbeatAdminPresence] = useHeartbeatAdminPresenceMutation()

  // Poll /me every 12 seconds — baseQueryWithBanCheck intercepts 401 reason:banned and auto-signs out
  useGetAdminMeQuery(adminIdentityKey, {
    pollingInterval: 12_000,
    skip: isBanned || !sessionAccessToken,
  })

  useEffect(() => {
    if (!sessionAccessToken || isBanned) {
      return
    }

    const currentPath = pathname || "/admin/dashboard"
    void heartbeatAdminPresence({ path: currentPath })

    const intervalId = window.setInterval(() => {
      void heartbeatAdminPresence({ path: currentPath })
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [heartbeatAdminPresence, isBanned, pathname, sessionAccessToken])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-slate-100 p-4 lg:p-6 dark:bg-slate-950">
          {children}
        </main>
      </div>

      {/* ── Ban Overlay ── */}
      <AnimatePresence>
        {isBanned && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-9999 flex items-center justify-center p-4"
            style={{
              backdropFilter: "blur(12px)",
              backgroundColor: "rgba(2, 6, 23, 0.85)",
            }}
          >
            {/* Glow behind card */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.1,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-500/20 bg-slate-900/90 shadow-2xl shadow-black/60"
            >
              {/* Top red accent bar */}
              <div className="h-1 w-full bg-linear-to-r from-red-600 via-red-400 to-red-600" />

              <div className="flex flex-col items-center px-8 py-10 text-center">
                {/* Pulsing lock */}
                <div className="relative mb-7">
                  <motion.div
                    animate={{ scale: [1, 1.07, 1], opacity: [1, 0.85, 1] }}
                    transition={{
                      duration: 2.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex h-24 w-24 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10"
                  >
                    <svg
                      className="h-11 w-11 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </motion.div>
                  {/* Red dot badge */}
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-900 bg-red-500"
                  >
                    <svg
                      className="h-2.5 w-2.5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.span>
                </div>

                {/* Heading */}
                <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">
                  Account Suspended
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-slate-400">
                  Your admin account has been suspended by a Super Admin. You
                  can view this page but you cannot perform any actions.
                </p>

                {/* Info box */}
                <div className="mb-8 w-full space-y-2 rounded-2xl border border-red-500/15 bg-red-500/8 px-5 py-4 text-left">
                  <div className="flex items-start gap-2.5">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-xs leading-relaxed text-red-300/80">
                      To restore access, contact a{" "}
                      <span className="font-semibold text-red-300">
                        Super Admin
                      </span>{" "}
                      and ask them to lift the restriction on your account.
                    </p>
                  </div>
                </div>

                {/* Logged in as */}
                <div className="mb-6 flex w-full items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/15">
                    <svg
                      className="h-4 w-4 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="mb-0.5 text-xs leading-none text-slate-500">
                      Logged in as
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-300">
                      {session?.user?.name ?? "Admin"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>

                {/* Sign out button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-300 transition-all hover:border-slate-500 hover:text-white"
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
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign Out
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DashboardLayout
