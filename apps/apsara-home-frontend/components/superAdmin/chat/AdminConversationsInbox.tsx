"use client"

import { useEffect, useMemo, useState } from "react"
import { useGetAdminConversationsQuery } from "@/store/api/adminConversationsApi"

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

const fmtWhen = (value?: string | null) => {
  if (!value) return ""
  const s = value.trim().replace(" ", "T")
  const d = new Date(/([zZ]|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+08:00`)
  if (Number.isNaN(d.getTime())) return ""
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
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

export default function AdminConversationsInbox() {
  const [status, setStatus] = useState("")
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)

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
  const selected = conversations.find((c) => c.id === selectedId) ?? null

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
          onClick={() => refetch()}
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
          Refresh
        </button>
      </div>

      <div className="flex h-[78vh] min-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* ── List ── */}
        <aside
          className={`w-full flex-col border-r border-slate-200 lg:flex lg:w-[360px] lg:shrink-0 dark:border-slate-800 ${
            selectedId ? "hidden" : "flex"
          }`}
        >
          {/* Filters */}
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

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                No conversations found.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {conversations.map((conv) => {
                  const active = conv.id === selectedId
                  const when = conv.last_message?.sent_at ?? conv.updated_at
                  return (
                    <li key={conv.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(conv.id)}
                        className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                          active
                            ? "bg-sky-50 dark:bg-sky-500/10"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-[11px] font-bold text-white">
                          {getInitials(conv.customer?.name)}
                          <span
                            className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                              STATUS_DOT[conv.status] ?? "bg-slate-300"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                              {conv.customer?.name || "Customer"}
                            </p>
                            <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                              {fmtWhen(when)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="mt-0.5 truncate text-[12px] text-slate-400">
                              {conv.last_message?.message || conv.subject || "No messages yet"}
                            </p>
                            {conv.unread_count > 0 ? (
                              <span className="mt-0.5 ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white">
                                {conv.unread_count}
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
          </div>
        </aside>

        {/* ── Thread ── */}
        <section
          className={`min-w-0 flex-1 flex-col ${selectedId ? "flex" : "hidden lg:flex"}`}
        >
          {selectedId ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
                  aria-label="Back to list"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-[11px] font-bold text-white">
                  {getInitials(selected?.customer?.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {selected?.customer?.name || "Customer"}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {selected?.customer?.email || selected?.subject || "Conversation"}
                  </p>
                </div>
                {selected?.status ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 capitalize dark:bg-slate-800 dark:text-slate-300">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[selected.status] ?? "bg-slate-300"}`} />
                    {selected.status}
                  </span>
                ) : null}
              </div>
              <ConversationThread key={selectedId} conversationId={selectedId} />
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
              <p className="text-xs">Pick a customer thread to start chatting.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
