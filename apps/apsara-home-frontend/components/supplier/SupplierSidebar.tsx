"use client"

import { useState } from "react"
import { clearAccessTokenCache } from "@/store/api/baseApi"
import {
  useGetSupplierCategoriesQuery,
  useGetSupplierMeQuery,
} from "@/store/api/suppliersApi"
import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  Bell,
  BookOpen,
  Box,
  Building2,
  ChevronDown,
  ClipboardList,
  FileText,
  Home,
  Inbox,
  LogOut,
  MessageSquare,
  Package,
  Smartphone,
  TicketPercent,
  Users,
  Warehouse,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const mainItems = [
  { label: "Dashboard", href: "/supplier/dashboard", icon: BarChart3 },
  { label: "Chats", href: "/supplier/chat", icon: MessageSquare },
  { label: "Products", href: "/supplier/products", icon: Package },
  { label: "Vouchers", href: "/supplier/vouchers", icon: TicketPercent },
  { label: "Orders", href: "/supplier/orders", icon: ClipboardList },
  { label: "Inventory", href: "/supplier/inventory", icon: Warehouse },
  { label: "Catalogue", href: "/supplier/catalogue", icon: BookOpen },
]

const servicesMainItems = [
  { label: "Dashboard", href: "/supplier/dashboard", icon: BarChart3 },
  { label: "Chats", href: "/supplier/chat", icon: MessageSquare },
  { label: "Inquiry", href: "/supplier/orders", icon: Inbox },
  { label: "Services", href: "/supplier/products", icon: Package },
]

const reportItems = [
  {
    label: "Order Report",
    href: "/supplier/reports/orders",
    icon: ClipboardList,
  },
  {
    label: "Delivered Orders",
    href: "/supplier/reports/delivered",
    icon: FileText,
  },
]

const mobileAdsItems = [
  { label: "Home", href: "/supplier/mobile-ads", icon: Home },
  { label: "Products", href: "/supplier/mobile-ads/products", icon: Package },
  { label: "Categories", href: "/supplier/mobile-ads/categories", icon: Box },
  {
    label: "Push Notifications",
    href: "/supplier/mobile-ads/notifications",
    icon: Bell,
  },
]

const settingsItems = [
  { label: "Categories", href: "/supplier/categories", icon: Box },
  { label: "Users", href: "/supplier/users", icon: Users },
  { label: "Company", href: "/supplier/company", icon: Building2 },
  // Warehouse icon added (still simple nav for now)
  { label: "Warehouse", href: "/supplier/warehouse", icon: Warehouse },
]

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

const formatRole = (isMainSupplier: boolean) => {
  return isMainSupplier ? "Main Supplier" : "Sub Supplier"
}

export default function SupplierSidebar({
  className = "",
  onClose,
}: {
  className?: string
  onClose?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [openMenus, setOpenMenus] = useState<string[]>([])
  const { data: session } = useSession()

  const supplierName =
    session?.user?.supplierName || session?.user?.name || "Supplier"
  const isMainSupplier = Boolean(session?.user?.isMainSupplier)
  const displayRole = formatRole(isMainSupplier)

  const { data: supplierMe } = useGetSupplierMeQuery(undefined, {
    skip: !session,
  })
  const supplierLogo = supplierMe?.supplier_logo ?? null

  const supplierId = Number(session?.user?.supplierId ?? 0)
  const { data: supplierCategoriesData } = useGetSupplierCategoriesQuery(
    supplierId,
    {
      skip: !session || supplierId <= 0,
    }
  )
  const isServicesView = (supplierCategoriesData?.categories ?? []).some(
    (c) => c.name.toLowerCase() === "services"
  )
  const visibleMainItems = isServicesView ? servicesMainItems : mainItems

  const toggleMenu = (id: string) =>
    setOpenMenus((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )

  const navigateTo = (href: string) => {
    onClose?.()

    if (href === "/supplier/vouchers") {
      window.location.assign(href)
      return
    }

    router.push(href)
  }

  const isActive = (href: string) => pathname === href
  const isChildActive = (items: typeof reportItems) =>
    items.some((item) => pathname === item.href)

  return (
    <aside
      className={`sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900 ${className}`}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/80 px-3 dark:border-slate-700/50">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-orange-50 to-cyan-50 ring-1 ring-slate-200 dark:bg-transparent dark:ring-0">
          <Image
            src="/af_home_logo.png"
            alt="AF Home"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-none font-bold whitespace-nowrap text-slate-900 dark:text-white">
            AF Home
          </p>
          <p className="mt-0.5 text-xs text-teal-600 dark:text-teal-400">
            Supplier
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-slate-400 hover:text-slate-900 lg:hidden dark:hover:text-white"
        >
          <svg
            className="h-5 w-5"
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

      {/* Profile Card */}
      <div className="border-b border-slate-200/80 px-2 py-3 dark:border-slate-700/50">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-700/50 dark:bg-slate-800/30">
          {supplierLogo ? (
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Image
                src={supplierLogo}
                alt={supplierName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-xs font-bold text-white">
              {getInitials(supplierName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
              Account
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-900 dark:text-white">
              {supplierName}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {displayRole}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-0 overflow-y-auto px-2 py-3"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollbarColor: "transparent transparent",
        }}
      >
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
        {/* Main Section */}
        <div>
          <div className="flex items-center gap-2 px-2 pt-1 pb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
              Main
            </span>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700/60" />
          </div>
          <div className="space-y-0.5">
            {visibleMainItems.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon as React.ComponentType<{
                className?: string
              }>
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault()
                    navigateTo(item.href)
                  }}
                  className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                    active
                      ? "bg-sky-500 text-white dark:bg-sky-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  } `}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      active
                        ? "bg-white/20"
                        : "bg-slate-100 group-hover:bg-slate-200 dark:bg-slate-800 dark:group-hover:bg-slate-700"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1 font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Reports Section — hidden for services suppliers */}
        {!isServicesView && (
          <div>
            <div className="flex items-center gap-2 px-2 pt-4 pb-1.5">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                Analytics
              </span>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700/60" />
            </div>
            <button
              onClick={() => toggleMenu("reports")}
              className={`group relative flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                isChildActive(reportItems)
                  ? "bg-sky-500 text-white dark:bg-sky-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              } `}
            >
              <span className="flex flex-1 items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${isChildActive(reportItems) ? "bg-white/20" : "bg-slate-100 group-hover:bg-slate-200 dark:bg-slate-800 dark:group-hover:bg-slate-700"}`}
                >
                  <FileText className="h-5 w-5" />
                </span>
                <span className="font-medium">Reports</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openMenus.includes("reports") || isChildActive(reportItems) ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {openMenus.includes("reports") || isChildActive(reportItems) ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5 pl-2">
                    {reportItems.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => onClose?.()}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                            active
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          } `}
                        >
                          <span className="flex h-6 w-6 items-center justify-center">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )}

        {/* Mobile Section — hidden for services suppliers */}
        {!isServicesView && (
          <div>
            <div className="flex items-center gap-2 px-2 pt-4 pb-1.5">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                Mobile
              </span>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700/60" />
            </div>
            <button
              onClick={() => toggleMenu("mobile")}
              className={`group relative flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                isChildActive(mobileAdsItems)
                  ? "bg-sky-500 text-white dark:bg-sky-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              } `}
            >
              <span className="flex flex-1 items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${isChildActive(mobileAdsItems) ? "bg-white/20" : "bg-slate-100 group-hover:bg-slate-200 dark:bg-slate-800 dark:group-hover:bg-slate-700"}`}
                >
                  <Smartphone className="h-5 w-5" />
                </span>
                <span className="font-medium">Mobile Management</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openMenus.includes("mobile") || isChildActive(mobileAdsItems) ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {openMenus.includes("mobile") || isChildActive(mobileAdsItems) ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5 pl-2">
                    {mobileAdsItems.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => onClose?.()}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                            active
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          } `}
                        >
                          <span className="flex h-6 w-6 items-center justify-center">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )}

        {/* Settings Section */}
        <div>
          <div className="flex items-center gap-2 px-2 pt-4 pb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
              Settings
            </span>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700/60" />
          </div>
          <div className="space-y-0.5">
            {settingsItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                    active
                      ? "bg-sky-500 text-white dark:bg-sky-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  } `}
                >
                  {item.icon && (
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? "bg-white/20" : "bg-slate-100 group-hover:bg-slate-200 dark:bg-slate-800 dark:group-hover:bg-slate-700"}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  )}
                  <span className="flex-1 font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Footer - Logout */}
      <div className="mt-auto border-t border-slate-200/80 p-3 dark:border-slate-700/50">
        <button
          onClick={async () => {
            clearAccessTokenCache()
            await signOut({ callbackUrl: "/supplier/login" })
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
