import AdminSecuritySettingsPageMain from "@/components/superAdmin/settings/AdminSecuritySettingsPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Settings Security",
  description: "Browse the Admin Settings Security page on AF Home.",
  path: "/admin/settings/security",
  noIndex: true,
})

export default function AdminSettingsSecurityPage() {
  return <AdminSecuritySettingsPageMain />
}
