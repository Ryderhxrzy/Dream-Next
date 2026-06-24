"use client"

import { useEffect, useRef, useState } from "react"
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

export default function CustomerChatPanel({ open, onClose }: Props) {
  const { data: session } = useSession()
  const user = session?.user as { id?: string; accessToken?: string } | undefined
  const myId = Number(user?.id ?? 0)
  const accessToken = user?.accessToken

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [text, setText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

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
  }, [messages.length, selectedId])

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
            className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 right-0 z-[201] flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Messages</p>
                <p className="text-[11px] text-slate-400">Chat with AF Home support</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close messages"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {conversations.length === 0 && !convLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center text-slate-400">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                  Need help with an order?
                </p>
                <p className="text-xs leading-relaxed">
                  Start a chat and tell us what&apos;s wrong — our support team will
                  reply right here.
                </p>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={creating}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {creating ? <Spinner /> : null}
                  Start a conversation
                </button>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1">
                {/* Left: conversation list */}
                <aside className="flex w-[150px] shrink-0 flex-col border-r border-slate-200 sm:w-[190px] dark:border-slate-800">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                      Chats
                    </span>
                    <button
                      type="button"
                      onClick={handleStart}
                      disabled={creating}
                      title="Start a new conversation"
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white transition hover:bg-sky-700 disabled:opacity-50"
                    >
                      {creating ? (
                        <Spinner />
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {convLoading ? (
                      <p className="px-3 py-6 text-center text-xs text-slate-400">Loading…</p>
                    ) : (
                      <ul className="space-y-0.5 px-1.5 pb-2">
                        {conversations.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(c.id)}
                              className={`w-full rounded-lg px-2 py-2 text-left transition ${
                                c.id === selectedId
                                  ? "bg-sky-50 dark:bg-sky-500/10"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                                  {c.subject || "Support"}
                                </p>
                                {c.status === "resolved" ? (
                                  <span className="ml-auto rounded bg-slate-100 px-1 text-[9px] font-semibold text-slate-400 dark:bg-slate-800">
                                    Closed
                                  </span>
                                ) : c.unread_count > 0 ? (
                                  <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold text-white">
                                    {c.unread_count}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                {c.last_message?.message || "No messages"}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </aside>

                {/* Right: thread */}
                <section className="flex min-w-0 flex-1 flex-col">
                  {!selectedId ? (
                    <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-400">
                      Select a conversation
                    </div>
                  ) : (
                    <>
                      <div
                        ref={scrollRef}
                        className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-950/40"
                      >
                        {msgLoading && messages.length === 0 ? (
                          <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                            <Spinner />
                            <span className="text-sm">Loading…</span>
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="py-10 text-center text-sm text-slate-400">
                            Send a message to get started 👋
                          </div>
                        ) : (
                          messages
                            .filter((m) => !m.is_internal)
                            .map((m) => {
                              const isMine = m.sender_id === myId
                              return (
                                <div
                                  key={m.id}
                                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm ${
                                      isMine
                                        ? "rounded-br-md bg-sky-600 text-white"
                                        : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                                    }`}
                                  >
                                    <p className="break-words whitespace-pre-wrap">{m.message}</p>
                                    <p
                                      className={`mt-1 text-right text-[10px] ${
                                        isMine ? "text-sky-100/80" : "text-slate-400"
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

                      {isClosed ? (
                        <div className="border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-400 dark:border-slate-800">
                          This conversation has been closed by support. Start a new
                          one if you still need help.
                        </div>
                      ) : (
                        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
                          <div className="flex items-end gap-2">
                            <textarea
                              value={text}
                              onChange={(e) => setText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSend()
                                }
                              }}
                              rows={1}
                              placeholder="Type a message…"
                              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={handleSend}
                              disabled={!text.trim() || sending}
                              aria-label="Send message"
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
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
