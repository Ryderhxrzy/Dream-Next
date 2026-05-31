"use client"

import { Button } from "@/components/ui/button"
import { Plus, LayoutGrid, CalendarDays, AlertCircle } from "lucide-react"
import { CreatePostModal } from "@/components/community/CreatePostModal"
import { CommentsModal } from "@/components/community/CommentsModal"
import { DeletePostModal } from "@/components/community/DeletePostModal"
import { useCommunityUiStore } from "@/store/community-ui.store"

const stats = [
  { value: "2,847", label: "Total members" },
  { value: "142",   label: "Active today",    highlight: true },
  { value: "38",    label: "New posts" },
  { value: "6",     label: "Events this week" },
]

const events = [
  { color: "bg-emerald-500", title: "Summer Block Party",  detail: "Sat, Jun 14 · Maple St · 3:00 PM" },
  { color: "bg-blue-500",    title: "HOA Annual Meeting",  detail: "Tue, Jun 17 · Community Center · 7 PM" },
  { color: "bg-orange-400",  title: "Farmers Market",      detail: "Sun, Jun 22 · Main St · 8:00 AM" },
]

const activeMembers = ["JM", "RP", "TK", "AL", "BN", "CM"]

const quickActions = [
  { icon: LayoutGrid,   label: "List an Item for Sale" },
  { icon: CalendarDays, label: "Create an Event" },
  { icon: AlertCircle,  label: "Report Local Issue" },
]

export default function RightPanel() {
  const { createPostOpen, openCreatePost, closeCreatePost, editPost, closeEditPost } = useCommunityUiStore()

  return (
    <aside className="w-64 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto py-4 px-3 space-y-5 border-l border-zinc-200">

      {/* Post Button */}
      <Button
        onClick={openCreatePost}
        className="w-full bg-zinc-950 hover:bg-zinc-800 text-white h-9 text-sm font-medium rounded-md"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Post to Community
      </Button>

      <CreatePostModal open={createPostOpen} onClose={closeCreatePost} />
      <CreatePostModal open={!!editPost} onClose={closeEditPost} editPost={editPost ?? undefined} />
      <DeletePostModal />
      <CommentsModal />

      {/* Stats */}
      <div>
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest mb-2.5">
          Community Stats
        </p>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="border border-zinc-200 rounded-lg p-2.5">
              <p className={`text-lg font-bold leading-none ${stat.highlight ? "text-emerald-600" : "text-zinc-900"}`}>
                {stat.value}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
            Upcoming Events
          </p>
          <button className="text-[11px] text-zinc-400 hover:text-zinc-900 transition-colors">
            See all
          </button>
        </div>
        <div className="space-y-2.5">
          {events.map((event) => (
            <div key={event.title} className="flex items-start gap-2">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${event.color}`} />
              <div>
                <p className="text-sm font-medium text-zinc-900 leading-none">{event.title}</p>
                <p className="text-[11px] text-zinc-400 mt-1">{event.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Members */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
            Active Members
          </p>
          <button className="text-[11px] text-zinc-400 hover:text-zinc-900 transition-colors">
            View all
          </button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          142 online right now
        </p>
        <div className="flex items-center flex-wrap gap-1">
          {activeMembers.map((initials) => (
            <div
              key={initials}
              className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-700 ring-2 ring-white cursor-pointer hover:ring-zinc-400 transition-all"
            >
              {initials}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] font-medium text-zinc-500">
            +136
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest mb-2">
          Quick Actions
        </p>
        <div className="space-y-0.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors text-left"
            >
              <action.icon className="w-4 h-4 text-zinc-400 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

    </aside>
  )
}
