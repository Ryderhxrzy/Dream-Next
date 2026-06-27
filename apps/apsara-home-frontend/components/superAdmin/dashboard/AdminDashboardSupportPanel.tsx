"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSession } from "next-auth/react"
import {
  useGetAdminConversationsQuery,
  useGetAdminConversationQuery,
} from "@/store/api/adminConversationsApi"
import CloseConversationButton from "@/components/superAdmin/chat/CloseConversationButton"
import ConversationThread from "@/components/superAdmin/chat/ConversationThread"

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

function getInitials(name?: string | null) {
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

export default function AdminDashboardSupportPanel() {
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [tab, setTab] = useState<"open" | "resolved">("open")

  const { data: session, status: sessionStatus } = useSession()
  const isAuthenticated = sessionStatus === "authenticated"
  const role = String(
    (session?.user as { role?: string } | undefined)?.role ?? ""
  ).toLowerCase()
  const isSuperAdmin = role === "super_admin" || role === "super admin"

  // Single open-conversations query — drives both the badge and the open tab list.
  // Always polls so the badge stays fresh; skipped until session is confirmed.
  const { data: openData, isLoading: openLoading } = useGetAdminConversationsQuery(
    { status: "open", per_page: 50 },
    { pollingInterval: 30_000, skip: !isAuthenticated }
  )
  const openConversations = openData?.data ?? []
  const totalUnread = openConversations.reduce(
    (sum, c) => sum + (c.unread_count ?? 0),
    0
  )

  // Resolved tab — only fetched when the drawer is open on that tab.
  const { data: resolvedData, isLoading: resolvedLoading } = useGetAdminConversationsQuery(
    { status: "resolved", per_page: 50 },
    { pollingInterval: 60_000, skip: !isAuthenticated || !open || tab !== "resolved" }
  )

  const conversations = tab === "open" ? openConversations : (resolvedData?.data ?? [])
  const isLoading = tab === "open" ? (open && openLoading) : resolvedLoading

  const { data: convDetail } = useGetAdminConversationQuery(
    conversationId ?? 0,
    { skip: !conversationId || !isAuthenticated }
  )
  const activeConv = convDetail?.data

  const openThread = (id: number) => setConversationId(id)
  const backToList = () => setConversationId(null)
  const closePanel = () => {
    setOpen(false)
    setConversationId(null)
  }

  if (!isAuthenticated) return null

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open support inbox"
        className="fixed bottom-6 right-6 z-135 flex h-14 w-14 items-center justify-center rounded-full bg-[#0f1f44] text-white shadow-xl transition hover:bg-[#1a2f5e] active:scale-95"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-145 bg-slate-900/40 backdrop-blur-[1px]"
              onClick={closePanel}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 right-0 z-146 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3">
                {conversationId ? (
                  <button
                    type="button"
                    onClick={backToList}
                    aria-label="Back to inbox"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f1f44] text-white">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  {conversationId ? (
                    <>
                      <p className="truncate text-sm font-bold text-slate-900">
                        {activeConv?.customer?.name ?? "Customer"}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {activeConv?.subject ?? "Support conversation"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-900">Support Inbox</p>
                      <p className="text-[11px] text-slate-400">
                        {totalUnread > 0
                          ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}`
                          : isSuperAdmin
                            ? "All conversations"
                            : "Your conversations"}
                      </p>
                    </>
                  )}
                </div>

                {conversationId ? (
                  <CloseConversationButton
                    conversationId={conversationId}
                    status={activeConv?.status}
                  />
                ) : null}

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live
                </span>

                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close support panel"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex min-h-0 flex-1 flex-col">
                {conversationId ? (
                  <ConversationThread key={conversationId} conversationId={conversationId} />
                ) : (
                  <>
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 px-4">
                      {(["open", "resolved"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTab(t)}
                          className={`relative mr-4 py-2.5 text-xs font-semibold capitalize transition ${
                            tab === t
                              ? "text-[#0f1f44]"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {t === "open" ? "Open" : "Resolved"}
                          {t === "open" && totalUnread > 0 && (
                            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                              {totalUnread}
                            </span>
                          )}
                          {tab === t && (
                            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#0f1f44]" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Conversation list */}
                    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                          <Spinner />
                          <span className="text-sm">Loading conversations…</span>
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-slate-400">
                          <svg className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-sm font-medium text-slate-500">
                            No {tab} conversations
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {conversations.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => openThread(c.id)}
                                className="w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f1f44]/10 text-[13px] font-bold text-[#0f1f44]">
                                    {getInitials(c.customer?.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <p className="truncate text-[13px] font-semibold text-slate-800">
                                        {c.customer?.name ?? "Customer"}
                                      </p>
                                      {c.status === "resolved" ? (
                                        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-slate-400">
                                          Closed
                                        </span>
                                      ) : c.unread_count > 0 ? (
                                        <span className="ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold whitespace-nowrap text-white">
                                          {c.unread_count}
                                        </span>
                                      ) : (
                                        <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-emerald-600">
                                          Open
                                        </span>
                                      )}
                                    </div>
                                    <p className="truncate text-[11px] font-medium text-slate-500">
                                      {c.subject || "Support"}
                                    </p>
                                    <div className="mt-0.5 flex items-center gap-2">
                                      <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
                                        {c.last_message
                                          ? `${c.last_message.sender_type === "admin" ? "You: " : ""}${c.last_message.message}`
                                          : "No messages yet"}
                                      </p>
                                      <span className="shrink-0 text-[10px] text-slate-300">
                                        {fmtTime(c.last_message?.sent_at ?? c.updated_at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
