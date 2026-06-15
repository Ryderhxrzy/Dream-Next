"use client"

import { useAuthStore } from "@/store/auth.store"
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
import { useRouter } from "next/navigation"

import {
  getFullName,
  getInitials,
  useCurrentUser,
} from "@/lib/hooks/use-current-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

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
    <header className="border-border bg-card sticky top-0 z-50 flex h-14 items-center gap-3 border-b px-4">
      {/* Logo */}
      <div className="flex w-auto shrink-0 items-center gap-2 lg:w-52">
        <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg">
          <svg
            className="text-primary-foreground h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <span className="text-foreground text-sm font-semibold tracking-tight">
          AF Nexus
        </span>
      </div>

      {/* Location Dropdown — hidden on mobile */}
      <Button
        variant="ghost"
        className="text-foreground/80 hover:text-foreground hover:bg-accent hidden h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium sm:flex"
      >
        <MapPin className="text-muted-foreground h-3.5 w-3.5" />
        <span className="hidden md:inline">Quezon City, Philippines</span>
        <span className="md:hidden">Quezon City</span>
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
      </Button>

      {/* Search */}
      <div className="relative max-w-sm min-w-0 flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
        <Input
          placeholder="Search..."
          className="bg-muted border-border focus-visible:ring-ring placeholder:text-muted-foreground h-8 rounded-md pl-8 text-sm focus-visible:ring-1"
        />
      </div>

      {/* Right Actions */}
      <div className="ml-auto flex items-center gap-0.5">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationsDropdown />

        {/* Grid */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-md"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>

        {/* Divider */}
        <div className="bg-muted mx-1.5 h-5 w-px" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:bg-accent focus-visible:ring-ring flex h-8 items-center gap-1 rounded-md px-1 transition-colors outline-none focus-visible:ring-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={currentUser?.avatarUrl ?? ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {getInitials(currentUser)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
              <span className="sr-only">Open user menu</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-foreground text-sm font-semibold">
                  {getFullName(currentUser)}
                </span>
                <span className="text-muted-foreground text-xs font-normal">
                  {currentUser?.email ?? "Community member"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="text-muted-foreground h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/saved")}>
              <Bookmark className="text-muted-foreground h-4 w-4" />
              Saved posts
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="text-muted-foreground h-4 w-4" />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CircleHelp className="text-muted-foreground h-4 w-4" />
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
