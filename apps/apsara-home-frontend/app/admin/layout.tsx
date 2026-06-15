"use client"

import { SessionProvider } from "next-auth/react"
import { usePathname } from "next/navigation"

import DashboardLayout from "@/components/superAdmin/DashboardLayout"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  if (pathname === "/admin/login") {
    return (
      <SessionProvider basePath="/api/admin/auth">{children}</SessionProvider>
    )
  }

  return (
    <SessionProvider basePath="/api/admin/auth">
      <DashboardLayout>{children}</DashboardLayout>
    </SessionProvider>
  )
}
