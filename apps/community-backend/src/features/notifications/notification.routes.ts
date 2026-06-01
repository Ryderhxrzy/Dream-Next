import { Hono } from "hono";

import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  countUnread,
  listNotifications,
  markAllRead,
  markOneRead,
  serializeNotification,
} from "./notification.service.js";

export const notificationRoutes = new Hono();

// GET /notifications — list + unread count
notificationRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("customer").id;
  const [notifications, unread] = await Promise.all([
    listNotifications(userId),
    countUnread(userId),
  ]);

  return c.json({
    notifications: notifications.map(serializeNotification),
    unreadCount: unread,
  });
});

// POST /notifications/read — mark all as read
notificationRoutes.post("/read", requireAuth, async (c) => {
  const userId = c.get("customer").id;
  await markAllRead(userId);
  return c.json({ success: true });
});

// POST /notifications/:id/read — mark one as read
notificationRoutes.post("/:id/read", requireAuth, async (c) => {
  const userId = c.get("customer").id;
  const id = BigInt(c.req.param("id") ?? "0");
  await markOneRead(userId, id);
  return c.json({ success: true });
});
