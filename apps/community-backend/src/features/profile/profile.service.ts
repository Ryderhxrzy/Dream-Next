import { prisma } from "../../lib/prisma.js"
import type { UpdateProfileInput } from "./profile.validator.js"

export function getProfile(customerId: bigint) {
  return prisma.communityProfile.findUnique({ where: { customerId } })
}

export function getCustomerWithProfile(userId: bigint) {
  return prisma.customer.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      profile: true,
    },
  })
}

export function upsertProfile(customerId: bigint, data: UpdateProfileInput) {
  return prisma.communityProfile.upsert({
    where: { customerId },
    create: { customerId, ...data },
    update: data,
  })
}
