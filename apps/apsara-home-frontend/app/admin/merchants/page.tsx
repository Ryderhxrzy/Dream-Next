import SuppliersTabsWrapper from "@/components/superAdmin/suppliers/SuppliersTabsWrapper"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Merchants",
  description: "Browse the Admin Merchants page on AF Home.",
  path: "/admin/merchants",
  noIndex: true,
})

export default function AdminMerchantsPage() {
  return <SuppliersTabsWrapper />
}
