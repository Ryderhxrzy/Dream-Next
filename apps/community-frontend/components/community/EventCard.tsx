"use client"

import { format } from "date-fns"
import { Clock, MapPin, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSetRsvp } from "@/lib/hooks/use-set-rsvp"
import { useToggleSave } from "@/lib/hooks/use-saved-posts"
import type { CommunityPost } from "@/lib/hooks/use-community-posts"

// Color palette for event card headers (cycled by id for variety)
const HEADER_COLORS = [
  "bg-blue-600",
  "bg-orange-500",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-rose-600",
  "bg-cyan-600",
]

function colorForId(id: string) {
  const n = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return HEADER_COLORS[n % HEADER_COLORS.length]
}

export function EventCard({ event }: { event: CommunityPost }) {
  const setRsvp = useSetRsvp()
  const toggleSave = useToggleSave()

  const date = event.eventDate ? new Date(event.eventDate) : new Date(event.createdAt)
  const going = event.counts.going
  const isGoing = event.viewerRsvp === "GOING"
  const headerColor = colorForId(event.id)

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      {/* Colored header */}
      <div className={cn("relative h-24 p-3 flex items-start justify-between", headerColor)}>
        {/* Date badge */}
        <div className="w-12 rounded-lg bg-white overflow-hidden text-center shadow-sm">
          <div className="bg-red-500 text-white text-[9px] font-bold uppercase py-0.5">
            {format(date, "MMM")}
          </div>
          <div className="text-lg font-bold text-zinc-900 leading-tight py-0.5">
            {format(date, "d")}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={() => toggleSave.mutate(event.id)}
          className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
        >
          <Bookmark className={cn("w-4 h-4 text-zinc-700", event.viewerHasSaved && "fill-zinc-700")} />
        </button>

        {/* Category tag */}
        <span className="absolute bottom-2 left-3 text-[11px] font-medium text-white bg-black/20 rounded-full px-2 py-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          Event
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1">{event.title}</h3>

        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {format(date, "EEE, MMM d")}{event.eventTime ? ` · ${event.eventTime}` : ""}
          </p>
          {event.location && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="text-xs text-muted-foreground">{going} going</span>
          <Button
            onClick={() => setRsvp.mutate({ postId: event.id, status: "GOING" })}
            size="sm"
            className={cn(
              "h-7 px-3 text-xs rounded-md",
              isGoing
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {isGoing ? "✓ Going" : "RSVP"}
          </Button>
        </div>
      </div>
    </div>
  )
}
