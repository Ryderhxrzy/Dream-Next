import { adminAuthOptions } from "@/libs/adminAuth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import EmailBlastPageMain from "@/components/superAdmin/emailBlast/EmailBlastPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Email Blast",
  description: "Send email blasts to members and suppliers on AF Home Admin.",
  path: "/admin/email-blast",
  noIndex: true,
})
export const dynamic = "force-dynamic"

export default async function EmailBlastPage() {
  const session = await getServerSession(adminAuthOptions)

  if (!session?.user) {
    redirect("/admin/login")
  }

  return <EmailBlastPageMain />
}
