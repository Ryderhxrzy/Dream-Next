"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowUp } from "lucide-react";

import PostCard, { type Post, type PostType } from "./PostCard";
import { PostFeedSkeleton } from "./PostCardSkeleton";
import {
  type CommunityPost,
  useCommunityPosts,
} from "@/lib/hooks/use-community-posts";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useNotifications } from "@/lib/hooks/use-notifications";

const PostFeed = () => {
  const postsQuery = useCommunityPosts();
  const { data: currentUser } = useCurrentUser();
  const { notifications } = useNotifications();
  const [lastSeenCount, setLastSeenCount] = useState(0);

  const newPostCount = notifications.filter(
    (n) => n.type === "new_post" && !n.read
  ).length;

  function handleRefresh() {
    postsQuery.refetch();
    setLastSeenCount(notifications.length);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (postsQuery.isLoading) {
    return <PostFeedSkeleton count={3} />;
  }

  if (postsQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {postsQuery.error.message}
      </div>
    );
  }

  const posts = postsQuery.data ?? [];

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-foreground">No posts yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Be the first to post something for the community.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {newPostCount > 0 && (
        <button
          onClick={handleRefresh}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-accent transition-colors shadow-sm"
        >
          <ArrowUp className="w-4 h-4" />
          {newPostCount === 1 ? "1 new post" : `${newPostCount} new posts`} — tap to refresh
        </button>
      )}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={mapCommunityPostToCard(post)}
          postId={post.id}
          isOwner={!!currentUser && currentUser.id === post.authorId}
          rawPost={post}
        />
      ))}
    </div>
  );
};

export function mapCommunityPostToCard(post: CommunityPost): Post {
  return {
    id: post.id,
    type: mapPostType(post.category),
    author: {
      name: post.author.name,
      initials: getInitials(post.author.name),
      avatar: post.author.avatarUrl ?? undefined,
    },
    timeAgo: formatDistanceToNowStrict(new Date(post.createdAt), {
      addSuffix: true,
    }),
    location: post.location || "Quezon City",
    content: post.content,
    imageUrl: post.imageUrl ?? undefined,
    helpfulCount: post.counts.reactions,
    liked: post.viewerHasReacted,
    commentCount: post.counts.comments,
    event: mapEvent(post),
  };
}

function mapPostType(category: CommunityPost["category"]): PostType {
  if (category === "QUESTION") return "question";
  if (category === "EVENT") return "event";
  return "normal";
}

function mapEvent(post: CommunityPost): Post["event"] {
  if (post.category !== "EVENT" || !post.eventDate) {
    return undefined;
  }

  const eventDate = new Date(post.eventDate);

  return {
    month: format(eventDate, "MMM").toUpperCase(),
    day: format(eventDate, "d"),
    title: post.title,
    date: `${format(eventDate, "EEE, MMM d")}${
      post.eventTime ? ` - ${post.eventTime}` : ""
    }`,
    location: post.location || "Community",
    going: post.viewerRsvp === "GOING",
    interested: post.viewerRsvp === "INTERESTED",
    goingCount: post.counts.going,
    interestedCount: post.counts.interested,
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default PostFeed;
