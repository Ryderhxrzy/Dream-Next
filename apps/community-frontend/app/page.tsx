"use client"

import { useEffect } from "react"

export default function Home() {
  useEffect(() => {
    window.location.replace("/feed")
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-500">
          Opening AF Nexus Community...
        </p>
        <a
          href="/feed"
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Continue to feed
        </a>
      </div>
    </main>
  )
}
