'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import {
  AlertCircle,
  CheckCheck,
  FileText,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Play,
  RefreshCw,
  Search,
  Send,
  Smile,
  X,
} from 'lucide-react'
import {
  createSupplierChatConversation,
  fetchSupplierChatConversation,
  fetchSupplierChatConversations,
  sendSupplierChatMessage,
  type SupplierChatConversation,
  type SupplierChatMessage,
} from '@/libs/supplierChat'


const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024

type FileKind = 'image' | 'video' | 'other'
type PendingAttachment = { id: string; file: File; previewUrl: string | null; kind: FileKind }
type MessageGroup = { dateLabel: string; messages: SupplierChatMessage[] }

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
type FileBadge = { letter: string; sub: string; colors: string }

function fileKind(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'other'
}

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
  const sizeClass = size === 'lg' ? 'h-11 w-11 text-sm' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
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

function formatClock(value: string): string {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return value

  return timestamp.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}


function getInitials(value: string): string {
  const parts = value
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return 'SP'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function SupplierChatPage() {
  const { data: session } = useSession()
  const supplierName = (session?.user as { supplierName?: string } | undefined)?.supplierName || session?.user?.name || 'My Company'
  const supplierLogo = (session?.user as { supplierLogo?: string | null } | undefined)?.supplierLogo ?? null

  const [conversations, setConversations] = useState<SupplierChatConversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeConversation, setActiveConversation] = useState<SupplierChatConversation | null>(null)
  const [input, setInput] = useState('')
  const [messageSearch, setMessageSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unread_count, 0)

  const activeMessages = activeConversation?.messages ?? []
  const filteredMessages = useMemo(() => {
    const query = messageSearch.trim().toLowerCase()
    if (!query) return activeMessages

    return activeMessages.filter((message) => message.message.toLowerCase().includes(query))
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
      const items = await fetchSupplierChatConversations()
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
    setError(null)

    const summary = sourceConversations.find((conversation) => conversation.id === conversationId) ?? null
    setActiveConversation(
      summary
        ? {
            ...summary,
            messages: summary.messages ?? [],
          }
        : null,
    )

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unread_count: 0 }
          : conversation
      )
    )

    try {
      const detailed = await fetchSupplierChatConversation(conversationId)
      setActiveConversation({
        ...detailed,
        messages: detailed.messages ?? [],
      })
    } catch (fetchError) {
      setActiveConversation(
        summary
          ? {
              ...summary,
              messages: summary.messages ?? [],
            }
          : null,
      )
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load conversation.')
    }
  }

  useEffect(() => {
    void loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll for new messages every 4 seconds while a conversation is open
  useEffect(() => {
    if (!activeId) return

    const poll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const detailed = await fetchSupplierChatConversation(activeId)
        setActiveConversation((prev) => {
          const prevLen = prev?.messages?.length ?? 0
          const newLen = detailed.messages?.length ?? 0
          // Only replace if server has more messages — avoids wiping optimistic messages
          if (newLen > prevLen) {
            return { ...detailed, messages: detailed.messages ?? [] }
          }
          return prev
        })
      } catch {
        // Ignore polling errors silently
      }
    }

    const timer = setInterval(() => { void poll() }, 4000)
    return () => clearInterval(timer)
  }, [activeId])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [activeMessages.length, activeId])

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return

    const trimmed = input.trim()
    setIsSending(true)
    setError(null)

    try {
      if (!activeId) {
        // No conversation yet — create one using the first message as the opening line
        const created = await createSupplierChatConversation('Support', trimmed)
        const conversation = { ...created, messages: created.messages ?? [] }
        setActiveConversation(conversation)
        setActiveId(created.id)
        setConversations([conversation])
      } else {
        const sent = await sendSupplierChatMessage(activeId, trimmed)

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
          prev.map((conversation) =>
            conversation.id === activeId
              ? {
                  ...conversation,
                  last_message: {
                    id: sent.id,
                    message: sent.message,
                    sender_type: sent.sender_type,
                    sent_at: sent.created_at,
                  },
                  last_message_at: sent.created_at,
                  message_count: conversation.message_count + 1,
                  unread_count: 0,
                }
              : conversation
          )
        )
      }

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

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const activeSubtitle = activeConversation?.assigned_admin?.name
    ? `Assigned to ${activeConversation.assigned_admin.name}`
    : 'Supplier chat inbox'
  const activeStatus = activeConversation?.status ?? 'open'

  return (
    <div className="flex h-[calc(100vh-104px)] flex-col gap-3 lg:h-[calc(100vh-120px)]">
      <div className="shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">
          Supplier
        </p>
        <div className="mt-0.5 flex items-center gap-3">
          <h1 className="text-[26px] font-black tracking-tight text-slate-900 dark:text-white">Chats</h1>
          {totalUnread > 0 && (
            <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {totalUnread} new
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Manage your conversations with the admin.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row">
        {/* Chat header — always visible */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800 lg:hidden">
          {supplierLogo ? (
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
              <Image src={supplierLogo} alt={supplierName} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {getInitials(supplierName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{supplierName}</p>
            <p className={`text-[11px] font-medium ${activeStatus === 'resolved' ? 'text-slate-400' : 'text-emerald-500'}`}>
              {activeSubtitle}
            </p>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            {supplierLogo ? (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
                <Image src={supplierLogo} alt={supplierName} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {getInitials(supplierName)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{supplierName}</p>
              <p className={`text-[11px] font-medium ${activeStatus === 'resolved' ? 'text-slate-400' : 'text-emerald-500'}`}>
                {activeSubtitle}
              </p>
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          {/* Messages area */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <MessageSquare className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">Loading conversation...</p>
              </div>
            </div>
          ) : error && conversations.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
                  <AlertCircle className="h-6 w-6 text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Could not load chat
                  </p>
                  <p className="mt-1 max-w-60 text-xs text-slate-400 dark:text-slate-500">
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => void loadConversations()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </button>
              </div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                  <MessageSquare className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {messageSearch.trim() ? 'No matching messages' : 'No messages yet'}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {messageSearch.trim()
                    ? 'Try a different search term.'
                    : 'Send a message below to start the conversation.'}
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

                {/* Messages in this day group */}
                <div className="space-y-3">
                  {group.messages.map((message) => {
                    const mine = message.sender_type === 'supplier'
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine && <Avatar label="AD" color="bg-slate-500" size="sm" />}
                        <div className={`max-w-[72%] ${mine ? 'ml-0' : 'ml-2'}`}>
                          <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${mine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'}`}>
                            {message.message}
                          </div>
                          <div className={`mt-1 flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] text-slate-400">{formatClock(message.created_at)}</span>
                            {mine && <CheckCheck className={`h-3 w-3 ${message.is_read ? 'text-indigo-500' : 'text-slate-400'}`} />}
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

          {/* Input — always visible */}
          <div className="shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            {error && <p className="mb-2 text-xs font-medium text-rose-500 dark:text-rose-400">{error}</p>}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
              {/* Attachment previews */}
              {pendingAttachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {pendingAttachments.map((attachment) => (
                    <div key={attachment.id} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 shadow hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {attachment.kind === 'image' && attachment.previewUrl ? (
                        <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700">
                          <img src={attachment.previewUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : attachment.kind === 'video' && attachment.previewUrl ? (
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
                          <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-xl border shadow-sm ${badge.colors}`}>
                            <span className="text-3xl font-black leading-none">{badge.letter}</span>
                            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest opacity-70">{badge.sub}</span>
                          </div>
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <FileText className="h-6 w-6 text-slate-400" />
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                disabled={isLoading}
                rows={1}
                className="w-full resize-none bg-transparent py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100"
                style={{ maxHeight: '120px' }}
              />

              {/* Action row */}
              <div className="mt-1.5 flex items-center gap-1">
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
                  <Smile className="h-4 w-4" />
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => void handleSendMessage()}
                  disabled={!input.trim() || isSending || isLoading}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden w-115 shrink-0 border-l border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60 xl:flex xl:flex-col">
          <div className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            {/* Company info — centered, matches admin sidebar */}
            <div className="flex shrink-0 flex-col items-center justify-center border-b border-slate-100 pb-4 text-center dark:border-slate-800">
              {supplierLogo ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-white dark:border-slate-700">
                  <Image src={supplierLogo} alt={supplierName} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
                  {getInitials(supplierName)}
                </div>
              )}
              <p className="mt-3 truncate text-[22px] font-bold leading-tight text-slate-900 dark:text-white">
                {supplierName}
              </p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Supplier</p>
            </div>

            {/* Search box */}
            <div className="mt-4 shrink-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
              <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                <Search className="h-3.5 w-3.5" />
                Search conversation
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={messageSearch}
                  onChange={(event) => setMessageSearch(event.target.value)}
                  placeholder="Search messages..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

            {/* Media / Files / Links stats grid */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <p className="flex items-center gap-1 text-[13px] font-semibold text-slate-900 dark:text-white">
                  <ImageIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Media
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {activeMessages.filter((message) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(message.message)).length} items
                </p>
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <p className="flex items-center gap-1 text-[13px] font-semibold text-slate-900 dark:text-white">
                  <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Files
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {activeMessages.filter((message) => /\.(pdf|doc|docx|xls|xlsx|csv|zip)$/i.test(message.message)).length} items
                </p>
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <p className="flex items-center gap-1 text-[13px] font-semibold text-slate-900 dark:text-white">
                  <Link2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Links
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {activeMessages.filter((message) => /https?:\/\/\S+/i.test(message.message)).length} items
                </p>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
