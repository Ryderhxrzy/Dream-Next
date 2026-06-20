import BrandRequestsAdminPage from "@/components/superAdmin/brandRequests/BrandRequestsAdminPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Brand Requests",
  description: "Review merchant brand requests on AF Home.",
  path: "/admin/brand-requests",
  noIndex: true,
})

export default function Page() {
  return <BrandRequestsAdminPage />
}
