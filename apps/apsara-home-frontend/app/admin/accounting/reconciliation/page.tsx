import ReconciliationMain from "@/components/superAdmin/accounting/ReconciliationMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Accounting Reconciliation",
  description: "Browse the Admin Accounting Reconciliation page on AF Home.",
  path: "/admin/accounting/reconciliation",
  noIndex: true,
})

export default function AccountingReconciliationPage() {
  return <ReconciliationMain />
}
