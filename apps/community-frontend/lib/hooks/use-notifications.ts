"use client";

import { useNotificationsStore } from "@/store/notifications.store";

export { type Notification } from "@/store/notifications.store";

export function useNotifications() {
  return useNotificationsStore();
}
