import { adminAuthOptions } from "@/libs/adminAuth"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

const LARAVEL_AUTH = `${process.env.LARAVEL_API_URL}/api/admin/qa/realtime/auth`

type AdminSessionUser = { accessToken?: string }

// Pusher posts `socket_id` + `channel_name` here when subscribing to the
// presence channel. We resolve the admin's Sanctum token from the session and
// forward to Laravel, which signs the auth response (with channel_data).
export async function POST(request: Request) {
  const session = await getServerSession(adminAuthOptions)
  const token = (session?.user as AdminSessionUser | undefined)?.accessToken
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // pusher-js sends the auth request as x-www-form-urlencoded.
  const form = await request.formData()
  const socket_id = String(form.get("socket_id") ?? "")
  const channel_name = String(form.get("channel_name") ?? "")

  try {
    const res = await fetch(LARAVEL_AUTH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ socket_id, channel_name }),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("QA realtime auth failed:", error)
    return NextResponse.json({ error: "Auth failed" }, { status: 502 })
  }
}
