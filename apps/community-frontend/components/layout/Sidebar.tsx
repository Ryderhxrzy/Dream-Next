"use client"

import { cn } from "@/lib/utils"
import {
  Home, Rss, CalendarDays, Users, MessageCircle,
  ShieldCheck, Settings, MapPin
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { icon: Home,          label: "Home",     href: "/feed",     active: true },
  { icon: Rss,           label: "Feed",     href: "/feed/all" },
  { icon: CalendarDays,  label: "Events",   href: "/events" },
  { icon: Users,         label: "Groups",   href: "/groups" },
  { icon: MessageCircle, label: "Messages", href: "/messages", badge: 3 },
  { icon: ShieldCheck,   label: "Safety",   href: "/safety" },
]

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 flex flex-col justify-between border-r border-zinc-200 bg-white py-3 overflow-y-auto">

      {/* Nav */}
      <nav className="px-3 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              item.active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <item.icon className={cn("w-5 h-5 shrink-0", item.active ? "text-zinc-900" : "text-zinc-400")} />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-zinc-900 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </a>
        ))}

        {/* Divider */}
        <div className="pt-3 pb-1 px-3">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Account</p>
        </div>

        <a
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          <Settings className="w-5 h-5 text-zinc-400 shrink-0" />
          Settings
        </a>
      </nav>

      {/* My Neighborhood + User */}
      <div className="px-3 space-y-2 pb-2">
        {/* Neighborhood */}
        <div className="rounded-xl border border-zinc-200 p-3 space-y-1.5">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">My Neighborhood</p>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <p className="text-sm font-semibold text-zinc-900 truncate">Quezon City</p>
          </div>
          <p className="text-xs text-zinc-400">2,847 members · 142 active</p>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src="" />
            <AvatarFallback className="bg-zinc-900 text-white text-xs font-semibold">SJ</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">Sarah Johnson</p>
            <p className="text-xs text-zinc-400">Member since 2021</p>
          </div>
        </div>
      </div>

    </aside>
  )
}
