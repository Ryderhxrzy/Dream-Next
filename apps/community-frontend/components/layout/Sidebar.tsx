"use client"

import { motion } from "framer-motion"
import {
  Bookmark,
  CalendarDays,
  Home,
  MapPin,
  MessageCircle,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  getFullName,
  getInitials,
  useCurrentUser,
} from "@/lib/hooks/use-current-user"
import { useUnreadMessageCount } from "@/lib/hooks/use-messages"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { icon: Home, label: "Home", href: "/feed" },
  { icon: Bookmark, label: "Saved", href: "/saved" },
  { icon: CalendarDays, label: "Events", href: "/events" },
  { icon: Users, label: "Groups", href: "/groups" },
  { icon: MessageCircle, label: "Messages", href: "/messages", messages: true },
  { icon: ShieldCheck, label: "Safety", href: "/safety" },
]

export default function Sidebar() {
  const unreadMessages = useUnreadMessageCount()
  const pathname = usePathname()
  const { data: user } = useCurrentUser()

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + "/")
  }

  return (
    <aside className="border-border bg-card sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col justify-between overflow-y-auto border-r py-3 lg:flex">
      {/* Nav */}
      <nav className="space-y-1 px-3">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="bg-accent absolute inset-0 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <item.icon
                className={cn(
                  "relative z-10 h-5 w-5 shrink-0",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              />
              <span className="relative z-10">{item.label}</span>
              {item.messages && unreadMessages > 0 && (
                <span className="bg-primary text-primary-foreground relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </Link>
          )
        })}

        {/* Divider */}
        <div className="px-3 pt-3 pb-1">
          <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
            Account
          </p>
        </div>

        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive("/profile")
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <User className="h-5 w-5 shrink-0" />
          Profile
        </Link>

        <Link
          href="/settings"
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
        >
          <Settings className="text-muted-foreground h-5 w-5 shrink-0" />
          Settings
        </Link>
      </nav>

      {/* My Neighborhood + User */}
      <div className="space-y-2 px-3 pb-2">
        {/* Neighborhood */}
        <div className="border-border space-y-1.5 rounded-xl border p-3">
          <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
            My Neighborhood
          </p>
          <div className="flex items-center gap-1.5">
            <MapPin className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <p className="text-foreground truncate text-sm font-semibold">
              Quezon City
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            2,847 members · 142 active
          </p>
        </div>

        {/* User */}
        <Link
          href="/profile"
          className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-semibold">
              {getFullName(user) || "Member"}
            </p>
            <p className="text-muted-foreground text-xs">View profile</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}
