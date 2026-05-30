"use client"

import { Bell, Grid3x3, MapPin, Search, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Topbar() {
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
        <Button variant="ghost" size="icon" className="relative rounded-md w-8 h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </Button>

        {/* Grid */}
        <Button variant="ghost" size="icon" className="rounded-md w-8 h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
          <Grid3x3 className="w-4 h-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-200 mx-1.5" />

        {/* User Avatar */}
        <Avatar className="w-7 h-7 cursor-pointer">
          <AvatarImage src="" />
          <AvatarFallback className="bg-zinc-900 text-white text-xs font-semibold">
            SJ
          </AvatarFallback>
        </Avatar>

      </div>
    </header>
  )
}
