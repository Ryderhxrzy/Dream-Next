"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { formatDistanceToNowStrict, format, isToday, isYesterday, isSameDay } from "date-fns"
import {
  Send, Loader2, MessageCircle, ArrowLeft, Smile, ImagePlus, X,
  Search, MoreHorizontal, PenSquare,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Socket } from "socket.io-client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createChatSocket } from "@/lib/socket"
import { useAuthStore } from "@/store/auth.store"
import { usePresenceStore } from "@/store/presence.store"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  type ChatMessage,
  type MessagesData,
} from "@/lib/hooks/use-messages"
import { useQueryClient } from "@tanstack/react-query"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

function dateLabel(d: Date) {
  if (isToday(d)) return "Today"
  if (isYesterday(d)) return "Yesterday"
  return format(d, "MMMM d, yyyy")
}

const EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🤩", "😭", "😅",
  "👍", "👏", "🙏", "🔥", "❤️", "💯", "🎉", "✨",
  "😴", "🤔", "😱", "😤", "🥳", "😇", "🤝", "👋",
  "🍕", "☕", "🏠", "🚗", "📦", "💬", "✅", "❓",
]

export default function MessagesPage() {
  const searchParams = useSearchParams()
  const token = useAuthStore((s) => s.token)
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  const { data: conversations, isLoading } = useConversations()
  const [activeId, setActiveId] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const { data: messagesData } = useMessages(activeId)
  const messages = messagesData?.messages
  const sendMessage = useSendMessage(activeId ?? "")
  const markRead = useMarkConversationRead()
  const [draft, setDraft] = useState("")
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function insertEmoji(emoji: string) {
    setDraft((d) => d + emoji)
  }

  useEffect(() => {
    setOtherReadAt(messagesData?.otherReadAt ?? null)
  }, [messagesData?.otherReadAt])

  const activeConvo = conversations?.find((c) => c.id === activeId)
  const onlineIds = usePresenceStore((s) => s.onlineUserIds)
  const otherOnline = !!activeConvo?.otherUser && onlineIds.has(activeConvo.otherUser.id)

  // Filtered conversation list (search + unread tab)
  const filteredConversations = useMemo(() => {
    let list = conversations ?? []
    if (filter === "unread") list = list.filter((c) => c.unreadCount > 0)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.otherUser?.name.toLowerCase().includes(q))
    }
    return list
  }, [conversations, filter, search])

  // Open from ?c= query, OR auto-open the first one on desktop
  useEffect(() => {
    if (activeId) return
    const c = searchParams.get("c")
    if (c) {
      setActiveId(c)
      return
    }
    const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
    if (isDesktop && conversations && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [searchParams, conversations, activeId])

  // Chat socket
  useEffect(() => {
    if (!token || !currentUser?.id) return
    const socket = createChatSocket(currentUser.id, token)
    socketRef.current = socket

    socket.on("new_message", (msg: ChatMessage) => {
      queryClient.setQueryData<MessagesData>(["messages", activeId], (old) => {
        if (!old) return old
        if (old.messages.some((m) => m.id === msg.id)) return old
        return { ...old, messages: [...old.messages, msg] }
      })
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    })

    socket.on("user_typing", (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.userId === currentUser?.id) return
      setOtherTyping(data.isTyping)
    })

    socket.on("conversation_read", (data: { conversationId: string; readerId: string; readAt: string }) => {
      if (data.readerId === currentUser?.id) return
      setOtherReadAt(data.readAt)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, currentUser?.id, activeId, queryClient])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !activeId) return
    setOtherTyping(false)
    socket.emit("join_conversation", activeId)
    markRead.mutate(activeId)
    return () => {
      socket.emit("leave_conversation", activeId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  function scrollToBottom() {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function emitTyping(isTyping: boolean) {
    const socket = socketRef.current
    if (!socket || !activeId || !currentUser?.id) return
    socket.emit("typing", { conversationId: activeId, userId: currentUser.id, isTyping })
  }

  function handleDraftChange(value: string) {
    setDraft(value)
    emitTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1500)
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = draft.trim()
    if ((!content && !imageFile) || !activeId) return
    emitTyping(false)
    sendMessage.mutate({ content, image: imageFile })
    setDraft("")
    clearImage()
  }

  return (
    <div className="w-full h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)] flex overflow-hidden bg-card">

      {/* ───────── Conversation list ───────── */}
      <div className={cn("w-full md:w-80 border-r border-border flex flex-col", activeId && "hidden md:flex")}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground">
              <PenSquare className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages"
              className="pl-8 h-9 bg-muted border-transparent rounded-full text-sm"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !filteredConversations.length ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              {conversations?.length ? "No matches." : "No conversations yet. Message someone from a post."}
            </p>
          ) : (
            filteredConversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-colors mb-0.5",
                  activeId === c.id ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={c.otherUser?.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {initials(c.otherUser?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  {c.otherUser && onlineIds.has(c.otherUser.id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-sm truncate", c.unreadCount > 0 && c.id !== activeId ? "font-bold text-foreground" : "font-semibold text-foreground")}>
                      {c.otherUser?.name}
                    </p>
                    {c.lastMessage && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNowStrict(new Date(c.lastMessage.createdAt))}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs truncate",
                    c.unreadCount > 0 && c.id !== activeId ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {c.lastMessage?.content || "📷 Photo"}
                  </p>
                </div>
                {c.unreadCount > 0 && c.id !== activeId && (
                  <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                    {c.unreadCount > 9 ? "9+" : c.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ───────── Chat thread ───────── */}
      <div className={cn("flex-1 flex flex-col bg-background/30", !activeId && "hidden md:flex")}>
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Your messages</p>
            <p className="text-xs text-muted-foreground mt-0.5">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <button onClick={() => setActiveId(null)} className="md:hidden text-muted-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative shrink-0">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={activeConvo?.otherUser?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials(activeConvo?.otherUser?.name ?? "?")}
                  </AvatarFallback>
                </Avatar>
                {otherOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{activeConvo?.otherUser?.name}</p>
                <p className={cn("text-[11px] flex items-center gap-1", otherOnline ? "text-emerald-600" : "text-muted-foreground")}>
                  {otherTyping ? "typing…" : otherOnline ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active now
                    </>
                  ) : "Offline"}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              <div className="space-y-1">
              {messages?.map((m, i) => {
                const mine = m.senderId === currentUser?.id
                const created = new Date(m.createdAt)
                const prev = i > 0 ? messages[i - 1] : null
                const next = i < messages.length - 1 ? messages[i + 1] : null
                const showDateSep = !prev || !isSameDay(created, new Date(prev.createdAt))
                // Show avatar only on the last message of a consecutive group from the other person
                const showAvatar = !mine && (!next || next.senderId !== m.senderId)

                const lastMineIndex = messages.reduce(
                  (acc, mm, idx) => (mm.senderId === currentUser?.id ? idx : acc),
                  -1,
                )
                const isLastMine = mine && i === lastMineIndex
                const seen = otherReadAt && new Date(otherReadAt) >= created

                return (
                  <div key={m.id}>
                    {showDateSep && (
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                          {dateLabel(created)}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                      {/* Other person's avatar (only at end of group) */}
                      {!mine && (
                        <div className="w-7 shrink-0">
                          {showAvatar && (
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={m.sender.avatarUrl ?? undefined} />
                              <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                                {initials(m.sender.name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div className={cn("flex flex-col max-w-[70%]", mine ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "overflow-hidden",
                            m.imageUrl ? "rounded-2xl" : cn(
                              "rounded-2xl px-3.5 py-2 text-sm",
                              mine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            )
                          )}
                        >
                          {m.imageUrl ? (
                            <div className="space-y-1">
                              <img
                                src={m.imageUrl}
                                alt=""
                                onLoad={scrollToBottom}
                                className="rounded-2xl max-w-full max-h-64 object-cover"
                              />
                              {m.content && <p className="text-sm px-1 text-foreground">{m.content}</p>}
                            </div>
                          ) : (
                            m.content
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 px-1">
                          <span className="text-[10px] text-muted-foreground">{format(created, "h:mm a")}</span>
                          {isLastMine && (
                            <span className="text-[10px] text-muted-foreground font-medium">· {seen ? "Read" : "Sent"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {otherTyping && (
                <div className="flex items-end gap-2 justify-start">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={activeConvo?.otherUser?.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                      {initials(activeConvo?.otherUser?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
              </div>
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="px-4 pt-3 bg-card">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="" className="h-20 rounded-lg border border-border object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-zinc-900 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="border-t border-border bg-card">
              <div className="flex items-center gap-1.5 px-6 py-3 w-full">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} aria-hidden />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              >
                <ImagePlus className="w-5 h-5" />
              </Button>

              <div className="flex-1 relative">
                <Input
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  placeholder={`Message ${activeConvo?.otherUser?.name?.split(" ")[0] ?? ""}…`}
                  className="h-10 bg-muted border-transparent rounded-full pr-10"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Smile className="w-5 h-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-2">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="text-lg hover:bg-accent rounded p-1 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                type="submit"
                size="icon"
                disabled={(!draft.trim() && !imageFile) || sendMessage.isPending}
                className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              >
                {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
