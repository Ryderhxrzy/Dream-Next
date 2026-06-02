import { Hono } from "hono";

import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  acceptRequest,
  getConnectionStatus,
  listConnections,
  listIncomingRequests,
  listMutual,
  removeConnection,
  sendRequest,
} from "./connection.service.js";
import { serializeConnectionUser } from "./connection.serializer.js";

export const connectionRoutes = new Hono();

function parseId(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

// GET /connections — my accepted connections
connectionRoutes.get("/", requireAuth, async (c) => {
  const users = await listConnections(c.get("customer").id);
  return c.json(users.map(serializeConnectionUser));
});

// GET /connections/requests — incoming pending requests
connectionRoutes.get("/requests", requireAuth, async (c) => {
  const users = await listIncomingRequests(c.get("customer").id);
  return c.json(users.map(serializeConnectionUser));
});

// GET /connections/:userId/mutual — mutual connections with a user
connectionRoutes.get("/:userId/mutual", requireAuth, async (c) => {
  const otherId = parseId(c.req.param("userId"));
  if (!otherId) return c.json({ error: "invalid user id" }, 400);
  const users = await listMutual(c.get("customer").id, otherId);
  return c.json(users.map(serializeConnectionUser));
});

// GET /connections/:userId/status — connection status with a user
connectionRoutes.get("/:userId/status", requireAuth, async (c) => {
  const otherId = parseId(c.req.param("userId"));
  if (!otherId) return c.json({ error: "invalid user id" }, 400);
  const status = await getConnectionStatus(c.get("customer").id, otherId);
  return c.json({ status });
});

// POST /connections/:userId/accept — accept an incoming request
connectionRoutes.post("/:userId/accept", requireAuth, async (c) => {
  const otherId = parseId(c.req.param("userId"));
  if (!otherId) return c.json({ error: "invalid user id" }, 400);
  const { error } = await acceptRequest(c.get("customer").id, otherId);
  if (error) return c.json({ error }, 404);
  return c.json({ status: "CONNECTED" });
});

// POST /connections/:userId — send a connection request
connectionRoutes.post("/:userId", requireAuth, async (c) => {
  const otherId = parseId(c.req.param("userId"));
  if (!otherId) return c.json({ error: "invalid user id" }, 400);
  const { error } = await sendRequest(c.get("customer").id, otherId);
  if (error) return c.json({ error }, 400);
  return c.json({ status: "PENDING_OUTGOING" });
});

// DELETE /connections/:userId — cancel / decline / disconnect
connectionRoutes.delete("/:userId", requireAuth, async (c) => {
  const otherId = parseId(c.req.param("userId"));
  if (!otherId) return c.json({ error: "invalid user id" }, 400);
  await removeConnection(c.get("customer").id, otherId);
  return c.json({ status: "NONE" });
});
