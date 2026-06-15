"use client"

import { formatDistanceToNowStrict } from "date-fns"
import { Loader2, PenSquare, Search } from "lucide-react"

import type { Conversation } from "@/lib/hooks/use-messages"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { initials } from "./message-utils"

type Filter = "all" | "unread"

interface ConversationListProps {
  conversations: Conversation[] | undefined
  filtered: Conversation[]
  isLoading: boolean
  activeId: string | null
  onSelect: (id: string) => void
  search: string
  setSearch: (v: string) => void
  filter: Filter
  setFilter: (f: Filter) => void
  onlineIds: Set<string>
  className?: string
}

export function ConversationList({
  conversations,
  filtered,
  isLoading,
  activeId,
  onSelect,
  search,
  setSearch,
  filter,
  setFilter,
  onlineIds,
  className,
}: ConversationListProps) {
  return (
    <div
      className={cn(
        "border-border flex w-full flex-col border-r md:w-80",
        className
      )}
    >
      {/* Header */}
      <div className="space-y-3 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-xl font-bold">Messages</h1>
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full"
          >
            <PenSquare className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages"
            className="bg-muted h-9 rounded-full border-transparent pl-8 text-sm"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
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
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : !filtered.length ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {conversations?.length
              ? "No matches."
              : "No conversations yet. Message someone from a post."}
          </p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "mb-0.5 flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                activeId === c.id ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={c.otherUser?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {initials(c.otherUser?.name ?? "?")}
                  </AvatarFallback>
                </Avatar>
                {c.otherUser && onlineIds.has(c.otherUser.id) && (
                  <span className="ring-card absolute right-0 bottom-0 h-3 w-3 rounded-full bg-emerald-500 ring-2" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "truncate text-sm",
                      c.unreadCount > 0 && c.id !== activeId
                        ? "text-foreground font-bold"
                        : "text-foreground font-semibold"
                    )}
                  >
                    {c.otherUser?.name}
                  </p>
                  {c.lastMessage && (
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {formatDistanceToNowStrict(
                        new Date(c.lastMessage.createdAt)
                      )}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "truncate text-xs",
                    c.unreadCount > 0 && c.id !== activeId
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {c.lastMessage?.content || "📷 Photo"}
                </p>
              </div>
              {c.unreadCount > 0 && c.id !== activeId && (
                <span className="bg-primary text-primary-foreground flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                  {c.unreadCount > 9 ? "9+" : c.unreadCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
