import { Hono } from "hono";

import { errorResponse } from "../../http/responses.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { getAuthCustomer } from "../auth/auth.service.js";
import {
  serializeCommunityPost,
  serializeCommunityPostListItem,
  serializeCommunityPostImageUpload,
} from "./community-post.serializer.js";
import {
  createCommunityPost,
  createRepost,
  deleteCommunityPost,
  listCommunityPosts,
  listRsvps,
  setPostVisibility,
  setRsvp,
  toggleReaction,
  updateCommunityPost,
  uploadCommunityPostImage,
} from "./community-post.service.js";
import {
  parseCommunityPostImageUpload,
  parseCreateCommunityPostInput,
} from "./community-post.validator.js";

export const communityPostRoutes = new Hono();

communityPostRoutes.get("/", async (c) => {
  // Optional auth — to know if the viewer liked/RSVP'd each post (no 401 if guest)
  const viewer = await getAuthCustomer(c);
  const posts = await listCommunityPosts(viewer?.id);

  return c.json(posts.map((post) => serializeCommunityPostListItem(post, viewer?.id)));
});

communityPostRoutes.post("/:id/react", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0");
  const result = await toggleReaction(id, c.get("customer").id);

  return c.json(result);
});

communityPostRoutes.post("/:id/rsvp", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0");
  const body = await c.req.json().catch(() => null);
  const status = body?.status;

  if (status !== "GOING" && status !== "INTERESTED") {
    return c.json({ message: "Invalid RSVP status" }, 422);
  }

  const result = await setRsvp(id, c.get("customer").id, status);

  return c.json(result);
});

communityPostRoutes.post("/:id/repost", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0");
  const body = await c.req.json().catch(() => null);
  const caption = typeof body?.caption === "string" ? body.caption.trim() : "";

  const { data, error } = await createRepost(c.get("customer").id, id, caption);

  if (error === "not_found") return c.json({ message: "Post not found" }, 404);

  return c.json(serializeCommunityPostListItem(data!, c.get("customer").id), 201);
});

communityPostRoutes.get("/:id/rsvps", async (c) => {
  const id = BigInt(c.req.param("id") ?? "0");
  const rsvps = await listRsvps(id);

  return c.json(
    rsvps.map((r) => ({
      userId: r.userId.toString(),
      name: [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "Community Member",
      avatarUrl: r.user.avatarUrl,
      status: r.status,
      createdAt: r.createdAt,
    })),
  );
});

communityPostRoutes.post("/", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const { data, error } = parseCreateCommunityPostInput(body);

  if (!data) {
    return c.json(errorResponse(error), 422);
  }

  const post = await createCommunityPost(c.get("customer").id, data);

  return c.json(serializeCommunityPost(post), 201);
});

communityPostRoutes.delete("/:id", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0");
  const { error } = await deleteCommunityPost(id, c.get("customer").id);

  if (error === "not_found") return c.json({ message: "Post not found" }, 404);
  if (error === "forbidden") return c.json({ message: "You can only delete your own posts" }, 403);

  return c.json({ message: "Post deleted" });
});

communityPostRoutes.patch("/:id", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0");
  const body = await c.req.json().catch(() => null);
  const { data: input, error: parseError } = parseCreateCommunityPostInput(body);

  if (!input) return c.json(errorResponse(parseError), 422);

  const { data, error } = await updateCommunityPost(id, c.get("customer").id, input);

  if (error === "not_found") return c.json({ message: "Post not found" }, 404);
  if (error === "forbidden") return c.json({ message: "You can only edit your own posts" }, 403);

  return c.json(serializeCommunityPost(data!));
});

communityPostRoutes.patch("/:id/hide", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0");
  const { error } = await setPostVisibility(id, c.get("customer").id, true);

  if (error === "not_found") return c.json({ message: "Post not found" }, 404);
  if (error === "forbidden") return c.json({ message: "You can only hide your own posts" }, 403);

  return c.json({ message: "Post hidden" });
});

communityPostRoutes.patch("/:id/unhide", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0");
  const { error } = await setPostVisibility(id, c.get("customer").id, false);

  if (error === "not_found") return c.json({ message: "Post not found" }, 404);
  if (error === "forbidden") return c.json({ message: "You can only unhide your own posts" }, 403);

  return c.json({ message: "Post unhidden" });
});

communityPostRoutes.post("/images", requireAuth, async (c) => {
  const body = await c.req.parseBody().catch(() => null);
  const { data, error } = parseCommunityPostImageUpload(body?.image);

  if (!data) {
    return c.json(errorResponse(error), 422);
  }

  const upload = await uploadCommunityPostImage(data);

  return c.json(serializeCommunityPostImageUpload(upload), 201);
});
