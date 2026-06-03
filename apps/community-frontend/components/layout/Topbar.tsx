"use client"

import { useRouter } from "next/navigation"
import {
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
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { useAuthStore } from "@/store/auth.store"
import { useCurrentUser, getFullName, getInitials } from "@/lib/hooks/use-current-user"

export function Topbar() {
  const router = useRouter()
  const setToken = useAuthStore((state) => state.setToken)
  const { data: currentUser } = useCurrentUser()

  function handleLogout() {
    setToken(null)
    router.replace("/login")
    router.refresh()
  }

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 sticky top-0 z-50">

      {/* Logo */}
      <div className="flex items-center gap-2 w-auto lg:w-52 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <span className="font-semibold text-foreground text-sm tracking-tight">AF Nexus</span>
      </div>

      {/* Location Dropdown — hidden on mobile */}
      <Button
        variant="ghost"
        className="hidden sm:flex items-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent shrink-0"
      >
        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="hidden md:inline">Quezon City, Philippines</span>
        <span className="md:hidden">Quezon City</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>

      {/* Search */}
      <div className="flex-1 relative max-w-sm min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-8 h-8 bg-muted border-border text-sm rounded-md focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-0.5 ml-auto">

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationsDropdown />

        {/* Grid */}
        <Button variant="ghost" size="icon" className="rounded-md w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-accent">
          <Grid3x3 className="w-4 h-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-5 bg-muted mx-1.5" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 items-center gap-1 rounded-md px-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="w-7 h-7">
                <AvatarImage src={currentUser?.avatarUrl ?? ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {getInitials(currentUser)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="sr-only">Open user menu</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {getFullName(currentUser)}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {currentUser?.email ?? "Community member"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/saved")}>
              <Bookmark className="h-4 w-4 text-muted-foreground" />
              Saved posts
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 text-muted-foreground" />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CircleHelp className="h-4 w-4 text-muted-foreground" />
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
