import WebPageItemsManager from "@/components/superAdmin/webpages/WebPageItemsManager"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Web Pages Banners",
  description: "Manage website banners.",
  path: "/admin/webpages/banners",
  noIndex: true,
})

export default function AdminWebPagesBannersPage() {
  return (
    <WebPageItemsManager
      type="banners"
      title="Web Pages / Banners"
      description="Manage banner content, links, schedule, and activation."
    />
  )
}
