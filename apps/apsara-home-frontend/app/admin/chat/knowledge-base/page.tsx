import { buildPageMetadata } from "@/app/seo"
import KnowledgeBasePageMain from "@/components/superAdmin/ai/KnowledgeBasePageMain"

export const metadata = buildPageMetadata({
  title: "AI Knowledge Base",
  description: "Manage AI support knowledge documents on AF Home.",
  path: "/admin/chat/knowledge-base",
  noIndex: true,
})

export default function AdminChatKnowledgeBasePage() {
  return <KnowledgeBasePageMain />
}
