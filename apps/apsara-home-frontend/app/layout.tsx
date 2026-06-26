import type { Metadata, Viewport } from "next"

import "./globals.css"

import { DynamicNotifyToaster } from "@/components/ui/DynamicNotify/DynamicNotify"
import Providers from "@/components/Providers"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
}

export const metadata: Metadata = {
  title: "AF Home - Premium Furniture & Appliances",
  description:
    "Shop the finest furniture and home appliances. Nationwide shipping available.",
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
  const fontVars = {
    "--font-poppins":
      '"Plus Jakarta Sans", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  } as React.CSSProperties

  return (
    <html lang="en" style={fontVars} suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/sir.png" />
      </head>
      <body className="bg-white antialiased dark:bg-gray-900">
        <Providers>{children}</Providers>
        <DynamicNotifyToaster />
      </body>
    </html>
  )
}
