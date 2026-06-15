"use client"

import { useMemo, useState } from "react"
import { useCommunityUiStore } from "@/store/community-ui.store"
import { endOfMonth, endOfWeek } from "date-fns"
import { motion } from "framer-motion"
import { CalendarDays, Loader2, Plus, Search } from "lucide-react"

import { useEvents } from "@/lib/hooks/use-events"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EventCard } from "@/components/community/EventCard"
import { eventDateOf } from "@/components/community/events/event-utils"
import { FeaturedEvent } from "@/components/community/events/FeaturedEvent"

type Tab = "upcoming" | "week" | "month" | "past"

const TABS: { value: Tab; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "past", label: "Past" },
]

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
      if (tab === "past") return d < now
      if (d < now) return false
      if (tab === "week") return d <= endOfWeek(now, { weekStartsOn: 1 })
      if (tab === "month") return d <= endOfMonth(now)
      return true // upcoming
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
    [events, now]
  )

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-foreground text-xl font-bold">Events</h1>
        <div className="relative max-w-sm min-w-40 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="bg-muted border-border h-9 rounded-full pl-8 text-sm"
          />
        </div>
        <Button
          onClick={() => openCreatePost("EVENT")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground ml-auto h-9 text-sm font-medium"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create Event
        </Button>
      </div>

      {/* Featured */}
      {featured && <FeaturedEvent event={featured} />}

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-muted inline-flex items-center gap-1 rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4",
                tab === t.value
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === t.value && (
                <motion.span
                  layoutId="events-tab"
                  className="bg-primary absolute inset-0 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : !filtered.length ? (
        <div className="border-border bg-card rounded-xl border p-10 text-center">
          <div className="bg-accent mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
            <CalendarDays className="text-muted-foreground h-5 w-5" />
          </div>
          <p className="text-foreground text-sm font-medium">No {tab} events</p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {tab === "upcoming"
              ? "Create an event to get the community together."
              : "No past events yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
