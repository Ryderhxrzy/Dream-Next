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
import { useCommunityUiStore } from "@/store/community-ui.store"
import { Bookmark, EyeOff, Flag, Pencil, ThumbsUp, MessageCircle, Share2, MoreHorizontal, Trash2, UserX } from "lucide-react"
import type { CommunityPost } from "@/lib/hooks/use-community-posts"

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
  commentCount: number
  event?: {
    month: string
    day: string
    title: string
    date: string
    location: string
    going?: boolean
    goingCount?: number
    interestedCount?: number
  }
}

const typeBadge: Record<PostType, { label: string; className: string }> = {
  normal:   { label: "",           className: "" },
  question: { label: "? Question", className: "bg-orange-50 text-orange-600 border border-orange-200" },
  event:    { label: "📅 Event",   className: "bg-blue-50 text-blue-600 border border-blue-200" },
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

  const [hidePending, setHidePending] = useState(false)
  const [undoProgress, setUndoProgress] = useState(100)
  const openEditPost = useCommunityUiStore((state) => state.openEditPost)
  const confirmDeletePost = useCommunityUiStore((state) => state.confirmDeletePost)
  const openComments = useCommunityUiStore((state) => state.openComments)

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
      <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <EyeOff className="w-4 h-4 shrink-0 text-zinc-400" />
          Post hidden
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-400 rounded-full transition-none"
              style={{ width: `${undoProgress}%` }}
            />
          </div>
          <button
            onClick={handleUndo}
            className="text-sm font-medium text-zinc-900 hover:underline shrink-0"
          >
            Undo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-9 h-9">
            <AvatarImage src={post.author.avatar || undefined} />
            <AvatarFallback className="bg-zinc-900 text-white text-xs font-semibold">
              {post.author.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-zinc-900">{post.author.name}</span>
              {post.author.isOfficial && (
                <span className="text-xs text-blue-600 font-medium">✓ Official</span>
              )}
              {post.type !== "normal" && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${badge.className}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {post.timeAgo} · {post.location}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-zinc-400 hover:text-zinc-600 transition-colors outline-none">
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

      {/* Content */}
      <p className="text-sm text-zinc-700 leading-relaxed">{post.content}</p>

      {/* Image */}
      {post.imageUrl && (
        <div className="rounded-lg overflow-hidden bg-zinc-100 aspect-video">
          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Event Card */}
      {post.event && (
        <div className="border border-zinc-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex flex-col items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-red-500 uppercase leading-none">{post.event.month}</span>
              <span className="text-base font-bold text-zinc-900 leading-tight">{post.event.day}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{post.event.title}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{post.event.date} · {post.event.location}</p>
            </div>
          </div>
          {post.event.going && (
            <Button className="h-8 px-3 text-xs bg-zinc-950 hover:bg-zinc-800 text-white rounded-md shrink-0">
              Going
            </Button>
          )}
        </div>
      )}

      {/* Event Footer */}
      {post.event && (
        <div className="flex items-center gap-3 text-xs text-zinc-500 pt-1 border-t border-zinc-100">
          <span className="text-emerald-600 font-medium">✓ {post.event.goingCount} Going</span>
          <span>{post.event.interestedCount} Interested</span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {post.commentCount} Comments
          </span>
        </div>
      )}

      {/* Actions */}
      {!post.event && (
        <div className="flex items-center gap-1 pt-1 border-t border-zinc-100">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
            <ThumbsUp className="w-3.5 h-3.5" />
            {post.helpfulCount} Helpful
          </button>
          <button
            onClick={() => openComments({ id: postId, title: rawPost.title })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {post.commentCount} Comments
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          {post.type === "question" && (
            <button className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-700 border border-zinc-200 hover:bg-zinc-50 transition-colors">
              + Answer
            </button>
          )}
        </div>
      )}

    </div>
  )
}

export default PostCard
