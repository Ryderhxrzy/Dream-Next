import DreamBuildContentManager from "@/components/superAdmin/webpages/DreamBuildContentManager"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin DreamBuild Content",
  description: "Manage dynamic DreamBuild landing page sections.",
  path: "/admin/webpages/dreambuild",
  noIndex: true,
})

export default function AdminDreamBuildContentPage() {
  return <DreamBuildContentManager />
}
