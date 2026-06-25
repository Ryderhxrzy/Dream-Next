"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  createSupplierChatConversation,
  fetchSupplierChatConversation,
  fetchSupplierChatConversations,
  sendSupplierChatMessage,
  toggleSupplierChatReaction,
  uploadSupplierChatAttachment,
  type SupplierChatConversation,
  type SupplierChatMessage,
} from "@/libs/supplierChat"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Play,
  RefreshCw,
  Reply,
  Search,
  Send,
  Smile,
  X,
} from "lucide-react"
import { useSession } from "next-auth/react"

import EmojiPicker from "@/components/ui/EmojiPicker"
import LinkPreview from "@/components/ui/LinkPreview"

const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"] as const

type FileKind = "image" | "video" | "other"
type PendingAttachment = {
  id: string
  file: File
  previewUrl: string | null
  kind: FileKind
}
type MessageGroup = {
  dateLabel: string
  displayLabel: string
  messages: SupplierChatMessage[]
}

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

function fileKind(file: File): FileKind {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  return "other"
}

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
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {label}
          </div>
        )}
      </div>
      {online !== undefined && (
        <span
          className={`absolute right-0 bottom-0 ${dotClass} rounded-full border-2 border-white dark:border-slate-900 ${
            online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
        />
      )}
    </div>
  )
}

function formatClock(value: string): string {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return value

  return timestamp.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function getInitials(value: string): string {
  const parts = value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return "SP"
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export default function SupplierChatPage() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<
    SupplierChatConversation[]
  >([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeConversation, setActiveConversation] =
    useState<SupplierChatConversation | null>(null)
  const [input, setInput] = useState("")
  const [messageSearch, setMessageSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([])
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
  const currentSupplierUserId = Number(
    (session?.user as { id?: number | string } | undefined)?.id ?? 0
  )
  const myDisplayName =
    (session?.user as { name?: string | null } | undefined)?.name?.trim() ||
    (session?.user as { supplierName?: string | null } | undefined)?.supplierName?.trim() ||
    "You"

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
      ...next,
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

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + conversation.unread_count,
    0
  )

  const activeMessages = activeConversation?.messages ?? []
  const filteredMessages = useMemo(() => {
    const query = messageSearch.trim().toLowerCase()
    if (!query) return activeMessages

    return activeMessages.filter((message) =>
      message.message.toLowerCase().includes(query)
    )
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
    setActiveId(conversationId)
    setError(null)
    setOpenPanel(null)

    const summary =
      sourceConversations.find(
        (conversation) => conversation.id === conversationId
      ) ?? null
    setActiveConversation(
      summary
        ? {
            ...summary,
            messages: summary.messages ?? [],
          }
        : null
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
          : null
      )
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load conversation."
      )
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
      if (typeof document !== "undefined" && document.hidden) return
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

    const timer = setInterval(() => {
      void poll()
    }, 4000)
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
      prev
        ? {
            ...prev,
            messages: [...(prev.messages ?? []), sent],
            last_message: {
              id: sent.id,
              message: sent.attachment_url
                ? `[${sent.attachment_type ?? "file"}]`
                : sent.message,
              sender_type: sent.sender_type,
              sent_at: sent.created_at,
            },
            last_message_at: sent.created_at,
            message_count: prev.message_count + 1,
            unread_count: 0,
          }
        : prev
    )
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              last_message: {
                id: sent.id,
                message: sent.attachment_url
                  ? `[${sent.attachment_type ?? "file"}]`
                  : sent.message,
                sender_type: sent.sender_type,
                sent_at: sent.created_at,
              },
              last_message_at: sent.created_at,
              message_count: c.message_count + 1,
              unread_count: 0,
            }
          : c
      )
      return [...updated].sort((a, b) => {
        const aTime = a.last_message_at ?? a.updated_at
        const bTime = b.last_message_at ?? b.updated_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
    })
  }

  const handleSendMessage = async () => {
    if (!input.trim() && pendingAttachments.length === 0) return
    if (isSending) return

    const trimmed = input.trim()
    setIsSending(true)
    setError(null)

    try {
      if (!activeId) {
        const created = await createSupplierChatConversation(
          "Support",
          trimmed || "Hi"
        )
        setActiveConversation({ ...created, messages: created.messages ?? [] })
        setActiveId(created.id)
        setConversations([{ ...created, messages: created.messages ?? [] }])
      } else {
        // Upload and send each attachment as its own message
        for (const attachment of pendingAttachments) {
          const uploaded = await uploadSupplierChatAttachment(attachment.file)
          const sent = await sendSupplierChatMessage(activeId, "", uploaded, myDisplayName)
          appendSentMessage({ ...sent, sender_name: sent.sender_name ?? myDisplayName, sender_supplier_user_id: sent.sender_supplier_user_id ?? currentSupplierUserId })
        }
        // Send text message if present
        const pendingReply = replyTo
        if (trimmed) {
          const sent = await sendSupplierChatMessage(activeId, trimmed, undefined, myDisplayName)
          appendSentMessage({ ...sent, sender_name: sent.sender_name ?? myDisplayName, sender_supplier_user_id: sent.sender_supplier_user_id ?? currentSupplierUserId })
          if (pendingReply)
            setLocalReplyMap((prev) => ({ ...prev, [sent.id]: pendingReply }))
        }
        setReplyTo(null)
      }

      setInput("")
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
    const current = message.reactions?.["supplier"] ?? null
    const optimistic = { ...(message.reactions ?? {}) }
    if (current === emoji) delete optimistic["supplier"]
    else optimistic["supplier"] = emoji

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

    toggleSupplierChatReaction(message.conversation_id, message.id, emoji)
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
  }, [mediaModal.open])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const activeStatus = activeConversation?.status ?? "open"
  const companyName = activeConversation?.company?.name?.trim() || "Company"
  const companyLogoUrl = activeConversation?.company?.logo ?? null
  const chatAdminName =
    activeConversation?.assigned_admin?.name ??
    activeConversation?.counterpart_label ??
    "AF Home"
  const chatAdminEmail = activeConversation?.assigned_admin?.email ?? ""
  const chatAdminAvatarUrl =
    activeConversation?.assigned_admin?.avatar_url ?? null
  const chatAdminInitials = getInitials(chatAdminName)
  const activeSubtitle =
    activeStatus === "resolved" ? "Resolved" : "Admin · Active"

  return (
    <div className="flex h-[calc(100vh-104px)] flex-col gap-3 lg:h-[calc(100vh-120px)]">
      <div className="shrink-0">
        <p className="text-[10px] font-bold tracking-[0.24em] text-indigo-600 uppercase dark:text-indigo-400">
          Supplier
        </p>
        <div className="mt-0.5 flex items-center gap-3">
          <h1 className="text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
            Chats
          </h1>
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex-row dark:border-slate-800 dark:bg-slate-900">
        {/* Chat header — always visible */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-3.5 lg:hidden dark:border-slate-800">
          <Avatar
            label={chatAdminInitials}
            color="bg-indigo-600"
            src={chatAdminAvatarUrl}
            alt={chatAdminName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">
              {chatAdminName}
            </p>
            <p
              className={`text-[11px] font-medium ${activeStatus === "resolved" ? "text-slate-400" : "text-emerald-500"}`}
            >
              {activeSubtitle}
            </p>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative flex min-h-0 flex-1 flex-col"
          style={{
            background:
              "linear-gradient(145deg,#eef2ff 0%,#f0f4ff 40%,#e8eeff 100%)",
          }}
        >
          {/* Fixed decorative background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <svg
              className="h-full w-full opacity-[0.13]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g
                transform="translate(40,70)"
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
                transform="translate(480,55)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <path d="M2 2h6l4 18h22l4-14H10" />
                <circle cx="16" cy="26" r="2" />
                <circle cx="32" cy="26" r="2" />
              </g>
              <g
                transform="translate(240,36)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <polyline points="0,12 22,0 44,12 44,36 22,48 0,36 0,12" />
                <polyline points="0,12 22,24 44,12" />
                <line x1="22" y1="24" x2="22" y2="48" />
              </g>
              <g
                transform="translate(540,320)"
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
                transform="translate(400,220)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <rect x="0" y="0" width="52" height="38" rx="12" />
                <path d="M10,38 L6,52 L20,42" />
              </g>
              <g
                transform="translate(50,380)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <circle cx="28" cy="28" r="28" />
                <path d="M28,28 L28,0 A28,28 0 0,1 56,28 Z" />
                <line x1="28" y1="28" x2="28" y2="0" />
              </g>
              <g
                transform="translate(580,440)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <rect x="0" y="24" width="12" height="22" rx="2" />
                <rect x="18" y="12" width="12" height="34" rx="2" />
                <rect x="36" y="4" width="12" height="42" rx="2" />
              </g>
              <g
                transform="translate(190,340)"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.4"
              >
                <circle cx="22" cy="10" r="10" />
                <path d="M0,46 C0,30 44,30 44,46" />
              </g>
              <g
                transform="translate(320,185)"
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
            </svg>
            <span className="absolute top-[22%] left-[38%] h-3 w-3 rounded-full bg-orange-400/60" />
            <span className="absolute top-[55%] left-[62%] h-2.5 w-2.5 rounded-full bg-teal-400/50" />
            <span className="absolute top-[68%] left-[20%] h-2 w-2 rounded-full bg-violet-400/50" />
            <span className="absolute top-[30%] left-[75%] h-2 w-2 rounded-full bg-sky-400/50" />
          </div>
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white/80 px-5 py-3.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
            <Avatar
              label={chatAdminInitials}
              color="bg-indigo-600"
              src={chatAdminAvatarUrl}
              alt={chatAdminName}
              online={activeStatus !== "resolved"}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-black tracking-wide text-slate-900 uppercase dark:text-white">
                {chatAdminName}
              </p>
              <p
                className={`text-[11px] font-semibold ${activeStatus === "resolved" ? "text-slate-400" : "text-emerald-500"}`}
              >
                {activeSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <Search className="h-4 w-4" />
              </button>
              <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div
            ref={messagesContainerRef}
            className="relative flex-1 scrollbar-none overflow-y-auto [&::-webkit-scrollbar]:hidden"
          >
            <div className="px-5 py-5">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                      <MessageSquare className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-400">
                      Loading conversation...
                    </p>
                  </div>
                </div>
              ) : error && conversations.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-4 px-4 text-center">
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
                      {messageSearch.trim()
                        ? "No matching messages"
                        : "No messages yet"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {messageSearch.trim()
                        ? "Try a different search term."
                        : "Send a message below to start the conversation."}
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

                    {/* Messages in this day group */}
                    <div className="space-y-3">
                      {buildRenderItems(group.messages).map((item) => {
                        /* ── Image grid cluster ── */
                        if (item.kind === "imageGroup") {
                          const mine =
                            item.messages[0].sender_type === "supplier"
                          const senderAvatarUrl = mine
                            ? null
                            : chatAdminAvatarUrl
                          const senderAvatarLabel = mine
                            ? getInitials("Supplier")
                            : chatAdminInitials
                          const imgs = item.messages
                          const lastMsg = imgs[imgs.length - 1]
                          {
                            /* Stacked card deck */
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
                                  label={senderAvatarLabel}
                                  color="bg-slate-500"
                                  src={senderAvatarUrl}
                                  alt={chatAdminName}
                                  size="sm"
                                />
                              )}
                              <div>
                                <p className={`mb-0.5 text-[11px] font-semibold ${mine ? "text-right text-indigo-500" : "text-left text-slate-600 dark:text-slate-400"}`}>
                                  {item.messages[0].sender_name ??
                                    (item.messages[0].sender_type === "admin"
                                      ? chatAdminName
                                      : item.messages[0].sender_supplier_user_id === currentSupplierUserId
                                        ? myDisplayName
                                        : (activeConversation?.supplier_user?.name ?? "Supplier"))}
                                </p>
                                {/* Card stack — extra bottom padding clears rotated card overflow */}
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
                                                          m.attachment_url ?? ""
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
                                          <div className="absolute right-2 bottom-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-black/60 px-1.5 text-[11px] font-bold text-white">
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
                        const mine = message.sender_type === "supplier"
                        const senderAvatarUrl = mine ? null : chatAdminAvatarUrl
                        const senderAvatarLabel = mine
                          ? getInitials("Supplier")
                          : chatAdminInitials
                        const replySource = localReplyMap[message.id]
                        const isHovered = hoveredMsgId === message.id
                        const myReaction =
                          message.reactions?.["supplier"] ?? null
                        const reactionCounts = Object.values(
                          message.reactions ?? {}
                        ).reduce(
                          (acc, e) => {
                            acc[e] = (acc[e] ?? 0) + 1
                            return acc
                          },
                          {} as Record<string, number>
                        )
                        const activeReactions = Object.entries(reactionCounts)
                        return (
                          <div
                            key={message.id}
                            className={`relative flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${activeReactions.length > 0 ? "mb-4" : ""}`}
                          >
                            {!mine && (
                              <Avatar
                                label={senderAvatarLabel}
                                color="bg-slate-500"
                                src={senderAvatarUrl}
                                alt={chatAdminName}
                                size="sm"
                              />
                            )}
                            <div
                              className={`relative max-w-[72%] min-w-0 ${mine ? "" : "ml-0"}`}
                              onMouseEnter={() => enterMsg(message.id)}
                              onMouseLeave={leaveMsg}
                            >
                              {/* Hover action bar */}
                              <div
                                onMouseEnter={() => enterMsg(message.id)}
                                className={`absolute -top-10 ${mine ? "right-0" : "left-0"} z-20 flex items-center gap-1 rounded-full border border-slate-100 bg-white px-3 py-1.5 whitespace-nowrap shadow-xl transition-all duration-150 ${isHovered ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
                              >
                                {QUICK_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() =>
                                      toggleReaction(message, emoji)
                                    }
                                    className={`text-2xl leading-none transition-all duration-150 hover:-translate-y-1 hover:scale-150 active:scale-90 ${myReaction === emoji ? "scale-110 opacity-100" : "opacity-70 hover:opacity-100"}`}
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
                              {/* Sender name */}
                              <p className={`mb-0.5 text-[11px] font-semibold ${mine ? "text-right text-indigo-500" : "text-left text-slate-600 dark:text-slate-400"}`}>
                                {message.sender_name ??
                                  (message.sender_type === "admin"
                                    ? chatAdminName
                                    : message.sender_supplier_user_id === currentSupplierUserId
                                      ? myDisplayName
                                      : (activeConversation?.supplier_user?.name ?? "Supplier"))}
                              </p>
                              {/* Reply quote */}
                              {replySource && (
                                <div
                                  className={`mb-1 max-w-full rounded-t-xl border-l-4 px-3 py-1.5 text-xs ${mine ? "border-indigo-300 bg-indigo-100/60 text-indigo-800" : "border-slate-300 bg-slate-100 text-slate-600"}`}
                                >
                                  <p className="mb-0.5 font-semibold">
                                    {replySource.sender_type === "supplier"
                                      ? "You"
                                      : chatAdminName}
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
                                            url: message.attachment_url ?? "",
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
                                            message.attachment_name ?? "image"
                                          }
                                          className="max-h-64 w-auto max-w-70 object-contain"
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void forceDownload(
                                            message.attachment_url ?? "",
                                            message.attachment_name ?? "image"
                                          )
                                        }
                                        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
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
                                  ) : message.attachment_type === "video" ? (
                                    <div className="group relative inline-block">
                                      <video
                                        src={message.attachment_url}
                                        controls
                                        className="max-h-64 w-auto max-w-70 rounded-2xl object-contain"
                                      />
                                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void forceDownload(
                                              message.attachment_url ?? "",
                                              message.attachment_name ?? "video"
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
                                              url: message.attachment_url ?? "",
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
                                      className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${mine ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100"}`}
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
                                    message.message.match(/^https?:\/\/\S+$/)
                                  const reactionBadge = activeReactions.length >
                                    0 && (
                                    <div
                                      className={`absolute -bottom-3 ${mine ? "left-1" : "-right-2"} flex items-center`}
                                    >
                                      {activeReactions.map(([emoji, count]) => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() =>
                                            toggleReaction(message, emoji)
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
                                      ))}
                                    </div>
                                  )
                                  if (urlMatch) {
                                    return (
                                      <div
                                        className={`relative max-w-70 ${activeReactions.length > 0 ? "mb-4" : ""}`}
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
                                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap ${mine ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}`}
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

          {/* Input — always visible */}
          <div className="shrink-0 border-t border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
            {error && (
              <p className="mb-2 text-xs font-medium text-rose-500 dark:text-rose-400">
                {error}
              </p>
            )}

            {/* Attachment previews */}
            {pendingAttachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingAttachments.map((attachment) => (
                  <div key={attachment.id} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 shadow hover:text-slate-700 dark:bg-slate-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {attachment.kind === "image" && attachment.previewUrl ? (
                      <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                        <img
                          src={attachment.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : attachment.kind === "video" && attachment.previewUrl ? (
                      <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm">
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
                          <div
                            className={`flex h-20 w-20 flex-col items-center justify-center rounded-xl border shadow-sm ${badge.colors}`}
                          >
                            <span className="text-3xl leading-none font-black">
                              {badge.letter}
                            </span>
                            <span className="mt-0.5 text-[9px] font-bold tracking-widest uppercase opacity-70">
                              {badge.sub}
                            </span>
                          </div>
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
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
                  <p className="text-[10px] font-bold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
                    Replying to{" "}
                    {replyTo.sender_type === "supplier"
                      ? "yourself"
                      : chatAdminName}
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
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isLoading}
              rows={1}
              className="w-full resize-none bg-transparent py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100"
              style={{ maxHeight: "120px" }}
            />

            {/* Action row */}
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
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
                disabled={
                  (!input.trim() && pendingAttachments.length === 0) ||
                  isSending ||
                  isLoading
                }
                className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-indigo-500 to-violet-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-200/60 transition hover:from-indigo-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-indigo-900/30"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </div>
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 border-l border-slate-100 bg-white xl:flex xl:flex-col dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-full scrollbar-none flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {/* Profile banner */}
            <div className="relative shrink-0">
              <div className="h-24 w-full rounded-none bg-linear-to-br from-indigo-100 via-violet-100 to-purple-100 dark:from-indigo-900/40 dark:via-violet-900/30 dark:to-purple-900/20" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                <div className="relative">
                  <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-md dark:border-slate-900">
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
                  {activeStatus !== "resolved" && (
                    <span className="absolute right-1 bottom-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                  )}
                </div>
              </div>
            </div>

            {/* Admin name + role + email */}
            <div className="mt-14 px-4 pb-4 text-center">
              <p className="truncate text-xl font-black tracking-wide text-slate-900 uppercase dark:text-white">
                {chatAdminName}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Admin
              </p>
              {chatAdminEmail && (
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {chatAdminEmail}
                </p>
              )}
            </div>

            <div className="mx-4 h-px bg-slate-100 dark:bg-slate-800" />

            {/* Search */}
            <div className="px-4 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                <Search className="h-3.5 w-3.5" /> Search conversation
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-8 pl-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                {messageSearch && (
                  <button
                    type="button"
                    onClick={() => setMessageSearch("")}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Media / Files / Links */}
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
                <div className="mt-4 space-y-2 px-4 pb-4">
                  {/* Summary row — always visible */}
                  <div className="grid grid-cols-3 gap-2">
                    {panels.map(({ key, label, icon, count }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setOpenPanel(openPanel === key ? null : key)
                        }
                        className={`flex items-center justify-between rounded-xl border px-2 py-2 shadow-sm transition ${
                          openPanel === key
                            ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30"
                            : "border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex min-w-0 flex-col items-start gap-0.5">
                          <div className="flex items-center gap-1">
                            {icon}
                            <span className="text-[11px] font-semibold whitespace-nowrap text-slate-800 dark:text-slate-100">
                              {label}
                            </span>
                          </div>
                          <span className="text-[10px] whitespace-nowrap text-slate-400 dark:text-slate-500">
                            {count} {count === 1 ? "item" : "items"}
                          </span>
                        </div>
                        <ChevronRight
                          className={`h-3 w-3 shrink-0 text-slate-300 transition-transform duration-200 ${openPanel === key ? "rotate-90" : ""}`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Expand panel */}
                  <div
                    className={`overflow-hidden rounded-2xl border transition-all duration-300 ${openPanel ? "max-h-64 border-slate-100 opacity-100 dark:border-slate-800" : "max-h-0 border-transparent opacity-0"}`}
                  >
                    <div className="max-h-64 scrollbar-none overflow-y-auto p-3 [&::-webkit-scrollbar]:hidden">
                      {openPanel === "media" &&
                        (mediaItems.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">
                            No media shared yet.
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5">
                            {(() => {
                              const imgUrls = mediaItems
                                .filter((m) => m.attachment_type === "image")
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
                                              m.attachment_name ?? undefined,
                                          })
                                    }
                                    className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
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
                                          <Play className="h-5 w-5 fill-white text-white" />
                                        </div>
                                      </>
                                    )}
                                  </button>
                                )
                              })
                            })()}
                          </div>
                        ))}
                      {openPanel === "files" &&
                        (fileItems.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">
                            No files shared yet.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
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
                                className="flex w-full items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                              >
                                <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                                <span className="min-w-0 flex-1 truncate text-left text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                  {m.attachment_name ?? "File"}
                                </span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              </button>
                            ))}
                          </div>
                        ))}
                      {openPanel === "links" &&
                        (linkItems.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">
                            No links shared yet.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {linkItems.map((m) => {
                              const url =
                                (m.message.match(/https?:\/\/\S+/i) ?? [])[0] ??
                                ""
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
                                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                                >
                                  <Link2 className="h-4 w-4 shrink-0 text-indigo-500" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                      {host}
                                    </p>
                                    <p className="truncate text-[10px] text-slate-400">
                                      {url}
                                    </p>
                                  </div>
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                </a>
                              )
                            })}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )
            })()}
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
              className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80 p-4"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e: React.MouseEvent) => {
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
                        className="absolute top-1/2 left-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:scale-110 hover:bg-black/70 disabled:opacity-30"
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
                        className="absolute top-1/2 right-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:scale-110 hover:bg-black/70 disabled:opacity-30"
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
