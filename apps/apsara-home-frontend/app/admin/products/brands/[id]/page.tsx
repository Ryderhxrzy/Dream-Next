import BrandProductsPage from "@/components/superAdmin/products/brands/BrandProductsPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Brand Products",
  description: "Products under a brand on AF Home.",
  path: "/admin/products/brands",
  noIndex: true,
})

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <BrandProductsPage brandId={Number(id)} />
}
