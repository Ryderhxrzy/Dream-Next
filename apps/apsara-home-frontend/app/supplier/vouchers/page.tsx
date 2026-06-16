import PaymentsVouchersPageMain from "@/components/superAdmin/payments/PaymentsVouchersPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Supplier Vouchers",
  description: "Manage supplier voucher eligibility on AF Home.",
  path: "/supplier/vouchers",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default function SupplierVouchersPage() {
  return <PaymentsVouchersPageMain scope="supplier" />
}
