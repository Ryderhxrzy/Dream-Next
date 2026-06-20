"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Pusher from "pusher-js"

type DreamBuildContentEvent = {
  type?: string
  action?: string
  id?: number | null
  updated_at?: string
}

export function DreamBuildRealtimeRefresh() {
  const router = useRouter()
  const refreshTimerRef = useRef<number | null>(null)
  const followUpTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

    if (!key || !cluster) {
      return
    }

    const pusher = new Pusher(key, { cluster })
    const channel = pusher.subscribe("dreambuild-content")

    const refresh = (event: DreamBuildContentEvent) => {
      void event
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current)
      }
      if (followUpTimerRef.current) {
        window.clearTimeout(followUpTimerRef.current)
      }

      refreshTimerRef.current = window.setTimeout(() => {
        router.refresh()
      }, 250)
      followUpTimerRef.current = window.setTimeout(() => {
        router.refresh()
      }, 1500)
    }

    channel.bind("content.updated", refresh)

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current)
      }
      if (followUpTimerRef.current) {
        window.clearTimeout(followUpTimerRef.current)
      }
      channel.unbind("content.updated", refresh)
      pusher.unsubscribe("dreambuild-content")
      pusher.disconnect()
    }
  }, [router])

  return null
}
