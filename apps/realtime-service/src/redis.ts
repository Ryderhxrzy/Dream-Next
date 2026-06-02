import { Redis } from "ioredis";
import { config } from "./config.js";

export const subscriber = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  lazyConnect: true,
  retryStrategy: (times: number): number => Math.min(times * 500, 5000),
});

subscriber.on("error", (error: Error) => {
  console.error("Redis subscriber error:", error.message);
});

// Must match community-backend CHANNELS
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
