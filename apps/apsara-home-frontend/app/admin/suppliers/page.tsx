import SuppliersTabsWrapper from "@/components/superAdmin/suppliers/SuppliersTabsWrapper"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Suppliers",
  description: "Browse the Admin Suppliers page on AF Home.",
  path: "/admin/suppliers",
  noIndex: true,
})

export default function AdminSuppliersPage() {
  return <SuppliersTabsWrapper />
}
