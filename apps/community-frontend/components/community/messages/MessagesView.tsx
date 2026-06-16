"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAuthStore } from "@/store/auth.store"
import { useChatUiStore } from "@/store/chat-ui.store"
import { usePresenceStore } from "@/store/presence.store"
import { useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import type { Socket } from "socket.io-client"

import { useCurrentUser } from "@/lib/hooks/use-current-user"
import {
  useConversations,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  type ChatMessage,
  type MessagesData,
} from "@/lib/hooks/use-messages"
import { createChatSocket } from "@/lib/socket"
import { cn } from "@/lib/utils"

import { ChatThread } from "./ChatThread"
import { ConversationList } from "./ConversationList"

export function MessagesView() {
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

  const onlineIds = usePresenceStore((s) => s.onlineUserIds)
  const setActiveConversation = useChatUiStore((s) => s.setActiveConversation)

  const activeConvo = conversations?.find((c) => c.id === activeId)
  const otherOnline =
    !!activeConvo?.otherUser && onlineIds.has(activeConvo.otherUser.id)

  const filteredConversations = useMemo(() => {
    let list = conversations ?? []
    if (filter === "unread") list = list.filter((c) => c.unreadCount > 0)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.otherUser?.name.toLowerCase().includes(q))
    }
    return list
  }, [conversations, filter, search])

  // Tell the app which conversation is open (to suppress its toast)
  useEffect(() => {
    setActiveConversation(activeId)
    return () => setActiveConversation(null)
  }, [activeId, setActiveConversation])

  useEffect(() => {
    setOtherReadAt(messagesData?.otherReadAt ?? null)
  }, [messagesData?.otherReadAt])

  // Open only when a specific conversation is deep-linked via ?c=.
  // We intentionally do NOT auto-open the first conversation, otherwise its
  // messages would be marked "seen" the moment the user lands on /messages.
  useEffect(() => {
    if (activeId) return
    const c = searchParams.get("c")
    if (c) setActiveId(c)
  }, [searchParams, activeId])

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

    socket.on(
      "user_typing",
      (data: { conversationId: string; userId: string; isTyping: boolean }) => {
        if (data.userId === currentUser?.id) return
        setOtherTyping(data.isTyping)
      }
    )

    socket.on(
      "conversation_read",
      (data: { conversationId: string; readerId: string; readAt: string }) => {
        if (data.readerId === currentUser?.id) return
        setOtherReadAt(data.readAt)
      }
    )

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
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    )
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function emitTyping(isTyping: boolean) {
    const socket = socketRef.current
    if (!socket || !activeId || !currentUser?.id) return
    socket.emit("typing", {
      conversationId: activeId,
      userId: currentUser.id,
      isTyping,
    })
  }

  function handleDraftChange(value: string) {
    setDraft(value)
    emitTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1500)
  }

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
    <div className="bg-card flex h-[calc(100vh-3.5rem-4rem)] w-full overflow-hidden lg:h-[calc(100vh-3.5rem)]">
      <ConversationList
        conversations={conversations}
        filtered={filteredConversations}
        isLoading={isLoading}
        activeId={activeId}
        onSelect={setActiveId}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        onlineIds={onlineIds}
        className={cn(activeId && "hidden md:flex")}
      />

      <div
        className={cn(
          "bg-background/30 flex flex-1 flex-col",
          !activeId && "hidden md:flex"
        )}
      >
        <ChatThread
          activeConvo={activeConvo}
          messages={messages}
          currentUserId={currentUser?.id}
          otherTyping={otherTyping}
          otherOnline={otherOnline}
          otherReadAt={otherReadAt}
          draft={draft}
          imagePreview={imagePreview}
          sending={sendMessage.isPending}
          bottomRef={bottomRef}
          fileInputRef={fileInputRef}
          onBack={() => setActiveId(null)}
          onDraftChange={handleDraftChange}
          onSend={handleSend}
          onImagePick={handleImagePick}
          onClearImage={clearImage}
          onInsertEmoji={(emoji) => setDraft((d) => d + emoji)}
          onImageLoad={scrollToBottom}
        />
      </div>
    </div>
  )
}
