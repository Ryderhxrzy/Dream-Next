"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { SessionProvider, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import PartnerDashboardLayout from "@/components/partner/DashboardLayout"

function PartnerRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === "loading") return
    if (pathname === "/partner/login") return

    if (status !== "authenticated") {
      router.replace("/partner/login")
    }
  }, [pathname, router, status])

  if (pathname !== "/partner/login" && status !== "authenticated") {
    return null
  }

  return <PartnerDashboardLayout>{children}</PartnerDashboardLayout>
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  if (pathname === "/partner/login") {
    return (
      <SessionProvider basePath="/api/partner/auth">{children}</SessionProvider>
    )
  }

  return (
    <SessionProvider basePath="/api/partner/auth">
      <PartnerRouteGuard>{children}</PartnerRouteGuard>
    </SessionProvider>
  )
}
