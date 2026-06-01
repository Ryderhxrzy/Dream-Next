import { create } from "zustand";

type PresenceState = {
  onlineUserIds: Set<string>;
  setOnlineUsers: (ids: string[]) => void;
  setPresence: (userId: string, online: boolean) => void;
  isOnline: (userId: string | undefined) => boolean;
};

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: new Set(),

  setOnlineUsers: (ids) => set({ onlineUserIds: new Set(ids) }),

  setPresence: (userId, online) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      if (online) next.add(userId);
      else next.delete(userId);
      return { onlineUserIds: next };
    }),

  isOnline: (userId) => (userId ? get().onlineUserIds.has(userId) : false),
}));
