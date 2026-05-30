import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  if (!q || q.length < 3) return NextResponse.json([])

  try {
    const params = new URLSearchParams({
      q,
      format: "json",
      limit: "6",
      addressdetails: "1",
    })

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "AFNexusCommunity/1.0 (community app)",
          "Accept-Language": "en",
        },
      }
    )

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}
