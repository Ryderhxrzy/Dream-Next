"use client"

import { useState } from "react"
import { formatDistanceToNowStrict } from "date-fns"
import { Loader2, Crown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useEventRsvps, type EventRsvp } from "@/lib/hooks/use-event-rsvps"
import { useCommunityUiStore } from "@/store/community-ui.store"

type Tab = "GOING" | "INTERESTED"

function RespondentRow({ rsvp, showTime }: { rsvp: EventRsvp; showTime: boolean }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarImage src={rsvp.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
          {rsvp.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{rsvp.name}</p>
        {showTime && (
          <p className="text-[11px] text-muted-foreground">
            RSVP&apos;d {formatDistanceToNowStrict(new Date(rsvp.createdAt), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  )
}

export function RespondentsModal() {
  const { respondentsEvent, closeRespondents } = useCommunityUiStore()
  const [tab, setTab] = useState<Tab>("GOING")

  const open = !!respondentsEvent
  const isOwner = respondentsEvent?.isOwner ?? false
  const { data: rsvps, isLoading } = useEventRsvps(respondentsEvent?.id ?? null)

  const going = rsvps?.filter((r) => r.status === "GOING") ?? []
  const interested = rsvps?.filter((r) => r.status === "INTERESTED") ?? []
  const list = tab === "GOING" ? going : interested

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeRespondents()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold text-foreground">
            {respondentsEvent?.title ?? "Event"} · Respondents
          </DialogTitle>
        </DialogHeader>

        {/* Owner banner */}
        {isOwner && (
          <div className="mx-5 mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-500">
              You&apos;re hosting · {going.length} going, {interested.length} interested
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 border-b border-border">
          {(["GOING", "INTERESTED"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "GOING" ? `Going (${going.length})` : `Interested (${interested.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto px-5 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No one {tab === "GOING" ? "going" : "interested"} yet.
            </p>
          ) : (
            list.map((rsvp) => (
              <RespondentRow key={rsvp.userId} rsvp={rsvp} showTime={isOwner} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
