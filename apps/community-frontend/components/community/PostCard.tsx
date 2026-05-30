"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal } from "lucide-react"

type PostType = "normal" | "question" | "event"

interface Post {
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

const PostCard = ({ post }: { post: Post }) => {
  const badge = typeBadge[post.type]

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-9 h-9">
            <AvatarImage src={post.author.avatar} />
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
        <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
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
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
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
