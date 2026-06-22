import { adminAuthOptions } from "@/libs/adminAuth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import AbandonedCheckoutsView from "@/components/superAdmin/orders/AbandonedCheckoutsView"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Abandoned Checkouts",
  description: "Carts that reached checkout but were never paid.",
  path: "/admin/orders/checkouts",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default async function AbandonedCheckoutsPage() {
  const session = await getServerSession(adminAuthOptions)

  if (!session?.user) {
    redirect("/admin/login")
  }

  return <AbandonedCheckoutsView />
}
