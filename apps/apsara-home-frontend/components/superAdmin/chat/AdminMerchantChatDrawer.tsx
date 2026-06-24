"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useGetSupplierUsersQuery } from "@/store/api/suppliersApi"
import {
  createAdminSupplierChatConversation,
  fetchAdminSupplierChatConversation,
  fetchAdminSupplierChatConversationsForSupplierUser,
  sendAdminSupplierChatMessage,
  type SupplierChatConversation,
} from "@/libs/adminSupplierChat"

interface Props {
  open: boolean
  onClose: () => void
  /** Supplier (company) id from the merchants list row. */
  supplierId: number | null | undefined
  merchantName?: string | null
}

const getInitials = (name?: string | null) => {
  if (!name) return "M"
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "M"
  )
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

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function AdminMerchantChatDrawer({
  open,
  onClose,
  supplierId,
  merchantName,
}: Props) {
  const validSupplier = !!supplierId && supplierId > 0

  // Resolve the supplier USER to chat with — the merchant row is company-level,
  // but the chat is keyed by supplier_user_id. Prefer the main/owner account.
  const { data: usersData, isLoading: usersLoading } = useGetSupplierUsersQuery(
    supplierId ?? 0,
    { skip: !open || !validSupplier }
  )
  const mainUser = useMemo(() => {
    const users = usersData?.users ?? []
    return users.find((u) => u.is_main_supplier) ?? users[0] ?? null
  }, [usersData])
  const supplierUserId = mainUser?.id ?? null

  const [view, setView] = useState<"list" | "thread">("list")
  const [conversations, setConversations] = useState<SupplierChatConversation[]>([])
  const [listReady, setListReady] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [thread, setThread] = useState<SupplierChatConversation | null>(null)
  const [starting, setStarting] = useState(false)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset when the drawer closes (during render — avoids a cascading effect).
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (!open) {
      setView("list")
      setSelectedId(null)
      setThread(null)
      setStarting(false)
      setText("")
      setError(null)
      setListReady(false)
    }
  }

  // Load this merchant's conversations. Loading is derived from `listReady`, so we
  // never call setState synchronously in the effect body (cascading-render rule).
  useEffect(() => {
    if (!open || !supplierUserId) return
    let active = true
    fetchAdminSupplierChatConversationsForSupplierUser(supplierUserId)
      .then((list) => {
        if (active) setConversations(list)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setListReady(true)
      })
    return () => {
      active = false
    }
  }, [open, supplierUserId, reloadKey])

  // Load + lightly poll the open thread (supplier chat has no client realtime hook).
  // `thread` is cleared by the openThread/backToList handlers, not here.
  useEffect(() => {
    if (!selectedId) return
    let active = true
    const load = () =>
      fetchAdminSupplierChatConversation(selectedId)
        .then((c) => {
          if (active) setThread(c)
        })
        .catch(() => {})
    load()
    const timer = setInterval(load, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [selectedId])

  const listLoading = !listReady
  const threadLoading = !!selectedId && !thread

  const messages = thread?.messages ?? []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, selectedId, starting])

  const openThread = (id: number) => {
    setStarting(false)
    setThread(null)
    setSelectedId(id)
    setView("thread")
  }

  const backToList = () => {
    setView("list")
    setSelectedId(null)
    setThread(null)
    setStarting(false)
    setReloadKey((k) => k + 1)
  }

  const startNew = () => {
    setStarting(true)
    setSelectedId(null)
    setThread(null)
    setView("thread")
  }

  const handleSend = async () => {
    const body = text.trim()
    if (!body || sending || !supplierUserId) return
    setSending(true)
    setText("")
    setError(null)
    try {
      if (starting || !selectedId) {
        // Admin "store" always creates a new thread and requires a first message.
        const conv = await createAdminSupplierChatConversation(
          supplierUserId,
          "Support",
          body
        )
        setStarting(false)
        setSelectedId(conv.id)
        setReloadKey((k) => k + 1)
      } else {
        await sendAdminSupplierChatMessage(selectedId, body)
        const c = await fetchAdminSupplierChatConversation(selectedId)
        setThread(c)
        setReloadKey((k) => k + 1)
      }
    } catch (e) {
      setText(body)
      setError(e instanceof Error ? e.message : "Failed to send message.")
    } finally {
      setSending(false)
    }
  }

  const headerName = merchantName || mainUser?.fullname || "Merchant"
  const inThread = view === "thread"
  const noUser = !usersLoading && validSupplier && !supplierUserId

  return (
    <AnimatePresence>
      {open && validSupplier ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 right-0 z-[121] flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
              {inThread ? (
                <button
                  type="button"
                  onClick={backToList}
                  aria-label="Back to conversations"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              ) : null}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-600 text-xs font-bold text-white">
                {getInitials(headerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {headerName}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {inThread
                    ? mainUser?.email || "Merchant conversation"
                    : `Merchant · ${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col">
              {noUser ? (
                <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-400">
                  This merchant has no portal user to chat with yet.
                </div>
              ) : inThread ? (
                <>
                  <div
                    ref={scrollRef}
                    className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-950/40"
                  >
                    {threadLoading && messages.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                        <Spinner />
                        <span className="text-sm">Loading…</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="py-10 text-center text-sm text-slate-400">
                        {starting
                          ? "Send the first message to start this conversation."
                          : "No messages yet."}
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMine = m.sender_type === "admin"
                        return (
                          <div
                            key={m.id}
                            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm ${
                                isMine
                                  ? "rounded-br-md bg-linear-to-br from-amber-500 to-orange-600 text-white"
                                  : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                              }`}
                            >
                              {!isMine && m.sender_name ? (
                                <p className="mb-0.5 text-[10px] font-semibold text-slate-400">
                                  {m.sender_name}
                                </p>
                              ) : null}
                              <p className="break-words whitespace-pre-wrap">{m.message}</p>
                              <p
                                className={`mt-1 text-right text-[10px] ${
                                  isMine ? "text-amber-100/80" : "text-slate-400"
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

                  <div className="border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
                    {error ? (
                      <p className="mb-1.5 text-center text-[11px] text-rose-500">{error}</p>
                    ) : null}
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
                        className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!text.trim() || sending}
                        aria-label="Send message"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 text-white transition hover:from-amber-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                  </div>
                </>
              ) : (
                <>
                  {/* New chat action */}
                  <div className="border-b border-slate-100 p-2.5 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={startNew}
                      disabled={!supplierUserId}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Start new chat
                    </button>
                  </div>

                  {/* Conversation list */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                    {listLoading || usersLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                        <Spinner />
                        <span className="text-sm">Loading conversations…</span>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center text-slate-400">
                        <svg className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                          No conversations yet
                        </p>
                        <p className="text-xs">Use “Start new chat” to message this merchant.</p>
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {conversations.map((c) => {
                          const resolved = c.status === "resolved"
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => openThread(c.id)}
                                className="w-full rounded-xl px-2.5 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                                        {c.subject || "Support"}
                                      </p>
                                      {resolved ? (
                                        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-slate-400 dark:bg-slate-700 dark:text-slate-300">
                                          Closed
                                        </span>
                                      ) : c.unread_count > 0 ? (
                                        <span className="ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-amber-600 px-1 text-[9px] font-bold whitespace-nowrap text-white">
                                          {c.unread_count}
                                        </span>
                                      ) : (
                                        <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                                          Open
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-2">
                                      <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
                                        {c.last_message
                                          ? `${c.last_message.sender_type === "admin" ? "You: " : ""}${c.last_message.message}`
                                          : "No messages yet"}
                                      </p>
                                      <span className="shrink-0 text-[10px] text-slate-300 dark:text-slate-500">
                                        {fmtTime(c.last_message?.sent_at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
