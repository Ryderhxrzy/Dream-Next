import SupplierOrderReportsPage from "@/components/supplier/SupplierOrderReportsPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Order Report",
  description: "Review supplier order reports on AF Home.",
  path: "/supplier/reports/orders",
  noIndex: true,
})

export default function SupplierOrderReportPage() {
  return <SupplierOrderReportsPage title="Order Report" filter="all" />
}
