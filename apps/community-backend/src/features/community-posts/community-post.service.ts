import { config } from "../../config/config.js"
import { CommunityPostStatus } from "../../generated/prisma/enums.js"
import { uploadImageToCloudinary } from "../../lib/cloudinary.js"
import { prisma } from "../../lib/prisma.js"
import { CHANNELS, publish } from "../../lib/redis.js"
import { createNotification } from "../notifications/notification.service.js"
import type { CreateCommunityPostInput } from "./community-post.types.js"

export function listCommunityPosts(viewerId?: bigint) {
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
          rsvps: true,
        },
      },
      // Only the viewer's own reaction (empty if not logged in / not reacted)
      reactions: {
        where: { authorId: viewerId ?? BigInt(-1) },
        select: { id: true },
      },
      // All RSVPs — to compute going/interested counts + viewer's status
      rsvps: {
        select: { userId: true, status: true },
      },
      // Viewer's own save (empty if not saved)
      savedBy: {
        where: { userId: viewerId ?? BigInt(-1) },
        select: { id: true },
      },
      // Original post if this is a repost (embedded in feed)
      repostOf: {
        include: { author: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  })
}

// Set / toggle an event RSVP. Clicking the same status again removes it.
export async function setRsvp(
  postId: bigint,
  userId: bigint,
  status: "GOING" | "INTERESTED"
) {
  const existing = await prisma.communityEventRsvp.findUnique({
    where: { postId_userId: { postId, userId } },
  })

  let newStatus: "GOING" | "INTERESTED" | null

  if (existing && existing.status === status) {
    // Same status clicked → remove RSVP
    await prisma.communityEventRsvp.delete({ where: { id: existing.id } })
    newStatus = null
  } else {
    // New or switching status → upsert
    await prisma.communityEventRsvp.upsert({
      where: { postId_userId: { postId, userId } },
      update: { status },
      create: { postId, userId, status },
    })
    newStatus = status
  }

  // Notify event owner when someone marks Going (skip own post / removal)
  if (newStatus === "GOING") {
    const post = await prisma.communityPost.findFirst({
      where: { id: postId },
      select: { authorId: true, title: true },
    })

    if (post && post.authorId !== userId) {
      const user = await prisma.customer.findUnique({ where: { id: userId } })
      const author = {
        id: userId.toString(),
        name:
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          "Community Member",
        avatarUrl: user?.avatarUrl ?? null,
      }

      await createNotification(post.authorId, "NEW_RSVP", {
        postId: postId.toString(),
        title: post.title,
        author,
      })

      await publish(CHANNELS.NEW_RSVP, {
        postId: postId.toString(),
        postAuthorId: post.authorId.toString(),
        rsvpUserId: userId.toString(),
        author,
      })
    }
  }

  const [going, interested] = await Promise.all([
    prisma.communityEventRsvp.count({ where: { postId, status: "GOING" } }),
    prisma.communityEventRsvp.count({
      where: { postId, status: "INTERESTED" },
    }),
  ])

  return { status: newStatus, going, interested }
}

// Quote-repost an existing post to your own feed.
export async function createRepost(
  authorId: bigint,
  originalPostId: bigint,
  caption: string
) {
  const original = await prisma.communityPost.findFirst({
    where: { id: originalPostId, status: CommunityPostStatus.ACTIVE },
    select: { id: true, repostOfId: true, authorId: true, title: true },
  })

  if (!original) return { data: null, error: "not_found" as const }

  // Flatten — if reposting a repost, point to the true original
  const targetId = original.repostOfId ?? original.id

  const repost = await prisma.communityPost.create({
    data: {
      authorId,
      category: "GENERAL",
      title: "",
      content: caption,
      repostOfId: targetId,
    },
    include: {
      author: true,
      _count: { select: { comments: true, reactions: true, rsvps: true } },
      reactions: { where: { authorId: BigInt(-1) }, select: { id: true } },
      rsvps: { select: { userId: true, status: true } },
      repostOf: { include: { author: true } },
    },
  })

  // Notify the original post owner (skip if reposting own post)
  const originalOwnerId = repost.repostOf?.authorId
  if (originalOwnerId && originalOwnerId !== authorId) {
    const author = {
      id: repost.author.id.toString(),
      name:
        [repost.author.firstName, repost.author.lastName]
          .filter(Boolean)
          .join(" ") || "Community Member",
      avatarUrl: repost.author.avatarUrl,
    }

    await createNotification(originalOwnerId, "NEW_REPOST", {
      postId: targetId.toString(),
      title: original.title,
      author,
    })

    await publish(CHANNELS.NEW_REPOST, {
      postId: targetId.toString(),
      postAuthorId: originalOwnerId.toString(),
      reposterId: authorId.toString(),
      author,
    })
  }

  // Broadcast new post so feeds refresh
  await publish(CHANNELS.NEW_POST, { id: repost.id.toString() })

  return { data: repost, error: null }
}

// List event posts, soonest upcoming first.
export function listEvents(viewerId?: bigint) {
  return prisma.communityPost.findMany({
    where: {
      status: CommunityPostStatus.ACTIVE,
      category: "EVENT",
    },
    include: {
      author: true,
      _count: { select: { comments: true, reactions: true, rsvps: true } },
      reactions: {
        where: { authorId: viewerId ?? BigInt(-1) },
        select: { id: true },
      },
      rsvps: { select: { userId: true, status: true } },
      savedBy: {
        where: { userId: viewerId ?? BigInt(-1) },
        select: { id: true },
      },
      repostOf: { include: { author: true } },
    },
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    take: 100,
  })
}

// Toggle save/bookmark on a post.
export async function toggleSave(postId: bigint, userId: bigint) {
  const existing = await prisma.communitySavedPost.findUnique({
    where: { userId_postId: { userId, postId } },
  })

  if (existing) {
    await prisma.communitySavedPost.delete({ where: { id: existing.id } })
    return { saved: false }
  }

  await prisma.communitySavedPost.create({ data: { userId, postId } })
  return { saved: true }
}

// List the posts a user has saved (newest saved first).
export async function listSavedPosts(viewerId: bigint) {
  const saved = await prisma.communitySavedPost.findMany({
    where: { userId: viewerId, post: { status: CommunityPostStatus.ACTIVE } },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        include: {
          author: true,
          _count: { select: { comments: true, reactions: true, rsvps: true } },
          reactions: { where: { authorId: viewerId }, select: { id: true } },
          rsvps: { select: { userId: true, status: true } },
          savedBy: { where: { userId: viewerId }, select: { id: true } },
          repostOf: { include: { author: true } },
        },
      },
    },
  })

  return saved.map((s) => s.post)
}

// List everyone who RSVP'd to an event (with their user info).
export function listRsvps(postId: bigint) {
  return prisma.communityEventRsvp.findMany({
    where: { postId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  })
}

// Toggle a like/helpful reaction on a post. Returns the new state + count.
export async function toggleReaction(postId: bigint, userId: bigint) {
  const existing = await prisma.communityReaction.findUnique({
    where: { postId_authorId: { postId, authorId: userId } },
  })

  if (existing) {
    await prisma.communityReaction.delete({ where: { id: existing.id } })
  } else {
    await prisma.communityReaction.create({
      data: { postId, authorId: userId },
    })

    // Notify the post owner (only on like, skip if liking own post)
    const post = await prisma.communityPost.findFirst({
      where: { id: postId },
      select: { authorId: true, title: true },
    })

    if (post && post.authorId !== userId) {
      const reactor = await prisma.customer.findUnique({
        where: { id: userId },
      })
      const author = {
        id: userId.toString(),
        name:
          [reactor?.firstName, reactor?.lastName].filter(Boolean).join(" ") ||
          "Community Member",
        avatarUrl: reactor?.avatarUrl ?? null,
      }

      await createNotification(post.authorId, "NEW_REACTION", {
        postId: postId.toString(),
        title: post.title,
        author,
      })

      await publish(CHANNELS.NEW_REACTION, {
        postId: postId.toString(),
        postAuthorId: post.authorId.toString(),
        reactorId: userId.toString(),
        author,
      })
    }
  }

  const count = await prisma.communityReaction.count({ where: { postId } })

  return { liked: !existing, count }
}

export async function createCommunityPost(
  authorId: bigint,
  input: CreateCommunityPostInput
) {
  const post = await prisma.communityPost.create({
    data: { authorId, ...input },
    include: { author: true },
  })

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
      name:
        [post.author.firstName, post.author.lastName]
          .filter(Boolean)
          .join(" ") || "Community Member",
      avatarUrl: post.author.avatarUrl,
    },
  })

  return post
}

export async function updateCommunityPost(
  postId: bigint,
  requesterId: bigint,
  input: Partial<CreateCommunityPostInput>
) {
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: { not: CommunityPostStatus.DELETED } },
  })

  if (!post) return { data: null, error: "not_found" as const }
  if (post.authorId !== requesterId)
    return { data: null, error: "forbidden" as const }

  const updated = await prisma.communityPost.update({
    where: { id: postId },
    data: input,
  })

  return { data: updated, error: null }
}

export async function deleteCommunityPost(postId: bigint, requesterId: bigint) {
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: { not: CommunityPostStatus.DELETED } },
  })

  if (!post) return { error: "not_found" as const }
  if (post.authorId !== requesterId) return { error: "forbidden" as const }

  await prisma.communityPost.update({
    where: { id: postId },
    data: { status: CommunityPostStatus.DELETED },
  })

  return { error: null }
}

export async function setPostVisibility(
  postId: bigint,
  requesterId: bigint,
  hidden: boolean
) {
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: { not: CommunityPostStatus.DELETED } },
  })

  if (!post) return { error: "not_found" as const }
  if (post.authorId !== requesterId) return { error: "forbidden" as const }

  await prisma.communityPost.update({
    where: { id: postId },
    data: {
      status: hidden ? CommunityPostStatus.HIDDEN : CommunityPostStatus.ACTIVE,
    },
  })

  return { error: null }
}

export function uploadCommunityPostImage(file: File) {
  return uploadImageToCloudinary(file, config.cloudinary.communityPostsFolder)
}
