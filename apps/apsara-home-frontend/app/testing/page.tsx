import { adminAuthOptions } from "@/libs/adminAuth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import Testing from "@/components/Testing"

export const metadata = {
  title: "QA Testing Backlog — Apsara Home",
}

// Session-gated, so it must never be statically rendered.
export const dynamic = "force-dynamic"

export default async function TestingPage() {
  const session = await getServerSession(adminAuthOptions)

  // Only signed-in admins may view the QA board.
  if (!session?.user) {
    redirect("/admin/login?callbackUrl=/testing")
  }

  return <Testing />
}
