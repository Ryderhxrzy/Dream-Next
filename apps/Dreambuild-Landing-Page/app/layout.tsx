import type { Metadata } from "next"

import "./globals.css"

import { DreamBuildRealtimeRefresh } from "@/components/shared/dreambuild-realtime-refresh"
import { SplashWrapper } from "@/components/shared/splash-wrapper"

export const metadata: Metadata = {
  title: "Dreambuild Interior Services",
  description: "Warm, refined interior design services for modern homes.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">
        <DreamBuildRealtimeRefresh />
        <SplashWrapper />
        {children}
      </body>
    </html>
  )
}
