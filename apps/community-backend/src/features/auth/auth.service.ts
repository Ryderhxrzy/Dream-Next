import { createHash } from "node:crypto"
import type { Context } from "hono"

import { prismaAuth } from "../../lib/prisma-auth.js"
import { prisma } from "../../lib/prisma.js"

const CUSTOMER_TOKENABLE_TYPE = "App\\Models\\Customer"

export async function getAuthCustomer(c: Context) {
  const rawToken = readToken(c)
  if (!rawToken) return null

  const [id, plainToken] = rawToken.split("|")
  if (!id || !plainToken) return null

  const accessToken = await prismaAuth.personalAccessToken.findFirst({
    where: {
      id: BigInt(id),
      token: hashSanctumToken(plainToken),
      tokenableType: CUSTOMER_TOKENABLE_TYPE,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  })

  if (!accessToken) return null

  await prismaAuth.personalAccessToken.update({
    where: { id: accessToken.id },
    data: { lastUsedAt: new Date() },
  })

  const customer = await prismaAuth.customer.findUnique({
    where: { id: accessToken.tokenableId },
  })

  if (!customer) return null

  // Sync customer to community schema so FK constraints on posts/comments are satisfied.
  await prisma.customer.upsert({
    where: { id: customer.id },
    update: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      avatarUrl: customer.avatarUrl,
    },
    create: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      avatarUrl: customer.avatarUrl,
    },
  })

  return customer
}

function readToken(c: Context) {
  const auth = c.req.header("authorization")
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim()
  }

  const cookie = c.req.header("cookie")
  const match = cookie?.match(/(?:^|;\s*)af_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function hashSanctumToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}
