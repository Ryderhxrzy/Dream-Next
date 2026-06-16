"use client"

import { useEffect, useRef } from "react"
import { useAuthStore } from "@/store/auth.store"
import { useChatUiStore } from "@/store/chat-ui.store"
import { useNotificationsStore } from "@/store/notifications.store"
import { usePresenceStore } from "@/store/presence.store"
import { useQueryClient } from "@tanstack/react-query"
import type { Socket } from "socket.io-client"
import { toast } from "sonner"

import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { useNotificationSync } from "@/lib/hooks/use-notification-sync"
import { createNotifySocket } from "@/lib/socket"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type NotificationAuthor = { name: string; avatarUrl?: string | null }

function showNotificationToast({
  author,
  label,
  content,
}: {
  author: NotificationAuthor
  label: string
  content: string
}) {
  const initials = author.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")

  toast.custom(
    () => (
      <div className="flex w-80 items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-lg">
        <Avatar className="mt-0.5 h-9 w-9 shrink-0">
          <AvatarImage src={author.avatarUrl ?? ""} />
          <AvatarFallback className="bg-zinc-900 text-xs font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm leading-none font-semibold text-zinc-900">
            {author.name}
          </p>
          <p className="mb-1 text-xs text-zinc-500">{label}</p>
          {content && (
            <p className="truncate text-xs text-zinc-700">{content}</p>
          )}
        </div>
      </div>
    ),
    { duration: 5000 }
  )
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const token = useAuthStore((state) => state.token)
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const addNotification = useNotificationsStore((s) => s.addNotification)
  const setOnlineUsers = usePresenceStore((s) => s.setOnlineUsers)
  const setPresence = usePresenceStore((s) => s.setPresence)
  const socketRef = useRef<Socket | null>(null)

  // Seed persisted notifications from backend on load
  useNotificationSync()

  useEffect(() => {
    if (!token || !currentUser?.id) return

    const socket = createNotifySocket(currentUser.id, token)
    socketRef.current = socket

    socket.on("connect", () => console.log("[notify] connected"))

    // Presence — who's online
    socket.on("online_users", (ids: string[]) => setOnlineUsers(ids))
    socket.on("presence", (data: { userId: string; online: boolean }) =>
      setPresence(data.userId, data.online)
    )

    // New post — refresh feed for everyone
    socket.on("new_post", (payload: Record<string, unknown>) => {
      addNotification("new_post", payload)
    })

    // Refresh feed + comments for everyone viewing that post
    socket.on("refresh_post", (payload: { postId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] })
      queryClient.invalidateQueries({
        queryKey: ["post-comments", payload.postId],
      })
    })

    // Personal: someone commented on YOUR post
    socket.on("new_comment", (payload: Record<string, unknown>) => {
      const author = payload.author as {
        name: string
        avatarUrl?: string | null
      }
      showNotificationToast({
        author,
        label: "commented on your post",
        content: String(payload.content ?? ""),
      })
      addNotification("new_comment", payload)
    })

    // Personal: someone replied to YOUR comment
    socket.on("new_reply", (payload: Record<string, unknown>) => {
      const author = payload.author as {
        name: string
        avatarUrl?: string | null
      }
      showNotificationToast({
        author,
        label: "replied to your comment",
        content: String(payload.content ?? ""),
      })
      addNotification("new_reply", payload)
    })

    // Personal: someone liked YOUR post
    socket.on("new_reaction", (payload: Record<string, unknown>) => {
      const author = payload.author as {
        name: string
        avatarUrl?: string | null
      }
      showNotificationToast({
        author,
        label: "liked your post",
        content: "",
      })
      addNotification("new_reaction", payload)
    })

    // Personal: someone is going to YOUR event
    socket.on("new_rsvp", (payload: Record<string, unknown>) => {
      const author = payload.author as {
        name: string
        avatarUrl?: string | null
      }
      showNotificationToast({
        author,
        label: "is going to your event",
        content: "",
      })
      addNotification("new_rsvp", payload)
    })

    // Personal: someone reposted YOUR post
    socket.on("new_repost", (payload: Record<string, unknown>) => {
      const author = payload.author as {
        name: string
        avatarUrl?: string | null
      }
      showNotificationToast({
        author,
        label: "reposted your post",
        content: "",
      })
      addNotification("new_repost", payload)
    })

    // Personal: someone sent YOU a connection request
    socket.on("connect_request", (payload: Record<string, unknown>) => {
      const author = payload.author as {
        name: string
        avatarUrl?: string | null
      }
      showNotificationToast({
        author,
        label: "sent you a connection request",
        content: "",
      })
      addNotification("connect_request", payload)
      queryClient.invalidateQueries({ queryKey: ["connection-requests"] })
    })

    // Personal: someone accepted YOUR connection request
    socket.on("connect_accepted", (payload: Record<string, unknown>) => {
      const author = payload.author as {
        name: string
        avatarUrl?: string | null
      }
      showNotificationToast({
        author,
        label: "accepted your connection request",
        content: "",
      })
      addNotification("connect_accepted", payload)
      queryClient.invalidateQueries({ queryKey: ["connections"] })
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
    })

    // Direct message — TOAST ONLY (not in the notification bell)
    socket.on(
      "new_message",
      (payload: {
        conversationId: string
        message: { content: string; sender: NotificationAuthor }
      }) => {
        // Skip toast if the user is already viewing this conversation
        const activeConversationId =
          useChatUiStore.getState().activeConversationId
        if (payload.conversationId !== activeConversationId) {
          showNotificationToast({
            author: payload.message.sender,
            label: "sent you a message",
            content: payload.message.content,
          })
        }
        // Update the Messages badge (unread count) everywhere
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
      }
    )

    socket.on("disconnect", () => console.log("[notify] disconnected"))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [
    token,
    currentUser?.id,
    queryClient,
    addNotification,
    setOnlineUsers,
    setPresence,
  ])

  return <>{children}</>
}
