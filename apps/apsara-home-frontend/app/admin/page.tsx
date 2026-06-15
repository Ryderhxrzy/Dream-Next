import { adminAuthOptions } from "@/libs/adminAuth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin",
  description: "Browse the Admin page on AF Home.",
  path: "/admin",
  noIndex: true,
})

export default async function AdminIndexPage() {
  const session = await getServerSession(adminAuthOptions)
  const userLevelId = session?.user?.userLevelId

  if (!session?.user) {
    redirect("/admin/login")
  }

  if (userLevelId === 4) {
    redirect("/admin/webpages")
  }

  redirect("/admin/dashboard")
}
