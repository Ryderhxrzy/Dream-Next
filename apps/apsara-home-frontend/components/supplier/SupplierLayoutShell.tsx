"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { sendSupplierPresenceHeartbeat } from "@/libs/supplierChat"
import { clearAccessTokenCache } from "@/store/api/baseApi"
import {
  useGetSupplierOrderNotificationsQuery,
  type SupplierNotificationItem,
} from "@/store/api/supplierOrdersApi"
import { useGetSupplierMeQuery } from "@/store/api/suppliersApi"
import { AnimatePresence, motion } from "framer-motion"
import { Bell, LogOut, Menu, MoonStar, Sparkles, SunMedium } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"

import { useSupplierRealtimeOrders } from "@/hooks/useSupplierRealtimeOrders"

import SupplierSidebar from "./SupplierSidebar"

const SUPPLIER_NOTIFICATION_DURATION = 10

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SP"
  )
}

export default function SupplierLayoutShell({
  children,
}: {
  children: React.ReactNode
}) {
  // Presence heartbeat — fires every 30s while supplier is logged in anywhere in the app
  useEffect(() => {
    void sendSupplierPresenceHeartbeat()
    const id = setInterval(() => void sendSupplierPresenceHeartbeat(), 30_000)
    return () => clearInterval(id)
  }, [])

  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readNotificationKeys, setReadNotificationKeys] = useState<string[]>([])
  const [realtimeNotification, setRealtimeNotification] =
    useState<SupplierNotificationItem | null>(null)
  const { data: session, status } = useSession()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  const accessToken = (session?.user as { accessToken?: string } | undefined)
    ?.accessToken
  const supplierId = (
    session?.user as { supplierId?: number | null } | undefined
  )?.supplierId

  const { data: supplierMe } = useGetSupplierMeQuery(undefined, {
    skip: status !== "authenticated",
  })
  const supplierLogo = supplierMe?.supplier_logo ?? null

  const supplierName =
    session?.user?.supplierName || session?.user?.name || "Supplier Account"
  const isMainSupplier = Boolean(session?.user?.isMainSupplier)
  const isDark = resolvedTheme === "dark"
  const notificationStorageKey = useMemo(
    () =>
      `afhome:supplier-notifications:read:${session?.user?.email ?? supplierName}`,
    [session?.user?.email, supplierName]
  )
  const {
    data: notificationsData,
    isFetching: isNotificationsFetching,
    isError: isNotificationsError,
    refetch: refetchNotifications,
  } = useGetSupplierOrderNotificationsQuery(undefined, {
    skip: status !== "authenticated",
    pollingInterval: 60000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })

  const handleRealtimeNotification = useCallback(
    (item: SupplierNotificationItem) => {
      setRealtimeNotification(item)
    },
    []
  )

  useSupplierRealtimeOrders({
    accessToken,
    supplierId,
    onNotification: refetchNotifications,
    onRealtimeNotification: handleRealtimeNotification,
  })

  useEffect(() => {
    if (!realtimeNotification) return
    const id = window.setTimeout(
      () => setRealtimeNotification(null),
      SUPPLIER_NOTIFICATION_DURATION * 1000
    )
    return () => window.clearTimeout(id)
  }, [realtimeNotification])

  const storedReadNotificationKeys = useMemo(() => {
    if (typeof window === "undefined") return []

    try {
      const stored = window.localStorage.getItem(notificationStorageKey)
      if (!stored) return []

      const parsed = JSON.parse(stored)
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === "string")
        : []
    } catch {
      return []
    }
  }, [notificationStorageKey])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const merged = Array.from(
        new Set([...storedReadNotificationKeys, ...readNotificationKeys])
      )
      window.localStorage.setItem(
        notificationStorageKey,
        JSON.stringify(merged)
      )
    } catch {
      // Ignore localStorage write failures.
    }
  }, [notificationStorageKey, readNotificationKeys, storedReadNotificationKeys])

  const getNotificationReadKey = (item: {
    id: string
    updated_at?: string | null
  }) => `${item.id}:${item.updated_at ?? ""}`
  const getNotificationTimestamp = (value?: string | null) => {
    if (!value) return 0
    const timestamp = new Date(value).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  const notifications = useMemo(() => {
    const items = notificationsData?.items ?? []
    const mergedReadKeys = new Set([
      ...storedReadNotificationKeys,
      ...readNotificationKeys,
    ])
    return [...items].sort((a, b) => {
      const aRead = mergedReadKeys.has(getNotificationReadKey(a)) ? 1 : 0
      const bRead = mergedReadKeys.has(getNotificationReadKey(b)) ? 1 : 0
      if (aRead !== bRead) return aRead - bRead
      return (
        getNotificationTimestamp(b.updated_at) -
        getNotificationTimestamp(a.updated_at)
      )
    })
  }, [
    notificationsData?.items,
    readNotificationKeys,
    storedReadNotificationKeys,
  ])

  const unreadNotificationCount = useMemo(() => {
    const mergedReadKeys = new Set([
      ...storedReadNotificationKeys,
      ...readNotificationKeys,
    ])
    return notifications.reduce((total, item) => {
      const isRead = mergedReadKeys.has(getNotificationReadKey(item))
      return isRead ? total : total + Math.max(1, item.count ?? 0)
    }, 0)
  }, [notifications, readNotificationKeys, storedReadNotificationKeys])

  const formatNotificationTime = (value?: string | null) => {
    if (!value) return ""
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ""
    return parsed.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  useEffect(() => {
    if (status !== "unauthenticated") return

    clearAccessTokenCache()
    router.replace("/supplier/login?session=expired")
  }, [router, status])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen bg-[linear-gradient(180deg,#f6fbff_0%,#eef4fb_42%,#edf2f7_100%)] dark:bg-[radial-gradient(circle_at_top,#14263a_0%,#09111d_42%,#050914_100%)]">
        <div className="hidden w-64 shrink-0 lg:block" />
        <div className="flex flex-1 flex-col">
          <div className="h-18.25 border-b border-white/55 bg-white/70 backdrop-blur-2xl dark:border-white/8 dark:bg-slate-950/45" />
          <div className="flex-1 px-4 py-5 lg:px-8 lg:py-7" />
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f6fbff_0%,#eef4fb_42%,#edf2f7_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,#14263a_0%,#09111d_42%,#050914_100%)] dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -top-16 -left-28 h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-16 -right-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl dark:bg-indigo-500/10" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <SupplierSidebar className="hidden lg:flex" />

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 left-0 z-40 w-80 lg:hidden"
            >
              <SupplierSidebar
                className="h-full w-full"
                onClose={() => setMenuOpen(false)}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 lg:gap-4">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                  AF Home / Merchant
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {supplierName}
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-slate-600 uppercase dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {isMainSupplier ? "Main Merchant" : "Sub Merchant"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-3">
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label="Toggle theme"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                {isDark ? (
                  <SunMedium className="h-4 w-4" />
                ) : (
                  <MoonStar className="h-4 w-4" />
                )}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const nextOpen = !notificationsOpen
                    setNotificationsOpen(nextOpen)

                    if (!nextOpen || !notifications.length) return

                    setReadNotificationKeys((current) => {
                      const next = new Set(current)
                      notifications.forEach((item) =>
                        next.add(getNotificationReadKey(item))
                      )
                      return Array.from(next)
                    })
                  }}
                  aria-label="Notifications"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationCount > 0 ? (
                    <span className="absolute top-2.5 right-2.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] leading-none font-bold text-white ring-2 ring-white dark:ring-slate-950">
                      {unreadNotificationCount > 9
                        ? "9+"
                        : unreadNotificationCount}
                    </span>
                  ) : null}
                </button>

                <AnimatePresence>
                  {notificationsOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-[calc(100%+0.6rem)] right-0 z-30 w-[340px] overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-slate-200/60 dark:border-white/8 dark:bg-slate-900 dark:shadow-black/40"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                          <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                            Notifications
                          </span>
                          {unreadNotificationCount > 0 && (
                            <span className="inline-flex items-center rounded-full bg-cyan-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
                              {unreadNotificationCount > 9
                                ? "9+"
                                : unreadNotificationCount}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/8 dark:hover:text-slate-200"
                        >
                          <svg
                            className="h-3.5 w-3.5"
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
                      </div>

                      <div className="border-t border-slate-100 dark:border-white/6" />

                      {/* Body */}
                      <div className="max-h-[360px] overflow-y-auto">
                        {isNotificationsFetching ? (
                          <div className="flex items-center gap-2.5 px-4 py-5 text-xs text-slate-400 dark:text-slate-500">
                            <svg
                              className="h-3.5 w-3.5 animate-spin text-cyan-500"
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
                            Loading notifications…
                          </div>
                        ) : isNotificationsError ? (
                          <div className="flex items-center gap-2 px-4 py-5 text-xs text-rose-500 dark:text-rose-400">
                            <svg
                              className="h-3.5 w-3.5 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="12" r="10" strokeWidth="2" />
                              <path
                                strokeLinecap="round"
                                strokeWidth="2"
                                d="M12 8v4m0 4h.01"
                              />
                            </svg>
                            Could not load notifications right now.
                          </div>
                        ) : notifications.length ? (
                          <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {notifications.map((item) => {
                              const isRead = new Set([
                                ...storedReadNotificationKeys,
                                ...readNotificationKeys,
                              ]).has(getNotificationReadKey(item))

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setNotificationsOpen(false)
                                    router.push(item.href)
                                  }}
                                  className={`group w-full px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/4 ${
                                    !isRead
                                      ? "bg-cyan-50/60 dark:bg-cyan-500/5"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Icon dot */}
                                    <div className="relative mt-1 shrink-0">
                                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-500/15">
                                        <Bell className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                                      </div>
                                      {!isRead && (
                                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-white dark:ring-slate-900" />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-1 text-[12.5px] leading-snug font-semibold text-slate-800 dark:text-slate-100">
                                        {item.title}
                                      </p>
                                      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                                        {item.description}
                                      </p>
                                      <div className="mt-1.5 flex items-center gap-2">
                                        <span className="text-[10.5px] text-slate-400 dark:text-slate-500">
                                          {formatNotificationTime(
                                            item.updated_at
                                          ) || "Recent"}
                                        </span>
                                        {item.count > 1 && (
                                          <span className="rounded-full bg-cyan-100 px-1.5 py-px text-[10px] font-semibold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">
                                            +{item.count}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
                              <Bell className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                            </div>
                            <p className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400">
                              No notifications yet
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                              New orders will appear here.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <>
                          <div className="border-t border-slate-100 dark:border-white/6" />
                          <div className="px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setNotificationsOpen(false)
                                router.push("/supplier/orders")
                              }}
                              className="w-full rounded-xl py-2 text-center text-[12px] font-medium text-cyan-600 transition hover:bg-cyan-50 hover:text-cyan-700 dark:text-cyan-400 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
                            >
                              View all orders →
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={async () => {
                  clearAccessTokenCache()
                  await signOut({ callbackUrl: "/supplier/login" })
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                {supplierLogo ? (
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-slate-800">
                    <Image
                      src={supplierLogo}
                      alt={supplierName}
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-[9px] font-bold text-white">
                    {getInitials(supplierName)}
                  </span>
                )}
                <span className="hidden max-w-20 truncate sm:block">
                  {supplierName}
                </span>
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {realtimeNotification && (
              <motion.div
                key={realtimeNotification.id}
                initial={{ opacity: 0, x: 36, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 36, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.35}
                onDragEnd={(_, info) => {
                  if (
                    Math.abs(info.offset.x) > 90 ||
                    Math.abs(info.velocity.x) > 550
                  ) {
                    setRealtimeNotification(null)
                  }
                }}
                className="fixed right-3 bottom-4 z-130 w-[calc(100vw-1.5rem)] max-w-sm sm:right-5 sm:bottom-5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setRealtimeNotification(null)
                    router.push(realtimeNotification.href)
                  }}
                  className="block w-full overflow-hidden rounded-2xl border border-cyan-200/80 bg-white text-left shadow-2xl ring-1 shadow-slate-900/15 ring-cyan-100/70 transition hover:-translate-y-0.5 hover:shadow-cyan-900/15 dark:border-cyan-800/60 dark:bg-slate-900 dark:ring-cyan-900/30"
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-500/10">
                      <Bell className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {realtimeNotification.title}
                        </p>
                        <span className="shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-cyan-700 uppercase dark:bg-cyan-900/40 dark:text-cyan-300">
                          New
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {realtimeNotification.description}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                        View order
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRealtimeNotification(null)
                      }}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      aria-label="Dismiss notification"
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
                  </div>
                  <div className="h-1 bg-slate-100 dark:bg-slate-800">
                    <motion.div
                      className="h-full origin-left bg-linear-to-r from-cyan-400 via-teal-400 to-sky-400"
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: 0 }}
                      transition={{
                        duration: SUPPLIER_NOTIFICATION_DURATION,
                        ease: "linear",
                      }}
                    />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
