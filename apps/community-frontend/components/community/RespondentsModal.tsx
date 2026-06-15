"use client"

import { useState } from "react"
import { useCommunityUiStore } from "@/store/community-ui.store"
import { formatDistanceToNowStrict } from "date-fns"
import { Crown, Loader2 } from "lucide-react"

import { useEventRsvps, type EventRsvp } from "@/lib/hooks/use-event-rsvps"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Tab = "GOING" | "INTERESTED"

function RespondentRow({
  rsvp,
  showTime,
}: {
  rsvp: EventRsvp
  showTime: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={rsvp.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
          {rsvp.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">
          {rsvp.name}
        </p>
        {showTime && (
          <p className="text-muted-foreground text-[11px]">
            RSVP&apos;d{" "}
            {formatDistanceToNowStrict(new Date(rsvp.createdAt), {
              addSuffix: true,
            })}
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
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-foreground text-base font-semibold">
            {respondentsEvent?.title ?? "Event"} · Respondents
          </DialogTitle>
        </DialogHeader>

        {/* Owner banner */}
        {isOwner && (
          <div className="mx-5 mb-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700 dark:text-amber-500">
              You&apos;re hosting · {going.length} going, {interested.length}{" "}
              interested
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-border flex items-center gap-1 border-b px-5">
          {(["GOING", "INTERESTED"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === t
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              {t === "GOING"
                ? `Going (${going.length})`
                : `Interested (${interested.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto px-5 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
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
