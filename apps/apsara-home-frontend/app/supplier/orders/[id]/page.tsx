import SupplierOrderDetailView from "@/components/supplier/SupplierOrderDetailView"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Order Details",
  description: "View supplier order details on AF Home.",
  path: "/supplier/orders",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default async function SupplierOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SupplierOrderDetailView orderId={decodeURIComponent(id)} />
}
