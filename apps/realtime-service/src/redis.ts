import Redis from "ioredis";
import { config } from "./config.js";

export const subscriber = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 500, 5000),
});

subscriber.on("error", (error) => {
  console.error("Redis subscriber error:", error.message);
});

// Must match community-backend CHANNELS
export const CHANNELS = {
  NEW_POST: "community:new_post",
  NEW_COMMENT: "community:new_comment",
  NEW_REPLY: "community:new_reply",
} as const;
