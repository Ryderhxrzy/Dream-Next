"use client"

import { Bookmark } from "lucide-react"

import PostCard from "@/components/community/PostCard"
import { mapCommunityPostToCard } from "@/components/community/PostFeed"
import { PostFeedSkeleton } from "@/components/community/PostCardSkeleton"
import { useSavedPosts } from "@/lib/hooks/use-saved-posts"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export default function SavedPage() {
  const { data: posts, isLoading } = useSavedPosts()
  const { data: currentUser } = useCurrentUser()

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Bookmark className="w-5 h-5 text-foreground" />
        <h1 className="text-lg font-bold text-foreground">Saved Posts</h1>
      </div>

      {isLoading ? (
        <PostFeedSkeleton count={3} />
      ) : !posts?.length ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mx-auto mb-2">
            <Bookmark className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No saved posts yet</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tap the ⋯ menu on any post and choose “Save post”.
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={mapCommunityPostToCard(post)}
            postId={post.id}
            isOwner={!!currentUser && currentUser.id === post.authorId}
            rawPost={post}
          />
        ))
      )}
    </div>
  )
}
