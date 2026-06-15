import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { adminAuthOptions } from "@/libs/adminAuth"

const LARAVEL_BASE = `${process.env.LARAVEL_API_URL}/api/admin/qa/test-statuses`

type AdminSessionUser = { accessToken?: string }

async function requireAdminToken(): Promise<string | null> {
  const session = await getServerSession(adminAuthOptions)
  const user = session?.user as AdminSessionUser | undefined
  return user?.accessToken ?? null
}

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  }
}

// Load every saved QA status so the board can hydrate from the database.
export async function GET() {
  const token = await requireAdminToken()
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const res = await fetch(LARAVEL_BASE, {
      headers: authHeaders(token),
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("QA status load failed:", error)
    return NextResponse.json(
      { error: "Failed to load QA statuses" },
      { status: 502 }
    )
  }
}

// Upsert a single test case status.
export async function PUT(request: Request) {
  const token = await requireAdminToken()
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const res = await fetch(LARAVEL_BASE, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("QA status save failed:", error)
    return NextResponse.json(
      { error: "Failed to save QA status" },
      { status: 502 }
    )
  }
}

// Clear all statuses (Reset all).
export async function DELETE() {
  const token = await requireAdminToken()
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const res = await fetch(LARAVEL_BASE, {
      method: "DELETE",
      headers: authHeaders(token),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("QA status reset failed:", error)
    return NextResponse.json(
      { error: "Failed to reset QA statuses" },
      { status: 502 }
    )
  }
}
