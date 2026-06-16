import PaymentsEwalletPageMain from "@/components/superAdmin/payments/PaymentsEwalletPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin E-Wallet Payments",
  description: "Browse the Admin E-Wallet Payments page on AF Home.",
  path: "/admin/payments/ewallet",
  noIndex: true,
})

export default function AdminPaymentsEwalletPage() {
  return <PaymentsEwalletPageMain />
}
