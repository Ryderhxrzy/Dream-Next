import { Hono } from "hono"
import { cors } from "hono/cors"

import { config } from "./config/config.js"
import { authRoutes } from "./features/auth/auth.routes.js"
import { communityCommentRoutes } from "./features/community-comments/community-comment.routes.js"
import { communityPostRoutes } from "./features/community-posts/community-post.routes.js"
import { connectionRoutes } from "./features/connections/connection.routes.js"
import { messageRoutes } from "./features/messages/message.routes.js"
import { notificationRoutes } from "./features/notifications/notification.routes.js"
import { profileRoutes } from "./features/profile/profile.routes.js"

export function createApp() {
  const app = new Hono()

  app.use(
    "*",
    cors({
      origin: config.corsOrigins,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    })
  )

  app.get("/", (c) => {
    return c.json({ message: "Community backend is running" })
  })

  registerCommunityRoutes(app, "")
  registerCommunityRoutes(app, "/api/community")

  return app
}

function registerCommunityRoutes(app: Hono, prefix: string) {
  app.route(prefix || "/", authRoutes)
  app.route(`${prefix}/posts`, communityPostRoutes)
  app.route(`${prefix}/posts`, communityCommentRoutes)
  app.route(`${prefix}/notifications`, notificationRoutes)
  app.route(`${prefix}/messages`, messageRoutes)
  app.route(`${prefix}/profile`, profileRoutes)
  app.route(`${prefix}/connections`, connectionRoutes)
}
