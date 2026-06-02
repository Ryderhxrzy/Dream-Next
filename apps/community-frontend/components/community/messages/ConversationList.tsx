"use client"

import { formatDistanceToNowStrict } from "date-fns"
import { Search, Loader2, PenSquare } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { initials } from "./message-utils"
import type { Conversation } from "@/lib/hooks/use-messages"

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
    <div className={cn("w-full md:w-80 border-r border-border flex flex-col", className)}>
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
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
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
        ) : !filtered.length ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-4">
            {conversations?.length ? "No matches." : "No conversations yet. Message someone from a post."}
          </p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
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
  )
}
