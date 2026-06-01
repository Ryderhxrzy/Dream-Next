import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export type EventRsvp = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: "GOING" | "INTERESTED";
  createdAt: string;
};

export function useEventRsvps(postId: string | null) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["event-rsvps", postId],
    queryFn: () => api<EventRsvp[]>(`/posts/${postId}/rsvps`, { token }),
    enabled: !!postId,
  });
}
