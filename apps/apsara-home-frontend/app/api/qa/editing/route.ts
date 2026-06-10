import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { adminAuthOptions } from '@/libs/adminAuth'

const LARAVEL_EDITING = `${process.env.LARAVEL_API_URL}/api/admin/qa/editing`

type AdminSessionUser = { accessToken?: string }

// Forwards an ephemeral "editing this card" ping to Laravel, which broadcasts
// it server-side with the Pusher secret (no client-events toggle needed).
export async function POST(request: Request) {
  const session = await getServerSession(adminAuthOptions)
  const token = (session?.user as AdminSessionUser | undefined)?.accessToken
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  try {
    const res = await fetch(LARAVEL_EDITING, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('QA editing ping failed:', error)
    return NextResponse.json({ error: 'failed' }, { status: 502 })
  }
}
