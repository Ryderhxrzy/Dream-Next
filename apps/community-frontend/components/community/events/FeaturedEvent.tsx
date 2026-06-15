"use client"

import { format } from "date-fns"
import { Clock, MapPin, Share2 } from "lucide-react"

import type { CommunityPost } from "@/lib/hooks/use-community-posts"
import { useEventRsvps } from "@/lib/hooks/use-event-rsvps"
import { useSetRsvp } from "@/lib/hooks/use-set-rsvp"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import {
  eventDateOf,
  formatEventTimeRange,
  initials,
  to12h,
} from "./event-utils"

function GoingAvatars({
  eventId,
  goingCount,
}: {
  eventId: string
  goingCount: number
}) {
  const { data: rsvps } = useEventRsvps(eventId)
  const going = (rsvps ?? []).filter((r) => r.status === "GOING").slice(0, 4)

  return (
    <div className="flex items-center gap-2.5">
      {going.length > 0 && (
        <div className="flex -space-x-2.5">
          {going.map((r) => (
            <Avatar key={r.userId} className="h-8 w-8 ring-2 ring-violet-600">
              <AvatarImage src={r.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-white text-[11px] font-semibold text-violet-700">
                {initials(r.name)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
      <span className="text-sm font-medium text-white/90">
        <span className="font-semibold text-white">{goingCount}</span>{" "}
        {goingCount === 1 ? "member" : "members"} going
      </span>
    </div>
  )
}

export function FeaturedEvent({ event }: { event: CommunityPost }) {
  const setRsvp = useSetRsvp()
  const date = eventDateOf(event)
  const isGoing = event.viewerRsvp === "GOING"
  const timeRange = formatEventTimeRange(event.eventTime, event.eventEndTime)

  async function handleShare() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/events` : ""
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: event.title,
          text: event.content ?? "",
          url,
        })
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      /* user cancelled share */
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-purple-600 via-violet-600 to-fuchsia-500 px-5 py-6 text-white shadow-sm sm:px-8 sm:py-7">
      {/* decorative glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute right-24 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        {/* Left: details */}
        <div className="order-2 min-w-0 flex-1 space-y-4 sm:order-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">
            ⭐ Featured · Upcoming
          </span>

          <div className="space-y-2">
            <h2 className="text-xl leading-tight font-bold sm:text-2xl lg:text-3xl">
              {event.title} 🎉
            </h2>
            {event.content && (
              <p className="line-clamp-2 max-w-lg text-sm leading-relaxed text-white/80">
                {event.content}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-white/90">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              {format(date, "EEE, MMM d")}
              {timeRange ? ` · ${timeRange}` : ""}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {event.location}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              onClick={() =>
                setRsvp.mutate({ postId: event.id, status: "GOING" })
              }
              className="h-10 rounded-full bg-white px-5 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:bg-white/90"
            >
              {isGoing ? "✓ Going" : "Join Event"}
            </Button>
            <Button
              onClick={handleShare}
              variant="ghost"
              className="h-10 rounded-full border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20"
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
            <GoingAvatars eventId={event.id} goingCount={event.counts.going} />
            <span className="text-sm text-white/70">
              · {event.counts.interested} interested
            </span>
          </div>
        </div>

        {/* Right: calendar card */}
        <div className="order-1 w-28 shrink-0 self-start overflow-hidden rounded-2xl bg-white text-center shadow-lg sm:order-2 sm:w-32 sm:self-auto">
          <div className="bg-red-500 py-1.5 text-xs font-bold tracking-wide text-white uppercase">
            {format(date, "MMMM")}
          </div>
          <div className="px-2 pt-3">
            <div className="text-5xl leading-none font-bold text-zinc-900">
              {format(date, "d")}
            </div>
            <div className="pt-1.5 text-xs font-medium text-zinc-500">
              {format(date, "EEEE")}
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 py-2 text-sm font-semibold text-violet-600">
            {to12h(event.eventTime) || format(date, "h:mm a")}
          </div>
        </div>
      </div>
    </div>
  )
}
