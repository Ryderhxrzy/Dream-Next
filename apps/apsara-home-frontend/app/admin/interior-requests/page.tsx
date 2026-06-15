import InteriorRequestsPageMain from "@/components/superAdmin/interiorRequests/InteriorRequestsPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Interior Quotation Requests",
  description: "Browse and manage interior service requests on AF Home.",
  path: "/admin/interior-requests",
  noIndex: true,
})

export default function AdminInteriorRequestsPage() {
  return <InteriorRequestsPageMain />
}
