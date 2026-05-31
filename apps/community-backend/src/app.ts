import { Hono } from "hono";
import { cors } from "hono/cors";

import { config } from "./config/config.js";
import { authRoutes } from "./features/auth/auth.routes.js";
import { communityCommentRoutes } from "./features/community-comments/community-comment.routes.js";
import { communityPostRoutes } from "./features/community-posts/community-post.routes.js";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: config.corsOrigins,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  );

  app.get("/", (c) => {
    return c.json({ message: "Community backend is running" });
  });

  app.route("/", authRoutes);
  app.route("/posts", communityPostRoutes);
  app.route("/posts", communityCommentRoutes);

  return app;
}
