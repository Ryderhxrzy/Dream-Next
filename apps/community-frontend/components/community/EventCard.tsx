"use client"

import { format } from "date-fns"
import { Bookmark, Clock, MapPin } from "lucide-react"

import type { CommunityPost } from "@/lib/hooks/use-community-posts"
import { useEventRsvps } from "@/lib/hooks/use-event-rsvps"
import { useToggleSave } from "@/lib/hooks/use-saved-posts"
import { useSetRsvp } from "@/lib/hooks/use-set-rsvp"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  formatEventTimeRange,
  initials,
} from "@/components/community/events/event-utils"

// Gradient header palette (cycled by id for variety)
const HEADER_GRADIENTS = [
  "bg-linear-to-br from-blue-500 to-blue-700",
  "bg-linear-to-br from-orange-400 to-rose-500",
  "bg-linear-to-br from-emerald-500 to-teal-600",
  "bg-linear-to-br from-purple-500 to-fuchsia-600",
  "bg-linear-to-br from-rose-500 to-pink-600",
  "bg-linear-to-br from-cyan-500 to-blue-600",
]
const DOT_COLORS = [
  "bg-blue-500",
  "bg-orange-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-500",
]

function indexForId(id: string) {
  const n = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return n % HEADER_GRADIENTS.length
}

function GoingAvatars({ eventId }: { eventId: string }) {
  const { data: rsvps } = useEventRsvps(eventId)
  const going = (rsvps ?? []).filter((r) => r.status === "GOING").slice(0, 3)
  if (!going.length) return null

  return (
    <div className="flex -space-x-2">
      {going.map((r) => (
        <Avatar key={r.userId} className="ring-card h-6 w-6 ring-2">
          <AvatarImage src={r.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-semibold">
            {initials(r.name)}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  )
}

export function EventCard({ event }: { event: CommunityPost }) {
  const setRsvp = useSetRsvp()
  const toggleSave = useToggleSave()

  const date = event.eventDate
    ? new Date(event.eventDate)
    : new Date(event.createdAt)
  const going = event.counts.going
  const isGoing = event.viewerRsvp === "GOING"
  const idx = indexForId(event.id)
  const timeRange = formatEventTimeRange(event.eventTime, event.eventEndTime)

  return (
    <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-md">
      {/* Gradient header */}
      <div className={cn("relative h-28 p-3", HEADER_GRADIENTS[idx])}>
        <div className="flex items-start justify-between">
          {/* Date badge */}
          <div className="w-12 overflow-hidden rounded-lg bg-white text-center shadow-sm">
            <div className="bg-red-500 py-0.5 text-[9px] font-bold text-white uppercase">
              {format(date, "MMM")}
            </div>
            <div className="py-0.5 text-lg leading-tight font-bold text-zinc-900">
              {format(date, "d")}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={() => toggleSave.mutate(event.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 transition-colors hover:bg-white"
          >
            <Bookmark
              className={cn(
                "h-4 w-4 text-zinc-700",
                event.viewerHasSaved && "fill-zinc-700"
              )}
            />
          </button>
        </div>

        {/* Category pill */}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-sm">
          <span className={cn("h-1.5 w-1.5 rounded-full", DOT_COLORS[idx])} />
          Event
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-foreground line-clamp-1 text-base leading-snug font-semibold">
          {event.title}
        </h3>

        <div className="mt-2 space-y-1.5">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {format(date, "EEE, MMM d")}
            {timeRange ? ` · ${timeRange}` : ""}
          </p>
          {event.location && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </p>
          )}
        </div>

        <div className="border-border mt-4 flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <GoingAvatars eventId={event.id} />
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {going} going
            </span>
          </div>
          <Button
            onClick={() =>
              setRsvp.mutate({ postId: event.id, status: "GOING" })
            }
            size="sm"
            className={cn(
              "h-8 rounded-full px-4 text-xs font-semibold shadow-none transition-colors",
              isGoing
                ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {isGoing ? "✓ Going" : "Join Event"}
          </Button>
        </div>
      </div>
    </div>
  )
}
