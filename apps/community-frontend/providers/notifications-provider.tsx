"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createNotifySocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useNotificationsStore } from "@/store/notifications.store";

type NotificationAuthor = { name: string; avatarUrl?: string | null };

function showNotificationToast({
  author,
  label,
  content,
}: {
  author: NotificationAuthor;
  label: string;
  content: string;
}) {
  const initials = author.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  toast.custom(() => (
    <div className="flex items-start gap-3 bg-white border border-zinc-200 rounded-xl shadow-lg px-4 py-3 w-80">
      <Avatar className="w-9 h-9 shrink-0 mt-0.5">
        <AvatarImage src={author.avatarUrl ?? ""} />
        <AvatarFallback className="bg-zinc-900 text-white text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 leading-none mb-1">
          {author.name}
        </p>
        <p className="text-xs text-zinc-500 mb-1">{label}</p>
        {content && (
          <p className="text-xs text-zinc-700 truncate">{content}</p>
        )}
      </div>
    </div>
  ), { duration: 5000 });
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !currentUser?.id) return;

    const socket = createNotifySocket(currentUser.id, token);
    socketRef.current = socket;

    socket.on("connect", () => console.log("[notify] connected"));

    // New post — refresh feed for everyone
    socket.on("new_post", (payload: Record<string, unknown>) => {
      addNotification("new_post", payload);
    });

    // Refresh feed + comments for everyone viewing that post
    socket.on("refresh_post", (payload: { postId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["post-comments", payload.postId] });
    });

    // Personal: someone commented on YOUR post
    socket.on("new_comment", (payload: Record<string, unknown>) => {
      const author = payload.author as { name: string; avatarUrl?: string | null };
      showNotificationToast({
        author,
        label: "commented on your post",
        content: String(payload.content ?? ""),
      });
      addNotification("new_comment", payload);
    });

    // Personal: someone replied to YOUR comment
    socket.on("new_reply", (payload: Record<string, unknown>) => {
      const author = payload.author as { name: string; avatarUrl?: string | null };
      showNotificationToast({
        author,
        label: "replied to your comment",
        content: String(payload.content ?? ""),
      });
      addNotification("new_reply", payload);
    });

    socket.on("disconnect", () => console.log("[notify] disconnected"));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, currentUser?.id, queryClient, addNotification]);

  return <>{children}</>;
}
