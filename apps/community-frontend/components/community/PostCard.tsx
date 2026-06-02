"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useHideCommunityPost } from "@/lib/hooks/use-hide-community-post"
import { useToggleReaction } from "@/lib/hooks/use-toggle-reaction"
import { useSetRsvp } from "@/lib/hooks/use-set-rsvp"
import { cn } from "@/lib/utils"
import { useCommunityUiStore } from "@/store/community-ui.store"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Bookmark, EyeOff, Flag, Pencil, ThumbsUp, MessageCircle, MessageSquare, Share2, Repeat2, MoreHorizontal, Trash2, UserX } from "lucide-react"
import type { CommunityPost } from "@/lib/hooks/use-community-posts"
import { useStartConversation } from "@/lib/hooks/use-messages"

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
  normal:   { label: "",           className: "" },
  question: { label: "? Question", className: "bg-orange-500/10 text-orange-600 border border-orange-500/20" },
  event:    { label: "📅 Event",   className: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
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

  const [hidePending, setHidePending] = useState(false)
  const [undoProgress, setUndoProgress] = useState(100)
  const openEditPost = useCommunityUiStore((state) => state.openEditPost)
  const confirmDeletePost = useCommunityUiStore((state) => state.confirmDeletePost)
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
      onSuccess: ({ conversationId }) => router.push(`/messages?c=${conversationId}`),
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
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <EyeOff className="w-4 h-4 shrink-0 text-muted-foreground" />
          Post hidden
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-1 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-muted-foreground rounded-full transition-none"
              style={{ width: `${undoProgress}%` }}
            />
          </div>
          <button
            onClick={handleUndo}
            className="text-sm font-medium text-foreground hover:underline shrink-0"
          >
            Undo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div id={`post-${postId}`} className="bg-card border border-border rounded-xl p-4 space-y-3 scroll-mt-20">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-9 h-9">
            <AvatarImage src={post.author.avatar || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {post.author.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{post.author.name}</span>
              {post.author.isOfficial && (
                <span className="text-xs text-blue-600 font-medium">✓ Official</span>
              )}
              {post.type !== "normal" && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${badge.className}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {post.timeAgo} · {post.location}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground/80 transition-colors outline-none">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {isOwner ? (
              <>
                <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
                  <Bookmark className="w-3.5 h-3.5" />
                  Save post
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-sm cursor-pointer"
                  onClick={() => openEditPost(rawPost)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit post
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-sm cursor-pointer"
                  onClick={handleHide}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Hide post
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2 text-sm cursor-pointer"
                  onClick={() => confirmDeletePost(postId)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete post
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={handleMessage} disabled={startConversation.isPending}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message {post.author.name.split(" ")[0]}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
                  <Bookmark className="w-3.5 h-3.5" />
                  Save post
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-sm cursor-pointer text-orange-600 focus:text-orange-600">
                  <Flag className="w-3.5 h-3.5" />
                  Report post
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-sm cursor-pointer text-red-600 focus:text-red-600">
                  <UserX className="w-3.5 h-3.5" />
                  Block user
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content (caption) */}
      {post.content && (
        <p className="text-sm text-foreground/90 leading-relaxed">{post.content}</p>
      )}

      {/* Embedded original (repost) */}
      {rawPost.repostOf && (
        <div className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={rawPost.repostOf.author.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-semibold">
                {rawPost.repostOf.author.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-foreground">{rawPost.repostOf.author.name}</span>
          </div>
          {rawPost.repostOf.title && (
            <p className="text-sm font-medium text-foreground">{rawPost.repostOf.title}</p>
          )}
          <p className="text-sm text-foreground/80 leading-relaxed">{rawPost.repostOf.content}</p>
          {rawPost.repostOf.imageUrl && (
            <div className="rounded-md overflow-hidden bg-accent aspect-video">
              <img src={rawPost.repostOf.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Image (own) */}
      {post.imageUrl && (
        <div className="rounded-lg overflow-hidden bg-accent aspect-video">
          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Event Card */}
      {post.event && (
        <div className="border border-border rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-red-500 uppercase leading-none">{post.event.month}</span>
              <span className="text-base font-bold text-foreground leading-tight">{post.event.day}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{post.event.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{post.event.date} · {post.event.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              onClick={() => setRsvp.mutate({ postId, status: "GOING" })}
              className={cn(
                "h-8 px-3 text-xs rounded-md transition-colors",
                post.event.going
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-muted hover:bg-accent text-foreground"
              )}
            >
              {post.event.going ? "✓ Going" : "Going"}
            </Button>
            <Button
              onClick={() => setRsvp.mutate({ postId, status: "INTERESTED" })}
              className={cn(
                "h-8 px-3 text-xs rounded-md transition-colors",
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
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
          <button
            onClick={() => openRespondents({ id: postId, title: rawPost.title, isOwner })}
            className="text-emerald-600 font-medium hover:underline"
          >
            ✓ {post.event.goingCount} Going
          </button>
          <button
            onClick={() => openRespondents({ id: postId, title: rawPost.title, isOwner })}
            className="hover:text-foreground hover:underline transition-colors"
          >
            {post.event.interestedCount} Interested
          </button>
          <button
            onClick={() => openComments({ id: postId, title: rawPost.title })}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            {post.commentCount} Comments
          </button>
        </div>
      )}

      {/* Actions */}
      {!post.event && (
        <div className="flex items-center gap-1 pt-1 border-t border-border">
          <button
            onClick={() => toggleReaction.mutate(postId)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors",
              post.liked
                ? "text-blue-600 hover:bg-blue-500/10"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <ThumbsUp className={cn("w-3.5 h-3.5", post.liked && "fill-blue-600")} />
            {post.helpfulCount} Helpful
          </button>
          <button
            onClick={() => openComments({ id: postId, title: rawPost.title })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {post.commentCount} Comments
          </button>
          <button
            onClick={() => openRepost(rawPost)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Repeat2 className="w-3.5 h-3.5" />
            Repost
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          {post.type === "question" && (
            <button
              onClick={() => openComments({ id: postId, title: rawPost.title })}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground/90 border border-border hover:bg-accent transition-colors"
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
