"use client";

import { useEffect } from "react";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationsStore, type Notification } from "@/store/notifications.store";

type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

// Fetch persisted notifications from the backend on load / refresh.
export function useNotificationSync() {
  const token = useAuthStore((s) => s.token);
  const setNotifications = useNotificationsStore((s) => s.setNotifications);

  useEffect(() => {
    if (!token) return;

    api<NotificationsResponse>("/notifications", { token })
      .then((res) => setNotifications(res.notifications, res.unreadCount))
      .catch(() => {
        /* non-fatal — realtime still works */
      });
  }, [token, setNotifications]);
}

// Persist "mark all read" to the backend.
export async function markAllReadRemote(token: string | null) {
  if (!token) return;
  await api("/notifications/read", { method: "POST", token }).catch(() => {});
}
