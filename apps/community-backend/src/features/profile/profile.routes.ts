import { Hono } from "hono";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { getCustomerWithProfile, getProfile, upsertProfile } from "./profile.service.js";
import { serializeProfile } from "./profile.serializer.js";
import { parseUpdateProfileInput } from "./profile.validator.js";
import {
  countConnections,
  getConnectionStatus,
} from "../connections/connection.service.js";

export const profileRoutes = new Hono();

function parseId(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

// GET /profile — current user's community profile
profileRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("customer").id;
  const [profile, connectionCount] = await Promise.all([
    getProfile(userId),
    countConnections(userId),
  ]);
  return c.json({ ...serializeProfile(profile), connectionCount });
});

// GET /profile/:userId — another user's public profile bundle
profileRoutes.get("/:userId", requireAuth, async (c) => {
  const viewerId = c.get("customer").id;
  const userId = parseId(c.req.param("userId"));
  if (!userId) return c.json({ error: "invalid user id" }, 400);

  const customer = await getCustomerWithProfile(userId);
  if (!customer) return c.json({ error: "User not found" }, 404);

  const [connectionStatus, connectionCount] = await Promise.all([
    getConnectionStatus(viewerId, userId),
    countConnections(userId),
  ]);

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    "Community Member";

  return c.json({
    id: customer.id.toString(),
    name,
    avatarUrl: customer.avatarUrl,
    isSelf: viewerId === userId,
    connectionStatus,
    connectionCount,
    ...serializeProfile(customer.profile),
  });
});

// PATCH /profile — create/update current user's community profile
profileRoutes.patch("/", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const { data, error } = parseUpdateProfileInput(body);
  if (error || !data) {
    return c.json({ error: error ?? "Invalid request body" }, 400);
  }

  const profile = await upsertProfile(c.get("customer").id, data);
  return c.json(serializeProfile(profile));
});
