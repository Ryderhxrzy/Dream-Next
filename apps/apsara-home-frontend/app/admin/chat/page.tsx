'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Hash,
  Image as ImageIcon,
  Link2,
  Play,
  Mail,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Smile,
  SquarePen,
  X,
} from 'lucide-react'
import {
  fetchAdminSupplierChatConversation,
  fetchAdminSupplierChatConversations,
  sendAdminSupplierChatMessage,
  type SupplierChatConversation,
  type SupplierChatMessage,
} from '@/libs/adminSupplierChat'

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-indigo-500',
]

const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024

type ConversationTab = 'all' | 'unread' | 'archived'
type MessageGroup = { dateLabel: string; messages: SupplierChatMessage[] }
type FileKind = 'image' | 'video' | 'other'
type PendingAttachment = { id: string; file: File; previewUrl: string | null; kind: FileKind }

function fileKind(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'other'
}

type FileBadge = { letter: string; sub: string; colors: string }

function getFileBadge(file: File): FileBadge | null {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  if (type === 'application/pdf' || name.endsWith('.pdf'))
    return { letter: 'P', sub: 'PDF', colors: 'border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10' }

  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx'))
    return { letter: 'W', sub: 'DOC', colors: 'border-blue-200 bg-blue-50 text-blue-500 dark:border-blue-500/30 dark:bg-blue-500/10' }

  if (type.includes('excel') || type.includes('spreadsheetml') || name.endsWith('.xls') || name.endsWith('.xlsx'))
    return { letter: 'E', sub: 'XLS', colors: 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10' }

  if (name.endsWith('.csv'))
    return { letter: 'C', sub: 'CSV', colors: 'border-teal-200 bg-teal-50 text-teal-600 dark:border-teal-500/30 dark:bg-teal-500/10' }

  if (type.includes('powerpoint') || type.includes('presentationml') || name.endsWith('.ppt') || name.endsWith('.pptx'))
    return { letter: 'P', sub: 'PPT', colors: 'border-orange-200 bg-orange-50 text-orange-500 dark:border-orange-500/30 dark:bg-orange-500/10' }

  if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz'))
    return { letter: 'Z', sub: 'ZIP', colors: 'border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-500/30 dark:bg-amber-500/10' }

  if (name.endsWith('.txt'))
    return { letter: 'T', sub: 'TXT', colors: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-800' }

  return null
}

function Avatar({
  label,
  color,
  online,
  size = 'md',
}: {
  label: string
  color: string
  online?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClass =
    size === 'lg' ? 'h-11 w-11 text-sm' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  const dotClass = size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5'
  return (
    <div className="relative shrink-0">
      <div className={`${sizeClass} ${color} flex items-center justify-center rounded-full font-bold text-white`}>
        {label}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotClass} rounded-full border-2 border-white dark:border-slate-900 ${
            online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        />
      )}
    </div>
  )
}

function formatRelativeTime(value: string | null): string {
  if (!value) return 'now'
  const ts = new Date(value)
  if (Number.isNaN(ts.getTime())) return 'now'
  const diffMs = Date.now() - ts.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return ts.toLocaleDateString('en-PH')
}

function formatClock(value: string): string {
  const ts = new Date(value)
  if (Number.isNaN(ts.getTime())) return value
  return ts.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-PH', { weekday: 'long' })
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return 'Last active recently'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 'Last active recently'
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Active now'
  if (diffMins < 60) return `Last active ${diffMins}m ago`
  if (diffHours < 24) return `Last active ${diffHours}h ago`
  if (diffDays === 1) return 'Last active yesterday'
  return `Last active ${diffDays}d ago`
}

function getConversationTitle(conversation: SupplierChatConversation): string {
  return (
    conversation.company?.name?.trim() ||
    conversation.supplier_user?.name?.trim() ||
    conversation.counterpart_label ||
    'Supplier conversation'
  )
}

function getInitials(value: string): string {
  const parts = value.split(' ').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return 'SP'
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function formatSupplierId(id: number | undefined): string {
  if (!id) return '—'
  return `SP-${String(id).padStart(4, '0')}`
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<SupplierChatConversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeConversation, setActiveConversation] = useState<SupplierChatConversation | null>(null)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [messageSearch, setMessageSearch] = useState('')
  const [activeTab, setActiveTab] = useState<ConversationTab>('all')
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)
  const unreadTabCount = conversations.filter((c) => c.unread_count > 0).length

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((c) => {
      const haystacks = [
        c.subject,
        c.counterpart_label,
        c.supplier_user?.name ?? '',
        c.supplier_user?.username ?? '',
        c.last_message?.message ?? '',
        c.status,
      ]
      return haystacks.some((v) => v.toLowerCase().includes(query))
    })
  }, [conversations, search])

  const tabConversations = useMemo(() => {
    if (activeTab === 'unread') return filteredConversations.filter((c) => c.unread_count > 0)
    if (activeTab === 'archived') return filteredConversations.filter((c) => c.status === 'resolved')
    return filteredConversations.filter((c) => c.status !== 'resolved')
  }, [filteredConversations, activeTab])

  const activeMessages = activeConversation?.messages ?? []

  const filteredMessages = useMemo(() => {
    const query = messageSearch.trim().toLowerCase()
    if (!query) return activeMessages
    return activeMessages.filter((m) => m.message.toLowerCase().includes(query))
  }, [activeMessages, messageSearch])

  const messageGroups = useMemo<MessageGroup[]>(() => {
    const groups: MessageGroup[] = []
    for (const message of filteredMessages) {
      const label = getDateLabel(message.created_at)
      const last = groups[groups.length - 1]
      if (last?.dateLabel === label) {
        last.messages.push(message)
      } else {
        groups.push({ dateLabel: label, messages: [message] })
      }
    }
    return groups
  }, [filteredMessages])

  const loadConversations = async (preferredId?: number | null) => {
    try {
      setIsLoading(true)
      setError(null)
      const items = await fetchAdminSupplierChatConversations()
      setConversations(items)
      const nextActiveId = preferredId ?? activeId ?? items[0]?.id ?? null
      if (nextActiveId !== null) {
        void selectConversation(nextActiveId, items)
      } else {
        setActiveId(null)
        setActiveConversation(null)
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load supplier chats.')
      setConversations([])
      setActiveId(null)
      setActiveConversation(null)
    } finally {
      setIsLoading(false)
    }
  }

  const selectConversation = async (
    conversationId: number,
    sourceConversations = conversations,
  ) => {
    setActiveId(conversationId)
    setIsMobileOpen(true)
    setError(null)
    const summary = sourceConversations.find((c) => c.id === conversationId) ?? null
    setActiveConversation(summary ? { ...summary, messages: summary.messages ?? [] } : null)
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
    )
    try {
      const detailed = await fetchAdminSupplierChatConversation(conversationId)
      setActiveConversation({ ...detailed, messages: detailed.messages ?? [] })
    } catch (fetchError) {
      setActiveConversation(summary ? { ...summary, messages: summary.messages ?? [] } : null)
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load conversation.')
    }
  }

  useEffect(() => {
    void loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeId) return
    const poll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const detailed = await fetchAdminSupplierChatConversation(activeId)
        setActiveConversation((prev) => {
          const prevLen = prev?.messages?.length ?? 0
          const newLen = detailed.messages?.length ?? 0
          if (newLen !== prevLen) return { ...detailed, messages: detailed.messages ?? [] }
          return prev
        })
      } catch { /* silent */ }
    }
    const timer = setInterval(() => { void poll() }, 4000)
    return () => clearInterval(timer)
  }, [activeId])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeMessages.length, activeId])

  const handleSendMessage = async () => {
    if (!input.trim() || !activeId || isSending) return
    const trimmed = input.trim()
    setIsSending(true)
    setError(null)
    try {
      const sent = await sendAdminSupplierChatMessage(activeId, trimmed)
      setActiveConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...(prev.messages ?? []), sent],
              last_message: {
                id: sent.id,
                message: sent.message,
                sender_type: sent.sender_type,
                sent_at: sent.created_at,
              },
              last_message_at: sent.created_at,
              message_count: prev.message_count + 1,
              unread_count: 0,
            }
          : prev,
      )
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                last_message: {
                  id: sent.id,
                  message: sent.message,
                  sender_type: sent.sender_type,
                  sent_at: sent.created_at,
                },
                last_message_at: sent.created_at,
                message_count: c.message_count + 1,
                unread_count: 0,
              }
            : c,
        ),
      )
      setInput('')
      pendingAttachments.forEach((a) => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl) })
      setPendingAttachments([])
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message.')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSendMessage()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const handleAttachmentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    const oversized = files.find((f) => f.size > MAX_ATTACHMENT_SIZE_BYTES)
    if (oversized) { setError(`${oversized.name} is larger than 25 MB.`); return }
    setError(null)
    setPendingAttachments((prev) => [
      ...prev,
      ...files.map((file) => {
        const kind = fileKind(file)
        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          previewUrl: kind !== 'other' ? URL.createObjectURL(file) : null,
          kind,
        }
      }),
    ])
  }

  const removeAttachment = (attachmentId: string) => {
    setPendingAttachments((prev) => {
      const removed = prev.find((a) => a.id === attachmentId)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((a) => a.id !== attachmentId)
    })
  }

  const activeConversationTitle = activeConversation
    ? getConversationTitle(activeConversation)
    : 'No conversation selected'
  const activeStatus = activeConversation?.status ?? 'open'
  const companyName =
    activeConversation?.company?.name?.trim() ||
    activeConversation?.counterpart_label ||
    'Supplier'
  const companyLogo = activeConversation?.company?.logo ?? null
  const supplierId = formatSupplierId(activeConversation?.supplier_user?.id)
  const supplierEmail = activeConversation?.supplier_user?.email ?? ''
  const supplierUsername = activeConversation?.supplier_user?.username
    ? `@${activeConversation.supplier_user.username}`
    : '—'
  const lastActive = formatLastActive(activeConversation?.last_message_at ?? null)

  return (
    <div className="flex h-[calc(100vh-104px)] flex-col gap-3 lg:h-[calc(100vh-120px)]">

      {/* Page title */}
      <div className="shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">
          Admin
        </p>
        <div className="mt-0.5 flex items-center gap-3">
          <h1 className="text-[26px] font-black tracking-tight text-slate-900 dark:text-white">Supplier Chats</h1>
          {totalUnread > 0 && (
            <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {totalUnread} new
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Manage and reply to supplier conversations.
        </p>
      </div>

      {/* Main panel */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:flex-row">

        {/* ── Left sidebar ── */}
        <div
          className={`flex w-full flex-col border-r border-slate-100 dark:border-slate-800 md:w-72 md:shrink-0 ${
            isMobileOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Messages</span>
              {totalUnread > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <SquarePen className="h-4 w-4" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supplier chats..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            {(['all', 'unread', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {tab === 'all' && 'All'}
                {tab === 'unread' && (
                  <>
                    Unread
                    {unreadTabCount > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          activeTab === 'unread'
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        }`}
                      >
                        {unreadTabCount}
                      </span>
                    )}
                  </>
                )}
                {tab === 'archived' && 'Archived'}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <MessageSquare className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">Loading conversations...</p>
              </div>
            ) : tabConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <MessageSquare className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">
                  {activeTab === 'unread'
                    ? 'No unread conversations'
                    : activeTab === 'archived'
                      ? 'No archived conversations'
                      : 'No conversations found'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {tabConversations.map((conversation, index) => {
                  const isActive = conversation.id === activeId
                  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]
                  const displayName = getConversationTitle(conversation)
                  const preview =
                    conversation.last_message?.message ?? conversation.subject ?? 'No messages yet'
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => void selectConversation(conversation.id, conversations)}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {conversation.company?.logo ? (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
                          <Image
                            src={conversation.company.logo}
                            alt={displayName}
                            fill
                            className="object-cover"
                          />
                          <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              conversation.status !== 'resolved' ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                        </div>
                      ) : (
                        <Avatar
                          label={getInitials(displayName)}
                          color={avatarColor}
                          online={conversation.status !== 'resolved'}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-[13px] font-semibold ${
                              isActive
                                ? 'text-indigo-700 dark:text-indigo-300'
                                : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {displayName}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {formatRelativeTime(
                              conversation.last_message_at ?? conversation.updated_at,
                            )}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                            {preview}
                          </p>
                          {conversation.unread_count > 0 && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-xs text-slate-400">
              {tabConversations.length}{' '}
              {tabConversations.length === 1 ? 'conversation' : 'conversations'}
            </span>
            <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Main chat area ── */}
        <div
          className={`flex flex-1 flex-col ${
            !isMobileOpen && !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {companyLogo ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
                    <Image
                      src={companyLogo}
                      alt={activeConversationTitle}
                      fill
                      className="object-cover"
                    />
                    {activeStatus !== 'resolved' && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                    )}
                  </div>
                ) : (
                  <Avatar
                    label={getInitials(activeConversationTitle)}
                    color={AVATAR_COLORS[0]}
                    online={activeStatus !== 'resolved'}
                    size="lg"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">
                    {activeConversationTitle}
                  </p>
                  <p
                    className={`text-[11px] font-medium ${
                      activeStatus !== 'resolved'
                        ? 'text-emerald-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {activeStatus !== 'resolved'
                      ? `Online · ${lastActive}`
                      : 'Resolved'}
                  </p>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-5 py-5"
              >
                {messageGroups.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <p className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {messageSearch.trim() ? 'No matching messages' : 'No messages yet'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {messageSearch.trim()
                          ? 'Try a different search term.'
                          : activeConversationTitle}
                      </p>
                    </div>
                  </div>
                ) : (
                  messageGroups.map((group) => (
                    <div key={group.dateLabel}>
                      {/* Date separator */}
                      <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                        <span className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {group.dateLabel}
                        </span>
                        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                      </div>

                      {/* Messages in this group */}
                      <div className="space-y-3">
                        {group.messages.map((message) => {
                          const mine = message.sender_type === 'admin'
                          return (
                            <div
                              key={message.id}
                              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                            >
                              {!mine && <Avatar label="SP" color="bg-slate-500" size="sm" />}
                              <div className={`ml-2 max-w-[72%] ${mine ? 'ml-0 mr-0' : ''}`}>
                                <div
                                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                    mine
                                      ? 'rounded-br-md bg-indigo-600 text-white'
                                      : 'rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                                  }`}
                                >
                                  {message.message}
                                </div>
                                <div
                                  className={`mt-1 flex items-center gap-1 ${
                                    mine ? 'justify-end' : 'justify-start'
                                  }`}
                                >
                                  <span className="text-[10px] text-slate-400">
                                    {formatClock(message.created_at)}
                                  </span>
                                  {mine && (
                                    <CheckCheck
                                      className={`h-3 w-3 ${
                                        message.is_read ? 'text-indigo-500' : 'text-slate-400'
                                      }`}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                {error && (
                  <p className="mb-2 text-xs font-medium text-rose-500 dark:text-rose-400">
                    {error}
                  </p>
                )}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                  {pendingAttachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {pendingAttachments.map((attachment) => (
                        <div key={attachment.id} className="relative shrink-0">
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeAttachment(attachment.id)}
                            className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 shadow hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            <X className="h-3 w-3" />
                          </button>

                          {/* Image preview */}
                          {attachment.kind === 'image' && attachment.previewUrl ? (
                            <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700">
                              <img
                                src={attachment.previewUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : attachment.kind === 'video' && attachment.previewUrl ? (
                            /* Video preview with play overlay */
                            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm dark:border-slate-700">
                              <video
                                src={attachment.previewUrl}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                                onLoadedMetadata={(e) => {
                                  const v = e.target as HTMLVideoElement
                                  v.currentTime = 0.1
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60">
                                  <Play className="h-3.5 w-3.5 fill-white text-white" />
                                </div>
                              </div>
                            </div>
                          ) : (() => {
                            const badge = getFileBadge(attachment.file)
                            return badge ? (
                              /* Typed file badge — letter + extension label */
                              <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-xl border shadow-sm ${badge.colors}`}>
                                <span className="text-3xl font-black leading-none">{badge.letter}</span>
                                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest opacity-70">{badge.sub}</span>
                              </div>
                            ) : (
                              /* Generic file icon fallback */
                              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                <FileText className="h-6 w-6 text-slate-400" />
                              </div>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a reply to the supplier…"
                    rows={1}
                    className="w-full resize-none bg-transparent py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                    style={{ maxHeight: '120px' }}
                  />
                  <div className="mt-2 flex items-center gap-1">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      multiple
                      onChange={handleAttachmentSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={!input.trim() || isSending}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-500/10">
                <MessageSquare className="h-9 w-9 text-indigo-400" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-slate-800 dark:text-slate-100">
                  No conversation selected
                </p>
                <p className="mt-1.5 max-w-xs text-sm text-slate-400 dark:text-slate-500">
                  Pick a supplier conversation from the list to read the history and reply.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <aside className="hidden w-[460px] shrink-0 border-l border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60 xl:flex xl:flex-col">
          <div className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            {/* Company info */}
            <div className="flex shrink-0 flex-col items-center border-b border-slate-100 pb-5 text-center dark:border-slate-800">
              <div className="relative">
                {companyLogo ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-white dark:border-slate-700">
                    <Image src={companyLogo} alt={companyName} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
                    {getInitials(companyName)}
                  </div>
                )}
                {activeStatus !== 'resolved' && (
                  <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                )}
              </div>
              <p className="mt-3 truncate text-[20px] font-bold leading-tight text-slate-900 dark:text-white">
                {companyName}
              </p>
              <p className="mt-0.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Supplier
              </p>
            </div>

            {/* Search */}
            <div className="mt-4 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Search conversation
              </p>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                {messageSearch && (
                  <button
                    type="button"
                    onClick={() => setMessageSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <p className="flex items-center gap-1 text-[12px] font-semibold text-slate-900 dark:text-white">
                  <ImageIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Media
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {activeMessages.filter((m) =>
                    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(m.message),
                  ).length}{' '}
                  items
                </p>
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <p className="flex items-center gap-1 text-[12px] font-semibold text-slate-900 dark:text-white">
                  <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Files
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {activeMessages.filter((m) =>
                    /\.(pdf|doc|docx|xls|xlsx|csv|zip)$/i.test(m.message),
                  ).length}{' '}
                  items
                </p>
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <p className="flex items-center gap-1 text-[12px] font-semibold text-slate-900 dark:text-white">
                  <Link2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Links
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {activeMessages.filter((m) => /https?:\/\/\S+/i.test(m.message)).length}{' '}
                  items
                </p>
              </button>
            </div>

            {/* About supplier */}
            <div className="mt-5">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white">About supplier</p>
              <div className="mt-3 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs">Supplier ID</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {supplierId}
                  </span>
                </div>
                {supplierEmail && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">Email</span>
                    </div>
                    <span className="max-w-[58%] truncate text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {supplierEmail}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs">Username</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {supplierUsername}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
