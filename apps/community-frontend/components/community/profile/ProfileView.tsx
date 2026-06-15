"use client"

import { useMemo, useRef, useState } from "react"
import {
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  ImagePlus,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useCommunityPosts } from "@/lib/hooks/use-community-posts"
import {
  useConnectionActions,
  useUserProfile,
} from "@/lib/hooks/use-connections"
import {
  getFullName,
  getInitials,
  useCurrentUser,
} from "@/lib/hooks/use-current-user"
import { useStartConversation } from "@/lib/hooks/use-messages"
import {
  useMyProfile,
  useUpdateProfile,
  useUploadProfileImage,
  type CommunityProfile,
} from "@/lib/hooks/use-profile"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { initials as initialsFromName } from "@/components/community/events/event-utils"
import PostCard from "@/components/community/PostCard"
import { mapCommunityPostToCard } from "@/components/community/PostFeed"

import { EditProfileModal } from "./EditProfileModal"
import { ProfileRightPanel } from "./ProfileRightPanel"

const TABS = [
  { value: "posts" as const, label: "Posts" },
  { value: "events" as const, label: "Events" },
]

const EMPTY_PROFILE: CommunityProfile = {
  bio: null,
  location: null,
  coverUrl: null,
  occupation: null,
  role: null,
  interests: [],
}

export function ProfileView({ userId }: { userId?: string }) {
  const router = useRouter()
  const { data: currentUser } = useCurrentUser()
  const isOwn = !userId || userId === currentUser?.id
  const targetId = isOwn ? currentUser?.id : userId

  const { data: posts, isLoading: postsLoading } = useCommunityPosts()
  const { data: myProfile } = useMyProfile()
  const { data: otherBundle, isLoading: otherLoading } = useUserProfile(
    isOwn ? undefined : userId
  )
  const updateProfile = useUpdateProfile()
  const uploadImage = useUploadProfileImage()
  const startConversation = useStartConversation()
  const { connect, accept, remove } = useConnectionActions(userId ?? "")

  const [tab, setTab] = useState<"posts" | "events">("posts")
  const [editOpen, setEditOpen] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const profile: CommunityProfile =
    (isOwn ? myProfile : otherBundle) ?? EMPTY_PROFILE
  const name = isOwn
    ? getFullName(currentUser)
    : (otherBundle?.name ?? "Member")
  const avatarUrl = isOwn ? currentUser?.avatarUrl : otherBundle?.avatarUrl
  const initials = isOwn
    ? getInitials(currentUser)
    : initialsFromName(otherBundle?.name ?? "?")
  const handle =
    isOwn && currentUser?.email ? currentUser.email.split("@")[0] : null
  const connectionCount = isOwn
    ? (myProfile?.connectionCount ?? 0)
    : (otherBundle?.connectionCount ?? 0)
  const status = isOwn ? "SELF" : (otherBundle?.connectionStatus ?? "NONE")

  const myPosts = useMemo(
    () => (posts ?? []).filter((p) => targetId && p.authorId === targetId),
    [posts, targetId]
  )

  const statsArr = useMemo(() => {
    const eventsHosted = myPosts.filter((p) => p.category === "EVENT").length
    const reactions = myPosts.reduce((a, p) => a + p.counts.reactions, 0)
    return [
      { label: "Posts", value: myPosts.length },
      { label: "Connections", value: connectionCount },
      { label: "Events hosted", value: eventsHosted },
      { label: "Reactions", value: reactions },
    ]
  }, [myPosts, connectionCount])

  const statsObj = useMemo(
    () => ({
      posts: myPosts.length,
      connections: connectionCount,
      eventsHosted: myPosts.filter((p) => p.category === "EVENT").length,
      reactions: myPosts.reduce((a, p) => a + p.counts.reactions, 0),
    }),
    [myPosts, connectionCount]
  )

  const visible = useMemo(
    () =>
      tab === "events"
        ? myPosts.filter((p) => p.category === "EVENT")
        : myPosts,
    [myPosts, tab]
  )

  const coverBusy = uploadImage.isPending || updateProfile.isPending

  function handleCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    uploadImage.mutate(file, {
      onSuccess: ({ imageUrl }) => {
        updateProfile.mutate(
          { ...profile, coverUrl: imageUrl },
          {
            onSuccess: () => toast.success("Cover photo updated!"),
            onError: (er) => toast.error(er.message ?? "Failed to save cover"),
          }
        )
      },
      onError: (er) => toast.error(er.message ?? "Upload failed"),
    })
  }

  function handleMessage() {
    if (!userId) return
    startConversation.mutate(userId, {
      onSuccess: ({ conversationId }) =>
        router.push(`/messages?c=${conversationId}`),
      onError: (er) =>
        toast.error(er.message ?? "Failed to start conversation"),
    })
  }

  if (!isOwn && otherLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Header card */}
          <div className="border-border bg-card overflow-hidden rounded-2xl border">
            {/* Cover */}
            <div className="relative h-28 sm:h-40">
              {profile.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.coverUrl}
                  alt="Cover"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-linear-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
              )}
              {isOwn && (
                <>
                  <Button
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverBusy}
                    size="sm"
                    className="absolute top-3 right-3 h-8 rounded-full bg-black/30 px-3 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/40"
                  >
                    {coverBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Edit Cover
                  </Button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverPick}
                  />
                </>
              )}
            </div>

            <div className="px-5 pb-5 sm:px-6">
              {/* Avatar */}
              <div className="relative -mt-12 mb-3 w-fit sm:-mt-14">
                <Avatar className="ring-card h-24 w-24 ring-4 sm:h-28 sm:w-28">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="ring-card absolute right-2 bottom-2 h-4 w-4 rounded-full bg-emerald-500 ring-2" />
              </div>

              {/* Name + actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-foreground text-xl font-bold sm:text-2xl">
                      {name}
                    </h1>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500">
                      <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                    </span>
                  </div>
                  {handle && (
                    <p className="text-muted-foreground text-sm">@{handle}</p>
                  )}
                </div>

                {isOwn ? (
                  <Button
                    onClick={() => setEditOpen(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-full px-4 text-sm font-semibold"
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    {status === "NONE" && (
                      <Button
                        onClick={() => connect.mutate()}
                        disabled={connect.isPending}
                        className="rounded-full px-4 text-sm font-semibold"
                      >
                        <UserPlus className="mr-1.5 h-4 w-4" />
                        Connect
                      </Button>
                    )}
                    {status === "PENDING_OUTGOING" && (
                      <Button
                        onClick={() => remove.mutate()}
                        disabled={remove.isPending}
                        variant="outline"
                        className="rounded-full px-4 text-sm font-semibold"
                      >
                        <Clock3 className="mr-1.5 h-4 w-4" />
                        Requested
                      </Button>
                    )}
                    {status === "PENDING_INCOMING" && (
                      <>
                        <Button
                          onClick={() => accept.mutate()}
                          disabled={accept.isPending}
                          className="rounded-full px-4 text-sm font-semibold"
                        >
                          <Check className="mr-1.5 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => remove.mutate()}
                          disabled={remove.isPending}
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {status === "CONNECTED" && (
                      <Button
                        onClick={() => remove.mutate()}
                        disabled={remove.isPending}
                        variant="outline"
                        className="rounded-full px-4 text-sm font-semibold"
                      >
                        <UserCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                        Connected
                      </Button>
                    )}
                    <Button
                      onClick={handleMessage}
                      disabled={startConversation.isPending}
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Meta row */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {profile.location && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {profile.location}
                  </span>
                )}
                <span className="flex items-center gap-1 font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Verified Member
                </span>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-foreground/90 mt-3 text-sm leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              )}

              {/* Interests */}
              {profile.interests.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.interests.map((i) => (
                    <span
                      key={i}
                      className="border-border bg-accent/50 text-foreground rounded-full border px-3 py-1 text-xs font-medium"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="border-border sm:divide-border mt-5 grid grid-cols-2 border-t pt-4 sm:grid-cols-4 sm:divide-x">
                {statsArr.map((s) => (
                  <div key={s.label} className="px-2 py-1 text-center">
                    <p className="text-foreground text-xl font-bold">
                      {s.value}
                    </p>
                    <p className="text-muted-foreground text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-muted inline-flex items-center gap-1 rounded-full p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  tab === t.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Posts */}
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : visible.length ? (
            <div className="space-y-4">
              {visible.map((post) => (
                <PostCard
                  key={post.id}
                  post={mapCommunityPostToCard(post)}
                  postId={post.id}
                  isOwner={isOwn}
                  rawPost={post}
                />
              ))}
            </div>
          ) : (
            <div className="border-border bg-card rounded-xl border p-10 text-center">
              <div className="bg-accent mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                <FileText className="text-muted-foreground h-5 w-5" />
              </div>
              <p className="text-foreground text-sm font-medium">
                {tab === "events" ? "No events hosted yet" : "No posts yet"}
              </p>
            </div>
          )}
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-18">
            <ProfileRightPanel
              profile={profile}
              stats={statsObj}
              isOwn={isOwn}
              userId={targetId ?? ""}
            />
          </div>
        </aside>
      </div>

      {isOwn && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profile={myProfile ?? EMPTY_PROFILE}
        />
      )}
    </div>
  )
}
