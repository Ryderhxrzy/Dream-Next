import path from "path"
import type { NextConfig } from "next"
import withSerwist from "@serwist/next"

const buildCpusRaw = Number(process.env.NEXT_BUILD_CPUS ?? "")
const buildCpus =
  Number.isFinite(buildCpusRaw) && buildCpusRaw > 0 ? buildCpusRaw : undefined
const useWorkerThreads = process.env.NEXT_WORKER_THREADS === "1"
const isDev = process.env.NODE_ENV !== "production"

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
]

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://upload-widget.cloudinary.com${isDev ? " 'unsafe-eval'" : ""}`,
  "media-src 'self' blob: data: https:",
  "connect-src 'self' http://localhost:* http://127.0.0.1:* https: wss:",
  "frame-src 'self' https://upload-widget.cloudinary.com https://challenges.cloudflare.com https://www.youtube.com https://player.vimeo.com https://www.google.com https://maps.google.com",
  "upgrade-insecure-requests",
].join("; ")

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle (.next/standalone) for small,
  // low-RAM production images. Set via Docker/CI; harmless for local dev.
  output: "standalone",
  // Monorepo: trace files from the workspace root so standalone includes the
  // correct (minimal) node_modules instead of guessing the root.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Workaround for Windows file locking issues on `.next` (EPERM unlink build-manifest.json).
  // Using a separate build directory avoids touching a locked `.next` folder.
  // In CI/Docker we force NEXT_DIST_DIR=.next so standalone paths are predictable.
  distDir: process.env.NEXT_DIST_DIR || ".next_build",
  async headers() {
    return [
      ...[
        "/admin/:path*",
        "/partner/:path*",
        "/supplier/:path*",
        "/profile/:path*",
        "/orders/:path*",
        "/login",
        "/forgot-password",
        "/reset-password",
        "/unauthorized",
      ].map((source) => ({
        source,
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
        ],
      })),
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Controls worker count used during "Collecting page data...". Set `NEXT_BUILD_CPUS=1` to avoid spawn EPERM on Windows.
    cpus: buildCpus,
    // Prefer worker_threads over child_process workers (avoids spawn EPERM on some Windows setups).
    workerThreads: useWorkerThreads,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "1000logos.net",
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "cdn.simpleicons.org",
      },
      {
        protocol: "https",
        hostname: "download.logo.wine",
      },
    ],
  },
  webpack: (config, { dev }) => {
    // Windows often blocks atomic renames inside webpack's persistent cache packs (EPERM).
    // Disabling the persistent cache for production builds avoids intermittent build failures.
    if (!dev) {
      config.cache = false
    }
    return config
  },
}

export default withSerwist({
  swSrc: "sw.ts",
  swDest: "public/sw.js",
  // Disable SW by default to avoid navigation no-response regressions in production.
  // Set ENABLE_SW=1 only when explicitly validating PWA behavior.
  disable: process.env.ENABLE_SW !== "1",
})(nextConfig)
