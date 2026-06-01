"use client"

import { formatDistanceToNowStrict } from "date-fns"
import { Bell, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth.store"
import { useNotifications, type Notification } from "@/lib/hooks/use-notifications"
import { markAllReadRemote } from "@/lib/hooks/use-notification-sync"

type NotifAuthor = { name?: string; avatarUrl?: string | null }

function getAuthor(payload: Record<string, unknown>): NotifAuthor {
  const author = payload.author as NotifAuthor | undefined
  return { name: author?.name ?? "Someone", avatarUrl: author?.avatarUrl ?? null }
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
  if (n.type === "new_post") return `posted: ${String(n.payload.title ?? "a new post")}`
  if (n.type === "new_comment") return "commented on your post"
  if (n.type === "new_reply") return "replied to your comment"
  if (n.type === "new_reaction") return "liked your post"
  if (n.type === "new_rsvp") return "is going to your event"
  if (n.type === "new_repost") return "reposted your post"
  return "sent a notification"
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
          className="relative rounded-md w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 ring-2 ring-card">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mb-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We&apos;ll let you know when something happens.
              </p>
            </div>
          ) : (
            notifications.slice(0, 15).map((n) => {
              const author = getAuthor(n.payload)
              const content = String(n.payload.content ?? "")
              return (
                <button
                  key={n.id}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border last:border-0",
                    n.read ? "hover:bg-accent" : "bg-blue-500/10 hover:bg-blue-500/15"
                  )}
                >
                  {/* Author avatar */}
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={author.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {getInitials(author.name ?? "S")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm leading-snug", n.read ? "text-foreground/80" : "text-foreground")}>
                      <span className="font-semibold">{author.name}</span>{" "}
                      <span className={n.read ? "" : "font-medium"}>{getActionLabel(n)}</span>
                    </p>
                    {content && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{content}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border p-2">
            <button className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground py-1.5 rounded-md hover:bg-accent transition-colors">
              View all notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
