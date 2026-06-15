import { Hono } from "hono"

import { requireAuth } from "../../middleware/auth.middleware.js"
import { serializeAuthCustomer } from "./auth.serializer.js"

export const authRoutes = new Hono()

authRoutes.get("/me", requireAuth, (c) => {
  return c.json(serializeAuthCustomer(c.get("customer")))
})
