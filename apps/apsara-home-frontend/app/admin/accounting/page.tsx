import AccountingDashboardMain from "@/components/superAdmin/accounting/AccountingDashboardMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Accounting",
  description: "Browse the Admin Accounting page on AF Home.",
  path: "/admin/accounting",
  noIndex: true,
})

export default function AccountingDashboardPage() {
  return <AccountingDashboardMain />
}
