"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, CalendarDays, Users, MessageCircle, ShieldCheck } from "lucide-react"
import { useUnreadMessageCount } from "@/lib/hooks/use-messages"

const tabs = [
  { icon: Home,          label: "Home",     href: "/feed" },
  { icon: CalendarDays,  label: "Events",   href: "/events" },
  { icon: Users,         label: "Groups",   href: "/groups" },
  { icon: MessageCircle, label: "Messages", href: "/messages", messages: true },
  { icon: ShieldCheck,   label: "Safety",   href: "/safety" },
]

export function MobileBottomNav() {
  const unreadMessages = useUnreadMessageCount()
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + "/")
          return (
          <Link
            key={tab.label}
            href={tab.href}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <tab.icon className="w-5 h-5" />
              {tab.messages && unreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1">
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
