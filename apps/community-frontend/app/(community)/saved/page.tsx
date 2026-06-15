"use client"

import { Bookmark } from "lucide-react"

import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { useSavedPosts } from "@/lib/hooks/use-saved-posts"
import PostCard from "@/components/community/PostCard"
import { PostFeedSkeleton } from "@/components/community/PostCardSkeleton"
import { mapCommunityPostToCard } from "@/components/community/PostFeed"

export default function SavedPage() {
  const { data: posts, isLoading } = useSavedPosts()
  const { data: currentUser } = useCurrentUser()

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="mb-1 flex items-center gap-2">
        <Bookmark className="text-foreground h-5 w-5" />
        <h1 className="text-foreground text-lg font-bold">Saved Posts</h1>
      </div>

      {isLoading ? (
        <PostFeedSkeleton count={3} />
      ) : !posts?.length ? (
        <div className="border-border bg-card rounded-xl border p-8 text-center">
          <div className="bg-accent mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full">
            <Bookmark className="text-muted-foreground h-4 w-4" />
          </div>
          <p className="text-foreground text-sm font-medium">
            No saved posts yet
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">
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
