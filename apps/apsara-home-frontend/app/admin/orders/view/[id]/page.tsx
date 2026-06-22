import AdminOrderDetailView from "@/components/superAdmin/orders/AdminOrderDetailView"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Order Details",
  description: "View order details on AF Home admin.",
  path: "/admin/orders/view",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AdminOrderDetailView orderId={decodeURIComponent(id)} />
}
