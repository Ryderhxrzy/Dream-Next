import AdminProjectPageMain from "@/components/superAdmin/project/AdminProjectPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Project",
  description: "Browse the Admin Project page on AF Home.",
  path: "/admin/project",
  noIndex: true,
})

export default function AdminProjectPage() {
  return <AdminProjectPageMain />
}
