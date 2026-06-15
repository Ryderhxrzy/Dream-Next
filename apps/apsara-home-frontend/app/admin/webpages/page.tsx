import WebContentDashboard from "@/components/superAdmin/webpages/WebContentDashboard"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Web Content",
  description: "Open the CMS-style web content dashboard for AF Home.",
  path: "/admin/webpages",
  noIndex: true,
})

export default function AdminWebContentPage() {
  return <WebContentDashboard />
}
