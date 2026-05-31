"use client"

import { useRouter } from "next/navigation"
import {
  Bell,
  Bookmark,
  ChevronDown,
  CircleHelp,
  Grid3x3,
  LogOut,
  MapPin,
  Search,
  Settings,
  User,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/store/auth.store"
import { useCurrentUser, getFullName, getInitials } from "@/lib/hooks/use-current-user"
import { useNotifications } from "@/lib/hooks/use-notifications"

export function Topbar() {
  const router = useRouter()
  const setToken = useAuthStore((state) => state.setToken)
  const { data: currentUser } = useCurrentUser()
  const { unreadCount, notifications, markAllRead } = useNotifications()

  function handleLogout() {
    setToken(null)
    router.replace("/login")
    router.refresh()
  }

  return (
    <header className="h-14 border-b border-zinc-200 bg-white flex items-center px-4 gap-3 sticky top-0 z-50">

      {/* Logo */}
      <div className="flex items-center gap-2 w-52 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <span className="font-semibold text-zinc-900 text-sm tracking-tight">AF Nexus</span>
      </div>

      {/* Location Dropdown */}
      <Button
        variant="ghost"
        className="flex items-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 shrink-0"
      >
        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
        Quezon City, Philippines
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </Button>

      {/* Search */}
      <div className="flex-1 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
        <Input
          placeholder="Search..."
          className="pl-8 h-8 bg-zinc-50 border-zinc-200 text-sm rounded-md focus-visible:ring-1 focus-visible:ring-zinc-900 placeholder:text-zinc-400"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-0.5 ml-auto">

        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => open && markAllRead()}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-md w-8 h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-semibold text-zinc-900">
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">No notifications yet</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2 cursor-pointer">
                  <span className="text-xs text-zinc-900">
                    {n.type === "new_post" && `New post: ${String(n.payload.title ?? "")}`}
                    {n.type === "new_comment" && "Someone commented on a post"}
                    {n.type === "new_reply" && "Someone replied to a comment"}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(n.createdAt).toLocaleTimeString()}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Grid */}
        <Button variant="ghost" size="icon" className="rounded-md w-8 h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
          <Grid3x3 className="w-4 h-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-200 mx-1.5" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 items-center gap-1 rounded-md px-1 outline-none transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900">
              <Avatar className="w-7 h-7">
                <AvatarImage src={currentUser?.avatarUrl ?? ""} />
                <AvatarFallback className="bg-zinc-900 text-white text-xs font-semibold">
                  {getInitials(currentUser)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              <span className="sr-only">Open user menu</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-900">
                  {getFullName(currentUser)}
                </span>
                <span className="text-xs font-normal text-zinc-500">
                  {currentUser?.email ?? "Community member"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/feed")}>
              <User className="h-4 w-4 text-zinc-500" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bookmark className="h-4 w-4 text-zinc-500" />
              Saved posts
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 text-zinc-500" />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CircleHelp className="h-4 w-4 text-zinc-500" />
              Help & support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}
