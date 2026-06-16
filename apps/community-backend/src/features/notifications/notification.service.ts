import type {
  CommunityNotificationType,
  Prisma,
} from "../../generated/prisma/client.js"
import { prisma } from "../../lib/prisma.js"

export function createNotification(
  userId: bigint,
  type: CommunityNotificationType,
  payload: Prisma.InputJsonValue
) {
  return prisma.communityNotification.create({
    data: { userId, type, payload },
  })
}

export function listNotifications(userId: bigint, limit = 30) {
  return prisma.communityNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

export function countUnread(userId: bigint) {
  return prisma.communityNotification.count({
    where: { userId, read: false },
  })
}

export function markAllRead(userId: bigint) {
  return prisma.communityNotification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
}

export function markOneRead(userId: bigint, notificationId: bigint) {
  return prisma.communityNotification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  })
}

export function serializeNotification(n: {
  id: bigint
  type: CommunityNotificationType
  payload: unknown
  read: boolean
  createdAt: Date
}) {
  return {
    id: n.id.toString(),
    type: n.type.toLowerCase(),
    payload: n.payload,
    read: n.read,
    createdAt: n.createdAt,
  }
}
