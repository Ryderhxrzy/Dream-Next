import SupplierChatPageClient from "@/components/supplier/SupplierChatPage"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Chats",
  description: "Manage customer conversations and inquiries.",
  path: "/supplier/chat",
  noIndex: true,
})

export default function SupplierChatPage() {
  return <SupplierChatPageClient />
}
