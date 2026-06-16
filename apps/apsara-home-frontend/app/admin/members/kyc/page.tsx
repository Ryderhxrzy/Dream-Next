import KycVerificationPageMain from "@/components/superAdmin/members/KycVerificationPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Members Kyc",
  description: "Browse the Admin Members Kyc page on AF Home.",
  path: "/admin/members/kyc",
  noIndex: true,
})

export default function AdminMembersKycPage() {
  return <KycVerificationPageMain />
}
