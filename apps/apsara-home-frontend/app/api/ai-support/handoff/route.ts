import { authOptions } from "@/libs/auth"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

type SessionUser = {
  accessToken?: string
}

type HandoffPayload = {
  reason?: string
  subject?: string
  summary?: string
}

const normalizeBase = (value?: string | null) =>
  String(value ?? "").replace(/\/+$/, "")

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const accessToken = (session?.user as SessionUser | undefined)?.accessToken

  if (!accessToken) {
    return NextResponse.json(
      { message: "Please log in first so customer service can review your account." },
      { status: 401 }
    )
  }

  const apiBase =
    normalizeBase(process.env.LARAVEL_API_URL) ||
    normalizeBase(process.env.NEXT_PUBLIC_LARAVEL_API_URL)

  if (!apiBase) {
    return NextResponse.json(
      { message: "Backend API URL is not configured." },
      { status: 500 }
    )
  }

  const payload = (await request.json().catch(() => ({}))) as HandoffPayload
  const subject = String(payload.subject || "Customer service support request").slice(0, 255)
  const summary = String(payload.summary || "AI Support recommended customer service verification.").slice(0, 2000)
  const reason = String(payload.reason || "customer_service_verification")
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  }

  const createResponse = await fetch(`${apiBase}/api/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      subject,
      description: `[AI handoff: ${reason}]\n${summary}`,
    }),
    cache: "no-store",
  })

  const createData = await createResponse.json().catch(() => ({}))
  if (!createResponse.ok) {
    return NextResponse.json(
      { message: createData?.message || "Unable to create customer service request." },
      { status: createResponse.status }
    )
  }

  const conversation = createData?.data
  const conversationId = Number(conversation?.id || 0)

  if (conversationId > 0) {
    await fetch(`${apiBase}/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: `AI Support handoff\nReason: ${reason}\n\n${summary}`,
      }),
      cache: "no-store",
    }).catch(() => null)
  }

  return NextResponse.json({
    message: "Customer service request created.",
    conversation,
  })
}
