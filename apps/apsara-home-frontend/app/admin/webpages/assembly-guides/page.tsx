import AssemblyGuidesManager from "@/components/superAdmin/webpages/AssemblyGuidesManager"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Web Pages Assembly Guides",
  description: "Manage assembly guides content.",
  path: "/admin/webpages/assembly-guides",
  noIndex: true,
})

export default function AdminWebPagesAssemblyGuidesPage() {
  return <AssemblyGuidesManager />
}
