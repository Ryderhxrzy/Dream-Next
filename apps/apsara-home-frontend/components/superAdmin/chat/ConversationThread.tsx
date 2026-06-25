"use client"

import { useEffect, useRef, useState } from "react"
import {
  useGetAdminConversationQuery,
  useSendAdminMessageMutation,
  useUpdateConversationStatusMutation,
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

// Placeholder bubbles shown while a conversation's messages load.
const SKELETON_ROWS = [
  { id: "s1", mine: false, w: "w-40" },
  { id: "s2", mine: true, w: "w-28" },
  { id: "s3", mine: false, w: "w-56" },
  { id: "s4", mine: false, w: "w-32" },
  { id: "s5", mine: true, w: "w-44" },
  { id: "s6", mine: true, w: "w-24" },
  { id: "s7", mine: false, w: "w-48" },
]

function ThreadSkeleton() {
  return (
    <div className="space-y-3">
      {SKELETON_ROWS.map((r) => (
        <div key={r.id} className={`flex ${r.mine ? "justify-end" : "justify-start"}`}>
          <div
            className={`h-9 ${r.w} max-w-[78%] animate-pulse rounded-2xl ${
              r.mine
                ? "rounded-br-md bg-sky-200/70 dark:bg-sky-500/20"
                : "rounded-bl-md bg-slate-200/80 dark:bg-slate-700/60"
            }`}
          />
        </div>
      ))}
    </div>
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
  const [reopenConversation, { isLoading: reopening }] =
    useUpdateConversationStatusMutation()
  // Poll as a realtime fallback so the latest messages always show even if the
  // Pusher channel isn't delivering (useConversationRealtime below stays primary).
  const { data: convData } = useGetAdminConversationQuery(conversationId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  })

  useConversationRealtime({ conversationId, accessToken })

  const conversation = convData?.data
  // Data is "ready" only when it belongs to the conversation we're viewing —
  // while switching, the cache can briefly hold the previous thread. Until the
  // right one loads we show a skeleton instead of stale messages/composer.
  const ready = !!conversation && conversation.id === conversationId
  const messages = ready ? conversation.messages ?? [] : []
  const customerIdResolved = conversation?.customer?.id ?? 0
  const isClosed = ready && conversation.status === "resolved"

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

  const order = ready ? conversation.order : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Order context — shown when the thread is tied to an order. */}
      {order ? (
        <div className="flex items-center gap-2.5 border-b border-slate-200 bg-linear-to-r from-amber-50 to-white px-4 py-2.5 dark:border-slate-800 dark:from-amber-500/5 dark:to-transparent">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
              {order.product_name || order.reference}
            </p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {order.reference}
              {order.amount != null
                ? ` · ₱${order.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : ""}
              {order.quantity
                ? ` · ${order.quantity} item${order.quantity === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>
          {order.payment_status ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-slate-600 capitalize dark:bg-slate-800 dark:text-slate-300">
              {order.payment_status.replace(/_/g, " ")}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-950/40"
      >
        {!ready ? (
          <ThreadSkeleton />
        ) : messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No messages yet. Say hello 👋
          </div>
        ) : (
          messages
            .filter((m) => !m.is_internal)
            .map((m) => {
              // Prefer the server-provided role; fall back to the id compare only
              // for any message cached before sender_type existed.
              const isAdmin = m.sender_type
                ? m.sender_type === "admin"
                : m.sender_id !== customerIdResolved
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

      {/* Composer — skeleton while loading, Reopen when closed, else the input. */}
      {!ready ? (
        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
          <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : isClosed ? (
        <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-4 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This conversation is closed. Reopen it to reply to the customer.
          </p>
          <button
            type="button"
            onClick={() => reopenConversation({ conversationId, status: "open" })}
            disabled={reopening}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
          >
            {reopening ? (
              <Spinner />
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Reopen chat
          </button>
        </div>
      ) : (
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
      )}
    </div>
  )
}
