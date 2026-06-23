import MemberInfoView from "@/components/superAdmin/members/MemberInfoView"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Member Details",
  description: "View member details on AF Home admin.",
  path: "/admin/members/info",
  noIndex: true,
})

export const dynamic = "force-dynamic"

export default async function MemberInfoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <MemberInfoView memberId={Number(decodeURIComponent(id))} />
}
