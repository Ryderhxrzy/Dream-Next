import { NextResponse } from "next/server"

const getDreamBuildRevalidateUrl = () => {
  const explicit = process.env.DREAMBUILD_REVALIDATE_URL
  if (explicit) return explicit

  const appUrl =
    process.env.DREAMBUILD_APP_URL ||
    process.env.NEXT_PUBLIC_DREAMBUILD_APP_URL ||
    "http://localhost:3000"

  return `${appUrl.replace(/\/+$/, "")}/api/revalidate/dreambuild`
}

export async function POST() {
  try {
    const headers: Record<string, string> = {}
    const secret = process.env.DREAMBUILD_REVALIDATE_SECRET

    if (secret) {
      headers["x-dreambuild-revalidate-secret"] = secret
    }

    const response = await fetch(getDreamBuildRevalidateUrl(), {
      method: "POST",
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: "DreamBuild revalidate failed" },
        { status: response.status }
      )
    }

    return NextResponse.json({ revalidated: true })
  } catch {
    return NextResponse.json(
      { message: "DreamBuild revalidate request failed" },
      { status: 502 }
    )
  }
}
