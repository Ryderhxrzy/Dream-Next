"use client"

import { useCommunityUiStore } from "@/store/community-ui.store"
import { AlertCircle, CalendarDays, LayoutGrid, Plus } from "lucide-react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { EventsRightPanel } from "@/components/community/events/EventsRightPanel"

const stats = [
  { value: "2,847", label: "Total members" },
  { value: "142", label: "Active today", highlight: true },
  { value: "38", label: "New posts" },
  { value: "6", label: "Events this week" },
]

const events = [
  {
    color: "bg-emerald-500",
    title: "Summer Block Party",
    detail: "Sat, Jun 14 · Maple St · 3:00 PM",
  },
  {
    color: "bg-blue-500",
    title: "HOA Annual Meeting",
    detail: "Tue, Jun 17 · Community Center · 7 PM",
  },
  {
    color: "bg-orange-400",
    title: "Farmers Market",
    detail: "Sun, Jun 22 · Main St · 8:00 AM",
  },
]

const activeMembers = ["JM", "RP", "TK", "AL", "BN", "CM"]

const quickActions = [
  { icon: LayoutGrid, label: "List an Item for Sale" },
  { icon: CalendarDays, label: "Create an Event" },
  { icon: AlertCircle, label: "Report Local Issue" },
]

export default function RightPanel() {
  const { openCreatePost } = useCommunityUiStore()
  const pathname = usePathname()

  // Messages & profile pages render their own layout — no generic right panel
  if (pathname?.includes("/messages")) return null
  if (pathname?.includes("/profile")) return null
  if (pathname?.includes("/events")) return <EventsRightPanel />

  return (
    <aside className="border-border sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 space-y-5 overflow-y-auto border-l px-3 py-4 xl:block">
      {/* Post Button */}
      <Button
        onClick={() => openCreatePost()}
        className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 w-full rounded-md text-sm font-medium"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Post to Community
      </Button>

      {/* Stats */}
      <div>
        <p className="text-muted-foreground mb-2.5 text-[10px] font-medium tracking-widest uppercase">
          Community Stats
        </p>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="border-border rounded-lg border p-2.5"
            >
              <p
                className={`text-lg leading-none font-bold ${stat.highlight ? "text-emerald-600" : "text-foreground"}`}
              >
                {stat.value}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
            Upcoming Events
          </p>
          <button className="text-muted-foreground hover:text-foreground text-[11px] transition-colors">
            See all
          </button>
        </div>
        <div className="space-y-2.5">
          {events.map((event) => (
            <div key={event.title} className="flex items-start gap-2">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${event.color}`}
              />
              <div>
                <p className="text-foreground text-sm leading-none font-medium">
                  {event.title}
                </p>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {event.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Members */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
            Active Members
          </p>
          <button className="text-muted-foreground hover:text-foreground text-[11px] transition-colors">
            View all
          </button>
        </div>
        <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          142 online right now
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {activeMembers.map((initials) => (
            <div
              key={initials}
              className="bg-muted text-foreground ring-card hover:ring-muted-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-semibold ring-2 transition-all"
            >
              {initials}
            </div>
          ))}
          <div className="bg-accent border-border text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-medium">
            +136
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-medium tracking-widest uppercase">
          Quick Actions
        </p>
        <div className="space-y-0.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="text-foreground/80 hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors"
            >
              <action.icon className="text-muted-foreground h-4 w-4 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
