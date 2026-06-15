import { useAuthStore } from "@/store/auth.store"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"

export function useHideCommunityPost() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)

  const hide = useMutation({
    mutationFn: (postId: string) =>
      api(`/posts/${postId}/hide`, { method: "PATCH", token }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["community-posts"] }),
  })

  const unhide = useMutation({
    mutationFn: (postId: string) =>
      api(`/posts/${postId}/unhide`, { method: "PATCH", token }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["community-posts"] }),
  })

  return { hide, unhide }
}
