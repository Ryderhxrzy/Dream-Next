import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { adminAuthOptions } from "@/libs/adminAuth"
import CommissionDocs from "@/components/Comission-docs"

export const metadata = {
  title: "Commission & Bonus System — Apsara Home",
}

// Session-gated, so it must never be statically rendered.
export const dynamic = "force-dynamic"

export default async function CommissionDocsPage() {
  const session = await getServerSession(adminAuthOptions)

  // Only signed-in admins may view the commission/bonus docs.
  if (!session?.user) {
    redirect("/admin/login?callbackUrl=/commission-docs")
  }

  return <CommissionDocs />
}
