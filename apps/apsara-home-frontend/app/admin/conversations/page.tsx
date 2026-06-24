import AdminConversationsInbox from "@/components/superAdmin/chat/AdminConversationsInbox"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Conversations",
  description: "Customer support conversations on AF Home admin.",
  path: "/admin/conversations",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default function AdminConversationsPage() {
  return <AdminConversationsInbox />
}
