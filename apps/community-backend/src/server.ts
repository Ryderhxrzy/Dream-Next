import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { config } from "./config/config.js";
import { prisma } from "./lib/prisma.js";
import { prismaAuth } from "./lib/prisma-auth.js";
import { redis } from "./lib/redis.js";

export async function startServer() {
  console.log("Connecting to database...");

  try {
    await Promise.all([prisma.$connect(), prismaAuth.$connect()]);
    console.log("✔ Database connected (community schema + public schema)");
  } catch (error) {
    console.error("✘ Database connection failed:", error);
    process.exit(1);
  }

  try {
    await redis.connect();
    console.log("✔ Redis connected");
  } catch (error) {
    console.warn("⚠ Redis unavailable — realtime features disabled:", (error as Error).message);
  }

  const server = serve({
    fetch: createApp().fetch,
    port: config.port,
  });

  console.log(`✔ Server is running on http://localhost:${config.port}`);

  function shutdown() {
    server.close(() => {
      prisma.$disconnect();
      prismaAuth.$disconnect();
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
