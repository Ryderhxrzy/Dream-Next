"use client"

import { format } from "date-fns"
import { Clock, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEventRsvps } from "@/lib/hooks/use-event-rsvps"
import { useSetRsvp } from "@/lib/hooks/use-set-rsvp"
import { cn } from "@/lib/utils"
import { eventDateOf, initials } from "./event-utils"
import type { CommunityPost } from "@/lib/hooks/use-community-posts"

function GoingAvatars({ eventId, goingCount }: { eventId: string; goingCount: number }) {
  const { data: rsvps } = useEventRsvps(eventId)
  const going = (rsvps ?? []).filter((r) => r.status === "GOING").slice(0, 4)

  return (
    <div className="flex items-center gap-2">
      {going.length > 0 && (
        <div className="flex -space-x-2">
          {going.map((r) => (
            <Avatar key={r.userId} className="w-7 h-7 ring-2 ring-purple-600">
              <AvatarImage src={r.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-white text-purple-700 text-[10px] font-semibold">
                {initials(r.name)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
      <span className="text-sm text-white/90">
        {goingCount} {goingCount === 1 ? "member" : "members"} going
      </span>
    </div>
  )
}

export function FeaturedEvent({ event }: { event: CommunityPost }) {
  const setRsvp = useSetRsvp()
  const date = eventDateOf(event)
  const isGoing = event.viewerRsvp === "GOING"

  return (
    <div className="rounded-2xl bg-linear-to-br from-purple-600 to-indigo-700 p-6 text-white flex items-center justify-between gap-4 flex-wrap">
      <div className="space-y-3 min-w-0">
        <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-medium">
          ⭐ Featured · Upcoming
        </span>
        <h2 className="text-2xl font-bold leading-tight">{event.title}</h2>
        <p className="text-white/80 text-sm line-clamp-2 max-w-lg">{event.content}</p>
        <div className="flex items-center gap-4 text-sm text-white/90 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {format(date, "EEE, MMM d")}{event.eventTime ? ` · ${event.eventTime}` : ""}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {event.location}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={() => setRsvp.mutate({ postId: event.id, status: "GOING" })}
            className={cn(
              "h-9 rounded-full text-sm font-semibold",
              isGoing
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-white text-purple-700 hover:bg-white/90"
            )}
          >
            {isGoing ? "✓ I'm Going" : "RSVP — I'm Going"}
          </Button>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <GoingAvatars eventId={event.id} goingCount={event.counts.going} />
          <span className="text-sm text-white/70">· {event.counts.interested} interested</span>
        </div>
      </div>

      {/* Date block */}
      <div className="w-28 rounded-xl bg-white overflow-hidden text-center shrink-0">
        <div className="bg-red-500 text-white text-xs font-bold uppercase py-1">{format(date, "MMMM")}</div>
        <div className="text-4xl font-bold text-zinc-900 py-2">{format(date, "d")}</div>
        <div className="text-xs text-zinc-500 pb-2">{format(date, "EEEE")}</div>
      </div>
    </div>
  )
}
