'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Pusher, { type Channel } from 'pusher-js'

export type QaTestStatus = 'pending' | 'pass' | 'bug' | 'skip'

export interface QaStatusUpdate {
  test_id: string
  status: QaTestStatus
  note?: string | null
  updated_by?: string | null
  updated_at?: string | null
}

export interface QaMember {
  id: string
  name: string
}

interface Options {
  /** Skip setup until the board has authenticated (avoids a wasted connect). */
  enabled: boolean
  /** A status/note changed somewhere else — patch local state. */
  onStatusUpdate: (update: QaStatusUpdate) => void
  /** Someone hit "Reset all". */
  onReset: () => void
}

interface Result {
  /** Everyone currently on the board (excluding nobody — includes you). */
  members: QaMember[]
  /** Your own presence id, so the UI can exclude self where needed. */
  myId: string | null
  /** test_id -> names of OTHER people currently editing that card. */
  editorsByTest: Record<string, string[]>
  /** Whisper that you started/stopped editing a card (null = stopped). */
  setEditing: (testId: string | null) => void
}

const CHANNEL = 'presence-qa-board'

/**
 * Wires the QA board to the shared `presence-qa-board` Pusher channel. Every
 * event is triggered server-side with the Pusher secret in the backend .env,
 * so no Pusher "client events" dashboard toggle is required:
 *   • presence              → who is online
 *   • qa.editing            → who is editing which card (ephemeral, no DB)
 *   • qa.status.updated     → live status/note sync
 *   • qa.reset              → board cleared
 */
export function useQaBoardRealtime({ enabled, onStatusUpdate, onReset }: Options): Result {
  const [members, setMembers] = useState<QaMember[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  // Keyed by the editor's presence id so members leaving cleans up correctly.
  const [editingByMember, setEditingByMember] = useState<Record<string, { testId: string; name: string }>>({})

  const channelRef = useRef<Channel | null>(null)
  const meRef = useRef<{ id: string; name: string } | null>(null)

  // Keep callbacks fresh without re-subscribing on every render.
  const cbRef = useRef({ onStatusUpdate, onReset })
  cbRef.current = { onStatusUpdate, onReset }

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap3'
    if (!pusherKey) return

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      // The BFF route attaches the admin Sanctum token from the session.
      channelAuthorization: {
        endpoint: '/api/qa/realtime-auth',
        transport: 'ajax',
      },
    })

    const channel = pusher.subscribe(CHANNEL)
    channelRef.current = channel

    const toMembers = (membersObj: { each: (cb: (m: { id: string; info?: { name?: string } }) => void) => void }) => {
      const list: QaMember[] = []
      membersObj.each((m) => list.push({ id: m.id, name: m.info?.name ?? 'Tester' }))
      return list
    }

    const onSubscribed = (membersObj: any) => {
      meRef.current = { id: membersObj.me?.id ?? null, name: membersObj.me?.info?.name ?? 'You' }
      setMyId(meRef.current.id)
      setMembers(toMembers(membersObj))
    }

    const onMemberAdded = (member: { id: string; info?: { name?: string } }) => {
      setMembers((prev) =>
        prev.some((m) => m.id === member.id) ? prev : [...prev, { id: member.id, name: member.info?.name ?? 'Tester' }],
      )
    }

    const onMemberRemoved = (member: { id: string }) => {
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      // Whoever left can no longer be "editing" anything.
      setEditingByMember((prev) => {
        if (!prev[member.id]) return prev
        const next = { ...prev }
        delete next[member.id]
        return next
      })
    }

    const onEditing = (data: { test_id: string | null; by_id?: string; by_name?: string }) => {
      const uid = data?.by_id
      if (!uid || uid === meRef.current?.id) return
      setEditingByMember((prev) => {
        const next = { ...prev }
        if (data.test_id) next[uid] = { testId: data.test_id, name: data.by_name ?? 'Someone' }
        else delete next[uid]
        return next
      })
    }

    channel.bind('pusher:subscription_succeeded', onSubscribed)
    channel.bind('pusher:member_added', onMemberAdded)
    channel.bind('pusher:member_removed', onMemberRemoved)
    channel.bind('qa.editing', onEditing)
    channel.bind('qa.status.updated', (u: QaStatusUpdate) => cbRef.current.onStatusUpdate(u))
    channel.bind('qa.reset', () => cbRef.current.onReset())

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(CHANNEL)
      pusher.disconnect()
      channelRef.current = null
      meRef.current = null
    }
  }, [enabled])

  // Last value we told the server, so a focus→blur burst on the same card
  // doesn't fire duplicate pings.
  const lastSentRef = useRef<string | null>(null)

  const setEditing = useCallback((testId: string | null) => {
    if (lastSentRef.current === testId) return
    lastSentRef.current = testId
    // Broadcast server-side via the BFF (uses the Pusher secret in backend .env).
    // keepalive lets the "stop editing" ping still send while the tab closes.
    fetch('/api/qa/editing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_id: testId }),
      keepalive: true,
    }).catch(() => { /* best-effort presence ping */ })
  }, [])

  // Collapse the per-member map into test_id -> [names].
  const editorsByTest: Record<string, string[]> = {}
  for (const { testId, name } of Object.values(editingByMember)) {
    ;(editorsByTest[testId] ??= []).push(name)
  }

  return { members, myId, editorsByTest, setEditing }
}
