import { config } from "../../config/config.js";
import { CommunityPostStatus } from "../../generated/prisma/enums.js";
import { uploadImageToCloudinary } from "../../lib/cloudinary.js";
import { prisma } from "../../lib/prisma.js";
import { publish, CHANNELS } from "../../lib/redis.js";
import type { CreateCommunityPostInput } from "./community-post.types.js";

export function listCommunityPosts() {
  return prisma.communityPost.findMany({
    where: {
      status: CommunityPostStatus.ACTIVE,
    },
    include: {
      author: true,
      _count: {
        select: {
          comments: true,
          reactions: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}

export async function createCommunityPost(
  authorId: bigint,
  input: CreateCommunityPostInput,
) {
  const post = await prisma.communityPost.create({
    data: { authorId, ...input },
    include: { author: true },
  });

  await publish(CHANNELS.NEW_POST, {
    id: post.id.toString(),
    authorId: post.authorId.toString(),
    category: post.category,
    title: post.title,
    content: post.content,
    location: post.location,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt,
    author: {
      id: post.author.id.toString(),
      name: [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || "Community Member",
      avatarUrl: post.author.avatarUrl,
    },
  });

  return post;
}

export async function updateCommunityPost(
  postId: bigint,
  requesterId: bigint,
  input: Partial<CreateCommunityPostInput>,
) {
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: { not: CommunityPostStatus.DELETED } },
  });

  if (!post) return { data: null, error: "not_found" as const };
  if (post.authorId !== requesterId) return { data: null, error: "forbidden" as const };

  const updated = await prisma.communityPost.update({
    where: { id: postId },
    data: input,
  });

  return { data: updated, error: null };
}

export async function deleteCommunityPost(postId: bigint, requesterId: bigint) {
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: { not: CommunityPostStatus.DELETED } },
  });

  if (!post) return { error: "not_found" as const };
  if (post.authorId !== requesterId) return { error: "forbidden" as const };

  await prisma.communityPost.update({
    where: { id: postId },
    data: { status: CommunityPostStatus.DELETED },
  });

  return { error: null };
}

export async function setPostVisibility(
  postId: bigint,
  requesterId: bigint,
  hidden: boolean,
) {
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: { not: CommunityPostStatus.DELETED } },
  });

  if (!post) return { error: "not_found" as const };
  if (post.authorId !== requesterId) return { error: "forbidden" as const };

  await prisma.communityPost.update({
    where: { id: postId },
    data: { status: hidden ? CommunityPostStatus.HIDDEN : CommunityPostStatus.ACTIVE },
  });

  return { error: null };
}

export function uploadCommunityPostImage(file: File) {
  return uploadImageToCloudinary(file, config.cloudinary.communityPostsFolder);
}
