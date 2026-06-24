"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import {
  useCreateCustomerConversationMutation,
  useGetCustomerConversationsQuery,
  useGetCustomerMessagesQuery,
  useSendCustomerMessageMutation,
} from "@/store/api/customerConversationsApi"
import { useCustomerConversationRealtime } from "@/hooks/useCustomerConversationRealtime"
import { AnimatePresence, motion } from "framer-motion"
import { useSession } from "next-auth/react"

interface Props {
  open: boolean
  onClose: () => void
}

// Backend timestamps are Manila-local without an offset — pin them to +08:00.
const parseDate = (value?: string | null) => {
  if (!value) return null
  const s = value.trim().replace(" ", "T")
  const d = new Date(/([zZ]|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+08:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const fmtTime = (value?: string | null) => {
  const d = parseDate(value)
  return d
    ? d.toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
      })
    : ""
}

// Stable per-day key in Manila time, used for grouping + date dividers.
const dayKeyOf = (value?: string | null) => {
  const d = parseDate(value)
  return d ? d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) : ""
}

const fmtDayLabel = (value?: string | null) => {
  const d = parseDate(value)
  if (!d) return ""
  const k = dayKeyOf(value)
  const now = new Date()
  const today = dayKeyOf(now.toISOString())
  const yesterday = dayKeyOf(new Date(now.getTime() - 86_400_000).toISOString())
  if (k === today) return "Today"
  if (k === yesterday) return "Yesterday"
  return d.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function ChatGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}

// Support agent avatar (left side of the thread + list rows).
function SupportAvatar({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <div
      className={`flex ${className} shrink-0 items-center justify-center self-end rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm`}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
        />
      </svg>
    </div>
  )
}

// Delivery ticks for the customer's own messages (single = sent, double = seen).
function Ticks({ seen }: { seen: boolean }) {
  return seen ? (
    <svg className="h-3.5 w-3.5 text-sky-200" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 13.5l4 4 7-9M11.5 17.5l1 .5 8-10" />
    </svg>
  ) : (
    <svg className="h-3.5 w-3.5 text-sky-100/70" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12.5l5 5 11-13" />
    </svg>
  )
}

export default function CustomerChatPanel({ open, onClose }: Props) {
  const { data: session } = useSession()
  const user = session?.user as { id?: string; accessToken?: string } | undefined
  const myId = Number(user?.id ?? 0)
  const accessToken = user?.accessToken

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [text, setText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    data: convData,
    isLoading: convLoading,
    refetch: refetchConversations,
  } = useGetCustomerConversationsQuery(undefined, { skip: !open })
  const conversations = convData?.data ?? []

  const [createConv, { isLoading: creating }] =
    useCreateCustomerConversationMutation()
  const [sendMessage, { isLoading: sending }] = useSendCustomerMessageMutation()

  const { data: msgData, isLoading: msgLoading } = useGetCustomerMessagesQuery(
    selectedId ?? 0,
    { skip: !selectedId }
  )
  const messages = msgData?.data ?? []
  const visible = messages.filter((m) => !m.is_internal)

  useCustomerConversationRealtime({ conversationId: selectedId, accessToken })

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null
  const isClosed = selectedConv?.status === "resolved"

  // Auto-select the most recent conversation once the list loads (during render).
  if (open && selectedId == null && conversations.length > 0) {
    setSelectedId(conversations[0].id)
  }

  // Reset when the panel closes (during render — avoids a cascading effect).
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (!open) {
      setSelectedId(null)
      setText("")
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [visible.length, selectedId])

  // Auto-grow the composer up to a sensible cap.
  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }

  // Start (or reuse the open) support conversation, then select it.
  const handleStart = async () => {
    try {
      const res = await createConv({ subject: "Support" }).unwrap()
      if (res?.data?.id) {
        setSelectedId(res.data.id)
        refetchConversations()
      }
    } catch {
      // ignore
    }
  }

  const handleSend = async () => {
    const body = text.trim()
    if (!body || !selectedId || sending || isClosed) return
    setText("")
    if (inputRef.current) inputRef.current.style.height = "auto"
    try {
      await sendMessage({ conversationId: selectedId, message: body }).unwrap()
    } catch {
      setText(body)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 right-0 z-[201] flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl sm:rounded-l-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-3.5 text-white">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/25 backdrop-blur">
                  <ChatGlyph className="h-5 w-5" />
                </div>
                <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-sky-600 bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold tracking-tight">AF Home Support</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/80">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  We typically reply within minutes
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close messages"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {conversations.length === 0 && !convLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 text-sky-500 dark:from-sky-500/10 dark:to-blue-500/10 dark:text-sky-300">
                  <ChatGlyph className="h-8 w-8" />
                </div>
                <p className="text-base font-bold text-slate-700 dark:text-slate-100">
                  Need help with an order?
                </p>
                <p className="max-w-xs text-xs leading-relaxed text-slate-400">
                  Start a chat and tell us what&apos;s wrong — our support team will
                  reply right here, usually within a few minutes.
                </p>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={creating}
                  className="mt-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:from-sky-700 hover:to-blue-700 disabled:opacity-50"
                >
                  {creating ? <Spinner /> : <ChatGlyph className="h-4 w-4" />}
                  Start a conversation
                </button>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1">
                {/* Left: conversation list */}
                <aside className="flex w-[164px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 sm:w-[210px] dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                      Chats
                    </span>
                    <button
                      type="button"
                      onClick={handleStart}
                      disabled={creating}
                      title="Start a new conversation"
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                    >
                      {creating ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-1.5 pb-2">
                    {convLoading ? (
                      <p className="px-3 py-6 text-center text-xs text-slate-400">Loading…</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {conversations.map((c) => {
                          const active = c.id === selectedId
                          const resolved = c.status === "resolved"
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(c.id)}
                                className={`relative w-full rounded-xl px-2.5 py-2 text-left transition ${
                                  active
                                    ? "bg-white shadow-sm ring-1 ring-sky-100 dark:bg-slate-800 dark:ring-sky-500/20"
                                    : "hover:bg-white/70 dark:hover:bg-slate-800/60"
                                }`}
                              >
                                {active ? (
                                  <span className="absolute inset-y-2.5 left-0 w-1 rounded-full bg-sky-600" />
                                ) : null}
                                <div className="flex items-center gap-2">
                                  <SupportAvatar className="h-8 w-8" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                                      {c.subject || "Support"}
                                    </p>
                                    <p className="truncate text-[10px] text-slate-400">
                                      {c.last_message?.message || "No messages yet"}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center justify-between pl-10">
                                  <span className="text-[9px] text-slate-300 dark:text-slate-500">
                                    {fmtTime(c.last_message?.sent_at)}
                                  </span>
                                  {resolved ? (
                                    <span className="rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-slate-400 dark:bg-slate-800">
                                      Closed
                                    </span>
                                  ) : c.unread_count > 0 ? (
                                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold whitespace-nowrap text-white">
                                      {c.unread_count}
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </aside>

                {/* Right: thread */}
                <section className="flex min-w-0 flex-1 flex-col bg-slate-50/60 dark:bg-slate-950/40">
                  {!selectedId ? (
                    <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-400">
                      Select a conversation
                    </div>
                  ) : (
                    <>
                      <div ref={scrollRef} className="flex-1 space-y-0.5 overflow-y-auto px-4 py-4">
                        {msgLoading && visible.length === 0 ? (
                          <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                            <Spinner />
                            <span className="text-sm">Loading…</span>
                          </div>
                        ) : visible.length === 0 ? (
                          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
                            <SupportAvatar className="h-10 w-10" />
                            <p className="font-medium text-slate-500 dark:text-slate-300">
                              Say hello 👋
                            </p>
                            <p className="text-xs">Send a message and we&apos;ll get back to you.</p>
                          </div>
                        ) : (
                          visible.map((m, i) => {
                            const prev = visible[i - 1]
                            const next = visible[i + 1]
                            // Prefer the server-provided sender_type; fall back to the id
                            // compare for any message cached before the field existed.
                            const isMine = m.sender_type
                              ? m.sender_type === "customer"
                              : m.sender_id === myId
                            const newDay =
                              !prev || dayKeyOf(prev.created_at) !== dayKeyOf(m.created_at)
                            const groupStart =
                              !prev || prev.sender_id !== m.sender_id || newDay
                            const groupEnd =
                              !next ||
                              next.sender_id !== m.sender_id ||
                              dayKeyOf(next.created_at) !== dayKeyOf(m.created_at)
                            return (
                              <Fragment key={m.id}>
                                {newDay ? (
                                  <div className="flex items-center justify-center py-3">
                                    <span className="rounded-full bg-slate-200/70 px-3 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                      {fmtDayLabel(m.created_at)}
                                    </span>
                                  </div>
                                ) : null}
                                <div
                                  className={`flex items-end gap-2 ${
                                    isMine ? "justify-end" : "justify-start"
                                  } ${groupStart ? "mt-3" : "mt-0.5"}`}
                                >
                                  {!isMine ? (
                                    groupEnd ? (
                                      <SupportAvatar />
                                    ) : (
                                      <div className="w-7 shrink-0" />
                                    )
                                  ) : null}
                                  <div
                                    className={`flex max-w-[78%] flex-col ${
                                      isMine ? "items-end" : "items-start"
                                    }`}
                                  >
                                    {!isMine && groupStart ? (
                                      <span className="mb-1 ml-1 text-[10px] font-semibold text-slate-400">
                                        AF Home Support
                                      </span>
                                    ) : null}
                                    <div
                                      className={`px-3.5 py-2 text-[13px] leading-relaxed shadow-sm ${
                                        isMine
                                          ? `rounded-2xl bg-gradient-to-br from-sky-600 to-blue-600 text-white ${
                                              groupEnd ? "rounded-br-md" : ""
                                            }`
                                          : `rounded-2xl bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 ${
                                              groupEnd ? "rounded-bl-md" : ""
                                            }`
                                      }`}
                                    >
                                      <p className="break-words whitespace-pre-wrap">{m.message}</p>
                                    </div>
                                    {groupEnd ? (
                                      <span
                                        className={`mt-1 flex items-center gap-1 px-1 text-[10px] ${
                                          isMine ? "text-slate-400" : "text-slate-400"
                                        }`}
                                      >
                                        {fmtTime(m.created_at)}
                                        {isMine ? <Ticks seen={!!m.read_at} /> : null}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </Fragment>
                            )
                          })
                        )}
                      </div>

                      {isClosed ? (
                        <div className="border-t border-slate-200 bg-white px-4 py-4 text-center dark:border-slate-800 dark:bg-slate-900">
                          <p className="text-xs text-slate-400">
                            This conversation has been closed by support.
                          </p>
                          <button
                            type="button"
                            onClick={handleStart}
                            disabled={creating}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-sky-700 hover:to-blue-700 disabled:opacity-50"
                          >
                            {creating ? <Spinner className="h-3.5 w-3.5" /> : null}
                            Start a new conversation
                          </button>
                        </div>
                      ) : (
                        <div className="border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5 transition focus-within:border-sky-400 focus-within:bg-white dark:border-slate-700 dark:bg-slate-800">
                            <textarea
                              ref={inputRef}
                              value={text}
                              onChange={(e) => {
                                setText(e.target.value)
                                autoGrow(e.target)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSend()
                                }
                              }}
                              rows={1}
                              placeholder="Type a message…"
                              className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent px-2 py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={handleSend}
                              disabled={!text.trim() || sending}
                              aria-label="Send message"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-sm transition hover:from-sky-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {sending ? (
                                <Spinner />
                              ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                          <p className="mt-1.5 px-1 text-center text-[10px] text-slate-300 dark:text-slate-600">
                            Press Enter to send · Shift + Enter for a new line
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
