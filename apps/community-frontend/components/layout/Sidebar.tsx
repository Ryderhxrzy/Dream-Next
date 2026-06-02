"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Home, Bookmark, CalendarDays, Users, MessageCircle,
  ShieldCheck, Settings, MapPin
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUnreadMessageCount } from "@/lib/hooks/use-messages"

const navItems = [
  { icon: Home,          label: "Home",     href: "/feed" },
  { icon: Bookmark,      label: "Saved",    href: "/saved" },
  { icon: CalendarDays,  label: "Events",   href: "/events" },
  { icon: Users,         label: "Groups",   href: "/groups" },
  { icon: MessageCircle, label: "Messages", href: "/messages", messages: true },
  { icon: ShieldCheck,   label: "Safety",   href: "/safety" },
]

export default function Sidebar() {
  const unreadMessages = useUnreadMessageCount()
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + "/")
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 flex-col justify-between border-r border-border bg-card py-3 overflow-y-auto">

      {/* Nav */}
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 bg-accent rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <item.icon className={cn("relative z-10 w-5 h-5 shrink-0", active ? "text-foreground" : "text-muted-foreground")} />
            <span className="relative z-10">{item.label}</span>
            {item.messages && unreadMessages > 0 && (
              <span className="relative z-10 ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Link>
          )
        })}

        {/* Divider */}
        <div className="pt-3 pb-1 px-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Account</p>
        </div>

        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5 text-muted-foreground shrink-0" />
          Settings
        </Link>
      </nav>

      {/* My Neighborhood + User */}
      <div className="px-3 space-y-2 pb-2">
        {/* Neighborhood */}
        <div className="rounded-xl border border-border p-3 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">My Neighborhood</p>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-sm font-semibold text-foreground truncate">Quezon City</p>
          </div>
          <p className="text-xs text-muted-foreground">2,847 members · 142 active</p>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">SJ</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Sarah Johnson</p>
            <p className="text-xs text-muted-foreground">Member since 2021</p>
          </div>
        </div>
      </div>

    </aside>
  )
}
