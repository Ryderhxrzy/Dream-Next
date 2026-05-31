import { Hono } from "hono";

import { errorResponse } from "../../http/responses.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  serializeCommunityPost,
  serializeCommunityPostListItem,
  serializeCommunityPostImageUpload,
} from "./community-post.serializer.js";
import {
  createCommunityPost,
  deleteCommunityPost,
  listCommunityPosts,
  setPostVisibility,
  updateCommunityPost,
  uploadCommunityPostImage,
} from "./community-post.service.js";
import {
  parseCommunityPostImageUpload,
  parseCreateCommunityPostInput,
} from "./community-post.validator.js";

export const communityPostRoutes = new Hono();

communityPostRoutes.get("/", async (c) => {
  const posts = await listCommunityPosts();

  return c.json(posts.map(serializeCommunityPostListItem));
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
