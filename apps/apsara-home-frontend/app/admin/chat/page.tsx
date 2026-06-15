"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  FileText,
  Hash,
  Image as ImageIcon,
  Link2,
  Play,
  Mail,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Reply,
  Phone,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Smile,
  SquarePen,
  X,
} from "lucide-react"
import {
  fetchAdminSupplierChatConversation,
  fetchAdminSupplierChatConversations,
  sendAdminSupplierChatMessage,
  toggleAdminChatReaction,
  uploadAdminChatAttachment,
  type SupplierChatConversation,
  type SupplierChatMessage,
} from "@/libs/adminSupplierChat"
import EmojiPicker from "@/components/ui/EmojiPicker"
import LinkPreview from "@/components/ui/LinkPreview"

function LogoCircle({
  src,
  alt,
  className,
  fallback,
}: {
  src: string
  alt: string
  className?: string
  fallback: React.ReactNode
}) {
  const [errored, setErrored] = useState(false)

  if (errored) return <>{fallback}</>

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  )
}

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-indigo-500",
]

type ChatRenderItem =
  | { kind: "single"; message: SupplierChatMessage }
  | { kind: "imageGroup"; messages: SupplierChatMessage[] }

function buildRenderItems(messages: SupplierChatMessage[]): ChatRenderItem[] {
  const items: ChatRenderItem[] = []
  let i = 0
  while (i < messages.length) {
    const msg = messages[i]
    if (
      msg.attachment_type === "image" &&
      msg.attachment_url &&
      !msg.message.trim()
    ) {
      const group: SupplierChatMessage[] = [msg]
      i++
      while (
        i < messages.length &&
        messages[i].sender_type === msg.sender_type &&
        messages[i].attachment_type === "image" &&
        messages[i].attachment_url &&
        !messages[i].message.trim()
      ) {
        group.push(messages[i])
        i++
      }
      items.push(
        group.length === 1
          ? { kind: "single", message: group[0] }
          : { kind: "imageGroup", messages: group }
      )
    } else {
      items.push({ kind: "single", message: msg })
      i++
    }
  }
  return items
}

const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"] as const

type ConversationTab = "all" | "unread" | "archived"
type MessageGroup = {
  dateLabel: string
  displayLabel: string
  messages: SupplierChatMessage[]
}
type FileKind = "image" | "video" | "other"
type PendingAttachment = {
  id: string
  file: File
  previewUrl: string | null
  kind: FileKind
}

function fileKind(file: File): FileKind {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  return "other"
}

async function forceDownload(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, "_blank")
  }
}

type FileBadge = { letter: string; sub: string; colors: string }

function getFileBadge(file: File): FileBadge | null {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  if (type === "application/pdf" || name.endsWith(".pdf"))
    return {
      letter: "P",
      sub: "PDF",
      colors:
        "border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10",
    }

  if (type.includes("word") || name.endsWith(".doc") || name.endsWith(".docx"))
    return {
      letter: "W",
      sub: "DOC",
      colors:
        "border-blue-200 bg-blue-50 text-blue-500 dark:border-blue-500/30 dark:bg-blue-500/10",
    }

  if (
    type.includes("excel") ||
    type.includes("spreadsheetml") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx")
  )
    return {
      letter: "E",
      sub: "XLS",
      colors:
        "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10",
    }

  if (name.endsWith(".csv"))
    return {
      letter: "C",
      sub: "CSV",
      colors:
        "border-teal-200 bg-teal-50 text-teal-600 dark:border-teal-500/30 dark:bg-teal-500/10",
    }

  if (
    type.includes("powerpoint") ||
    type.includes("presentationml") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  )
    return {
      letter: "P",
      sub: "PPT",
      colors:
        "border-orange-200 bg-orange-50 text-orange-500 dark:border-orange-500/30 dark:bg-orange-500/10",
    }

  if (
    name.endsWith(".zip") ||
    name.endsWith(".rar") ||
    name.endsWith(".7z") ||
    name.endsWith(".tar") ||
    name.endsWith(".gz")
  )
    return {
      letter: "Z",
      sub: "ZIP",
      colors:
        "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-500/30 dark:bg-amber-500/10",
    }

  if (name.endsWith(".txt"))
    return {
      letter: "T",
      sub: "TXT",
      colors:
        "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-800",
    }

  return null
}

function Avatar({
  label,
  color,
  src,
  alt,
  online,
  size = "md",
}: {
  label: string
  color: string
  src?: string | null
  alt?: string
  online?: boolean
  size?: "sm" | "md" | "lg"
}) {
  const sizeClass =
    size === "lg"
      ? "h-11 w-11 text-sm"
      : size === "sm"
        ? "h-8 w-8 text-xs"
        : "h-10 w-10 text-sm"
  const dotClass = size === "lg" ? "h-3 w-3" : "h-2.5 w-2.5"
  return (
    <div className="relative shrink-0">
      <div
        className={`${sizeClass} ${color} overflow-hidden rounded-full font-bold text-white`}
      >
        {src ? (
          <img
            src={src}
            alt={alt ?? label}
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {label}
          </div>
        )}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotClass} rounded-full border-2 border-white dark:border-slate-900 ${
            online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
        />
      )}
    </div>
  )
}

function formatRelativeTime(value: string | null): string {
  if (!value) return "now"
  const ts = new Date(value)
  if (Number.isNaN(ts.getTime())) return "now"
  const diffMs = Date.now() - ts.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return ts.toLocaleDateString("en-PH")
}

function formatClock(value: string): string {
  const ts = new Date(value)
  if (Number.isNaN(ts.getTime())) return value
  return ts.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000
  )
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "yesterday"
  return startOfDate.toISOString().slice(0, 10)
}

function formatGroupLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000
  )
  const timeStr = date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  if (diffDays === 0) return `Today at ${timeStr}`
  if (diffDays === 1) return `Yesterday at ${timeStr}`
  const fullDate = date.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  return `${fullDate} at ${timeStr}`
}

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return "Last active recently"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "Last active recently"
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "Active now"
  if (diffMins < 60) return `Last active ${diffMins}m ago`
  if (diffHours < 24) return `Last active ${diffHours}h ago`
  if (diffDays === 1) return "Last active yesterday"
  return `Last active ${diffDays}d ago`
}

function getConversationTitle(conversation: SupplierChatConversation): string {
  return (
    conversation.company?.name?.trim() ||
    conversation.supplier_user?.name?.trim() ||
    conversation.counterpart_label ||
    "Supplier conversation"
  )
}

function getConversationPreview(
  conversation: SupplierChatConversation
): string {
  const lastMessage = conversation.last_message
  if (!lastMessage) return "No messages yet"

  const body = lastMessage.message.trim()
  const senderName =
    lastMessage.sender_type === "admin"
      ? "You"
      : conversation.supplier_user?.name?.trim() ||
        conversation.counterpart_label ||
        "Supplier"
  const senderPrefix =
    lastMessage.sender_type === "admin" ? "You sent" : `${senderName} sent`

  if (!body) return `${senderPrefix} an attachment`
  return `${senderPrefix}: ${body}`
}

function getInitials(value: string): string {
  const parts = value
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return "SP"
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function formatSupplierId(id: number | undefined): string {
  if (!id) return "—"
  return `SP-${String(id).padStart(4, "0")}`
}

export default function AdminChatPage() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<
    SupplierChatConversation[]
  >([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeConversation, setActiveConversation] =
    useState<SupplierChatConversation | null>(null)
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [messageSearch, setMessageSearch] = useState("")
  const [activeTab, setActiveTab] = useState<ConversationTab>("all")
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([])
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [openPanel, setOpenPanel] = useState<
    "media" | "files" | "links" | null
  >(null)
  const [replyTo, setReplyTo] = useState<SupplierChatMessage | null>(null)
  const [localReplyMap, setLocalReplyMap] = useState<
    Record<number, SupplierChatMessage>
  >({})
  const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentAdminId = Number(
    (session?.user as { id?: number | string } | undefined)?.id ?? 0
  )

  const [mediaModal, setMediaModal] = useState<{
    open: boolean
    url: string | null
    type: "image" | "video" | null
    name?: string
    urls?: string[]
    activeIndex?: number
  }>({ open: false, url: null, type: null })
  const mediaSlideDir = useRef<1 | -1>(1)

  const closeMediaModal = () =>
    setMediaModal({ open: false, url: null, type: null })

  const openMediaModal = (next: {
    url: string
    type: "image" | "video"
    name?: string
  }) =>
    setMediaModal({
      open: true,
      url: next.url,
      type: next.type,
      name: next.name,
      urls: undefined,
      activeIndex: undefined,
    })

  const openImageGroupModal = (urls: string[], startIndex = 0) => {
    mediaSlideDir.current = 1
    setMediaModal({
      open: true,
      url: urls[startIndex] ?? null,
      type: "image",
      urls,
      activeIndex: startIndex,
    })
  }

  const setMediaModalIndex = (next: number) => {
    setMediaModal((prev) => {
      if (!prev.urls) return prev
      const idx = Math.max(0, Math.min(next, prev.urls.length - 1))
      mediaSlideDir.current = idx > (prev.activeIndex ?? 0) ? 1 : -1
      return { ...prev, url: prev.urls[idx], activeIndex: idx }
    })
  }

  const conversationCacheRef = useRef<Map<number, SupplierChatConversation>>(
    new Map()
  )
  const activeIdRef = useRef<number | null>(null)
  const selectionRequestRef = useRef(0)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
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
        c.supplier_user?.name ?? "",
        c.supplier_user?.username ?? "",
        c.last_message?.message ?? "",
        c.status,
      ]
      return haystacks.some((v) => v.toLowerCase().includes(query))
    })
  }, [conversations, search])

  const tabConversations = useMemo(() => {
    if (activeTab === "unread")
      return filteredConversations.filter((c) => c.unread_count > 0)
    if (activeTab === "archived")
      return filteredConversations.filter((c) => c.status === "resolved")
    return filteredConversations.filter((c) => c.status !== "resolved")
  }, [filteredConversations, activeTab])

  const activeMessages = activeConversation?.messages ?? []

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

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
        groups.push({
          dateLabel: label,
          displayLabel: formatGroupLabel(message.created_at),
          messages: [message],
        })
      }
    }
    return groups
  }, [filteredMessages])

  const loadConversations = async (preferredId?: number | null) => {
    try {
      setIsLoading(true)
      setError(null)
      const requestId = ++selectionRequestRef.current
      const items = await fetchAdminSupplierChatConversations()
      setConversations(items)
      const nextActiveId =
        preferredId ?? activeIdRef.current ?? items[0]?.id ?? null
      if (requestId !== selectionRequestRef.current) return
      if (nextActiveId !== null) {
        void selectConversation(nextActiveId, items)
      } else {
        setActiveId(null)
        setActiveConversation(null)
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load supplier chats."
      )
      setConversations([])
      setActiveId(null)
      setActiveConversation(null)
    } finally {
      setIsLoading(false)
    }
  }

  const selectConversation = async (
    conversationId: number,
    sourceConversations = conversations
  ) => {
    const requestId = ++selectionRequestRef.current
    setActiveId(conversationId)
    setIsMobileOpen(true)
    setOpenPanel(null)
    setError(null)

    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    )

    // Serve from cache instantly, then refresh in the background
    const cached = conversationCacheRef.current.get(conversationId)
    if (cached) {
      setActiveConversation(cached)
    } else {
      const summary =
        sourceConversations.find((c) => c.id === conversationId) ?? null
      setActiveConversation(
        summary ? { ...summary, messages: summary.messages ?? [] } : null
      )
      setIsLoadingMessages(true)
    }

    try {
      const detailed = await fetchAdminSupplierChatConversation(conversationId)
      if (requestId !== selectionRequestRef.current) return
      const full = { ...detailed, messages: detailed.messages ?? [] }
      conversationCacheRef.current.set(conversationId, full)
      setActiveConversation(full)
    } catch (fetchError) {
      if (requestId !== selectionRequestRef.current) return
      if (!cached) {
        const summary =
          sourceConversations.find((c) => c.id === conversationId) ?? null
        setActiveConversation(
          summary ? { ...summary, messages: summary.messages ?? [] } : null
        )
      }
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load conversation."
      )
    } finally {
      if (requestId !== selectionRequestRef.current) return
      setIsLoadingMessages(false)
    }
  }

  useEffect(() => {
    void loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh conversation list every 30s to pick up supplier last_seen_at changes
  useEffect(() => {
    const refresh = async () => {
      try {
        const items = await fetchAdminSupplierChatConversations()
        setConversations(items)
      } catch {
        /* silent */
      }
    }
    const id = setInterval(() => void refresh(), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!mediaModal.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMediaModal()
      if (e.key === "ArrowRight" && mediaModal.urls)
        setMediaModalIndex((mediaModal.activeIndex ?? 0) + 1)
      if (e.key === "ArrowLeft" && mediaModal.urls)
        setMediaModalIndex((mediaModal.activeIndex ?? 0) - 1)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mediaModal.open, mediaModal.activeIndex, mediaModal.urls])

  useEffect(() => {
    if (!activeId) return
    const poll = async () => {
      if (typeof document !== "undefined" && document.hidden) return
      try {
        const detailed = await fetchAdminSupplierChatConversation(activeId)
        if (activeIdRef.current !== activeId) return
        const full = { ...detailed, messages: detailed.messages ?? [] }
        conversationCacheRef.current.set(activeId, full)
        setActiveConversation((prev) => {
          const prevLen = prev?.messages?.length ?? 0
          const newLen = full.messages.length
          const prevSeen = prev?.supplier_user?.last_seen_at ?? null
          const newSeen = full.supplier_user?.last_seen_at ?? null
          if (newLen !== prevLen || prevSeen !== newSeen) return full
          return prev
        })
        // Also update the conversation list entry so the sidebar dot reflects the new status
        setConversations((prev) =>
          prev.map((c) =>
            c.id === full.id ? { ...c, supplier_user: full.supplier_user } : c
          )
        )
      } catch {
        /* silent */
      }
    }
    const timer = setInterval(() => {
      void poll()
    }, 4000)
    return () => clearInterval(timer)
  }, [activeId])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeMessages.length, activeId])

  const appendSentMessage = (sent: SupplierChatMessage) => {
    const preview = sent.attachment_url
      ? `[${sent.attachment_type ?? "file"}]`
      : sent.message
    setActiveConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [...(prev.messages ?? []), sent],
            last_message: {
              id: sent.id,
              message: preview,
              sender_type: sent.sender_type,
              sent_at: sent.created_at,
            },
            last_message_at: sent.created_at,
            message_count: prev.message_count + 1,
            unread_count: 0,
          }
        : prev
    )
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              last_message: {
                id: sent.id,
                message: preview,
                sender_type: sent.sender_type,
                sent_at: sent.created_at,
              },
              last_message_at: sent.created_at,
              message_count: c.message_count + 1,
              unread_count: 0,
            }
          : c
      )
    )
  }

  const handleSendMessage = async () => {
    if (
      (!input.trim() && pendingAttachments.length === 0) ||
      !activeId ||
      isSending
    )
      return
    const trimmed = input.trim()
    setIsSending(true)
    setError(null)
    try {
      for (const attachment of pendingAttachments) {
        const uploaded = await uploadAdminChatAttachment(attachment.file)
        const sent = await sendAdminSupplierChatMessage(activeId, "", uploaded)
        appendSentMessage(sent)
      }
      const pendingReply = replyTo
      if (trimmed) {
        const sent = await sendAdminSupplierChatMessage(activeId, trimmed)
        appendSentMessage(sent)
        if (pendingReply)
          setLocalReplyMap((prev) => ({ ...prev, [sent.id]: pendingReply }))
      }
      setInput("")
      setReplyTo(null)
      pendingAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
      })
      setPendingAttachments([])
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to send message."
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSendMessage()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const handleAttachmentSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return
    const oversized = files.find((f) => f.size > MAX_ATTACHMENT_SIZE_BYTES)
    if (oversized) {
      setError(`${oversized.name} is larger than 25 MB.`)
      return
    }
    setError(null)
    setPendingAttachments((prev) => [
      ...prev,
      ...files.map((file) => {
        const kind = fileKind(file)
        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          previewUrl: kind !== "other" ? URL.createObjectURL(file) : null,
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

  const toggleReaction = (message: SupplierChatMessage, emoji: string) => {
    const current = message.reactions?.["admin"] ?? null
    const optimistic = { ...(message.reactions ?? {}) }
    if (current === emoji) delete optimistic["admin"]
    else optimistic["admin"] = emoji

    const updateMessages = (msgs: SupplierChatMessage[]) =>
      msgs.map((m) =>
        m.id === message.id
          ? {
              ...m,
              reactions: Object.keys(optimistic).length ? optimistic : null,
            }
          : m
      )

    setActiveConversation((prev) =>
      prev ? { ...prev, messages: updateMessages(prev.messages ?? []) } : prev
    )

    toggleAdminChatReaction(message.conversation_id, message.id, emoji)
      .then((updated) => {
        setActiveConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: (prev.messages ?? []).map((m) =>
                  m.id === updated.id
                    ? { ...m, reactions: updated.reactions }
                    : m
                ),
              }
            : prev
        )
      })
      .catch(() => {
        /* poll will self-correct */
      })
  }

  const enterMsg = (id: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHoveredMsgId(id)
  }
  const leaveMsg = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredMsgId(null), 300)
  }

  const activeConversationTitle = activeConversation
    ? getConversationTitle(activeConversation)
    : "No conversation selected"
  const activeStatus = activeConversation?.status ?? "open"
  const companyName =
    activeConversation?.company?.name?.trim() ||
    activeConversation?.counterpart_label ||
    "Supplier"
  const companyLogo = activeConversation?.company?.logo ?? null
  const supplierId = formatSupplierId(activeConversation?.supplier_user?.id)
  const supplierEmail = activeConversation?.supplier_user?.email ?? ""
  const supplierUsername = activeConversation?.supplier_user?.username
    ? `@${activeConversation.supplier_user.username}`
    : "—"
  const lastActive = formatLastActive(
    activeConversation?.last_message_at ?? null
  )
  const isSupplierOnline = (() => {
    const ts = activeConversation?.supplier_user?.last_seen_at
    if (!ts) return false
    const diffMs = Date.now() - new Date(ts).getTime()
    return diffMs < 2 * 60 * 1000 // online if heartbeat received within last 2 minutes
  })()

  return (
    <div className="flex h-[calc(100vh-104px)] flex-col gap-3 lg:h-[calc(100vh-120px)]">
      {/* Page title */}
      <div className="shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">
          Admin
        </p>
        <div className="mt-0.5 flex items-center gap-3">
          <h1 className="text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
            Supplier Chats
          </h1>
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
            isMobileOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Messages
              </span>
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
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            {(["all", "unread", "archived"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                }`}
              >
                {tab === "all" && "All"}
                {tab === "unread" && (
                  <>
                    Unread
                    {unreadTabCount > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          activeTab === "unread"
                            ? "bg-white/20 text-white"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                        }`}
                      >
                        {unreadTabCount}
                      </span>
                    )}
                  </>
                )}
                {tab === "archived" && "Archived"}
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
                <p className="text-sm text-slate-400">
                  Loading conversations...
                </p>
              </div>
            ) : tabConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <MessageSquare className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">
                  {activeTab === "unread"
                    ? "No unread conversations"
                    : activeTab === "archived"
                      ? "No archived conversations"
                      : "No conversations found"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {tabConversations.map((conversation, index) => {
                  const isActive = conversation.id === activeId
                  const avatarColor =
                    AVATAR_COLORS[index % AVATAR_COLORS.length]
                  const displayName = getConversationTitle(conversation)
                  const preview = getConversationPreview(conversation)
                  const convLastSeen = conversation.supplier_user?.last_seen_at
                  const convIsOnline = convLastSeen
                    ? Date.now() - new Date(convLastSeen).getTime() <
                      2 * 60 * 1000
                    : false
                  return (
                    <button
                      key={conversation.id}
                      onClick={() =>
                        void selectConversation(conversation.id, conversations)
                      }
                      className={`relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-500/10"
                          : conversation.unread_count > 0
                            ? "bg-indigo-50/40 hover:bg-indigo-50 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      {/* Unread left accent bar */}
                      {conversation.unread_count > 0 && !isActive && (
                        <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500" />
                      )}

                      {/* Avatar */}
                      {conversation.company?.logo ? (
                        <div className="relative shrink-0">
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
                            <LogoCircle
                              src={conversation.company.logo}
                              alt={displayName}
                              className="h-full w-full rounded-full object-contain bg-white p-1 dark:bg-slate-900"
                              fallback={
                                <Avatar
                                  label={getInitials(displayName)}
                                  color={avatarColor}
                                />
                              }
                            />
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              convIsOnline ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                        </div>
                      ) : (
                        <Avatar
                          label={getInitials(displayName)}
                          color={avatarColor}
                          online={convIsOnline}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-[13px] ${
                              isActive
                                ? "font-bold text-indigo-700 dark:text-indigo-300"
                                : conversation.unread_count > 0
                                  ? "font-bold text-slate-900 dark:text-white"
                                  : "font-semibold text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {displayName}
                          </span>
                          <span
                            className={`shrink-0 text-[10px] ${conversation.unread_count > 0 && !isActive ? "font-semibold text-indigo-500" : "text-slate-400"}`}
                          >
                            {formatRelativeTime(
                              conversation.last_message_at ??
                                conversation.updated_at
                            )}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p
                            className={`truncate text-[12px] ${
                              conversation.unread_count > 0 && !isActive
                                ? "font-semibold text-slate-700 dark:text-slate-200"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {preview}
                          </p>
                          {conversation.unread_count > 0 && (
                            <span className="ml-2 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white shadow-sm">
                              {conversation.unread_count > 99
                                ? "99+"
                                : conversation.unread_count}
                            </span>
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
              {tabConversations.length}{" "}
              {tabConversations.length === 1 ? "conversation" : "conversations"}
            </span>
            <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Main chat area ── */}
        <div
          className={`relative flex flex-1 flex-col ${
            !isMobileOpen && !activeConversation ? "hidden md:flex" : "flex"
          }`}
          style={{
            background:
              "linear-gradient(145deg,#eef2ff 0%,#f0f4ff 40%,#e8eeff 100%)",
          }}
        >
          {/* Fixed decorative background — sits behind scrollable content */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <svg
              className="h-full w-full opacity-[0.13]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g
                transform="translate(48,80)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <rect x="0" y="14" width="56" height="36" rx="3" />
                <polyline points="0,14 28,0 56,14" />
                <rect x="18" y="28" width="20" height="22" rx="2" />
                <rect x="4" y="20" width="14" height="12" rx="1" />
                <rect x="38" y="20" width="14" height="12" rx="1" />
              </g>
              <g
                transform="translate(520,60)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <path d="M2 2h6l4 18h22l4-14H10" />
                <circle cx="16" cy="26" r="2" />
                <circle cx="32" cy="26" r="2" />
              </g>
              <g
                transform="translate(260,40)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <polyline points="0,12 22,0 44,12 44,36 22,48 0,36 0,12" />
                <polyline points="0,12 22,24 44,12" />
                <line x1="22" y1="24" x2="22" y2="48" />
              </g>
              <g
                transform="translate(580,340)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <rect x="0" y="6" width="38" height="28" rx="2" />
                <path d="M38,16 h14 l6,12 v6 h-20 z" />
                <circle cx="10" cy="38" r="5" />
                <circle cx="48" cy="38" r="5" />
              </g>
              <g
                transform="translate(440,240)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <rect x="0" y="0" width="52" height="38" rx="12" />
                <path d="M10,38 L6,52 L20,42" />
              </g>
              <g
                transform="translate(60,400)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <circle cx="28" cy="28" r="28" />
                <path d="M28,28 L28,0 A28,28 0 0,1 56,28 Z" />
                <line x1="28" y1="28" x2="28" y2="0" />
              </g>
              <g
                transform="translate(620,460)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <rect x="0" y="24" width="12" height="22" rx="2" />
                <rect x="18" y="12" width="12" height="34" rx="2" />
                <rect x="36" y="4" width="12" height="42" rx="2" />
              </g>
              <g
                transform="translate(200,360)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <circle cx="22" cy="10" r="10" />
                <path d="M0,46 C0,30 44,30 44,46" />
              </g>
              <g
                transform="translate(340,200)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <polyline points="0,8 16,0 32,8 32,26 16,34 0,26 0,8" />
                <polyline points="0,8 16,16 32,8" />
                <line x1="16" y1="16" x2="16" y2="34" />
              </g>
              <circle cx="130" cy="140" r="2" fill="#6366f1" />
              <circle cx="148" cy="140" r="2" fill="#6366f1" />
              <circle cx="166" cy="140" r="2" fill="#6366f1" />
              <circle cx="184" cy="140" r="2" fill="#6366f1" />
              <circle cx="202" cy="140" r="2" fill="#6366f1" />
              <circle cx="130" cy="158" r="2" fill="#6366f1" />
              <circle cx="148" cy="158" r="2" fill="#6366f1" />
              <circle cx="166" cy="158" r="2" fill="#6366f1" />
              <circle cx="184" cy="158" r="2" fill="#6366f1" />
              <circle cx="202" cy="158" r="2" fill="#6366f1" />
              <circle cx="130" cy="176" r="2" fill="#6366f1" />
              <circle cx="148" cy="176" r="2" fill="#6366f1" />
              <circle cx="166" cy="176" r="2" fill="#6366f1" />
              <circle cx="184" cy="176" r="2" fill="#6366f1" />
              <circle cx="202" cy="176" r="2" fill="#6366f1" />
              <circle cx="130" cy="194" r="2" fill="#6366f1" />
              <circle cx="148" cy="194" r="2" fill="#6366f1" />
              <circle cx="166" cy="194" r="2" fill="#6366f1" />
              <circle cx="184" cy="194" r="2" fill="#6366f1" />
              <circle cx="202" cy="194" r="2" fill="#6366f1" />
              <circle cx="130" cy="212" r="2" fill="#6366f1" />
              <circle cx="148" cy="212" r="2" fill="#6366f1" />
              <circle cx="166" cy="212" r="2" fill="#6366f1" />
              <circle cx="184" cy="212" r="2" fill="#6366f1" />
              <circle cx="202" cy="212" r="2" fill="#6366f1" />
              <circle cx="130" cy="230" r="2" fill="#6366f1" />
              <circle cx="148" cy="230" r="2" fill="#6366f1" />
              <circle cx="166" cy="230" r="2" fill="#6366f1" />
              <circle cx="184" cy="230" r="2" fill="#6366f1" />
              <circle cx="202" cy="230" r="2" fill="#6366f1" />
            </svg>
            <span className="absolute left-[38%] top-[22%] h-3 w-3 rounded-full bg-orange-400/60" />
            <span className="absolute left-[62%] top-[55%] h-2.5 w-2.5 rounded-full bg-teal-400/50" />
            <span className="absolute left-[20%] top-[68%] h-2 w-2 rounded-full bg-violet-400/50" />
            <span className="absolute left-[75%] top-[30%] h-2 w-2 rounded-full bg-sky-400/50" />
          </div>
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
                  <div className="relative h-11 w-11 shrink-0">
                    <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
                      <LogoCircle
                        src={companyLogo}
                        alt={activeConversationTitle}
                        className="h-full w-full rounded-full object-contain bg-white p-1 dark:bg-slate-900"
                        fallback={
                          <Avatar
                            label={getInitials(activeConversationTitle)}
                            color={AVATAR_COLORS[0]}
                            size="lg"
                          />
                        }
                      />
                    </div>
                    {activeStatus !== "resolved" && (
                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${isSupplierOnline ? "bg-emerald-500" : "bg-slate-400"}`}
                      />
                    )}
                  </div>
                ) : (
                  <Avatar
                    label={getInitials(activeConversationTitle)}
                    color={AVATAR_COLORS[0]}
                    online={isSupplierOnline}
                    size="lg"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">
                    {activeConversationTitle}
                  </p>
                  <p
                    className={`text-[11px] font-medium ${
                      activeStatus === "resolved"
                        ? "text-slate-400"
                        : isSupplierOnline
                          ? "text-emerald-500"
                          : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {activeStatus === "resolved"
                      ? "Resolved"
                      : isSupplierOnline
                        ? `Online · ${lastActive}`
                        : lastActive}
                  </p>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="relative flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
              >
                <div className="px-5 py-5">
                  {isLoadingMessages ? (
                    <div className="flex flex-col gap-4">
                      {[72, 48, 64, 40, 56].map((w, i) => (
                        <div
                          key={i}
                          className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className="h-9 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                            style={{ width: `${w}%`, maxWidth: "72%" }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : messageGroups.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <p className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {messageSearch.trim()
                            ? "No matching messages"
                            : "No messages yet"}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {messageSearch.trim()
                            ? "Try a different search term."
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
                            {group.displayLabel}
                          </span>
                          <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                        </div>

                        {/* Messages in this group */}
                        <div className="space-y-3">
                          {buildRenderItems(group.messages).map((item) => {
                            /* ── Image grid cluster ── */
                            if (item.kind === "imageGroup") {
                              const mine =
                                item.messages[0].sender_type === "admin"
                              const imgs = item.messages
                              const lastMsg = imgs[imgs.length - 1]
                              {
                                /* Stacked card deck — show up to 3 behind, top card is clickable */
                              }
                              const stackVisible = imgs.slice(
                                0,
                                Math.min(imgs.length, 3)
                              )
                              const cardTransforms = [
                                "rotate(-11deg) translate(-14px, 10px)",
                                "rotate(7deg) translate(10px, -6px)",
                                "rotate(-2deg) translate(2px, 2px)",
                              ]
                              return (
                                <div
                                  key={item.messages[0].id}
                                  className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                                >
                                  {!mine && (
                                    <Avatar
                                      label={getInitials(
                                        activeConversationTitle
                                      )}
                                      color="bg-slate-500"
                                      src={companyLogo}
                                      alt={activeConversationTitle}
                                      size="sm"
                                    />
                                  )}
                                  <div>
                                    {/* Card stack — extra bottom margin clears rotated card overflow */}
                                    <div
                                      className="relative"
                                      style={{
                                        width: 190,
                                        height: 220,
                                        marginBottom: 28,
                                      }}
                                    >
                                      {stackVisible.map((msg, idx) => {
                                        const isTop =
                                          idx === stackVisible.length - 1
                                        return (
                                          <div
                                            key={msg.id}
                                            style={{
                                              position: "absolute",
                                              inset: 0,
                                              zIndex: idx + 1,
                                              transform:
                                                cardTransforms[
                                                  stackVisible.length === 2
                                                    ? idx + 1
                                                    : idx
                                                ] ?? cardTransforms[2],
                                            }}
                                            className="overflow-hidden rounded-2xl shadow-lg"
                                          >
                                            <button
                                              type="button"
                                              onClick={
                                                isTop
                                                  ? () =>
                                                      openImageGroupModal(
                                                        imgs
                                                          .map(
                                                            (m) =>
                                                              m.attachment_url ??
                                                              ""
                                                          )
                                                          .filter(Boolean)
                                                      )
                                                  : undefined
                                              }
                                              className="block h-full w-full"
                                              style={{
                                                cursor: isTop
                                                  ? "pointer"
                                                  : "default",
                                              }}
                                            >
                                              <img
                                                src={msg.attachment_url ?? ""}
                                                alt=""
                                                className="h-full w-full object-cover"
                                              />
                                            </button>
                                            {isTop && imgs.length > 1 && (
                                              <div className="absolute bottom-2 right-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-black/60 px-1.5 text-[11px] font-bold text-white">
                                                {imgs.length}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                    <div
                                      className={`flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}
                                    >
                                      <span className="text-[10px] text-slate-400">
                                        {formatClock(lastMsg.created_at)}
                                      </span>
                                      {mine && (
                                        <CheckCheck
                                          className={`h-3 w-3 ${lastMsg.is_read ? "text-indigo-500" : "text-slate-400"}`}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            }

                            /* ── Single message ── */
                            const { message } = item
                            const mine = message.sender_type === "admin"
                            const replySource = localReplyMap[message.id]
                            const isHovered = hoveredMsgId === message.id
                            const myReaction =
                              message.reactions?.["admin"] ?? null
                            const reactionCounts = Object.values(
                              message.reactions ?? {}
                            ).reduce(
                              (acc, e) => {
                                acc[e] = (acc[e] ?? 0) + 1
                                return acc
                              },
                              {} as Record<string, number>
                            )
                            const activeReactions =
                              Object.entries(reactionCounts)
                            return (
                              <div
                                key={message.id}
                                className={`relative flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${activeReactions.length > 0 ? "mb-4" : ""}`}
                              >
                                {!mine && (
                                  <Avatar
                                    label={getInitials(activeConversationTitle)}
                                    color="bg-slate-500"
                                    src={companyLogo}
                                    alt={activeConversationTitle}
                                    size="sm"
                                  />
                                )}
                                <div
                                  className={`relative max-w-[72%] ${mine ? "" : "ml-0"}`}
                                  onMouseEnter={() => enterMsg(message.id)}
                                  onMouseLeave={leaveMsg}
                                >
                                  {/* Hover action bar */}
                                  <div
                                    onMouseEnter={() => enterMsg(message.id)}
                                    className={`absolute -top-10 ${mine ? "right-0" : "left-0"} z-20 flex items-center gap-1 rounded-full border border-slate-100 bg-white px-3 py-1.5 shadow-xl transition-all duration-150 whitespace-nowrap ${isHovered ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-95"}`}
                                  >
                                    {QUICK_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() =>
                                          toggleReaction(message, emoji)
                                        }
                                        className={`text-2xl leading-none transition-all duration-150 hover:scale-150 hover:-translate-y-1 active:scale-90 ${myReaction === emoji ? "opacity-100 scale-110" : "opacity-70 hover:opacity-100"}`}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                    <span className="mx-1 h-4 w-px bg-slate-200" />
                                    <button
                                      type="button"
                                      onClick={() => setReplyTo(message)}
                                      className="flex items-center justify-center text-slate-400 transition-colors hover:text-indigo-600"
                                    >
                                      <Reply className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  {/* Reply quote */}
                                  {replySource && (
                                    <div
                                      className={`mb-1 max-w-full rounded-t-xl border-l-4 px-3 py-1.5 text-xs ${mine ? "border-indigo-300 bg-indigo-100/60 text-indigo-800" : "border-slate-300 bg-slate-100 text-slate-600"}`}
                                    >
                                      <p className="font-semibold mb-0.5">
                                        {replySource.sender_type === "admin"
                                          ? "You"
                                          : activeConversationTitle}
                                      </p>
                                      <p className="truncate">
                                        {replySource.message || "[attachment]"}
                                      </p>
                                    </div>
                                  )}
                                  {/* Attachment */}
                                  {message.attachment_url && (
                                    <div className="mb-1 overflow-hidden rounded-2xl">
                                      {message.attachment_type === "image" ? (
                                        <div className="group relative inline-block">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openMediaModal({
                                                url:
                                                  message.attachment_url ?? "",
                                                type: "image",
                                                name:
                                                  message.attachment_name ??
                                                  undefined,
                                              })
                                            }
                                            className="block overflow-hidden rounded-2xl"
                                          >
                                            <img
                                              src={message.attachment_url}
                                              alt={
                                                message.attachment_name ??
                                                "image"
                                              }
                                              className="max-h-64 max-w-[280px] w-auto object-contain"
                                            />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void forceDownload(
                                                message.attachment_url ?? "",
                                                message.attachment_name ??
                                                  "image"
                                              )
                                            }
                                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
                                            title="Download image"
                                          >
                                            <svg
                                              className="h-3.5 w-3.5"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11"
                                              />
                                            </svg>
                                          </button>
                                        </div>
                                      ) : message.attachment_type ===
                                        "video" ? (
                                        <div className="group relative inline-block">
                                          <video
                                            src={message.attachment_url}
                                            controls
                                            preload="metadata"
                                            className="max-h-64 max-w-[280px] w-auto rounded-2xl object-contain"
                                          />
                                          <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void forceDownload(
                                                  message.attachment_url ?? "",
                                                  message.attachment_name ??
                                                    "video"
                                                )
                                              }
                                              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                                              title="Download video"
                                            >
                                              <svg
                                                className="h-3.5 w-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11"
                                                />
                                              </svg>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openMediaModal({
                                                  url:
                                                    message.attachment_url ??
                                                    "",
                                                  type: "video",
                                                  name:
                                                    message.attachment_name ??
                                                    undefined,
                                                })
                                              }
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
                                          onClick={() =>
                                            void forceDownload(
                                              message.attachment_url ?? "",
                                              message.attachment_name ?? "file"
                                            )
                                          }
                                          className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${
                                            mine
                                              ? "bg-indigo-700 text-white"
                                              : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                                          }`}
                                        >
                                          <FileText className="h-4 w-4 shrink-0" />
                                          <span className="truncate">
                                            {message.attachment_name ??
                                              "Download file"}
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {/* Text / Link preview */}
                                  {message.message &&
                                    (() => {
                                      const urlMatch =
                                        message.message.match(
                                          /^https?:\/\/\S+$/
                                        )
                                      const reactionBadge =
                                        activeReactions.length > 0 && (
                                          <div
                                            className={`absolute -bottom-3 ${mine ? "left-1" : "-right-2"} flex items-center`}
                                          >
                                            {activeReactions.map(
                                              ([emoji, count]) => (
                                                <button
                                                  key={emoji}
                                                  type="button"
                                                  onClick={() =>
                                                    toggleReaction(
                                                      message,
                                                      emoji
                                                    )
                                                  }
                                                  className="flex items-center text-base leading-none transition hover:scale-110 active:scale-95"
                                                >
                                                  <span>{emoji}</span>
                                                  {count > 1 && (
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                      {count}
                                                    </span>
                                                  )}
                                                </button>
                                              )
                                            )}
                                          </div>
                                        )
                                      if (urlMatch) {
                                        return (
                                          <div
                                            className={`relative max-w-[280px] ${activeReactions.length > 0 ? "mb-4" : ""}`}
                                          >
                                            <LinkPreview
                                              url={urlMatch[0]}
                                              mine={mine}
                                            />
                                            {reactionBadge}
                                          </div>
                                        )
                                      }
                                      return (
                                        <div
                                          className={`relative ${activeReactions.length > 0 ? "mb-4" : ""}`}
                                        >
                                          <div
                                            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                              mine
                                                ? "rounded-br-md bg-indigo-600 text-white"
                                                : "rounded-bl-md bg-white text-slate-800 border border-slate-200 shadow-sm"
                                            }`}
                                          >
                                            {message.message}
                                          </div>
                                          {reactionBadge}
                                        </div>
                                      )
                                    })()}
                                  <div
                                    className={`mt-1 flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}
                                  >
                                    <span className="text-[10px] text-slate-400">
                                      {formatClock(message.created_at)}
                                    </span>
                                    {mine && (
                                      <CheckCheck
                                        className={`h-3 w-3 ${message.is_read ? "text-indigo-500" : "text-slate-400"}`}
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
                {/* end relative px-5 py-5 */}
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
                          {attachment.kind === "image" &&
                          attachment.previewUrl ? (
                            <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700">
                              <img
                                src={attachment.previewUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : attachment.kind === "video" &&
                            attachment.previewUrl ? (
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
                          ) : (
                            (() => {
                              const badge = getFileBadge(attachment.file)
                              return badge ? (
                                /* Typed file badge — letter + extension label */
                                <div
                                  className={`flex h-20 w-20 flex-col items-center justify-center rounded-xl border shadow-sm ${badge.colors}`}
                                >
                                  <span className="text-3xl font-black leading-none">
                                    {badge.letter}
                                  </span>
                                  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest opacity-70">
                                    {badge.sub}
                                  </span>
                                </div>
                              ) : (
                                /* Generic file icon fallback */
                                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                  <FileText className="h-6 w-6 text-slate-400" />
                                </div>
                              )
                            })()
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Reply preview */}
                  {replyTo && (
                    <div className="mb-2 flex items-start gap-2 rounded-xl border-l-4 border-indigo-500 bg-indigo-50 px-3 py-2 dark:bg-indigo-900/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                          Replying to{" "}
                          {replyTo.sender_type === "admin"
                            ? "yourself"
                            : activeConversationTitle}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">
                          {replyTo.message || "[attachment]"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyTo(null)}
                        className="shrink-0 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
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
                    style={{ maxHeight: "120px" }}
                  />
                  <div className="relative mt-2 flex items-center gap-1">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      multiple
                      onChange={handleAttachmentSelect}
                      className="hidden"
                    />
                    <input
                      ref={imageInputRef}
                      type="file"
                      multiple
                      accept="image/*"
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
                      onClick={() => imageInputRef.current?.click()}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                      <ImageIcon className="h-4 w-4" />
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
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={
                        (!input.trim() && pendingAttachments.length === 0) ||
                        isSending
                      }
                      className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-indigo-500 to-violet-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-200/60 transition hover:from-indigo-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-indigo-900/30"
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
                  Pick a supplier conversation from the list to read the history
                  and reply.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 xl:flex">
          <div className="flex h-full flex-col overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
            {/* Company info */}
            <div className="flex shrink-0 flex-col items-center border-b border-slate-100 px-4 pb-5 pt-6 text-center dark:border-slate-800">
              <div className="relative">
                {companyLogo ? (
                  <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-white dark:border-slate-700">
                    <LogoCircle
                      src={companyLogo}
                      alt={companyName}
                      className="h-full w-full rounded-full object-contain bg-white p-1 dark:bg-slate-900"
                      fallback={
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
                          {getInitials(companyName)}
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
                    {getInitials(companyName)}
                  </div>
                )}
                {activeStatus !== "resolved" && (
                  <span
                    className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${isSupplierOnline ? "bg-emerald-500" : "bg-slate-400"}`}
                  />
                )}
              </div>
              <p className="mt-3 truncate text-[20px] font-bold leading-tight text-slate-900 dark:text-white">
                {companyName}
              </p>
              <p
                className={`mt-0.5 text-sm font-medium ${isSupplierOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}
              >
                {isSupplierOnline ? "Online" : lastActive}
              </p>
            </div>

            {/* Search */}
            <div className="shrink-0 px-4 pt-4">
              <p className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                Search conversation
              </p>
              <div className="relative">
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
                    onClick={() => setMessageSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Media / Files / Links — vertical list */}
            {(() => {
              const mediaItems = activeMessages.filter(
                (m) =>
                  m.attachment_type === "image" || m.attachment_type === "video"
              )
              const fileItems = activeMessages.filter(
                (m) => m.attachment_type === "file"
              )
              const linkItems = activeMessages.filter((m) =>
                /https?:\/\/\S+/i.test(m.message)
              )
              const panels = [
                {
                  key: "media" as const,
                  label: "Media",
                  icon: <ImageIcon className="h-4 w-4 text-indigo-500" />,
                  count: mediaItems.length,
                },
                {
                  key: "files" as const,
                  label: "Files",
                  icon: <FileText className="h-4 w-4 text-indigo-500" />,
                  count: fileItems.length,
                },
                {
                  key: "links" as const,
                  label: "Links",
                  icon: <Link2 className="h-4 w-4 text-indigo-500" />,
                  count: linkItems.length,
                },
              ]
              return (
                <div className="mt-4 space-y-1 px-4">
                  {panels.map(({ key, label, icon, count }) => (
                    <div key={key}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenPanel(openPanel === key ? null : key)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                          openPanel === key
                            ? "border-indigo-100 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-900/20"
                            : "border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {label}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {count} {count === 1 ? "item" : "items"}
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${openPanel === key ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Expand */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ${openPanel === key ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}
                      >
                        <div className="max-h-64 overflow-y-auto rounded-b-xl border border-t-0 border-slate-100 p-2 scrollbar-none dark:border-slate-800 [&::-webkit-scrollbar]:hidden">
                          {key === "media" &&
                            (mediaItems.length === 0 ? (
                              <p className="py-3 text-center text-xs text-slate-400">
                                No media shared yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-3 gap-1.5">
                                {(() => {
                                  const imgUrls = mediaItems
                                    .filter(
                                      (m) => m.attachment_type === "image"
                                    )
                                    .map((m) => m.attachment_url ?? "")
                                    .filter(Boolean)
                                  return mediaItems.map((m) => {
                                    const url = m.attachment_url ?? ""
                                    const type =
                                      m.attachment_type === "video"
                                        ? "video"
                                        : "image"
                                    return (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() =>
                                          type === "image"
                                            ? openImageGroupModal(
                                                imgUrls,
                                                imgUrls.indexOf(url)
                                              )
                                            : openMediaModal({
                                                url,
                                                type,
                                                name:
                                                  m.attachment_name ??
                                                  undefined,
                                              })
                                        }
                                        className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
                                      >
                                        {type === "image" ? (
                                          <img
                                            src={url}
                                            alt=""
                                            className="h-full w-full object-cover transition group-hover:scale-105"
                                          />
                                        ) : (
                                          <>
                                            <video
                                              src={url}
                                              className="h-full w-full object-cover"
                                              muted
                                              preload="metadata"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                              <Play className="h-4 w-4 fill-white text-white" />
                                            </div>
                                          </>
                                        )}
                                      </button>
                                    )
                                  })
                                })()}
                              </div>
                            ))}
                          {key === "files" &&
                            (fileItems.length === 0 ? (
                              <p className="py-3 text-center text-xs text-slate-400">
                                No files shared yet.
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {fileItems.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() =>
                                      void forceDownload(
                                        m.attachment_url ?? "",
                                        m.attachment_name ?? "file"
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                                  >
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                      {m.attachment_name ?? "File"}
                                    </span>
                                    <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                                  </button>
                                ))}
                              </div>
                            ))}
                          {key === "links" &&
                            (linkItems.length === 0 ? (
                              <p className="py-3 text-center text-xs text-slate-400">
                                No links shared yet.
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {linkItems.map((m) => {
                                  const url =
                                    (m.message.match(/https?:\/\/\S+/i) ??
                                      [])[0] ?? ""
                                  let host = ""
                                  try {
                                    host = new URL(url).hostname
                                  } catch {
                                    host = url
                                  }
                                  return (
                                    <a
                                      key={m.id}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                      <Link2 className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                          {host}
                                        </p>
                                        <p className="truncate text-[10px] text-slate-400">
                                          {url}
                                        </p>
                                      </div>
                                    </a>
                                  )
                                })}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* About supplier */}
            <div className="mt-4 px-4 pb-5">
              <p className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
                About supplier
              </p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs">Supplier ID</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {supplierId}
                  </span>
                </div>
                {supplierEmail && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">Email</span>
                    </div>
                    <span className="max-w-[55%] truncate text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {supplierEmail}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs">Username</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {supplierUsername}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Media modal */}
        <AnimatePresence>
          {mediaModal.open && mediaModal.url && mediaModal.type && (
            <motion.div
              key="media-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeMediaModal()
              }}
            >
              <motion.div
                key="media-panel"
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-3xl rounded-2xl bg-slate-950 shadow-xl"
              >
                {/* Top bar */}
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <p className="truncate text-sm font-medium text-white/80">
                    {mediaModal.urls
                      ? `Image ${(mediaModal.activeIndex ?? 0) + 1} of ${mediaModal.urls.length}`
                      : (mediaModal.name ?? "Media")}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void forceDownload(
                          mediaModal.url ?? "",
                          mediaModal.name ?? "image"
                        )
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11"
                        />
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

                {/* Image / Video */}
                <div className="relative flex w-full items-center justify-center overflow-hidden p-2">
                  <AnimatePresence
                    mode="popLayout"
                    custom={mediaSlideDir.current}
                  >
                    {mediaModal.type === "image" ? (
                      <motion.img
                        key={mediaModal.url}
                        custom={mediaSlideDir.current}
                        variants={{
                          enter: (d: number) => ({ x: d * 80, opacity: 0 }),
                          center: { x: 0, opacity: 1 },
                          exit: (d: number) => ({ x: d * -80, opacity: 0 }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        src={mediaModal.url}
                        alt={mediaModal.name ?? "Media"}
                        className="max-h-[78vh] w-full object-contain"
                      />
                    ) : (
                      <video
                        key={mediaModal.url}
                        src={mediaModal.url}
                        controls
                        className="max-h-[78vh] w-full object-contain"
                      />
                    )}
                  </AnimatePresence>

                  {/* Prev / Next */}
                  {mediaModal.urls && mediaModal.urls.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setMediaModalIndex((mediaModal.activeIndex ?? 0) - 1)
                        }
                        disabled={(mediaModal.activeIndex ?? 0) === 0}
                        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:scale-110 hover:bg-black/70 disabled:opacity-30"
                        aria-label="Previous"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMediaModalIndex((mediaModal.activeIndex ?? 0) + 1)
                        }
                        disabled={
                          (mediaModal.activeIndex ?? 0) ===
                          (mediaModal.urls?.length ?? 1) - 1
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:scale-110 hover:bg-black/70 disabled:opacity-30"
                        aria-label="Next"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {/* Dot indicators */}
                {mediaModal.urls && mediaModal.urls.length > 1 && (
                  <div className="flex justify-center gap-2 border-t border-white/10 py-3">
                    {mediaModal.urls.map((_, i) => (
                      <motion.button
                        key={i}
                        type="button"
                        onClick={() => setMediaModalIndex(i)}
                        animate={{
                          width: i === mediaModal.activeIndex ? 24 : 8,
                          backgroundColor:
                            i === mediaModal.activeIndex
                              ? "#6366f1"
                              : "#ffffff40",
                        }}
                        transition={{ duration: 0.2 }}
                        className="h-2 rounded-full"
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
