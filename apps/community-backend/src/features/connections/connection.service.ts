import { prisma } from "../../lib/prisma.js"
import { CHANNELS, publish } from "../../lib/redis.js"
import { createNotification } from "../notifications/notification.service.js"

async function buildAuthor(userId: bigint) {
  const u = await prisma.customer.findUnique({ where: { id: userId } })
  return {
    id: userId.toString(),
    name:
      [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
      "Community Member",
    avatarUrl: u?.avatarUrl ?? null,
  }
}

export type ConnectionStatus =
  | "NONE"
  | "PENDING_OUTGOING"
  | "PENDING_INCOMING"
  | "CONNECTED"

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  profile: { select: { location: true } },
} as const

export async function getConnectionStatus(
  viewerId: bigint,
  otherId: bigint
): Promise<ConnectionStatus> {
  if (viewerId === otherId) return "NONE"
  const conn = await prisma.communityConnection.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: viewerId },
      ],
    },
  })
  if (!conn) return "NONE"
  if (conn.status === "ACCEPTED") return "CONNECTED"
  return conn.requesterId === viewerId ? "PENDING_OUTGOING" : "PENDING_INCOMING"
}

export async function sendRequest(requesterId: bigint, addresseeId: bigint) {
  if (requesterId === addresseeId)
    return { error: "cannot_connect_self" as const }
  const existing = await prisma.communityConnection.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  })
  if (existing) return { error: "already_exists" as const }
  await prisma.communityConnection.create({
    data: { requesterId, addresseeId, status: "PENDING" },
  })

  const author = await buildAuthor(requesterId)
  await createNotification(addresseeId, "CONNECT_REQUEST", {
    userId: requesterId.toString(),
    author,
  })
  await publish(CHANNELS.CONNECT_REQUEST, {
    recipientId: addresseeId.toString(),
    author,
  })

  return { error: null }
}

export async function acceptRequest(viewerId: bigint, otherId: bigint) {
  const conn = await prisma.communityConnection.findFirst({
    where: { requesterId: otherId, addresseeId: viewerId, status: "PENDING" },
  })
  if (!conn) return { error: "not_found" as const }
  await prisma.communityConnection.update({
    where: { id: conn.id },
    data: { status: "ACCEPTED" },
  })

  const author = await buildAuthor(viewerId)
  await createNotification(otherId, "CONNECT_ACCEPTED", {
    userId: viewerId.toString(),
    author,
  })
  await publish(CHANNELS.CONNECT_ACCEPTED, {
    recipientId: otherId.toString(),
    author,
  })

  return { error: null }
}

/** Cancel outgoing request, decline incoming, or disconnect — removes the row either way. */
export async function removeConnection(viewerId: bigint, otherId: bigint) {
  await prisma.communityConnection.deleteMany({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: viewerId },
      ],
    },
  })
  return { error: null }
}

export function countConnections(userId: bigint) {
  return prisma.communityConnection.count({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  })
}

async function connectedIds(userId: bigint): Promise<bigint[]> {
  const conns = await prisma.communityConnection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  })
  return conns.map((c) =>
    c.requesterId === userId ? c.addresseeId : c.requesterId
  )
}

export async function listConnections(userId: bigint) {
  const ids = await connectedIds(userId)
  if (!ids.length) return []
  return prisma.customer.findMany({
    where: { id: { in: ids } },
    select: USER_SELECT,
  })
}

export async function listMutual(viewerId: bigint, otherId: bigint) {
  if (viewerId === otherId) return []
  const [a, b] = await Promise.all([
    connectedIds(viewerId),
    connectedIds(otherId),
  ])
  const bSet = new Set(b.map((x) => x.toString()))
  const mutualIds = a.filter((x) => bSet.has(x.toString()))
  if (!mutualIds.length) return []
  return prisma.customer.findMany({
    where: { id: { in: mutualIds } },
    select: USER_SELECT,
  })
}

export async function listIncomingRequests(userId: bigint) {
  const conns = await prisma.communityConnection.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: { requester: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  })
  return conns.map((c) => c.requester)
}
