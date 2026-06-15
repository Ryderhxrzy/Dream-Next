import DatabaseExportPage from "@/components/superAdmin/webpages/DatabaseExportPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Database Export",
  description: "Export database snapshots from the web content workspace.",
  path: "/admin/webpages/database",
  noIndex: true,
})

export default function AdminDatabaseExportPage() {
  return <DatabaseExportPage />
}
