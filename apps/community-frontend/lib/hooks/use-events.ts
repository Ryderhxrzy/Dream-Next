import { useAuthStore } from "@/store/auth.store"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { CommunityPost } from "@/lib/hooks/use-community-posts"

export function useEvents() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ["events"],
    queryFn: () => api<CommunityPost[]>("/posts/events", { token }),
  })
}
