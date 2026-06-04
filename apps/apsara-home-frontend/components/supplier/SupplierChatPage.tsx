'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCheck,
  ChevronDown,
  ExternalLink,
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
  uploadSupplierChatAttachment,
  type SupplierChatConversation,
  type SupplierChatMessage,
} from '@/libs/supplierChat'
import EmojiPicker from '@/components/ui/EmojiPicker'
import LinkPreview from '@/components/ui/LinkPreview'


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
async function forceDownload(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
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
  src,
  alt,
  online,
  size = 'md',
}: {
  label: string
  color: string
  src?: string | null
  alt?: string
  online?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClass = size === 'lg' ? 'h-11 w-11 text-sm' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  const dotClass = size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5'

  return (
    <div className="relative shrink-0">
      <div className={`${sizeClass} ${color} overflow-hidden rounded-full font-bold text-white`}>
        {src ? (
          <img src={src} alt={alt ?? label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {label}
          </div>
        )}
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

  const [conversations, setConversations] = useState<SupplierChatConversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeConversation, setActiveConversation] = useState<SupplierChatConversation | null>(null)
  const [input, setInput] = useState('')
  const [messageSearch, setMessageSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [openPanel, setOpenPanel] = useState<'media' | 'files' | 'links' | null>(null)
  const [mediaModal, setMediaModal] = useState<{
    open: boolean
    url: string | null
    type: 'image' | 'video' | null
    name?: string
  }>({ open: false, url: null, type: null })

  const closeMediaModal = () => setMediaModal({ open: false, url: null, type: null })
  const openMediaModal = (next: { url: string; type: 'image' | 'video'; name?: string }) =>
    setMediaModal({ open: true, ...next })

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
    setOpenPanel(null)

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

  const appendSentMessage = (sent: SupplierChatMessage) => {
    setActiveConversation((prev) =>
      prev ? {
        ...prev,
        messages: [...(prev.messages ?? []), sent],
        last_message: { id: sent.id, message: sent.attachment_url ? `[${sent.attachment_type ?? 'file'}]` : sent.message, sender_type: sent.sender_type, sent_at: sent.created_at },
        last_message_at: sent.created_at,
        message_count: prev.message_count + 1,
        unread_count: 0,
      } : prev,
    )
    setConversations((prev) =>
      prev.map((c) => c.id === activeId ? {
        ...c,
        last_message: { id: sent.id, message: sent.attachment_url ? `[${sent.attachment_type ?? 'file'}]` : sent.message, sender_type: sent.sender_type, sent_at: sent.created_at },
        last_message_at: sent.created_at,
        message_count: c.message_count + 1,
        unread_count: 0,
      } : c)
    )
  }

  const handleSendMessage = async () => {
    if (!input.trim() && pendingAttachments.length === 0) return
    if (isSending) return

    const trimmed = input.trim()
    setIsSending(true)
    setError(null)

    try {
      if (!activeId) {
        const created = await createSupplierChatConversation('Support', trimmed || 'Hi')
        setActiveConversation({ ...created, messages: created.messages ?? [] })
        setActiveId(created.id)
        setConversations([{ ...created, messages: created.messages ?? [] }])
      } else {
        // Upload and send each attachment as its own message
        for (const attachment of pendingAttachments) {
          const uploaded = await uploadSupplierChatAttachment(attachment.file)
          const sent = await sendSupplierChatMessage(activeId, '', uploaded)
          appendSentMessage(sent)
        }
        // Send text message if present
        if (trimmed) {
          const sent = await sendSupplierChatMessage(activeId, trimmed)
          appendSentMessage(sent)
        }
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

  useEffect(() => {
    if (!mediaModal.open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMediaModal() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mediaModal.open])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const activeStatus = activeConversation?.status ?? 'open'
  const companyName = activeConversation?.company?.name?.trim() || 'Company'
  const companyLogoUrl = activeConversation?.company?.logo ?? null
  const chatAdminName = activeConversation?.assigned_admin?.name ?? activeConversation?.counterpart_label ?? 'AF Home'
  const chatAdminEmail = activeConversation?.assigned_admin?.email ?? ''
  const chatAdminAvatarUrl = activeConversation?.assigned_admin?.avatar_url ?? null
  const chatAdminInitials = getInitials(chatAdminName)
  const activeSubtitle = activeStatus === 'resolved' ? 'Resolved' : 'Admin · Active'

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
          <Avatar label={chatAdminInitials} color="bg-indigo-600" src={chatAdminAvatarUrl} alt={chatAdminName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{chatAdminName}</p>
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
            <Avatar label={chatAdminInitials} color="bg-indigo-600" src={chatAdminAvatarUrl} alt={chatAdminName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{chatAdminName}</p>
              <p className={`text-[11px] font-medium ${activeStatus === 'resolved' ? 'text-slate-400' : 'text-emerald-500'}`}>
                {activeSubtitle}
              </p>
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          {/* Messages area */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-5 scrollbar-none [&::-webkit-scrollbar]:hidden">
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
                      const senderAvatarUrl = mine ? null : chatAdminAvatarUrl
                      const senderAvatarLabel = mine ? getInitials('Supplier') : chatAdminInitials
                      return (
                        <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && (
                            <Avatar
                              label={senderAvatarLabel}
                              color="bg-slate-500"
                              src={senderAvatarUrl}
                              alt={chatAdminName}
                              size="sm"
                            />
                          )}
                        <div className={`max-w-[72%] ${mine ? 'ml-0' : 'ml-2'}`}>
                          {/* Attachment */}
                          {message.attachment_url && (
                            <div className="mb-1 overflow-hidden rounded-2xl">
                              {message.attachment_type === 'image' ? (
                                <div className="group relative inline-block">
                                  <button
                                    type="button"
                                    onClick={() => openMediaModal({ url: message.attachment_url ?? '', type: 'image', name: message.attachment_name ?? undefined })}
                                    className="block overflow-hidden rounded-2xl"
                                  >
                                    <img src={message.attachment_url} alt={message.attachment_name ?? 'image'} className="max-h-64 max-w-70 w-auto object-contain" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void forceDownload(message.attachment_url ?? '', message.attachment_name ?? 'image')}
                                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
                                    title="Download image"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
                                    </svg>
                                  </button>
                                </div>
                              ) : message.attachment_type === 'video' ? (
                                <div className="group relative inline-block">
                                  <video src={message.attachment_url} controls className="max-h-64 max-w-70 w-auto rounded-2xl object-contain" />
                                  <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => void forceDownload(message.attachment_url ?? '', message.attachment_name ?? 'video')}
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                                      title="Download video"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openMediaModal({ url: message.attachment_url ?? '', type: 'video', name: message.attachment_name ?? undefined })}
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                                      title="Open in fullscreen"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void forceDownload(message.attachment_url ?? '', message.attachment_name ?? 'file')}
                                  className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${mine ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'}`}
                                >
                                  <FileText className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{message.attachment_name ?? 'Download file'}</span>
                                </button>
                              )}
                            </div>
                          )}
                          {/* Text / Link preview */}
                          {message.message && (() => {
                            const urlMatch = message.message.match(/^https?:\/\/\S+$/)
                            if (urlMatch) {
                              return (
                                <div className="max-w-70">
                                  <LinkPreview url={urlMatch[0]} mine={mine} />
                                </div>
                              )
                            }
                            return (
                              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${mine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'}`}>
                                {message.message}
                              </div>
                            )
                          })()}
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={(emoji) => setInput((prev) => prev + emoji)}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => void handleSendMessage()}
                  disabled={(!input.trim() && pendingAttachments.length === 0) || isSending || isLoading}
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

            {/* Admin info */}
            <div className="flex shrink-0 flex-col items-center justify-center border-b border-slate-100 pb-4 text-center dark:border-slate-800">
              <div className="h-20 w-20 overflow-hidden rounded-full">
                {chatAdminAvatarUrl ? (
                  <img
                    src={chatAdminAvatarUrl}
                    alt={chatAdminName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-indigo-600 text-2xl font-bold text-white">
                    {chatAdminInitials}
                  </div>
                )}
              </div>
              <p className="mt-3 truncate text-[22px] font-bold leading-tight text-slate-900 dark:text-white">
                {chatAdminName}
              </p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Admin</p>
              {chatAdminEmail ? (
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{chatAdminEmail}</p>
              ) : null}
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

            {/* Media / Files / Links expandable panels */}
            {(() => {
              const mediaItems = activeMessages.filter((m) => m.attachment_type === 'image' || m.attachment_type === 'video')
              const fileItems = activeMessages.filter((m) => m.attachment_type === 'file')
              const linkItems = activeMessages.filter((m) => /https?:\/\/\S+/i.test(m.message))

              const panels = [
                { key: 'media' as const, label: 'Media', icon: <ImageIcon className="h-3.5 w-3.5" />, count: mediaItems.length },
                { key: 'files' as const, label: 'Files',  icon: <FileText  className="h-3.5 w-3.5" />, count: fileItems.length  },
                { key: 'links' as const, label: 'Links',  icon: <Link2     className="h-3.5 w-3.5" />, count: linkItems.length  },
              ]

              return (
                <div className="mt-4 space-y-2">
                  {/* Tab row */}
                  <div className="grid grid-cols-3 gap-2">
                    {panels.map(({ key, label, icon, count }) => {
                      const active = openPanel === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setOpenPanel(active ? null : key)}
                          className={`flex flex-col rounded-xl border px-3 py-2 text-left shadow-sm transition ${
                            active
                              ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40'
                              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
                          }`}
                        >
                          <p className={`flex items-center gap-1 text-[13px] font-semibold ${active ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                            {icon}{label}
                          </p>
                          <div className="mt-0.5 flex items-center justify-between">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{count} items</p>
                            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${active ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Slide-open panel */}
                  <div className={`overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 transition-all duration-300 ${openPanel ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0 border-transparent'}`}>
                    <div className="max-h-72 overflow-y-auto p-3 scrollbar-none [&::-webkit-scrollbar]:hidden">

                      {/* Media panel */}
                      {openPanel === 'media' && (
                        mediaItems.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">No media shared yet.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5">
                            {mediaItems.map((m) => {
                              const type = m.attachment_type === 'video' ? 'video' : 'image'
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => openMediaModal({ url: m.attachment_url ?? '', type, name: m.attachment_name ?? undefined })}
                                  className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 text-left dark:bg-slate-800"
                                >
                                  {type === 'image' ? (
                                    <img src={m.attachment_url ?? ''} alt={m.attachment_name ?? ''} className="h-full w-full object-cover transition group-hover:scale-105" />
                                  ) : (
                                    <>
                                      <video src={m.attachment_url ?? ''} className="h-full w-full object-cover" muted preload="metadata" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <Play className="h-5 w-5 fill-white text-white drop-shadow" />
                                      </div>
                                    </>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )
                      )}

                      {/* Files panel */}
                      {openPanel === 'files' && (
                        fileItems.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">No files shared yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {fileItems.map((m) => (
                              <button key={m.id} type="button"
                                onClick={() => void forceDownload(m.attachment_url ?? '', m.attachment_name ?? 'file')}
                                className="flex w-full items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                                <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                                <span className="min-w-0 flex-1 truncate text-left text-[12px] font-medium text-slate-700 dark:text-slate-200">
                                  {m.attachment_name ?? 'File'}
                                </span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              </button>
                            ))}
                          </div>
                        )
                      )}

                      {/* Links panel */}
                      {openPanel === 'links' && (
                        linkItems.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">No links shared yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {linkItems.map((m) => {
                              const url = (m.message.match(/https?:\/\/\S+/i) ?? [])[0] ?? ''
                              let host = ''
                              try { host = new URL(url).hostname } catch { host = url }
                              return (
                                <a key={m.id} href={url} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                                  <Link2 className="h-4 w-4 shrink-0 text-indigo-500" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-medium text-slate-700 dark:text-slate-200">{host}</p>
                                    <p className="truncate text-[10px] text-slate-400">{url}</p>
                                  </div>
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                </a>
                              )
                            })}
                          </div>
                        )
                      )}

                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </aside>

        {/* Media modal */}
        {mediaModal.open && mediaModal.url && mediaModal.type && (
          <div
            className="fixed inset-0 z-1000 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => { if (e.target === e.currentTarget) closeMediaModal() }}
          >
            <div className="relative w-full max-w-3xl rounded-2xl bg-slate-950 shadow-xl">
              {/* Top bar */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="truncate text-sm font-medium text-white/80">
                  {mediaModal.name ?? 'Media'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void forceDownload(mediaModal.url ?? '', mediaModal.name ?? 'file')}
                    className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
                    </svg>
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={closeMediaModal}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex w-full items-center justify-center p-2">
                {mediaModal.type === 'image' ? (
                  <img
                    src={mediaModal.url}
                    alt={mediaModal.name ?? 'Media'}
                    className="max-h-[80vh] w-full object-contain"
                  />
                ) : (
                  <video
                    src={mediaModal.url}
                    controls
                    className="max-h-[80vh] w-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
