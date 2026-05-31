import type { Server } from "socket.io";

export function registerNotifyNamespace(io: Server) {
  const notify = io.of("/notifications");

  notify.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Each user joins their own room so we can target them
    socket.join(`user:${userId}`);
    console.log(`[notify] user ${userId} connected`);

    socket.on("disconnect", () => {
      console.log(`[notify] user ${userId} disconnected`);
    });
  });

  return notify;
}
