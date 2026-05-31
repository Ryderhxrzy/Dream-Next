import { prisma } from "../../lib/prisma.js";
import { publish, CHANNELS } from "../../lib/redis.js";

export function listPostComments(postId: bigint) {
  return prisma.communityComment.findMany({
    where: { postId, parentId: null },
    include: {
      author: true,
      replies: {
        include: { author: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

function serializeAuthor(author: {
  id: bigint;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}) {
  return {
    id: author.id.toString(),
    name: [author.firstName, author.lastName].filter(Boolean).join(" ") || "Community Member",
    avatarUrl: author.avatarUrl,
  };
}

async function getPostAuthorId(postId: bigint): Promise<string | null> {
  const post = await prisma.communityPost.findFirst({
    where: { id: postId },
    select: { authorId: true },
  });
  return post ? post.authorId.toString() : null;
}

export async function createComment(postId: bigint, authorId: bigint, content: string) {
  const [comment, postAuthorId] = await Promise.all([
    prisma.communityComment.create({
      data: { postId, authorId, content },
      include: { author: true, replies: true },
    }),
    getPostAuthorId(postId),
  ]);

  await publish(CHANNELS.NEW_COMMENT, {
    id: comment.id.toString(),
    postId: comment.postId.toString(),
    postAuthorId,                          // who owns the post
    commentAuthorId: authorId.toString(),  // who made the comment
    content: comment.content,
    createdAt: comment.createdAt,
    author: serializeAuthor(comment.author),
  });

  return comment;
}

export async function createReply(
  postId: bigint,
  parentId: bigint,
  authorId: bigint,
  content: string,
) {
  const reply = await prisma.communityComment.create({
    data: { postId, parentId, authorId, content },
    include: { author: true },
  });

  // Notify the parent comment author
  const parentComment = await prisma.communityComment.findFirst({
    where: { id: parentId },
    select: { authorId: true },
  });

  await publish(CHANNELS.NEW_REPLY, {
    id: reply.id.toString(),
    postId: reply.postId.toString(),
    parentId: reply.parentId?.toString(),
    parentAuthorId: parentComment?.authorId.toString() ?? null, // who gets notified
    replyAuthorId: authorId.toString(),
    content: reply.content,
    createdAt: reply.createdAt,
    author: serializeAuthor(reply.author),
  });

  return reply;
}
