"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Messages page is flush + full-height (no padding, attached to sidebar)
  const isFlush = pathname?.includes("/messages")

  return (
    <main className={cn("flex-1 min-w-0", isFlush ? "" : "px-4 lg:px-6 py-4 pb-20 lg:pb-4")}>
      {children}
    </main>
  )
}
