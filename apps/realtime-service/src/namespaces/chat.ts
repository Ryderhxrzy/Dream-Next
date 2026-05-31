import type { Server } from "socket.io";

export function registerChatNamespace(io: Server) {
  const chat = io.of("/chat");

  chat.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`[chat] user ${userId} connected`);

    // Join a conversation room
    socket.on("join_room", (roomId: string) => {
      socket.join(roomId);
      console.log(`[chat] user ${userId} joined room ${roomId}`);
    });

    socket.on("leave_room", (roomId: string) => {
      socket.leave(roomId);
    });

    // Send a message to a room
    socket.on("send_message", (data: { roomId: string; message: string }) => {
      chat.to(data.roomId).emit("new_message", {
        senderId: userId,
        message: data.message,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`[chat] user ${userId} disconnected`);
    });
  });

  return chat;
}
