import AdminNotificationsSettingsPageMain from "@/components/superAdmin/settings/AdminNotificationsSettingsPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Settings Notifications",
  description: "Browse the Admin Settings Notifications page on AF Home.",
  path: "/admin/settings/notifications",
  noIndex: true,
})

export default function AdminSettingsNotificationsPage() {
  return <AdminNotificationsSettingsPageMain />
}
