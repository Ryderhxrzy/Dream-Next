import AdminProjectPageMain from "@/components/superAdmin/project/AdminProjectPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Project Gallery",
  description: "Upload and manage project photo and video galleries.",
  path: "/admin/project/gallery",
  noIndex: true,
})

export default function AdminProjectGalleryPage() {
  return <AdminProjectPageMain />
}
