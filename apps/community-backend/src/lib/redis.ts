import { Redis } from "ioredis";

import { config } from "../config/config.js";

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
  enableOfflineQueue: false,
});

redis.on("error", (error: NodeJS.ErrnoException) => {
  // Non-fatal — only log once, not on every retry
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return; // silently ignore — already warned in startServer()
  }
  console.error("Redis error:", error.message);
});

// Channel names — shared with realtime-service
export const CHANNELS = {
  NEW_POST: "community:new_post",
  NEW_COMMENT: "community:new_comment",
  NEW_REPLY: "community:new_reply",
  NEW_REACTION: "community:new_reaction",
  NEW_RSVP: "community:new_rsvp",
  NEW_REPOST: "community:new_repost",
  NEW_MESSAGE: "community:new_message",
  MESSAGE_READ: "community:message_read",
  CONNECT_REQUEST: "community:connect_request",
  CONNECT_ACCEPTED: "community:connect_accepted",
} as const;

export async function publish(channel: string, payload: object) {
  try {
    await redis.publish(channel, JSON.stringify(payload));
  } catch (error) {
    // Non-fatal — app continues even if Redis is down
    console.error(`Failed to publish to ${channel}:`, error);
  }
}
