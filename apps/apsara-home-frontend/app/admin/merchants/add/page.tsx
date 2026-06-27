import { adminAuthOptions } from "@/libs/adminAuth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import AddMerchantPageMain from "@/components/superAdmin/suppliers/AddMerchantPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Add Merchant",
  description: "Create a new merchant and optionally invite the owner login.",
  path: "/admin/merchants/add",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default async function AdminAddMerchantPage() {
  const session = await getServerSession(adminAuthOptions)

  if (!session?.user) {
    redirect("/admin/login")
  }

  return <AddMerchantPageMain />
}
