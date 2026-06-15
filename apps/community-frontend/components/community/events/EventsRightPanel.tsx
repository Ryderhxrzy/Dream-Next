"use client"

import { useMemo, useState } from "react"
import { useCommunityUiStore } from "@/store/community-ui.store"
import { format } from "date-fns"
import { CalendarDays, ChevronRight, Plus } from "lucide-react"

import { useEvents } from "@/lib/hooks/use-events"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { eventDateOf, to12h } from "@/components/community/events/event-utils"

const categories = [
  { label: "Community", count: 8, color: "bg-blue-500" },
  { label: "Volunteer", count: 5, color: "bg-emerald-500" },
  { label: "Market & Sales", count: 4, color: "bg-orange-500" },
  { label: "Social", count: 6, color: "bg-purple-500" },
  { label: "Safety", count: 2, color: "bg-rose-500" },
]

export function EventsRightPanel() {
  const { data: events } = useEvents()
  const openCreatePost = useCommunityUiStore((s) => s.openCreatePost)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const upcoming = useMemo(
    () =>
      (events ?? [])
        .filter((event) => eventDateOf(event) >= new Date())
        .sort((a, b) => +eventDateOf(a) - +eventDateOf(b))
        .slice(0, 4),
    [events]
  )

  return (
    <aside className="border-border bg-card sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 overflow-y-auto border-l px-3 py-4 xl:block">
      <Button
        onClick={() => openCreatePost("EVENT")}
        className="mb-4 h-9 w-full rounded-lg text-sm font-semibold"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Create Event
      </Button>

      <div className="border-border bg-background rounded-xl border p-1">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="w-full bg-transparent p-2"
        />
      </div>

      <section className="mt-5">
        <h2 className="text-foreground mb-2.5 text-sm font-semibold">
          Categories
        </h2>
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.label}
              className="flex items-center gap-2 text-sm"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${category.color}`} />
              <span className="text-foreground/80">{category.label}</span>
              <span className="text-muted-foreground ml-auto text-xs">
                {category.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border mt-5 border-t pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">
            Upcoming Events
          </h2>
          <button className="flex items-center text-xs font-medium text-blue-600 hover:text-blue-700">
            See all
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="divide-border divide-y">
          {upcoming.length ? (
            upcoming.map((event) => {
              const date = eventDateOf(event)
              return (
                <div key={event.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 shrink-0 text-center">
                    <p className="text-[10px] font-bold text-red-500 uppercase">
                      {format(date, "MMM")}
                    </p>
                    <p className="text-foreground text-xl leading-none font-bold">
                      {format(date, "d")}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                      {event.title}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {format(date, "EEE")}
                      {to12h(event.eventTime)
                        ? ` · ${to12h(event.eventTime)}`
                        : ""}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-6 text-center">
              <CalendarDays className="text-muted-foreground mx-auto h-5 w-5" />
              <p className="text-muted-foreground mt-2 text-xs">
                No upcoming events yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </aside>
  )
}
