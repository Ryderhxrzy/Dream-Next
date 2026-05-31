import type { CommunityPost } from "../../generated/prisma/client.js";
import type { listCommunityPosts } from "./community-post.service.js";
import type { CommunityPostImageUpload } from "./community-post.types.js";

type CommunityPostListItem = Awaited<ReturnType<typeof listCommunityPosts>>[number];

export function serializeCommunityPost(post: CommunityPost) {
  return {
    id: post.id.toString(),
    authorId: post.authorId.toString(),
    category: post.category,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl,
    eventDate: post.eventDate,
    eventTime: post.eventTime,
    location: post.location,
    latitude: post.latitude?.toString() ?? null,
    longitude: post.longitude?.toString() ?? null,
    price: post.price?.toString() ?? null,
    condition: post.condition,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function serializeCommunityPostListItem(post: CommunityPostListItem) {
  const authorName = [post.author.firstName, post.author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    ...serializeCommunityPost(post),
    author: {
      id: post.author.id.toString(),
      name: authorName || "Community Member",
      firstName: post.author.firstName,
      lastName: post.author.lastName,
      email: post.author.email,
      avatarUrl: post.author.avatarUrl,
    },
    counts: {
      comments: post._count.comments,
      reactions: post._count.reactions,
    },
  };
}

export function serializeCommunityPostImageUpload(upload: CommunityPostImageUpload) {
  return {
    publicId: upload.publicId,
    imageUrl: upload.secureUrl,
    width: upload.width,
    height: upload.height,
    format: upload.format,
  };
}
