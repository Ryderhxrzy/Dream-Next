"use client"

import { useState } from "react"
import {
  useCreateConversationWithCustomerMutation,
  useGetAdminConversationQuery,
  useGetAdminConversationsQuery,
  useSendAdminMessageMutation,
} from "@/store/api/adminConversationsApi"
import { AnimatePresence, motion } from "framer-motion"

import CloseConversationButton from "./CloseConversationButton"
import ConversationThread from "./ConversationThread"

interface Props {
  open: boolean
  onClose: () => void
  customerId: number | null | undefined
  customerName?: string | null
  /** Subject used only when a brand-new conversation is created. */
  subject?: string
}

const getInitials = (name?: string | null) => {
  if (!name) return "C"
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "C"
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

export default function AdminCustomerChatDrawer({
  open,
  onClose,
  customerId,
  customerName,
  subject,
}: Props) {
  const [conversationId, setConversationId] = useState<number | null>(null)
  // Compose mode: a blank thread whose conversation isn't created until the
  // admin sends the first message (so empty threads never appear in the list).
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState("")

  const validCustomer = !!customerId && customerId > 0
  const subjectToUse = subject?.trim() || "Support chat"

  // All of this customer's threads (open + closed history).
  const {
    data: listData,
    isLoading: listLoading,
    refetch: refetchList,
  } = useGetAdminConversationsQuery(
    { customer_id: customerId ?? 0, per_page: 50 },
    { skip: !open || !validCustomer }
  )
  const conversations = listData?.data ?? []

  const [createConv, { isLoading: creating, isError: createError }] =
    useCreateConversationWithCustomerMutation()
  const [sendMessage, { isLoading: sending }] = useSendAdminMessageMutation()

  // Thread header detail (customer name + status for the close button).
  const { data: convData } = useGetAdminConversationQuery(conversationId ?? 0, {
    skip: !conversationId,
  })

  // Reset when the drawer closes (during render — avoids a cascading effect).
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (!open) {
      setConversationId(null)
      setComposing(false)
      setDraft("")
    }
  }

  const openThread = (id: number) => {
    setComposing(false)
    setConversationId(id)
  }

  const backToList = () => {
    setConversationId(null)
    setComposing(false)
    setDraft("")
    refetchList()
  }

  // Open the existing thread for this subject if one is live; otherwise enter
  // compose mode WITHOUT creating anything yet.
  const handleNewChat = () => {
    if (!validCustomer) return
    const existing = conversations.find(
      (c) => c.subject === subjectToUse && c.status !== "resolved"
    )
    if (existing) {
      openThread(existing.id)
      return
    }
    setConversationId(null)
    setDraft("")
    setComposing(true)
  }

  // First message in compose mode → create the conversation, then send.
  const handleComposeSend = async () => {
    const body = draft.trim()
    if (!body || creating || sending || !validCustomer) return
    setDraft("")
    try {
      const res = await createConv({ customer_id: customerId!, subject }).unwrap()
      const id = res?.data?.id
      if (!id) {
        setDraft(body)
        return
      }
      await sendMessage({ conversationId: id, message: body }).unwrap()
      setComposing(false)
      setConversationId(id)
      refetchList()
    } catch {
      setDraft(body) // restore so the admin doesn't lose their text
    }
  }

  const headerName =
    convData?.data?.customer?.name || customerName || "Customer"
  const headerEmail = convData?.data?.customer?.email || "Support conversation"
  const inThreadView = !!conversationId || composing

  return (
    <AnimatePresence>
      {open && validCustomer ? (
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
              {inThreadView ? (
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-xs font-bold text-white">
                {getInitials(headerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {headerName}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {conversationId
                    ? headerEmail
                    : composing
                      ? "New message"
                      : `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`}
                </p>
              </div>
              {conversationId ? (
                <CloseConversationButton
                  conversationId={conversationId}
                  status={convData?.data?.status}
                />
              ) : null}
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
              {conversationId ? (
                <ConversationThread conversationId={conversationId} />
              ) : composing ? (
                /* Compose mode — conversation is created on first send. */
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-slate-400">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-500 dark:bg-teal-500/10 dark:text-teal-300">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                      Start a new conversation
                    </p>
                    <p className="text-xs">
                      Send the first message — the chat is created (and added to the
                      list) only once you hit send.
                    </p>
                  </div>
                  <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleComposeSend()
                          }
                        }}
                        rows={1}
                        placeholder="Type a message…"
                        className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={handleComposeSend}
                        disabled={!draft.trim() || creating || sending}
                        aria-label="Send message"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-teal-500 to-teal-600 text-white transition hover:from-teal-600 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {creating || sending ? (
                          <Spinner />
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {createError ? (
                      <p className="mt-1.5 text-center text-[11px] text-rose-500">
                        Couldn&apos;t start the conversation. Please try again.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  {/* New chat action */}
                  <div className="border-b border-slate-100 p-2.5 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-teal-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-teal-600 hover:to-teal-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Start / open chat
                    </button>
                  </div>

                  {/* Conversation list */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                    {listLoading ? (
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
                        <p className="text-xs">Use “Start / open chat” to message this customer.</p>
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
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
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
                                        <span className="ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-teal-600 px-1 text-[9px] font-bold whitespace-nowrap text-white">
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
