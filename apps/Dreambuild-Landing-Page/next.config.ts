import path from "path"
import type { NextConfig } from "next"
import withPWAInit from "next-pwa"

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})

const nextConfig: NextConfig = {
  // Self-contained server bundle for small, low-RAM production images.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
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
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
}

export default withPWA(nextConfig)
