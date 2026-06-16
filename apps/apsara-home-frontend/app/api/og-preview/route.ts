import net from "net"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "127.0.0.1",
  "::1",
])

const PRIVATE_IPV4_RANGES = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^198\.(1[89])\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
]

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase()
  if (!normalized) return true
  if (BLOCKED_HOSTS.has(normalized)) return true

  const ipVersion = net.isIP(normalized)
  if (ipVersion === 4) {
    return PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(normalized))
  }

  if (ipVersion === 6) {
    return (
      normalized === "::1" ||
      normalized.startsWith("::ffff:") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd")
    )
  }

  return normalized.endsWith(".local") || normalized.endsWith(".internal")
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripHtml(str: string): string {
  const decoded = decodeEntities(str)
  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function extractMeta(html: string, property: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i"
    ),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return ""
}

function extractNameMeta(html: string, name: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
      "i"
    ),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return ""
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1]?.trim() ?? ""
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 })

  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    if (isPrivateHostname(parsed.hostname)) {
      return NextResponse.json({ error: "Blocked URL" }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OGBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok)
      return NextResponse.json({ error: "Failed to fetch" }, { status: 502 })

    const html = await res.text()

    const title = stripHtml(
      extractMeta(html, "og:title") ||
        extractNameMeta(html, "twitter:title") ||
        extractTitle(html)
    )

    const description = stripHtml(
      extractMeta(html, "og:description") ||
        extractNameMeta(html, "twitter:description") ||
        extractNameMeta(html, "description")
    )

    let image =
      extractMeta(html, "og:image") ||
      extractMeta(html, "og:image:url") ||
      extractNameMeta(html, "twitter:image")

    // Resolve relative image URLs
    if (image && !image.startsWith("http")) {
      image = new URL(image, parsed.origin).href
    }

    const siteName =
      extractMeta(html, "og:site_name") || parsed.hostname.replace(/^www\./, "")

    const favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`

    return NextResponse.json({
      title,
      description,
      image,
      siteName,
      favicon,
      url,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    )
  }
}
