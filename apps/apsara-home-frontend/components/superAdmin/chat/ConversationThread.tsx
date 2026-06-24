"use client"

import { useEffect, useRef, useState } from "react"
import {
  useGetAdminConversationQuery,
  useSendAdminMessageMutation,
} from "@/store/api/adminConversationsApi"
import { useConversationRealtime } from "@/hooks/useConversationRealtime"
import { useSession } from "next-auth/react"

const fmtTime = (value?: string | null) => {
  if (!value) return ""
  const s = value.trim().replace(" ", "T")
  const d = new Date(/([zZ]|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+08:00`)
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
      })
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

/**
 * The realtime message thread + composer for one conversation. Shared by the
 * order/member chat drawer and the /admin/conversations inbox. Remount on a new
 * conversation by passing a `key={conversationId}`.
 */
export default function ConversationThread({
  conversationId,
}: {
  conversationId: number
}) {
  const { data: session } = useSession()
  const accessToken = (session?.user as { accessToken?: string } | undefined)
    ?.accessToken

  // Per-conversation drafts so switching threads never loses what you're typing.
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const text = drafts[conversationId] ?? ""
  const setDraft = (value: string) =>
    setDrafts((d) => ({ ...d, [conversationId]: value }))
  const scrollRef = useRef<HTMLDivElement>(null)

  const [sendMessage, { isLoading: sending }] = useSendAdminMessageMutation()
  // Poll as a realtime fallback so the latest messages always show even if the
  // Pusher channel isn't delivering (useConversationRealtime below stays primary).
  const { data: convData, isLoading } = useGetAdminConversationQuery(
    conversationId,
    { pollingInterval: 5000 }
  )

  useConversationRealtime({ conversationId, accessToken })

  const conversation = convData?.data
  const messages = conversation?.messages ?? []
  const customerIdResolved = conversation?.customer?.id ?? 0

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, conversationId])

  const handleSend = async () => {
    const body = text.trim()
    if (!body || sending) return
    setDraft("")
    try {
      await sendMessage({ conversationId, message: body }).unwrap()
    } catch {
      setDraft(body)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-950/40"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
            <Spinner />
            <span className="text-sm">Loading messages…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No messages yet. Say hello 👋
          </div>
        ) : (
          messages
            .filter((m) => !m.is_internal)
            .map((m) => {
              const isAdmin = m.sender_id !== customerIdResolved
              return (
                <div
                  key={m.id}
                  className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm ${
                      isAdmin
                        ? "rounded-br-md bg-sky-600 text-white"
                        : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{m.message}</p>
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        isAdmin ? "text-sky-100/80" : "text-slate-400"
                      }`}
                    >
                      {fmtTime(m.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={1}
            placeholder="Type a message…"
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            {sending ? (
              <Spinner />
            ) : (
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-slate-400">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  )
}
