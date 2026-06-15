"use client"

import {
  CalendarDays,
  Home,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useUnreadMessageCount } from "@/lib/hooks/use-messages"
import { cn } from "@/lib/utils"

const tabs = [
  { icon: Home, label: "Home", href: "/feed" },
  { icon: CalendarDays, label: "Events", href: "/events" },
  { icon: Users, label: "Groups", href: "/groups" },
  { icon: MessageCircle, label: "Messages", href: "/messages", messages: true },
  { icon: ShieldCheck, label: "Safety", href: "/safety" },
]

export function MobileBottomNav() {
  const unreadMessages = useUnreadMessageCount()
  const pathname = usePathname()

  return (
    <nav className="bg-card border-border fixed inset-x-0 bottom-0 z-50 border-t lg:hidden">
      <div className="flex h-16 items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname?.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <tab.icon className="h-5 w-5" />
                {tab.messages && unreadMessages > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
