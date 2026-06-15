"use client"

import { useEffect, useRef, useState } from "react"
import { useCommunityUiStore } from "@/store/community-ui.store"
import {
  Bookmark,
  EyeOff,
  Flag,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Share2,
  ThumbsUp,
  Trash2,
  UserX,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { CommunityPost } from "@/lib/hooks/use-community-posts"
import { useHideCommunityPost } from "@/lib/hooks/use-hide-community-post"
import { useStartConversation } from "@/lib/hooks/use-messages"
import { useToggleSave } from "@/lib/hooks/use-saved-posts"
import { useSetRsvp } from "@/lib/hooks/use-set-rsvp"
import { useToggleReaction } from "@/lib/hooks/use-toggle-reaction"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type PostType = "normal" | "question" | "event"

export interface Post {
  id: string
  type: PostType
  author: {
    name: string
    initials: string
    avatar?: string
    isOfficial?: boolean
  }
  timeAgo: string
  location: string
  content: string
  imageUrl?: string
  helpfulCount: number
  liked: boolean
  commentCount: number
  event?: {
    month: string
    day: string
    title: string
    date: string
    location: string
    going?: boolean
    interested?: boolean
    goingCount?: number
    interestedCount?: number
  }
}

const typeBadge: Record<PostType, { label: string; className: string }> = {
  normal: { label: "", className: "" },
  question: {
    label: "? Question",
    className: "bg-orange-500/10 text-orange-600 border border-orange-500/20",
  },
  event: {
    label: "📅 Event",
    className: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
  },
}

const UNDO_DURATION = 5000

interface PostCardProps {
  post: Post
  postId: string
  isOwner: boolean
  rawPost: CommunityPost
}

const PostCard = ({ post, postId, isOwner, rawPost }: PostCardProps) => {
  const badge = typeBadge[post.type]
  const { hide } = useHideCommunityPost()
  const toggleReaction = useToggleReaction()
  const setRsvp = useSetRsvp()
  const toggleSave = useToggleSave()

  const [hidePending, setHidePending] = useState(false)
  const [undoProgress, setUndoProgress] = useState(100)
  const openEditPost = useCommunityUiStore((state) => state.openEditPost)
  const confirmDeletePost = useCommunityUiStore(
    (state) => state.confirmDeletePost
  )
  const openComments = useCommunityUiStore((state) => state.openComments)
  const openRespondents = useCommunityUiStore((state) => state.openRespondents)
  const openRepost = useCommunityUiStore((state) => state.openRepost)

  const router = useRouter()
  const startConversation = useStartConversation()

  function handleShare() {
    // Use the current path so the login redirect works on the active host.
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`
    navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard")
  }

  function handleMessage() {
    startConversation.mutate(rawPost.authorId, {
      onSuccess: ({ conversationId }) =>
        router.push(`/messages?c=${conversationId}`),
      onError: (e) => toast.error(e.message ?? "Failed to start conversation"),
    })
  }

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function handleHide() {
    setHidePending(true)
    setUndoProgress(100)

    const start = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      setUndoProgress(Math.max(0, 100 - (elapsed / UNDO_DURATION) * 100))
    }, 50)

    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!)
      hide.mutate(postId)
    }, UNDO_DURATION)
  }

  function handleUndo() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setHidePending(false)
    setUndoProgress(100)
  }

  if (hidePending) {
    return (
      <div className="bg-card border-border flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <EyeOff className="text-muted-foreground h-4 w-4 shrink-0" />
          Post hidden
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-accent h-1 w-24 overflow-hidden rounded-full">
            <div
              className="bg-muted-foreground h-full rounded-full transition-none"
              style={{ width: `${undoProgress}%` }}
            />
          </div>
          <button
            onClick={handleUndo}
            className="text-foreground shrink-0 text-sm font-medium hover:underline"
          >
            Undo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      id={`post-${postId}`}
      className="bg-card border-border scroll-mt-20 space-y-3 rounded-xl border p-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Link href={`/profile/${rawPost.authorId}`}>
            <Avatar className="h-9 w-9 transition-opacity hover:opacity-90">
              <AvatarImage src={post.author.avatar || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {post.author.initials}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/profile/${rawPost.authorId}`}
                className="text-foreground text-sm font-semibold hover:underline"
              >
                {post.author.name}
              </Link>
              {post.author.isOfficial && (
                <span className="text-xs font-medium text-blue-600">
                  ✓ Official
                </span>
              )}
              {post.type !== "normal" && (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {post.timeAgo} · {post.location}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground/80 transition-colors outline-none">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {isOwner ? (
              <>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-sm"
                  onClick={() => toggleSave.mutate(postId)}
                >
                  <Bookmark
                    className={cn(
                      "h-3.5 w-3.5",
                      rawPost.viewerHasSaved && "fill-current"
                    )}
                  />
                  {rawPost.viewerHasSaved ? "Saved" : "Save post"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-sm"
                  onClick={() => openEditPost(rawPost)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit post
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-sm"
                  onClick={handleHide}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide post
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer gap-2 text-sm"
                  onClick={() => confirmDeletePost(postId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete post
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-sm"
                  onClick={handleMessage}
                  disabled={startConversation.isPending}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message {post.author.name.split(" ")[0]}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-sm"
                  onClick={() => toggleSave.mutate(postId)}
                >
                  <Bookmark
                    className={cn(
                      "h-3.5 w-3.5",
                      rawPost.viewerHasSaved && "fill-current"
                    )}
                  />
                  {rawPost.viewerHasSaved ? "Saved" : "Save post"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer gap-2 text-sm text-orange-600 focus:text-orange-600">
                  <Flag className="h-3.5 w-3.5" />
                  Report post
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2 text-sm text-red-600 focus:text-red-600">
                  <UserX className="h-3.5 w-3.5" />
                  Block user
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content (caption) */}
      {post.content && (
        <p className="text-foreground/90 text-sm leading-relaxed">
          {post.content}
        </p>
      )}

      {/* Embedded original (repost) */}
      {rawPost.repostOf && (
        <div className="border-border space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={rawPost.repostOf.author.avatarUrl ?? undefined}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-semibold">
                {rawPost.repostOf.author.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-foreground text-xs font-semibold">
              {rawPost.repostOf.author.name}
            </span>
          </div>
          {rawPost.repostOf.title && (
            <p className="text-foreground text-sm font-medium">
              {rawPost.repostOf.title}
            </p>
          )}
          <p className="text-foreground/80 text-sm leading-relaxed">
            {rawPost.repostOf.content}
          </p>
          {rawPost.repostOf.imageUrl && (
            <div className="bg-accent aspect-video overflow-hidden rounded-md">
              <img
                src={rawPost.repostOf.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* Image (own) */}
      {post.imageUrl && (
        <div className="bg-accent aspect-video overflow-hidden rounded-lg">
          <img
            src={post.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Event Card */}
      {post.event && (
        <div className="border-border flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
              <span className="text-[9px] leading-none font-bold text-red-500 uppercase">
                {post.event.month}
              </span>
              <span className="text-foreground text-base leading-tight font-bold">
                {post.event.day}
              </span>
            </div>
            <div>
              <p className="text-foreground text-sm font-semibold">
                {post.event.title}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {post.event.date} · {post.event.location}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              onClick={() => setRsvp.mutate({ postId, status: "GOING" })}
              className={cn(
                "h-8 rounded-md px-3 text-xs transition-colors",
                post.event.going
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-muted hover:bg-accent text-foreground"
              )}
            >
              {post.event.going ? "✓ Going" : "Going"}
            </Button>
            <Button
              onClick={() => setRsvp.mutate({ postId, status: "INTERESTED" })}
              className={cn(
                "h-8 rounded-md px-3 text-xs transition-colors",
                post.event.interested
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted hover:bg-accent text-foreground"
              )}
            >
              Interested
            </Button>
          </div>
        </div>
      )}

      {/* Event Footer */}
      {post.event && (
        <div className="text-muted-foreground border-border flex items-center gap-3 border-t pt-1 text-xs">
          <button
            onClick={() =>
              openRespondents({ id: postId, title: rawPost.title, isOwner })
            }
            className="font-medium text-emerald-600 hover:underline"
          >
            ✓ {post.event.goingCount} Going
          </button>
          <button
            onClick={() =>
              openRespondents({ id: postId, title: rawPost.title, isOwner })
            }
            className="hover:text-foreground transition-colors hover:underline"
          >
            {post.event.interestedCount} Interested
          </button>
          <button
            onClick={() => openComments({ id: postId, title: rawPost.title })}
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <MessageCircle className="h-3 w-3" />
            {post.commentCount} Comments
          </button>
        </div>
      )}

      {/* Actions */}
      {!post.event && (
        <div className="border-border flex items-center gap-1 border-t pt-1">
          <button
            onClick={() => toggleReaction.mutate(postId)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
              post.liked
                ? "text-blue-600 hover:bg-blue-500/10"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <ThumbsUp
              className={cn("h-3.5 w-3.5", post.liked && "fill-blue-600")}
            />
            {post.helpfulCount} Helpful
          </button>
          <button
            onClick={() => openComments({ id: postId, title: rawPost.title })}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {post.commentCount} Comments
          </button>
          <button
            onClick={() => openRepost(rawPost)}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors"
          >
            <Repeat2 className="h-3.5 w-3.5" />
            Repost
          </button>
          <button
            onClick={handleShare}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          {post.type === "question" && (
            <button
              onClick={() => openComments({ id: postId, title: rawPost.title })}
              className="text-foreground/90 border-border hover:bg-accent ml-auto flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              + Answer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default PostCard
