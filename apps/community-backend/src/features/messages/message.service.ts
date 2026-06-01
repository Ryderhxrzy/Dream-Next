import { prisma } from "../../lib/prisma.js";
import { publish, CHANNELS } from "../../lib/redis.js";

function serializeUser(user: {
  id: bigint;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}) {
  return {
    id: user.id.toString(),
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Community Member",
    avatarUrl: user.avatarUrl,
  };
}

// Find an existing 1:1 conversation between two users, or create one.
export async function getOrCreateConversation(userId: bigint, otherUserId: bigint) {
  if (userId === otherUserId) return { data: null, error: "self" as const };

  // Find a conversation where BOTH are participants
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    select: { id: true },
  });

  if (existing) return { data: existing.id, error: null };

  const created = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
    select: { id: true },
  });

  return { data: created.id, error: null };
}

// List the current user's conversations with last message + other participant.
export async function listConversations(userId: bigint) {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(
    conversations.map(async (conv) => {
      const me = conv.participants.find((p) => p.userId === userId);
      const other = conv.participants.find((p) => p.userId !== userId);
      const lastMessage = conv.messages[0] ?? null;

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
        },
      });

      return {
        id: conv.id.toString(),
        otherUser: other ? serializeUser(other.user) : null,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              senderId: lastMessage.senderId.toString(),
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    }),
  );
}

async function isParticipant(conversationId: bigint, userId: bigint) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return !!p;
}

export async function listMessages(conversationId: bigint, userId: bigint) {
  if (!(await isParticipant(conversationId, userId))) {
    return { data: null, error: "forbidden" as const };
  }

  const [messages, otherParticipant] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      include: { sender: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
      select: { lastReadAt: true },
    }),
  ]);

  return {
    data: {
      messages: messages.map((m) => ({
        id: m.id.toString(),
        content: m.content,
        imageUrl: m.imageUrl,
        senderId: m.senderId.toString(),
        sender: serializeUser(m.sender),
        createdAt: m.createdAt,
      })),
      otherReadAt: otherParticipant?.lastReadAt ?? null,
    },
    error: null,
  };
}

export async function sendMessage(
  conversationId: bigint,
  senderId: bigint,
  content: string,
  imageUrl?: string | null,
) {
  if (!(await isParticipant(conversationId, senderId))) {
    return { data: null, error: "forbidden" as const };
  }

  const [message] = await Promise.all([
    prisma.message.create({
      data: { conversationId, senderId, content, imageUrl: imageUrl ?? null },
      include: { sender: true },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  // Recipient(s) — everyone in the conversation except sender
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: senderId } },
    select: { userId: true },
  });

  const payload = {
    conversationId: conversationId.toString(),
    message: {
      id: message.id.toString(),
      content: message.content,
      imageUrl: message.imageUrl,
      senderId: message.senderId.toString(),
      sender: serializeUser(message.sender),
      createdAt: message.createdAt,
    },
    recipientIds: participants.map((p) => p.userId.toString()),
  };

  await publish(CHANNELS.NEW_MESSAGE, payload);

  return { data: payload.message, error: null };
}

export async function markConversationRead(conversationId: bigint, userId: bigint) {
  const readAt = new Date();
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: readAt },
  });

  // Notify the OTHER participant(s) so their "Sent" updates to "Seen" live
  await publish(CHANNELS.MESSAGE_READ, {
    conversationId: conversationId.toString(),
    readerId: userId.toString(),
    readAt,
  });

  return { error: null };
}
