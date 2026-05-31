import { Hono } from "hono";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { listPostComments, createComment, createReply } from "./community-comment.service.js";

export const communityCommentRoutes = new Hono();

function serializeAuthor(author: { id: bigint; firstName: string | null; lastName: string | null; avatarUrl: string | null }) {
  return {
    id: author.id.toString(),
    name: [author.firstName, author.lastName].filter(Boolean).join(" ") || "Community Member",
    avatarUrl: author.avatarUrl,
  };
}

communityCommentRoutes.get("/:postId/comments", async (c) => {
  const postId = BigInt(c.req.param("postId") ?? "0");
  const comments = await listPostComments(postId);

  return c.json(
    comments.map((comment) => ({
      id: comment.id.toString(),
      postId: comment.postId.toString(),
      content: comment.content,
      createdAt: comment.createdAt,
      author: serializeAuthor(comment.author),
      replies: comment.replies.map((reply) => ({
        id: reply.id.toString(),
        postId: reply.postId.toString(),
        parentId: reply.parentId?.toString() ?? null,
        content: reply.content,
        createdAt: reply.createdAt,
        author: serializeAuthor(reply.author),
      })),
    })),
  );
});

communityCommentRoutes.post("/:postId/comments", requireAuth, async (c) => {
  const postId = BigInt(c.req.param("postId") ?? "0");
  const body = await c.req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) return c.json({ message: "Comment content is required" }, 422);

  const comment = await createComment(postId, c.get("customer").id, content);

  return c.json(
    {
      id: comment.id.toString(),
      postId: comment.postId.toString(),
      content: comment.content,
      createdAt: comment.createdAt,
      author: serializeAuthor(comment.author),
      replies: [],
    },
    201,
  );
});

communityCommentRoutes.post("/:postId/comments/:commentId/replies", requireAuth, async (c) => {
  const postId = BigInt(c.req.param("postId") ?? "0");
  const commentId = BigInt(c.req.param("commentId") ?? "0");
  const body = await c.req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) return c.json({ message: "Reply content is required" }, 422);

  const reply = await createReply(postId, commentId, c.get("customer").id, content);

  return c.json(
    {
      id: reply.id.toString(),
      postId: reply.postId.toString(),
      parentId: reply.parentId?.toString() ?? null,
      content: reply.content,
      createdAt: reply.createdAt,
      author: serializeAuthor(reply.author),
    },
    201,
  );
});
