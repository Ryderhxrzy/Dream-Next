"use client"

import { useMemo, useState } from "react"
import { Search, Plus, CalendarDays, Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EventCard } from "@/components/community/EventCard"
import { FeaturedEvent } from "@/components/community/events/FeaturedEvent"
import { eventDateOf } from "@/components/community/events/event-utils"
import { useEvents } from "@/lib/hooks/use-events"
import { useCommunityUiStore } from "@/store/community-ui.store"
import { cn } from "@/lib/utils"

type Tab = "upcoming" | "past"

export function EventsView() {
  const { data: events, isLoading } = useEvents()
  const openCreatePost = useCommunityUiStore((s) => s.openCreatePost)
  const [tab, setTab] = useState<Tab>("upcoming")
  const [search, setSearch] = useState("")

  const now = useMemo(() => new Date(), [])

  const filtered = useMemo(() => {
    let list = events ?? []
    list = list.filter((e) => {
      const d = eventDateOf(e)
      return tab === "upcoming" ? d >= now : d < now
    })
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.title.toLowerCase().includes(q))
    }
    return list
  }, [events, tab, search, now])

  const featured = useMemo(
    () =>
      (events ?? [])
        .filter((e) => eventDateOf(e) >= now)
        .sort((a, b) => +eventDateOf(a) - +eventDateOf(b))[0],
    [events, now],
  )

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Events</h1>
        <div className="relative flex-1 min-w-40 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="pl-8 h-9 bg-muted border-border rounded-full text-sm"
          />
        </div>
        <Button
          onClick={() => openCreatePost("EVENT")}
          className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium ml-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Event
        </Button>
      </div>

      {/* Featured */}
      {featured && <FeaturedEvent event={featured} />}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize",
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !filtered.length ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No {tab} events</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tab === "upcoming" ? "Create an event to get the community together." : "No past events yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
