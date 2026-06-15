import WebPageItemsManager from "@/components/superAdmin/webpages/WebPageItemsManager"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Web Pages Branches",
  description: "Manage branches page content.",
  path: "/admin/webpages/branches",
  noIndex: true,
})

export default function AdminWebPagesBranchesPage() {
  return (
    <WebPageItemsManager
      type="home"
      title="Web Pages / Branches"
      description="Manage branch cards, maps links, and location details."
    />
  )
}
