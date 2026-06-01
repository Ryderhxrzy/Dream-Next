import type { Server } from "socket.io";

export function registerNotifyNamespace(io: Server) {
  const notify = io.of("/notifications");

  // Presence — track how many active sockets each user has
  const onlineCounts = new Map<string, number>();

  function onlineUserIds() {
    return Array.from(onlineCounts.keys());
  }

  notify.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Each user joins their own room so we can target them
    socket.join(`user:${userId}`);
    console.log(`[notify] user ${userId} connected`);

    // Presence: increment count; broadcast online if first connection
    const prev = onlineCounts.get(userId) ?? 0;
    onlineCounts.set(userId, prev + 1);
    if (prev === 0) {
      notify.emit("presence", { userId, online: true });
    }

    // Send the full online list to the newly connected client
    socket.emit("online_users", onlineUserIds());

    socket.on("disconnect", () => {
      console.log(`[notify] user ${userId} disconnected`);
      const count = (onlineCounts.get(userId) ?? 1) - 1;
      if (count <= 0) {
        onlineCounts.delete(userId);
        notify.emit("presence", { userId, online: false });
      } else {
        onlineCounts.set(userId, count);
      }
    });
  });

  return notify;
}
