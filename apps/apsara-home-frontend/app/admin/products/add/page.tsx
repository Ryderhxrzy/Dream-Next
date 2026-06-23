import { adminAuthOptions } from "@/libs/adminAuth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import AddProductPageMain from "@/components/superAdmin/products/AddProductPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Add Product",
  description: "Add a new product via manual entry, CSV import, or API import.",
  path: "/admin/products/add",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default async function AdminAddProductPage() {
  const session = await getServerSession(adminAuthOptions)

  if (!session?.user) {
    redirect("/admin/login")
  }

  return <AddProductPageMain />
}
