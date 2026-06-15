"use client"

import { useState } from "react"
import { useAuthStore } from "@/store/auth.store"
import { formatDistanceToNowStrict } from "date-fns"
import { Bell, Check } from "lucide-react"

import { useConnectionActions } from "@/lib/hooks/use-connections"
import { markAllReadRemote } from "@/lib/hooks/use-notification-sync"
import {
  useNotifications,
  type Notification,
} from "@/lib/hooks/use-notifications"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type NotifAuthor = { name?: string; avatarUrl?: string | null }

function getAuthor(payload: Record<string, unknown>): NotifAuthor {
  const author = payload.author as NotifAuthor | undefined
  return {
    name: author?.name ?? "Someone",
    avatarUrl: author?.avatarUrl ?? null,
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function getActionLabel(n: Notification): string {
  if (n.type === "new_post")
    return `posted: ${String(n.payload.title ?? "a new post")}`
  if (n.type === "new_comment") return "commented on your post"
  if (n.type === "new_reply") return "replied to your comment"
  if (n.type === "new_reaction") return "liked your post"
  if (n.type === "new_rsvp") return "is going to your event"
  if (n.type === "new_repost") return "reposted your post"
  if (n.type === "connect_request") return "sent you a connection request"
  if (n.type === "connect_accepted") return "accepted your connection request"
  return "sent a notification"
}

function ConnectRequestActions({ userId }: { userId: string }) {
  const { accept, remove } = useConnectionActions(userId)
  const [done, setDone] = useState<null | "accepted" | "declined">(null)

  if (done) {
    return (
      <p className="text-muted-foreground mt-1.5 text-xs font-medium">
        {done === "accepted" ? "✓ Connected" : "Declined"}
      </p>
    )
  }

  const busy = accept.isPending || remove.isPending
  return (
    <div className="mt-2 flex items-center gap-2">
      <Button
        size="sm"
        className="h-7 px-3 text-xs"
        disabled={busy}
        onClick={() =>
          accept.mutate(undefined, { onSuccess: () => setDone("accepted") })
        }
      >
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-3 text-xs"
        disabled={busy}
        onClick={() =>
          remove.mutate(undefined, { onSuccess: () => setDone("declined") })
        }
      >
        Decline
      </Button>
    </div>
  )
}

export function NotificationsDropdown() {
  const token = useAuthStore((s) => s.token)
  const { unreadCount, notifications, markAllRead } = useNotifications()

  function handleMarkAllRead() {
    markAllRead()
    markAllReadRemote(token)
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && handleMarkAllRead()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-accent relative h-8 w-8 rounded-md"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="ring-card absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white ring-2">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 overflow-hidden p-0">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <p className="text-foreground text-sm font-semibold">Notifications</p>
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] font-medium transition-colors"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <div className="bg-accent mb-2 flex h-10 w-10 items-center justify-center rounded-full">
                <Bell className="text-muted-foreground h-4 w-4" />
              </div>
              <p className="text-foreground text-sm font-medium">
                No notifications yet
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                We&apos;ll let you know when something happens.
              </p>
            </div>
          ) : (
            notifications.slice(0, 15).map((n) => {
              const author = getAuthor(n.payload)
              const content = String(n.payload.content ?? "")
              return (
                <div
                  key={n.id}
                  className={cn(
                    "border-border flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-0",
                    n.read
                      ? "hover:bg-accent"
                      : "bg-blue-500/10 hover:bg-blue-500/15"
                  )}
                >
                  {/* Author avatar */}
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={author.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {getInitials(author.name ?? "S")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        n.read ? "text-foreground/80" : "text-foreground"
                      )}
                    >
                      <span className="font-semibold">{author.name}</span>{" "}
                      <span className={n.read ? "" : "font-medium"}>
                        {getActionLabel(n)}
                      </span>
                    </p>
                    {content && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {content}
                      </p>
                    )}
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      {formatDistanceToNowStrict(new Date(n.createdAt), {
                        addSuffix: true,
                      })}
                    </p>

                    {/* Connection request actions */}
                    {n.type === "connect_request" && (
                      <ConnectRequestActions
                        userId={String(n.payload.userId ?? "")}
                      />
                    )}
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-border border-t p-2">
            <button className="text-muted-foreground hover:text-foreground hover:bg-accent w-full rounded-md py-1.5 text-center text-xs font-medium transition-colors">
              View all notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
