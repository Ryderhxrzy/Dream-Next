"use client"

import Link from "next/link"
import { MapPin, Briefcase, Star, CalendarCheck, PenLine, Heart, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { initials } from "@/components/community/events/event-utils"
import type { CommunityProfile } from "@/lib/hooks/use-profile"
import {
  useMyConnections,
  useMutualConnections,
  useConnectionRequests,
  useConnectionActions,
  type ConnectionUser,
} from "@/lib/hooks/use-connections"

type Stats = { posts: number; connections: number; eventsHosted: number; reactions: number }

function PersonRow({ u }: { u: ConnectionUser }) {
  return (
    <Link
      href={`/profile/${u.id}`}
      className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-accent"
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={u.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
          {initials(u.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
        {u.location && <p className="truncate text-xs text-muted-foreground">{u.location}</p>}
      </div>
    </Link>
  )
}

function RequestRow({ u }: { u: ConnectionUser }) {
  const { accept, remove } = useConnectionActions(u.id)
  const busy = accept.isPending || remove.isPending
  return (
    <div className="flex items-center gap-2">
      <Link href={`/profile/${u.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={u.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initials(u.name)}
          </AvatarFallback>
        </Avatar>
        <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
      </Link>
      <Button size="sm" className="h-7 px-2.5 text-xs" disabled={busy} onClick={() => accept.mutate()}>
        Accept
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-muted-foreground"
        disabled={busy}
        onClick={() => remove.mutate()}
      >
        Decline
      </Button>
    </div>
  )
}

export function ProfileRightPanel({
  profile,
  stats,
  isOwn,
  userId,
}: {
  profile: CommunityProfile
  stats: Stats
  isOwn: boolean
  userId: string
}) {
  const myConns = useMyConnections()
  const mutual = useMutualConnections(userId, !isOwn)
  const requests = useConnectionRequests()

  const people = isOwn ? myConns.data ?? [] : mutual.data ?? []
  const peopleTitle = isOwn ? "Connections" : "Mutual Neighbors"
  const incoming = isOwn ? requests.data ?? [] : []

  const about = [
    { icon: MapPin, label: "Lives in", value: profile.location },
    { icon: Briefcase, label: "Works as", value: profile.occupation },
    { icon: Star, label: "Role", value: profile.role },
  ].filter((a) => a.value)

  const badges = [
    { icon: CalendarCheck, label: "Event Host", sub: `${stats.eventsHosted} hosted`, earned: stats.eventsHosted >= 1, color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: PenLine, label: "Active Poster", sub: `${stats.posts} posts`, earned: stats.posts >= 5, color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: Heart, label: "Well-liked", sub: `${stats.reactions} reactions`, earned: stats.reactions >= 10, color: "text-rose-500", bg: "bg-rose-500/10" },
    { icon: Users, label: "Connector", sub: `${stats.connections} connections`, earned: stats.connections >= 5, color: "text-sky-500", bg: "bg-sky-500/10" },
  ]

  return (
    <div className="space-y-5">
      {/* About */}
      {about.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">About</h3>
          <div className="space-y-3">
            {about.map((a) => (
              <div key={a.label} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <a.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{a.label}</p>
                  <p className="truncate text-sm font-semibold text-foreground">{a.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection requests (own only) */}
      {incoming.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Connection Requests
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {incoming.length}
            </span>
          </h3>
          <div className="space-y-3">
            {incoming.map((u) => (
              <RequestRow key={u.id} u={u} />
            ))}
          </div>
        </div>
      )}

      {/* Community Badges */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Community Badges</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {badges.map((b) => (
            <div
              key={b.label}
              className={cn(
                "rounded-xl border p-3 text-center transition-colors",
                b.earned ? "border-border" : "border-dashed border-border opacity-60",
              )}
            >
              <div className={cn("mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full", b.earned ? b.bg : "bg-muted")}>
                <b.icon className={cn("h-5 w-5", b.earned ? b.color : "text-muted-foreground")} />
              </div>
              <p className="text-xs font-semibold text-foreground">{b.label}</p>
              <p className="text-[10px] text-muted-foreground">{b.earned ? b.sub : "Locked"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Connections / Mutual Neighbors */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {peopleTitle}
          {people.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">· {people.length}</span>
          )}
        </h3>
        {people.length > 0 ? (
          <div className="space-y-1">
            {people.slice(0, 6).map((u) => (
              <PersonRow key={u.id} u={u} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {isOwn ? "No connections yet. Connect with members to grow your network." : "No mutual connections yet."}
          </p>
        )}
      </div>
    </div>
  )
}
