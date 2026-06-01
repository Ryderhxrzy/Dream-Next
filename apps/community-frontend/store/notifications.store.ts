import { create } from "zustand";

export type Notification = {
  id: string;
  type: "new_post" | "new_comment" | "new_reply" | "new_reaction" | "new_rsvp" | "new_repost";
  payload: Record<string, unknown>;
  createdAt: string;
  read: boolean;
};

type NotificationsState = {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  addNotification: (type: Notification["type"], payload: Record<string, unknown>) => void;
  markAllRead: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,

  // Seed from backend (on load / refresh)
  setNotifications: (notifications, unreadCount) =>
    set({ notifications, unreadCount }),

  addNotification: (type, payload) => {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      read: false,
    };

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
