"use client"

import { useEffect, useRef, useState } from "react"
import { useHeartbeatAdminPresenceMutation } from "@/store/api/adminUsersApi"
import { useGetAdminMeQuery } from "@/store/api/authApi"
import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"

import Header from "./Header"
import Sidebar from "./Sidebar"

interface PartnerDashboardLayoutProps {
  children: React.ReactNode
}

const PartnerDashboardLayout = ({ children }: PartnerDashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [heartbeatAdminPresence] = useHeartbeatAdminPresenceMutation()
  const pathname = usePathname()
  const isBanned =
    (session?.user as { isBanned?: boolean } | undefined)?.isBanned === true
  const sessionAccessToken = String(
    (session?.user as { accessToken?: string } | undefined)?.accessToken ?? ""
  )
  const adminIdentityKey = sessionAccessToken
    ? `${String((session?.user as { id?: string | number } | undefined)?.id ?? "unknown")}:${sessionAccessToken}`
    : undefined

  // Poll /me every 12 seconds
  const { data: meData } = useGetAdminMeQuery(adminIdentityKey, {
    pollingInterval: 12_000,
    skip: isBanned || !sessionAccessToken,
  })

  // Keep a ref of the last known disabled IDs to avoid redundant session updates
  const lastDisabledIdsRef = useRef<string>("")

  useEffect(() => {
    if (!meData) return

    const freshDisabled: number[] = Array.isArray(
      meData.disabled_storefront_ids
    )
      ? meData.disabled_storefront_ids.map(Number).filter(Number.isFinite)
      : []
    const freshStorefrontIds: number[] = Array.isArray(meData.storefront_ids)
      ? meData.storefront_ids.map(Number).filter(Number.isFinite)
      : []

    const disabledKey = [...freshDisabled].sort().join(",")
    if (disabledKey === lastDisabledIdsRef.current) return
    lastDisabledIdsRef.current = disabledKey

    // Sync the NextAuth session with fresh disabled IDs from the server.
    void updateSession({
      disabledStorefrontIds: freshDisabled,
      storefrontIds: freshStorefrontIds,
    })

    // When every assigned storefront is disabled/expired, kick the partner out.
    const allExpired =
      freshStorefrontIds.length > 0 &&
      freshStorefrontIds.every((id) => freshDisabled.includes(id))
    if (allExpired) {
      router.replace("/partner/login?reason=subscription_expired")
    }
  }, [meData, updateSession, router])

  useEffect(() => {
    if (!sessionAccessToken || isBanned) {
      return
    }

    const currentPath = pathname || "/partner/dashboard"

    void heartbeatAdminPresence({ path: currentPath })

    const intervalId = window.setInterval(() => {
      void heartbeatAdminPresence({ path: currentPath })
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [heartbeatAdminPresence, isBanned, sessionAccessToken, pathname])

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
    </div>
  )
}

export default PartnerDashboardLayout
