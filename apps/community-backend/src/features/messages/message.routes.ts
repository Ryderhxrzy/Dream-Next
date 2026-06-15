import { Hono } from "hono"

import { config } from "../../config/config.js"
import { uploadImageToCloudinary } from "../../lib/cloudinary.js"
import { requireAuth } from "../../middleware/auth.middleware.js"
import {
  getOrCreateConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from "./message.service.js"

export const messageRoutes = new Hono()

// Upload a chat image → returns the Cloudinary URL
messageRoutes.post("/images", requireAuth, async (c) => {
  const body = await c.req.parseBody().catch(() => null)
  const image = body?.image

  if (!(image instanceof File)) {
    return c.json({ message: "Image file is required" }, 422)
  }

  const upload = await uploadImageToCloudinary(
    image,
    config.cloudinary.communityChatFolder
  )

  return c.json({ imageUrl: upload.secureUrl, publicId: upload.publicId }, 201)
})

// Start (or get existing) 1:1 conversation with another user
messageRoutes.post("/conversations", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null)
  const otherUserId = body?.userId

  if (!otherUserId) return c.json({ message: "userId is required" }, 422)

  const { data, error } = await getOrCreateConversation(
    c.get("customer").id,
    BigInt(otherUserId)
  )

  if (error === "self")
    return c.json({ message: "Cannot message yourself" }, 422)

  return c.json({ conversationId: data!.toString() }, 201)
})

// List my conversations
messageRoutes.get("/conversations", requireAuth, async (c) => {
  const conversations = await listConversations(c.get("customer").id)
  return c.json(conversations)
})

// Get message history
messageRoutes.get("/conversations/:id/messages", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0")
  const { data, error } = await listMessages(id, c.get("customer").id)

  if (error === "forbidden")
    return c.json({ message: "Not in this conversation" }, 403)

  return c.json(data)
})

// Send a message
messageRoutes.post("/conversations/:id/messages", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0")
  const body = await c.req.json().catch(() => null)
  const content = typeof body?.content === "string" ? body.content.trim() : ""
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl : null

  if (!content && !imageUrl) {
    return c.json({ message: "Message content or image is required" }, 422)
  }

  const { data, error } = await sendMessage(
    id,
    c.get("customer").id,
    content,
    imageUrl
  )

  if (error === "forbidden")
    return c.json({ message: "Not in this conversation" }, 403)

  return c.json(data, 201)
})

// Mark conversation as read
messageRoutes.post("/conversations/:id/read", requireAuth, async (c) => {
  const id = BigInt(c.req.param("id") ?? "0")
  await markConversationRead(id, c.get("customer").id)
  return c.json({ success: true })
})
