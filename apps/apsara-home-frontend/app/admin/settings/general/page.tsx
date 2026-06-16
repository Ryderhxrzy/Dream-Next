import AdminGeneralSettingsPageMain from "@/components/superAdmin/settings/AdminGeneralSettingsPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Settings General",
  description: "Browse the Admin Settings General page on AF Home.",
  path: "/admin/settings/general",
  noIndex: true,
})

export default function AdminSettingsGeneralPage() {
  return <AdminGeneralSettingsPageMain />
}
