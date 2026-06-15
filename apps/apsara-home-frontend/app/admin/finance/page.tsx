import FinanceDashboardMain from "@/components/superAdmin/accounting/FinanceDashboardMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Finance",
  description: "Browse the Admin Finance page on AF Home.",
  path: "/admin/finance",
  noIndex: true,
})

export default function FinanceDashboardPage() {
  return <FinanceDashboardMain />
}
