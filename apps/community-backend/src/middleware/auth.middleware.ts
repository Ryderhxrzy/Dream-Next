import { createMiddleware } from "hono/factory"

import { getAuthCustomer } from "../features/auth/auth.service.js"

type AuthVariables = {
  customer: NonNullable<Awaited<ReturnType<typeof getAuthCustomer>>>
}

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const customer = await getAuthCustomer(c)
    if (!customer) {
      return c.json({ message: "Unauthenticated" }, 401)
    }

    c.set("customer", customer)
    await next()
  }
)
