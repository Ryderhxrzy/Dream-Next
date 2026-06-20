import SupplierBrandProductsPage from "@/components/supplier/SupplierBrandProductsPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "My Brand Products",
  description: "Your products under a brand on AF Home.",
  path: "/supplier/brands",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SupplierBrandProductsPage brandId={Number(id)} />
}
