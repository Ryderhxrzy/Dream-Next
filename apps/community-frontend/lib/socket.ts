import { io } from "socket.io-client"

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4001"

// Notifications socket — connects with userId so server can target us
export function createNotifySocket(userId: string, token: string) {
  return io(`${REALTIME_URL}/notifications`, {
    auth: { userId, token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  })
}

// Chat socket — joins conversation rooms
export function createChatSocket(userId: string, token: string) {
  return io(`${REALTIME_URL}/chat`, {
    auth: { userId, token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  })
}
