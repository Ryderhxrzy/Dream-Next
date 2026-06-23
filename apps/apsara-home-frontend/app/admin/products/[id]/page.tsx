import { adminAuthOptions } from "@/libs/adminAuth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import ProductDetailPageMain from "@/components/superAdmin/products/ProductDetailPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Product Details",
  description: "View and edit a product and its variants.",
  path: "/admin/products",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(adminAuthOptions)

  if (!session?.user) {
    redirect("/admin/login")
  }

  const { id } = await params
  return <ProductDetailPageMain productId={Number(id)} />
}
