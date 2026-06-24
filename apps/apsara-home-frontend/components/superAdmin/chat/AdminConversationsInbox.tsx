"use client"

import { useEffect, useMemo, useState } from "react"
import {
  useGetAdminConversationQuery,
  useGetAdminConversationsQuery,
  type AdminConversation,
  type ConversationCustomer,
} from "@/store/api/adminConversationsApi"
import { AnimatePresence, motion } from "framer-motion"

import CloseConversationButton from "./CloseConversationButton"
import ConversationThread from "./ConversationThread"

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
]

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

const toTime = (value?: string | null) => {
  if (!value) return 0
  const s = value.trim().replace(" ", "T")
  const d = new Date(/([zZ]|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+08:00`)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

const fmtWhen = (value?: string | null) => {
  const t = toTime(value)
  if (!t) return ""
  const d = new Date(t)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
      })
    : d.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
      })
}

const STATUS_DOT: Record<string, string> = {
  open: "bg-emerald-400",
  pending: "bg-amber-400",
  resolved: "bg-slate-300",
}

const STATUS_PILL: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  pending: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  resolved: "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-300",
}

interface MemberGroup {
  customer: ConversationCustomer
  conversations: AdminConversation[]
  latest: AdminConversation
  latestWhen: string
  totalUnread: number
  count: number
  allResolved: boolean
}

export default function AdminConversationsInbox() {
  const [status, setStatus] = useState("")
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeCustomer, setActiveCustomer] = useState<{
    id: number
    name: string
  } | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isFetching, refetch } = useGetAdminConversationsQuery(
    {
      status: status || undefined,
      assigned_to_me: assignedToMe || undefined,
      search: debouncedSearch || undefined,
      per_page: 50,
    },
    { pollingInterval: 20000 }
  )

  const conversations = useMemo(() => data?.data ?? [], [data])

  // One row per MEMBER — a customer with several threads should appear once.
  const members = useMemo<MemberGroup[]>(() => {
    const map = new Map<number, AdminConversation[]>()
    for (const c of conversations) {
      const id = c.customer?.id
      if (!id) continue
      const bucket = map.get(id)
      if (bucket) bucket.push(c)
      else map.set(id, [c])
    }
    const groups = Array.from(map.values()).map((convs) => {
      const latest = convs.reduce((a, b) =>
        toTime(b.last_message?.sent_at ?? b.updated_at) >
        toTime(a.last_message?.sent_at ?? a.updated_at)
          ? b
          : a
      )
      const openCount = convs.filter((c) => c.status !== "resolved").length
      return {
        customer: latest.customer,
        conversations: convs,
        latest,
        latestWhen: latest.last_message?.sent_at ?? latest.updated_at,
        totalUnread: convs.reduce((s, c) => s + (c.unread_count || 0), 0),
        count: convs.length,
        allResolved: openCount === 0,
      }
    })
    groups.sort((a, b) => toTime(b.latestWhen) - toTime(a.latestWhen))
    return groups
  }, [conversations])

  // Selected member's full thread list (independent of the status filter).
  const { data: memberData, isLoading: memberLoading } =
    useGetAdminConversationsQuery(
      { customer_id: activeCustomer?.id ?? 0, per_page: 50 },
      { skip: !activeCustomer, pollingInterval: 12000 }
    )
  const memberConversations = useMemo(() => {
    const list = memberData?.data ?? []
    return [...list].sort(
      (a, b) =>
        toTime(b.last_message?.sent_at ?? b.updated_at) -
        toTime(a.last_message?.sent_at ?? a.updated_at)
    )
  }, [memberData])
  const selectedConv =
    memberConversations.find((c) => c.id === selectedConversationId) ?? null

  // Live detail of the OPEN conversation — kept fresh by ConversationThread's
  // realtime hook + send mutation. We read the same cache here so the latest
  // message shows in the left list instantly, not just on the next poll.
  const { data: activeDetail } = useGetAdminConversationQuery(
    selectedConversationId ?? 0,
    { skip: !selectedConversationId }
  )
  const activeLatest = useMemo(() => {
    const msgs = activeDetail?.data?.messages ?? []
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (!msgs[i].is_internal) return msgs[i]
    }
    return null
  }, [activeDetail])

  const openMember = (m: MemberGroup) => {
    setSelectedConversationId(null)
    setActiveCustomer({ id: m.customer.id, name: m.customer.name })
  }

  const backToMembers = () => {
    setActiveCustomer(null)
    setSelectedConversationId(null)
    refetch()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            Conversations
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Realtime support chat with your customers
          </p>
        </div>
        <button
          type="button"
          onClick={() => (activeCustomer ? backToMembers() : refetch())}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <svg
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {activeCustomer ? "All conversations" : "Refresh"}
        </button>
      </div>

      <div className="flex h-[78vh] min-h-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Filters — only while browsing the member list */}
        {!activeCustomer ? (
          <div className="space-y-2.5 border-b border-slate-200 p-3 dark:border-slate-800">
            <div className="relative">
              <svg className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, subject…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center gap-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value || "all"}
                  type="button"
                  onClick={() => setStatus(tab.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    status === tab.value
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAssignedToMe((v) => !v)}
                className={`ml-auto rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  assignedToMe
                    ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
                    : "border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                Mine
              </button>
            </div>
          </div>
        ) : null}

        <div className="relative flex min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {!activeCustomer ? (
              /* ── Member list ── */
              <motion.div
                key="members"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex-1 overflow-y-auto"
              >
                {isLoading ? (
                  <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
                ) : members.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No conversations found.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {members.map((m) => {
                      const resolved = m.allResolved
                      const lastIsAdmin =
                        m.latest.last_message?.sender_type === "admin"
                      return (
                        <li key={m.customer.id}>
                          <button
                            type="button"
                            onClick={() => openMember(m)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                              resolved ? "opacity-70" : ""
                            }`}
                          >
                            <div
                              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ${
                                resolved
                                  ? "bg-linear-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700"
                                  : "bg-linear-to-br from-teal-400 to-teal-600"
                              }`}
                            >
                              {getInitials(m.customer.name)}
                              <span
                                className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                  resolved
                                    ? "bg-slate-300"
                                    : STATUS_DOT[m.latest.status] ?? "bg-slate-300"
                                }`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p
                                  className={`truncate text-[13px] font-semibold ${
                                    resolved
                                      ? "text-slate-500 dark:text-slate-400"
                                      : "text-slate-800 dark:text-slate-100"
                                  }`}
                                >
                                  {m.customer.name || "Customer"}
                                </p>
                                {m.count > 1 ? (
                                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-bold whitespace-nowrap text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                    {m.count} chats
                                  </span>
                                ) : null}
                                {resolved ? (
                                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-slate-400 dark:bg-slate-700 dark:text-slate-300">
                                    Resolved
                                  </span>
                                ) : null}
                                <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                                  {fmtWhen(m.latestWhen)}
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-2">
                                <p className="min-w-0 flex-1 truncate text-[12px] text-slate-400">
                                  {m.latest.last_message?.message
                                    ? `${lastIsAdmin ? "You: " : ""}${m.latest.last_message.message}`
                                    : m.latest.subject || "No messages yet"}
                                </p>
                                {m.totalUnread > 0 ? (
                                  <span className="ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white">
                                    {m.totalUnread}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </motion.div>
            ) : (
              /* ── One member: conversation list (left) + thread (right) ── */
              <motion.div
                key="member-detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-0 flex-1"
              >
                {/* Left: this member's conversations */}
                <aside
                  className={`w-full flex-col border-r border-slate-200 lg:flex lg:w-[340px] lg:shrink-0 dark:border-slate-800 ${
                    selectedConversationId ? "hidden" : "flex"
                  }`}
                >
                  <div className="flex items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={backToMembers}
                      aria-label="Back to all conversations"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-[11px] font-bold text-white">
                      {getInitials(activeCustomer.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {activeCustomer.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {memberConversations.length} conversation
                        {memberConversations.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {memberLoading && memberConversations.length === 0 ? (
                      <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
                    ) : memberConversations.length === 0 ? (
                      <p className="py-10 text-center text-sm text-slate-400">
                        No conversations.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {memberConversations.map((c) => {
                          const active = c.id === selectedConversationId
                          // For the open thread, prefer the live latest message.
                          const liveLast = active ? activeLatest : null
                          const previewMsg =
                            liveLast?.message ?? c.last_message?.message
                          const previewWhen =
                            liveLast?.created_at ??
                            c.last_message?.sent_at ??
                            c.updated_at
                          const rowUnread = active ? 0 : c.unread_count
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedConversationId(c.id)}
                                className={`flex w-full items-start gap-2.5 px-3 py-3 text-left transition ${
                                  active
                                    ? "bg-sky-50 dark:bg-sky-500/10"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                }`}
                              >
                                <span
                                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[c.status] ?? "bg-slate-300"}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                                      {c.subject || "Support"}
                                    </p>
                                    <span
                                      className={`ml-auto shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold whitespace-nowrap capitalize ${STATUS_PILL[c.status] ?? STATUS_PILL.resolved}`}
                                    >
                                      {c.status === "resolved" ? "Closed" : c.status}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2">
                                    <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
                                      {previewMsg || "No messages yet"}
                                    </p>
                                    {rowUnread > 0 ? (
                                      <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold text-white">
                                        {rowUnread}
                                      </span>
                                    ) : (
                                      <span className="shrink-0 text-[10px] text-slate-300 dark:text-slate-500">
                                        {fmtWhen(previewWhen)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </aside>

                {/* Right: the selected conversation thread */}
                <section
                  className={`min-w-0 flex-1 flex-col ${selectedConversationId ? "flex" : "hidden lg:flex"}`}
                >
                  {selectedConversationId ? (
                    <>
                      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectedConversationId(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
                          aria-label="Back to conversation list"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-[11px] font-bold text-white">
                          {getInitials(activeCustomer.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {selectedConv?.subject || activeCustomer.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {selectedConv?.customer?.email || "Conversation"}
                          </p>
                        </div>
                        {selectedConv?.status ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 capitalize dark:bg-slate-800 dark:text-slate-300">
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[selectedConv.status] ?? "bg-slate-300"}`} />
                            {selectedConv.status === "resolved" ? "Closed" : selectedConv.status}
                          </span>
                        ) : null}
                        <CloseConversationButton
                          conversationId={selectedConversationId}
                          status={selectedConv?.status}
                        />
                      </div>
                      <ConversationThread conversationId={selectedConversationId} />
                    </>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-slate-400">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                        <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                        Select a conversation
                      </p>
                      <p className="text-xs">
                        Pick one of {activeCustomer.name}&apos;s threads to open it.
                      </p>
                    </div>
                  )}
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
