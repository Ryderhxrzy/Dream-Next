import UnderMaintenancePage from "@/components/superAdmin/UnderMaintenancePage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Product Report",
  description: "Browse the Admin Product Report page on AF Home.",
  path: "/admin/reports/products",
  noIndex: true,
})

export default function AdminReportsProductsPage() {
  return (
    <UnderMaintenancePage
      title="Product Report"
      description="Product performance reporting is still being built."
    />
  )
}
