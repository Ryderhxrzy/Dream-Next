import http from "http";
import { Server } from "socket.io";

import { config } from "./config.js";
import { subscriber, CHANNELS } from "./redis.js";
import { registerNotifyNamespace } from "./namespaces/notify.js";
import { registerChatNamespace } from "./namespaces/chat.js";

export async function startServer() {
  // Connect to Redis
  console.log("Connecting to Redis...");
  let redisConnected = false;

  try {
    await subscriber.connect();
    redisConnected = true;
    console.log("✔ Redis connected");
  } catch (error) {
    console.warn("⚠ Redis unavailable — realtime pub/sub disabled:", (error as Error).message);
  }

  // Create HTTP + Socket.io server
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  // Register namespaces
  const notify = registerNotifyNamespace(io);
  const chat = registerChatNamespace(io);

  // Subscribe to Redis channels from community-backend
  if (redisConnected) {
    await subscriber.subscribe(
      CHANNELS.NEW_POST,
      CHANNELS.NEW_COMMENT,
      CHANNELS.NEW_REPLY,
      CHANNELS.NEW_REACTION,
      CHANNELS.NEW_RSVP,
      CHANNELS.NEW_REPOST,
      CHANNELS.NEW_MESSAGE,
      CHANNELS.MESSAGE_READ,
    );

    subscriber.on("message", (channel: string, message: string) => {
      try {
        const payload = JSON.parse(message);

        if (channel === CHANNELS.NEW_POST) {
          // Broadcast new post to everyone (feed refresh)
          notify.emit("new_post", payload);
        }

        if (channel === CHANNELS.NEW_COMMENT) {
          // Refresh feed + comments for everyone viewing that post
          notify.emit("refresh_post", { postId: payload.postId });

          // Toast notification only for the post author (not the commenter)
          if (payload.postAuthorId && payload.postAuthorId !== payload.commentAuthorId) {
            notify
              .to(`user:${payload.postAuthorId}`)
              .emit("new_comment", payload);
          }
        }

        if (channel === CHANNELS.NEW_REPLY) {
          // Refresh comments for everyone viewing that post
          notify.emit("refresh_post", { postId: payload.postId });

          // Toast notification only for the parent comment author (not the replier)
          if (payload.parentAuthorId && payload.parentAuthorId !== payload.replyAuthorId) {
            notify
              .to(`user:${payload.parentAuthorId}`)
              .emit("new_reply", payload);
          }
        }

        if (channel === CHANNELS.NEW_REACTION) {
          // Toast notification only for the post author (not the reactor)
          if (payload.postAuthorId && payload.postAuthorId !== payload.reactorId) {
            notify
              .to(`user:${payload.postAuthorId}`)
              .emit("new_reaction", payload);
          }
        }

        if (channel === CHANNELS.NEW_RSVP) {
          // Toast notification only for the event owner (not the RSVP'er)
          if (payload.postAuthorId && payload.postAuthorId !== payload.rsvpUserId) {
            notify
              .to(`user:${payload.postAuthorId}`)
              .emit("new_rsvp", payload);
          }
        }

        if (channel === CHANNELS.NEW_REPOST) {
          // Refresh feeds (new repost appeared)
          notify.emit("new_post", payload);

          // Toast notification for the original post owner (not the reposter)
          if (payload.postAuthorId && payload.postAuthorId !== payload.reposterId) {
            notify
              .to(`user:${payload.postAuthorId}`)
              .emit("new_repost", payload);
          }
        }

        if (channel === CHANNELS.NEW_MESSAGE) {
          // Deliver to everyone in the conversation room (chat namespace)
          chat.to(`conversation:${payload.conversationId}`).emit("new_message", payload.message);

          // Also notify recipients on notify namespace (for unread badge / toast)
          for (const recipientId of payload.recipientIds ?? []) {
            notify.to(`user:${recipientId}`).emit("new_message", {
              conversationId: payload.conversationId,
              message: payload.message,
            });
          }
        }

        if (channel === CHANNELS.MESSAGE_READ) {
          // Tell the conversation room that someone read it (update Sent → Seen)
          chat.to(`conversation:${payload.conversationId}`).emit("conversation_read", {
            conversationId: payload.conversationId,
            readerId: payload.readerId,
            readAt: payload.readAt,
          });
        }
      } catch {
        console.error("Failed to parse Redis message:", message);
      }
    });
  }

  httpServer.listen(config.port, () => {
    console.log(`✔ Realtime service running on http://localhost:${config.port}`);
  });

  function shutdown() {
    subscriber.quit();
    httpServer.close();
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
