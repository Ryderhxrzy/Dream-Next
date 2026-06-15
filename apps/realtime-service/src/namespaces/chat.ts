import type { Server } from "socket.io"

export function registerChatNamespace(io: Server) {
  const chat = io.of("/chat")

  chat.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined

    if (!userId) {
      socket.disconnect()
      return
    }

    console.log(`[chat] user ${userId} connected`)

    // Join a conversation room — messages are persisted via REST + delivered via Redis
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`)
    })

    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    // Typing indicator — relay to others in the room (not back to sender)
    socket.on(
      "typing",
      (data: { conversationId: string; userId: string; isTyping: boolean }) => {
        socket.to(`conversation:${data.conversationId}`).emit("user_typing", {
          conversationId: data.conversationId,
          userId: data.userId,
          isTyping: data.isTyping,
        })
      }
    )

    socket.on("disconnect", () => {
      console.log(`[chat] user ${userId} disconnected`)
    })
  })

  return chat
}
