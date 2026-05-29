'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  BarChart3,
  Bell,
  Box,
  Building2,
  ChevronDown,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Package,
  Smartphone,
  Users,
  Warehouse,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { clearAccessTokenCache } from '@/store/api/baseApi'

const mainItems = [
  { label: 'Dashboard', href: '/supplier/dashboard', icon: BarChart3 },
  { label: 'Products', href: '/supplier/products', icon: Package },
  { label: 'Orders', href: '/supplier/orders', icon: ClipboardList },
  { label: 'Inventory', href: '/supplier/inventory', icon: Warehouse },
]

const reportItems = [
  { label: 'Order Report', href: '/supplier/reports/orders', icon: ClipboardList },
  { label: 'Delivered Orders', href: '/supplier/reports/delivered', icon: FileText },
]

const mobileAdsItems = [
  { label: 'Home', href: '/supplier/mobile-ads', icon: Home },
  { label: 'Products', href: '/supplier/mobile-ads/products', icon: Package },
  { label: 'Categories', href: '/supplier/mobile-ads/categories', icon: Box },
  { label: 'Push Notifications', href: '/supplier/mobile-ads/notifications', icon: Bell },
]

const settingsItems = [
  { label: 'Categories', href: '/supplier/categories', icon: Box },
  { label: 'Users', href: '/supplier/users', icon: Users },
  { label: 'Company', href: '/supplier/company', icon: Building2 },
]

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'SP'
  )
}

const formatRole = (isMainSupplier: boolean) => {
  return isMainSupplier ? 'Main Supplier' : 'Sub Supplier'
}

export default function SupplierSidebar({
  className = '',
  onClose,
}: {
  className?: string
  onClose?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [openMenus, setOpenMenus] = useState<string[]>([])
  const { data: session } = useSession()

  const supplierName = session?.user?.supplierName || session?.user?.name || 'Supplier'
  const isMainSupplier = Boolean(session?.user?.isMainSupplier)
  const userEmail = session?.user?.email || ''
  const supplierLogo = (session?.user as { supplierLogo?: string | null } | undefined)?.supplierLogo || null
  const displayRole = formatRole(isMainSupplier)

  const toggleMenu = (id: string) =>
    setOpenMenus(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])

  const isActive = (href: string) => pathname === href
  const isChildActive = (items: typeof reportItems) => items.some((item) => pathname === item.href)

  return (
    <aside className={`sticky top-0 h-screen flex w-64 shrink-0 flex-col bg-white/95 dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-700/50 backdrop-blur-xl ${className}`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-3 border-b border-slate-200/80 dark:border-slate-700/50 shrink-0 gap-2">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-cyan-50 ring-1 ring-slate-200 dark:bg-transparent dark:ring-0">
          <Image
            src="/af_home_logo.png"
            alt="AF Home"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 dark:text-white font-bold text-sm leading-none whitespace-nowrap">AF Home</p>
          <p className="text-teal-600 dark:text-teal-400 text-xs mt-0.5">Supplier</p>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white ml-auto">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Profile Card */}
      <div className="px-2 py-3 border-b border-slate-200/80 dark:border-slate-700/50">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-700/50 dark:bg-slate-800/30 p-3">
          {supplierLogo ? (
            <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-sky-100 dark:bg-sky-900/30">
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
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Account</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-900 dark:text-white">{supplierName}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">{displayRole}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollbarColor: 'transparent transparent' }}>
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
        {/* Main Section */}
        <div>
          <div className="flex items-center gap-2 px-2 pb-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Main</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60" />
          </div>
          <div className="space-y-0.5">
            {mainItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 group relative
                    ${active
                      ? 'bg-sky-500 text-white dark:bg-sky-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }
                  `}
                >
                  <span className={`flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-colors ${active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-medium flex-1">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Reports Section */}
        <div>
          <div className="flex items-center gap-2 px-2 pb-1.5 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Analytics</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60" />
          </div>
          <button
            onClick={() => toggleMenu('reports')}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 group relative
              ${isChildActive(reportItems)
                ? 'bg-sky-500 text-white dark:bg-sky-600'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }
            `}
          >
            <span className="flex items-center gap-3 flex-1">
              <span className={`flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-colors ${isChildActive(reportItems) ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                <FileText className="w-5 h-5" />
              </span>
              <span className="font-medium">Reports</span>
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${openMenus.includes('reports') || isChildActive(reportItems) ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {(openMenus.includes('reports') || isChildActive(reportItems)) ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
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
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                          ${active
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                          }
                        `}
                      >
                        <span className="flex items-center justify-center h-6 w-6">
                          <Icon className="w-4 h-4" />
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

        {/* Mobile Section */}
        <div>
          <div className="flex items-center gap-2 px-2 pb-1.5 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Mobile</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60" />
          </div>
          <button
            onClick={() => toggleMenu('mobile')}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 group relative
              ${isChildActive(mobileAdsItems)
                ? 'bg-sky-500 text-white dark:bg-sky-600'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }
            `}
          >
            <span className="flex items-center gap-3 flex-1">
              <span className={`flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-colors ${isChildActive(mobileAdsItems) ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                <Smartphone className="w-5 h-5" />
              </span>
              <span className="font-medium">Mobile Management</span>
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${openMenus.includes('mobile') || isChildActive(mobileAdsItems) ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {(openMenus.includes('mobile') || isChildActive(mobileAdsItems)) ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
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
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                          ${active
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                          }
                        `}
                      >
                        <span className="flex items-center justify-center h-6 w-6">
                          <Icon className="w-4 h-4" />
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

        {/* Settings Section */}
        <div>
          <div className="flex items-center gap-2 px-2 pb-1.5 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Settings</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60" />
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 group relative
                    ${active
                      ? 'bg-sky-500 text-white dark:bg-sky-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }
                  `}
                >
                  <span className={`flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-colors ${active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-medium flex-1">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Footer - Logout */}
      <div className="mt-auto border-t border-slate-200/80 dark:border-slate-700/50 p-3">
        <button
          onClick={async () => {
            clearAccessTokenCache()
            await signOut({ callbackUrl: '/supplier/login' })
          }}
          className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
